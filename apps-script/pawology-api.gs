/**
 * Pawology API — Google Apps Script внутри таблицы «Калькулятор рационов Pawology».
 *
 * Что делает:
 *  - GET  ?action=calc&...   — подбирает рационы и считает цены по данным таблицы
 *                               (Каталог, Настройки, First Bite). Отдаёт ТОЛЬКО то,
 *                               что видит клиент: названия, граммовку, цены.
 *                               Себестоимость и прибыль наружу не уходят.
 *  - POST {lead}             — записывает заявку с сайта во вкладку «Заявки с сайта».
 *
 * Формулы повторяют листы «Калькулятор» и «First Bite»; все цифры (цены, наценки,
 * нормы, скидки, упаковка) читаются из таблицы при каждом запросе.
 * Если меняется само ПРАВИЛО расчёта в таблице — этот файл нужно поправить так же.
 *
 * Установка: Расширения → Apps Script → вставить этот код → Развернуть →
 * Новое развёртывание → Веб-приложение (Выполнять от: меня, Доступ: все) → скопировать URL.
 */

const LEADS_SHEET = 'Заявки с сайта';
const PERIODS = [7, 30];            // какие сроки показываем на сайте
const HIDE_RECIPE_MARK = 'индивидуальный';
const NO_NECKS_MARK = 'без шей';
const GRAINS_LINES = ['Pawfect Balance']; // линейки с крупами (рис, гречка)

/* ------------------------------ HTTP ------------------------------ */

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action !== 'calc') return json_({ ok: false, error: 'unknown action' });
    return json_(Object.assign({ ok: true }, calc_(parseInput_(p))));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.website) return json_({ ok: true }); // ловушка для ботов
    const input = parseInput_(body.answers || {});
    const result = calc_(input);
    // цену пересчитываем на сервере, а не берём из браузера
    let price = '';
    const r = result.rations.concat(result.firstBite).find(function (x) { return x.name === body.ration; });
    if (r) price = r.prices[String(body.period)] || '';
    saveLead_(body, input, result.gramsPerDay, price);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------ Ввод ------------------------------ */

function parseInput_(p) {
  const num = function (v) { return parseFloat(String(v || '').replace(',', '.')); };
  const allergies = String(p.allergies || '').split(',').map(function (s) { return s.trim(); }).filter(String);
  let age = num(p.age);
  if (p.ageUnit === 'months') age = age / 12;
  const weight = num(p.weight);
  if (!(weight > 0)) throw new Error('weight required');
  return {
    pet: p.pet === 'cat' ? 'Кошка' : 'Собака',
    weight: weight,
    age: isNaN(age) ? 0 : age,
    activity: ({ low: 'низкая', medium: 'средняя', high: 'высокая' })[p.activity] || 'средняя',
    allergies: allergies,                          // chicken, beef, fish, grains, ...
    food: p.food || '',                            // ready | homemade | cooked
    raw: p,
  };
}

/* ------------------------------ Расчёт ------------------------------ */

function calc_(inp) {
  const ss = SpreadsheetApp.getActive();
  const s = settings_(ss);

  // суточная норма — как в листе «Калькулятор» (B11:B13)
  const normPct = inp.age > s.seniorAge ? s.normSenior : (inp.activity === 'высокая' ? s.normHigh : s.norm);
  const grams = Math.floor(inp.weight * 1000 * normPct / s.step) * s.step;

  const meatAllergens = { chicken: 'Курица', beef: 'Говядина', fish: 'Рыба', lamb: 'Баранина' };
  const excluded = inp.allergies.map(function (a) { return meatAllergens[a]; }).filter(String);
  const noGrains = inp.allergies.indexOf('grains') >= 0;
  const chickenAllergy = inp.allergies.indexOf('chicken') >= 0;

  const rations = catalog_(ss).filter(function (r) {
    if (!r.active || r.kind !== inp.pet) return false;
    if (r.flavor.indexOf(HIDE_RECIPE_MARK) >= 0) return false;
    // «без шей» показываем только при аллергии на курицу
    // (обычные рецепты с шеями тогда отсеются по аллергену «Курица» ниже)
    if (!chickenAllergy && r.flavor.indexOf(NO_NECKS_MARK) >= 0) return false;
    if (noGrains && GRAINS_LINES.indexOf(r.line) >= 0) return false;
    return !r.allergens.some(function (a) { return excluded.indexOf(a) >= 0; });
  }).map(function (r) {
    const pack = packPerDay_(grams, s);
    const costDay = r.costPerKg * grams / 1000 + pack;         // Калькулятор!C17
    const priceDay = costDay * (1 + r.markup);                 // Калькулятор!D17
    const prices = {};
    PERIODS.forEach(function (d) {
      prices[d] = ceilTo_(priceDay * d * (1 - discount_(s, d)), s.roundTo);  // Калькулятор!E17
    });
    return { name: r.name, line: r.line, flavor: r.flavor, gramsPerDay: grams, prices: prices };
  });

  // First Bite: только собакам на готовом корме
  let firstBite = [];
  if (inp.pet === 'Собака' && inp.food === 'ready' && !noGrains) {
    firstBite = firstBite_(ss, s, grams).filter(function (f) {
      return excluded.indexOf(f.allergen) < 0;
    }).map(function (f) {
      return { name: 'First Bite · ' + f.flavor, line: 'First Bite', flavor: f.flavor, gramsPerDay: grams, days: f.days, prices: { 14: f.price } };
    });
  }

  return { gramsPerDay: grams, rations: rations, firstBite: firstBite };
}

