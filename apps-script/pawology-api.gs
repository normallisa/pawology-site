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
 * Заявки уходят в отдельную таблицу (LEADS_SPREADSHEET_ID ниже).
 *
 * Установка: Расширения → Apps Script → вставить этот код → Развернуть →
 * Новое развёртывание → Веб-приложение (Выполнять от: меня, Доступ: все) → скопировать URL.
 */

// Заявки с сайта пишутся в отдельную таблицу «Pawology — заказы с сайта», вкладка «Заказы»
const LEADS_SPREADSHEET_ID = '1B1uDGlFF77AuoL8x9LqlhC3PupQiTIRo-34i7sCKkYg';
const LEADS_SHEET = 'Заказы';
// Товары допродажи (мороженое, супы, миски) — таблица «Pawology — товары допродажи», вкладка «Товары»
const EXTRAS_SPREADSHEET_ID = '1ddAxCQfXzaZaLQeAwzXQ9UI7lZ2Q4XFi3OV7eWfFUuI';
const EXTRAS_SHEET = 'Товары';
const PERIODS = [7, 30];            // какие сроки показываем на сайте
const HIDE_RECIPE_MARK = 'индивидуальный';
const NO_NECKS_MARK = 'без шей';
// Какую линейку предлагаем: собакам — Pawfect Balance (в нём крупы: рис, гречка),
// при аллергии на крупы — Let's Meat; кошкам — их линейка Let's Meat cats.
const DOG_LINE = 'Pawfect Balance';
const DOG_LINE_NO_GRAINS = "Let's Meat";
// First Bite — собакам, которые сейчас на готовом корме или варёной натуралке
const FIRST_BITE_FOODS = ['ready', 'cooked'];
const FIRST_BITE_SHEET = 'First Bite';
const FIRST_BITE_NO_GRAINS_SHEET = 'First Bite без круп';
// цена First Bite на сайте — всегда по этому вкусу с листа без круп
const FIRST_BITE_PRICE_FLAVOR = 'Говядина';
// Скидка на первый заказ. Можно задать в «Настройках» строками с такими названиями;
// если строк нет — берутся значения по умолчанию.
const PROMO_REAL_LABEL = 'Скидка на первый заказ (считаем)';
const PROMO_SHOWN_LABEL = 'Скидка на первый заказ (пишем на сайте)';
const PROMO_REAL_DEFAULT = 0.4;
const PROMO_FB_LABEL = 'Скидка на First Bite (считаем)';
const PROMO_FB_DEFAULT = 0.5;
// Если сначала предлагаем First Bite — на рацион после него своя скидка (и считаем, и пишем).
const PROMO_AFTER_FB_LABEL = 'Скидка на рацион после First Bite';
const PROMO_AFTER_FB_DEFAULT = 0.3;
const PROMO_SHOWN_DEFAULT = 0.5;

// Данные листов кэшируются на 5 минут — так ответ быстрее.
// Изменения в таблице попадут на сайт максимум через 5 минут.
const CACHE_SECONDS = 300;