function packPerDay_(g, s) {
  // Калькулятор!B14 / First Bite!C37
  return (g >= s.bigFrom ? s.vacBig + s.bagBig : s.vacSmall + s.bagSmall) + s.labelPack / s.labelCount;
}

function ceilTo_(v, step) { return Math.ceil(Math.round(v * 1e6) / 1e6 / step) * step; }

function discount_(s, days) {
  // как VLOOKUP(...; FALSE): точное совпадение
  return s.discounts.hasOwnProperty(days) ? s.discounts[days] : 0;
}

/* ------------------------------ Чтение таблицы ------------------------------ */

function settings_(ss) {
  const v = ss.getSheetByName('Настройки').getDataRange().getValues();
  const map = {};
  const discounts = {};
  let inDiscounts = false;
  v.forEach(function (row) {
    const k = String(row[0]).trim();
    if (k === 'Дней') { inDiscounts = true; return; }
    if (inDiscounts && typeof row[0] === 'number') { discounts[row[0]] = Number(row[1]) || 0; return; }
    if (k) map[k] = row[1];
  });
  const need = function (label) {
    if (!(label in map)) throw new Error('В «Настройках» не найдено: ' + label);
    return Number(map[label]);
  };
  return {
    norm: need('Норма кормления, % от веса'),
    normHigh: need('Норма при высокой активности'),
    normSenior: need('Норма для пожилых'),
    seniorAge: need('Пожилой возраст: старше, лет'),
    step: need('Шаг граммовки, г'),
    bigFrom: need('Большая порция: от, г'),
    vacSmall: need('Вакуумный пакетик, малая порция, ₾'),
    vacBig: need('Вакуумный пакетик, большая порция, ₾'),
    bagSmall: need('Пакет для доставки, малая порция, ₾'),
    bagBig: need('Пакет для доставки, большая порция, ₾'),
    roundTo: need('Округление цены вверх до, ₾'),
    labelPack: need('Этикетка: цена за упаковку, ₾'),
    labelCount: need('Этикеток в упаковке, шт'),
    discounts: discounts,
  };
}

function catalog_(ss) {
  const v = ss.getSheetByName('Каталог').getDataRange().getValues();
  const h = v[0].map(function (x) { return String(x).trim(); });
  const col = function (name) {
    const i = h.indexOf(name);
    if (i < 0) throw new Error('В «Каталоге» нет колонки: ' + name);
    return i;
  };
  const c = {
    name: col('Рецепт'), line: col('Линейка'), flavor: col('Вкус'), kind: col('Вид'),
    markup: col('Наценка'), active: col('В калькуляторе'),
    cost: col('Себестоимость продуктов, ₾/кг'), allergens: col('Аллергены'),
  };
  return v.slice(1).filter(function (r) { return r[c.name]; }).map(function (r) {
    return {
      name: String(r[c.name]), line: String(r[c.line]), flavor: String(r[c.flavor]), kind: String(r[c.kind]),
      markup: Number(r[c.markup]) || 0, active: r[c.active] === true || String(r[c.active]).toUpperCase() === 'TRUE',
      costPerKg: Number(r[c.cost]) || 0,
      allergens: String(r[c.allergens]).split(',').map(function (s) { return s.trim(); }).filter(String),
    };
  });
}

/** First Bite: этапы, доли, цены продуктов — как на листе «First Bite». */
function firstBite_(ss, s, normGrams) {
  const v = ss.getSheetByName('First Bite').getDataRange().getValues();
  const findRow = function (pred, from) {
    for (let i = from || 0; i < v.length; i++) if (pred(v[i])) return i;
    return -1;
  };
  const probioticsG = Number(v[findRow(function (r) { return String(r[0]).indexOf('Пробиотики на пакетик') === 0; })][1]) || 0;

  // этапы: строки «дни …» под заголовком «Дни | Дней в этапе | % от суточной нормы …»
  const hStages = findRow(function (r) { return r[0] === 'Дни' && r[1] === 'Дней в этапе'; });
  const stages = [];
  for (let i = hStages + 1; i < v.length && String(v[i][0]).indexOf('дни') === 0; i++) {
    stages.push({ days: Number(v[i][1]) || 0, pct: Number(v[i][2]) || 0, shares: v[i].slice(4, 9).map(Number) });
  }

  // вкусы: «Вкус | Наценка | Аллерген | …»
  const hFlavors = findRow(function (r) { return r[0] === 'Вкус' && r[1] === 'Наценка'; });
  const flavors = [];
  for (let i = hFlavors + 1; i < v.length && v[i][0]; i++) {
    flavors.push({ flavor: String(v[i][0]), markup: Number(v[i][1]) || 0, allergen: String(v[i][2]) });
  }

  // цены продуктов: после «Цена продуктов с потерями»
  const hPrices = findRow(function (r) { return String(r[0]).indexOf('Цена продуктов с потерями') === 0; });
  const prices = {};
  for (let i = hPrices + 1; i < v.length && v[i][0]; i++) {
    prices[String(v[i][0])] = { probiotics: Number(v[i][3]) || 0, items: v[i].slice(4, 9).map(Number) };
  }

  return flavors.map(function (f) {
    const pr = prices[f.flavor];
    if (!pr) return null;
    let cost = 0, days = 0;
    stages.forEach(function (st) {
      const portion = normGrams * st.pct;
      let mix = 0;
      for (let k = 0; k < 5; k++) mix += (st.shares[k] || 0) * (pr.items[k] || 0);
      cost += (portion / 1000 * mix + probioticsG / 1000 * pr.probiotics + packPerDay_(portion, s)) * st.days;
      days += st.days;
    });
    return { flavor: f.flavor, allergen: f.allergen, days: days, price: ceilTo_(cost * (1 + f.markup), s.roundTo) };
  }).filter(Boolean);
}

/* ------------------------------ Заявки ------------------------------ */

function saveLead_(body, inp, grams, price) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(LEADS_SHEET);
  const header = ['Дата', 'Имя клиента', 'Контакт', 'Как связаться', 'Вид', 'Кличка', 'Порода', 'Возраст', 'Вес, кг',
    'Активность', 'Стерилизация', 'Аллергия или не любит', 'Есть заболевание', 'Сейчас ест', 'Граммовка в день, г',
    'Выбранный рацион', 'Период, дн.', 'Цена, ₾', 'Язык сайта'];
  if (!sh) {
    sh = ss.insertSheet(LEADS_SHEET);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  const a = body.answers || {};
  const c = body.contact || {};
  // коды с сайта → понятные менеджеру слова
  const RU = {
    yes: 'да', no: 'нет',
    chicken: 'курица', beef: 'говядина', fish: 'рыба', pumpkin: 'тыква', broccoli: 'брокколи',
    zucchini: 'кабачок', grains: 'крупы', none: 'нет',
    ready: 'готовый корм', homemade: 'готовит сам(а)', cooked: 'варёная натуралка',
    whatsapp: 'WhatsApp', telegram: 'Telegram', call: 'звонок',
  };
  const ru = function (x) { return RU[x] || x || ''; };
  const clean = function (x) { return String(x == null ? '' : x).slice(0, 200).replace(/^[=+\-@]/, "'$&"); };
  sh.appendRow([
    new Date(), clean(c.name), clean(c.value), ru(c.channel),
    inp.pet, clean(a.name), clean(a.breed),
    a.age ? clean(a.age) + ' ' + (a.ageUnit === 'months' ? 'мес' : 'лет') : '',
    inp.weight, inp.activity, ru(a.sterilized), (a.allergies || []).map(ru).join(', '),
    a.disease ? 'да' : '', ru(a.food), grams,
    clean(body.ration), clean(body.period), price, clean(body.lang),
  ]);
}

/* Быстрая проверка из редактора: Выполнить → testCalc, смотреть «Журнал выполнения». */
function testCalc() {
  Logger.log(JSON.stringify(calc_(parseInput_({ pet: 'dog', weight: '10', age: '5', activity: 'low', allergies: '', food: 'ready' })), null, 2));
}