/* ------------------------------ HTTP ------------------------------ */

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === 'ping') return json_({ ok: true });   // «разбудить» скрипт
    if (p.action === 'extras') return json_({ ok: true, items: cached_('extras', extras_) });
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
    let price = '', sale = '';
    const r = result.rations.concat(result.firstBite).find(function (x) { return x.name === body.ration; });
    if (r) { price = r.prices[String(body.period)] || ''; sale = r.sale[String(body.period)] || ''; }
    saveLead_(body, input, result.gramsPerDay, price, sale);
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
  const s = cached_('settings', function () { return settings_(ss); });

  // суточная норма — как в листе «Калькулятор» (B11:B13)
  const normPct = inp.age > s.seniorAge ? s.normSenior : (inp.activity === 'высокая' ? s.normHigh : s.norm);
  const grams = Math.floor(inp.weight * 1000 * normPct / s.step) * s.step;

  const meatAllergens = { chicken: 'Курица', beef: 'Говядина', fish: 'Рыба', lamb: 'Баранина' };
  const excluded = inp.allergies.map(function (a) { return meatAllergens[a]; }).filter(String);
  const noGrains = inp.allergies.indexOf('grains') >= 0;
  const chickenAllergy = inp.allergies.indexOf('chicken') >= 0;

  const rations = cached_('catalog', function () { return catalog_(ss); }).filter(function (r) {
    if (!r.active || r.kind !== inp.pet) return false;
    if (r.flavor.indexOf(HIDE_RECIPE_MARK) >= 0) return false;
    // «без шей» показываем только при аллергии на курицу
    // (обычные рецепты с шеями тогда отсеются по аллергену «Курица» ниже)
    if (!chickenAllergy && r.flavor.indexOf(NO_NECKS_MARK) >= 0) return false;
    // собакам: вкусы основной линейки, а рыба — всегда из Let's Meat
    if (inp.pet === 'Собака') {
      const fish = r.flavor.indexOf('Рыба') === 0;
      const line = fish ? DOG_LINE_NO_GRAINS : (noGrains ? DOG_LINE_NO_GRAINS : DOG_LINE);
      if (r.line !== line) return false;
    }
    return !r.allergens.some(function (a) { return excluded.indexOf(a) >= 0; });
  }).map(function (r) {
    const pack = packPerDay_(grams, s);
    const costDay = r.costPerKg * grams / 1000 + pack;         // Калькулятор!C17
    const priceDay = costDay * (1 + r.markup);                 // Калькулятор!D17
    const prices = {};
    PERIODS.forEach(function (d) {
      prices[d] = ceilTo_(priceDay * d * (1 - discount_(s, d)), s.roundTo);  // Калькулятор!E17
    });
    return { name: r.name, line: r.line, flavor: r.flavor, gramsPerDay: grams, prices: prices, sale: promo_(prices, s) };
  }).sort(function (a, b) {
    // рыба — в конце списка
    return (a.flavor.indexOf('Рыба') === 0) - (b.flavor.indexOf('Рыба') === 0);
  });

  // First Bite: собакам на готовом корме или варёной натуралке; при аллергии на крупы — лист без круп
  let firstBite = [];
  if (inp.pet === 'Собака' && FIRST_BITE_FOODS.indexOf(inp.food) >= 0) {
    const sheet = noGrains ? FIRST_BITE_NO_GRAINS_SHEET : FIRST_BITE_SHEET;
    // одна карточка «переходный рацион»: вкусы перечислены,
    // цена — всегда по говядине без круп (лист «First Bite без круп»)
    const fb = firstBite_(ss, s, grams, sheet).filter(function (f) {
      return excluded.indexOf(f.allergen) < 0;
    });
    if (fb.length) {
      const priced = firstBite_(ss, s, grams, FIRST_BITE_NO_GRAINS_SHEET).filter(function (f) {
        return excluded.indexOf(f.allergen) < 0;
      });
      // говядина; если на неё аллергия — оставшийся вкус
      const base = priced.find(function (f) { return f.flavor === FIRST_BITE_PRICE_FLAVOR; }) || priced[0] || fb[0];
      const prices = { 14: base.price };
      firstBite = [{
        name: sheet, line: sheet,
        flavor: fb.map(function (f, i) { return i ? f.flavor.toLowerCase() : f.flavor; }).join(' / '),
        gramsPerDay: grams, days: base.days, prices: prices, sale: promo_(prices, s, s.promoFirstBite),
      }];
    }
  }

  // рацион после First Bite — со своей скидкой (−30%), бейдж показывает её же
  if (firstBite.length) {
    rations.forEach(function (r) {
      r.sale = promo_(r.prices, s, s.promoAfterFb);
      r.badge = s.promoAfterFb;
      r.afterFirstBite = true;
    });
  }
  return { gramsPerDay: grams, rations: rations, firstBite: firstBite, promo: { shown: s.promoShown, afterFirstBite: s.promoAfterFb } };
}

/** Цена со скидкой на первый заказ: цена калькулятора − скидка (у First Bite своя), вверх до целого лари. */
function promo_(prices, s, rate) {
  const r = rate == null ? s.promoReal : rate;
  const out = {};
  Object.keys(prices).forEach(function (k) { out[k] = ceilTo_(prices[k] * (1 - r), s.roundTo); });
  return out;
}

/** Товары допродажи: только те, у кого стоит галочка «В наличии». */
function extras_() {
  const v = SpreadsheetApp.openById(EXTRAS_SPREADSHEET_ID).getSheetByName(EXTRAS_SHEET).getDataRange().getValues();
  const h = v[0].map(function (x) { return String(x).trim(); });
  const col = function (start) {
    for (let i = 0; i < h.length; i++) if (h[i].indexOf(start) === 0) return i;
    return -1;
  };
  const c = {
    id: col('ID'), stock: col('В наличии'), pets: col('Для кого'), title: col('Название'), sub: col('Подзаголовок'),
    price: col('Цена, ₾'), discount: col('Скидка'), sale: col('Цена со скидкой'), colors: col('Цвета'), photo: col('Фото'),
    titleEn: col('Название EN'), subEn: col('Подзаголовок EN'),
  };
  const COLORS = {
    'розовая': ['#F4A3A3', 'pink'], 'зелёная': ['#A8D89A', 'green'], 'зеленая': ['#A8D89A', 'green'],
    'голубая': ['#9CC9F0', 'blue'], 'синяя': ['#6F9EDB', 'blue'], 'жёлтая': ['#F6D86B', 'yellow'], 'желтая': ['#F6D86B', 'yellow'],
    'бежевая': ['#E8D9C0', 'beige'], 'белая': ['#FFFFFF', 'white'], 'чёрная': ['#2B2B2B', 'black'], 'черная': ['#2B2B2B', 'black'],
    'серая': ['#B9BBBE', 'grey'], 'оранжевая': ['#F5A35C', 'orange'], 'фиолетовая': ['#B79BE0', 'purple'],
  };
  const get = function (row, i) { return i < 0 ? '' : row[i]; };
  const num = function (x) { const n = parseFloat(String(x).replace(',', '.')); return isNaN(n) ? null : n; };
  return v.slice(1).filter(function (r) {
    return String(get(r, c.id)).trim() && (get(r, c.stock) === true || String(get(r, c.stock)).toUpperCase() === 'TRUE');
  }).map(function (r) {
    const id = String(get(r, c.id)).trim();
    const who = String(get(r, c.pets)).trim();
    const price = num(get(r, c.price));
    let sale = num(get(r, c.sale));
    if (sale == null && price != null) sale = price;
    const colors = String(get(r, c.colors)).split(',').map(function (x) { return x.trim(); }).filter(String).map(function (name) {
      const k = COLORS[name.toLowerCase()] || ['#D9D6CE', name];
      return { id: k[1] + '-' + name.toLowerCase(), hex: k[0], title: { ru: name, en: k[1] } };
    });
    return {
      id: id,
      img: String(get(r, c.photo)).trim(),
      icon: id.indexOf('icecream') === 0 ? '🍨' : id.indexOf('soup') === 0 || id.indexOf('bowl') === 0 ? '🥣' : '🎁',
      pets: who === 'Собаки' ? ['dog'] : who === 'Кошки' ? ['cat'] : null,
      title: { ru: String(get(r, c.title)), en: String(get(r, c.titleEn)) || String(get(r, c.title)) },
      sub: { ru: String(get(r, c.sub)), en: String(get(r, c.subEn)) || String(get(r, c.sub)) },
      price: sale,
      oldPrice: price != null && sale != null && sale < price ? price : null,
      colors: colors.length ? colors : null,
    };
  });
}

/** Берёт значение из кэша скрипта или считает и кладёт туда на CACHE_SECONDS. */
function cached_(key, fn) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const val = fn();
  try { cache.put(key, JSON.stringify(val), CACHE_SECONDS); } catch (e) { /* слишком большое — просто не кэшируем */ }
  return val;
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
  const opt = function (label, def) { return (label in map && map[label] !== '') ? Number(map[label]) : def; };
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
    promoReal: opt(PROMO_REAL_LABEL, PROMO_REAL_DEFAULT),
    promoShown: opt(PROMO_SHOWN_LABEL, PROMO_SHOWN_DEFAULT),
    promoFirstBite: opt(PROMO_FB_LABEL, PROMO_FB_DEFAULT),
    promoAfterFb: opt(PROMO_AFTER_FB_LABEL, PROMO_AFTER_FB_DEFAULT),
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
function firstBite_(ss, s, normGrams, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Не найден лист: ' + sheetName);
  const v = cached_('sheet:' + sheetName, function () { return sh.getDataRange().getValues(); });
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

function saveLead_(body, inp, grams, price, sale) {
  const ss = SpreadsheetApp.openById(LEADS_SPREADSHEET_ID);
  const a = body.answers || {};
  const c = body.contact || {};
  // коды с сайта → понятные менеджеру слова
  const RU = {
    yes: 'да', no: 'нет', male: 'мальчик', female: 'девочка',
    chicken: 'курица', beef: 'говядина', fish: 'рыба', pumpkin: 'тыква', broccoli: 'брокколи',
    zucchini: 'кабачок', grains: 'крупы', none: 'нет',
    ready: 'готовый корм', homemade: 'готовит сам(а)', cooked: 'варёная натуралка',
  };
  const ru = function (x) { return RU[x] || x || ''; };
  const clean = function (x, max) { return String(x == null ? '' : x).slice(0, max || 200).replace(/^[=+\-@]/, "'$&"); };

  // значения по названиям колонок: новые колонки добавятся в конец сами
  const row = {
    'Статус': 'Новая',
    'Дата': new Date(),
    'Имя клиента': clean(c.name),
    'Телефон': clean(c.phone),
    'Ссылка для связи': clean(c.link),
    'Адрес': clean(c.address, 400),
    'Вид': inp.pet,
    'Кличка': clean(a.name),
    'Пол': ru(a.sex),
    'Порода': clean(a.breed),
    'Возраст': a.age ? clean(a.age) + ' ' + (a.ageUnit === 'months' ? 'мес' : 'лет') : '',
    'Вес, кг': inp.weight,
    'Активность': inp.activity,
    'Стерилизация': ru(a.sterilized),
    'Аллергия или не любит': (a.allergies || []).map(ru).join(', '),
    'Есть заболевание': a.disease ? 'да' : '',
    'Сейчас ест': ru(a.food),
    'О питомце': clean(c.about, 1500),
    'Граммовка в день, г': grams,
    'Выбранный рацион': clean(body.ration),
    'Период, дн.': clean(body.period),
    'Цена без скидки, ₾': price,
    'Цена со скидкой, ₾': sale,
    'Дополнительно': clean((body.extras || []).join(', '), 500),
    'Язык сайта': clean(body.lang),
  };

  let sh = ss.getSheetByName(LEADS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LEADS_SHEET);
    sh.appendRow(Object.keys(row));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, Object.keys(row).length).setFontWeight('bold');
  }
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  Object.keys(row).forEach(function (k) {
    if (header.indexOf(k) < 0) {
      header.push(k);
      sh.getRange(1, header.length).setValue(k).setFontWeight('bold');
    }
  });
  sh.appendRow(header.map(function (k) { return k in row ? row[k] : ''; }));
}

/* Быстрая проверка из редактора: Выполнить → testCalc, смотреть «Журнал выполнения». */
function testCalc() {
  Logger.log(JSON.stringify(calc_(parseInput_({ pet: 'dog', weight: '10', age: '5', activity: 'low', allergies: '', food: 'ready' })), null, 2));
}
