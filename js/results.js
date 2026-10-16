/* =========================================================
   Results — финальный экран квиза: подходящие рационы из Google Sheets
   (через Apps Script, см. apps-script/pawology-api.gs) + заявка менеджеру.
   Results.mount(el, onChange)  Results.canSubmit()  Results.submit()
   ========================================================= */
(function () {
  const API = () => (window.PAWOLOGY_API_URL || "").trim();
  const cache = {};
  let st = { status: "idle", stage: "form", key: "", data: null, selected: null, extras: {}, hp: "",
    contact: { name: "", phone: "", link: "", address: "", about: "" } };
  let el = null;
  let notify = () => {};

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const A = () => Store.get().answers;

  // названия вкусов из таблицы → английский
  const EN = { "Говядина": "Beef", "Курица": "Chicken", "Рыба": "Fish", "Баранина": "Lamb", "без шей": "no necks", "кошки": "cats" };
  const tr = (s) => (Store.get().lang === "en" ? String(s).replace(/Говядина|Курица|Рыба|Баранина|без шей|кошки/g, (m) => EN[m]) : s);

  function query(activity) {
    const a = A();
    const p = new URLSearchParams({
      action: "calc",
      pet: Store.get().pet,
      weight: a.weight || "",
      age: a.age || "",
      ageUnit: a.ageUnit || "years",
      activity: activity || a.activity || "",
      allergies: (a.allergies || []).join(","),
      food: a.food || "",
    });
    return p.toString();
  }

  // один запрос на один набор ответов: повторные вызовы ждут тот же ответ
  const inflight = {};
  function request(key) {
    if (cache[key]) return Promise.resolve(cache[key]);
    if (!inflight[key]) {
      inflight[key] = fetch(API() + "?" + key)
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) throw new Error(data.error || "error");
          cache[key] = data;
          preloadPhotos(data);
          return data;
        })
        .finally(() => { delete inflight[key]; });
    }
    return inflight[key];
  }

  async function load() {
    const key = query();
    if (!API()) { st.status = "nokey"; return draw(); }
    if (st.key === key && (st.status === "ready" || st.status === "loading")) return draw();
    st.key = key;
    st.selected = null;
    if (cache[key]) { st.data = cache[key]; st.status = "ready"; preselect(st.data); return draw(); }
    st.status = "loading"; draw();
    try {
      const data = await request(key);
      if (st.key !== key) return;
      st.data = data; st.status = "ready";
      preselect(data);
    } catch (e) {
      if (st.key !== key) return;
      st.status = "error";
    }
    draw();
  }

  // фото рационов из ответа — грузим заранее, чтобы карточки появились сразу с картинками
  function preloadPhotos(data) {
    (data.rations || []).concat(data.firstBite || []).forEach((r) => {
      const m = photo(r).match(/src="([^"]+)"/);
      if (m) new Image().src = m[1];
    });
  }

  // рекомендуемый вариант выбран заранее: First Bite, если он есть, иначе первый рацион
  function preselect(data) {
    const first = (data.firstBite || [])[0] || (data.rations || [])[0];
    st.selected = first ? { name: first.name, period: Object.keys(first.prices)[0] } : null;
  }

  /* ---------- Разметка ---------- */
  function priceBtn(r, period) {
    const sel = st.selected && st.selected.name === r.name && st.selected.period === period;
    return `<button type="button" class="r-price" data-ration="${esc(r.name)}" data-period="${period}" aria-pressed="${!!sel}">
      ${r.sale ? `<s class="r-price__old">${r.prices[period]} ₾</s>` : ""}
      <b>${t("res.from")} ${r.sale ? r.sale[period] : r.prices[period]} ₾</b><span>${t("res.days", { n: period })}</span>
    </button>`;
  }

  // фото рациона: assets/img/rations/<линейка>-<вкус>.webp; «без шей» — то же фото, что и вкус
  const LINE_SLUG = { "Pawfect Balance": "pb", "Let's Meat": "lm", "Let's Meat cats": "lmc" };
  const FLAVOR_SLUG = [["Говядина", "beef"], ["Курица", "chicken"], ["Рыба", "fish"]];
  const PHOTOS = ["pb-beef", "pb-chicken", "lm-beef", "lm-chicken", "lm-fish", "lmc-beef", "lmc-chicken", "lmc-fish"];
  function photo(r) {
    if (r.line.indexOf("First Bite") === 0) return `<div class="r-card__photo"><img src="assets/img/rations/first-bite.webp" alt="" loading="lazy"></div>`;
    const fl = FLAVOR_SLUG.find(([ru]) => r.flavor.indexOf(ru) === 0);
    const key = LINE_SLUG[r.line] && fl ? LINE_SLUG[r.line] + "-" + fl[1] : "";
    if (PHOTOS.includes(key)) return `<div class="r-card__photo"><img src="assets/img/rations/${key}.webp" alt="" loading="lazy"></div>`;
    const emoji = r.line.indexOf("First Bite") === 0 ? "🥣" : r.flavor.indexOf("Рыба") === 0 ? "🐟" : "🍖";
    return `<div class="r-card__photo r-card__photo--empty" aria-hidden="true">${emoji}</div>`;
  }

  function card(r, i) {
    const periods = Object.keys(r.prices);
    const picked = st.selected && st.selected.name === r.name;
    return `<li class="r-card q-anim ${picked ? "is-picked" : ""}" style="--i:${i}">
      ${photo(r)}
      <div class="r-card__head">
        <span class="r-card__line">${esc(tr(r.line))}</span>
        <span class="r-card__flavor">${esc(tr(r.flavor))}</span>
        ${r.sale && st.data.promo ? `<span class="r-card__badge ${r.afterFirstBite ? "r-card__badge--pink" : ""}">−${Math.round((r.badge || st.data.promo.shown) * 100)}%</span>` : ""}
      </div>
      <div class="r-card__prices">${periods.map((p) => priceBtn(r, p)).join("")}</div>
    </li>`;
  }

  function contactForm() {
    const c = st.contact;
    const input = (k, type, ac, max, req) =>
      `<div class="field"><input id="r-${k}" data-contact="${k}" type="${type}" placeholder=" " maxlength="${max}" value="${esc(c[k])}" autocomplete="${ac}" ${req ? "required" : ""}><label for="r-${k}">${t("res.f." + k)}${req ? '<i class="req" aria-hidden="true">*</i>' : ""}</label></div>`;
    return `<div class="r-form q-anim" style="--i:3">
      <h3 class="r-form__title">${t("res.form.title")}</h3>
      <p class="q-sub">${t("res.form.sub")}</p>
      <div class="r-form__fields">
        ${input("name", "text", "name", 60, true)}
        <div class="field field--phone">
          <span class="field__prefix" aria-hidden="true">+995</span>
          <input id="r-phone" data-contact="phone" data-phone type="tel" inputmode="numeric" placeholder=" " maxlength="12" value="${esc(c.phone)}" autocomplete="tel-national" required>
          <label for="r-phone">${t("res.f.phone")}<i class="req" aria-hidden="true">*</i></label>
        </div>
        ${input("link", "text", "off", 120, true)}
        ${input("address", "text", "street-address", 200)}
        <div class="field field--area">
          <textarea id="r-about" data-contact="about" placeholder=" " maxlength="1500" rows="3">${esc(c.about)}</textarea>
          <label for="r-about">${t("res.f.about")}</label>
        </div>
        <p class="r-form__hint">${t("res.f.aboutHint")}</p>
      </div>
      <input class="r-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    </div>`;
  }

  /* ---------- Дополнительные товары (после формы, до отправки) ---------- */
  const L = (o) => (o ? o[Store.get().lang] || o.ru : "");
  const extrasList = () => (window.EXTRAS || []).filter((x) => !x.pets || x.pets.includes(Store.get().pet));

  function extraCard(x, i) {
    const sel = st.extras[x.id];
    const color = sel ? sel.color : x.colors && x.colors[0].id;
    return `<li class="x-card q-anim ${sel ? "is-added" : ""}" style="--i:${i}">
      <div class="x-card__top">
        <div class="x-card__photo ${x.img ? "" : "x-card__photo--empty"}">${x.img ? `<img src="assets/img/extras/${x.img}.webp" alt="" loading="lazy">` : x.icon}</div>
        <div class="x-card__text">
          <h4 class="x-card__title">${esc(L(x.title))}</h4>
          <p class="x-card__sub">${esc(L(x.sub))}</p>
          ${x.price ? `<p class="x-card__price">${x.oldPrice ? `<s>${x.oldPrice} ₾</s> ` : ""}<b>${x.price} ₾</b></p>` : ""}
        </div>
      </div>
      ${x.colors ? `<div class="x-card__colors" role="radiogroup" aria-label="${t("ext.color")}">
        ${x.colors.map((c) => `<button type="button" class="x-color" role="radio" data-extra-color="${x.id}" data-value="${c.id}" aria-checked="${c.id === color}" style="--c:${c.hex}"><i></i>${esc(L(c.title))}</button>`).join("")}
      </div>` : ""}
      <button type="button" class="x-card__add" data-extra="${x.id}" aria-pressed="${!!sel}">${sel ? "✓ " + t("ext.added") : "+ " + t("ext.add")}</button>
    </li>`;
  }

  function drawExtras() {
    const name = esc((A().name || "").trim());
    el.innerHTML = `<div class="x-head q-anim">
        <h3 class="r-h">${t("ext.title", { name })}</h3>
        <p class="q-sub">${t("ext.sub")}</p>
      </div>
      <ul class="x-list">${extrasList().map(extraCard).join("")}</ul>`;
    notify();
  }

  function extrasForLead() {
    return extrasList().filter((x) => st.extras[x.id]).map((x) => {
      const c = x.colors && x.colors.find((k) => k.id === st.extras[x.id].color);
      return x.title.ru + (c ? " (" + c.title.ru + ")" : "");
    });
  }

  function draw() {
    if (!el) return;
    const a = A();
    // экран товаров выглядит отдельной страницей — без заголовка рационов и плашек
    const step = el.closest(".q-step");
    if (step) step.classList.toggle("is-extras", st.status === "ready" && st.stage === "extras");
    if (st.status === "ready" && st.stage === "extras") return drawExtras();
    if (st.status === "sent") {
      el.innerHTML = `<div class="r-done q-anim"><div class="r-done__icon">💌</div>
        <h3>${t("res.sent.title", { name: esc(st.contact.name.trim()) })}</h3><p class="q-sub">${t("res.sent.sub")}</p></div>`;
      return notify();
    }
    if (st.status === "nokey") {
      el.innerHTML = `<p class="r-note q-anim">${t("res.nokey")}</p>`;
      return notify();
    }
    if (st.status === "loading" || st.status === "idle") {
      el.innerHTML = `<div class="r-loading q-anim"><i></i><i></i><i></i></div>`;
      return notify();
    }
    if (st.status === "error") {
      el.innerHTML = `<p class="r-note q-anim">${t("res.error")}</p>
        <button type="button" class="btn-pill btn-pill--light r-retry" data-retry>${t("res.retry")}</button>`;
      return notify();
    }

    const d = st.data;
    const fb = d.firstBite || [];
    const list = d.rations || [];
    el.innerHTML = `
      <div class="r-portion q-anim">
        <span class="r-portion__icon">⚖️</span>
        <span>${t("res.portion", { g: d.gramsPerDay, name: esc((a.name || "").trim()) })}</span>
      </div>
      ${a.disease ? `<p class="r-note r-note--soft q-anim">${t("res.disease")}</p>` : ""}
      ${fb.length ? `<h3 class="r-h q-anim">${t("res.fb.title")}</h3><p class="q-sub r-h__sub">${t("res.fb.sub")}</p>
        <ul class="r-list">${fb.map(card).join("")}</ul>` : ""}
      ${list.length
        ? `<h3 class="r-h q-anim">${t(fb.length ? "res.list.afterFb" : "res.list.title", { line: esc(tr(list[0].line)) })}</h3>
           <p class="q-sub r-h__sub">${t("res.line." + list[0].line)}</p>
           ${fb.length && d.promo && d.promo.afterFirstBite ? `<p class="r-gift q-anim">🎁 ${t("res.gift", { p: Math.round(d.promo.afterFirstBite * 100) })}</p>` : ""}
           <ul class="r-list">${list.map((r, i) => card(r, i + fb.length)).join("")}</ul>`
        : `<p class="r-note q-anim">${t("res.empty")}</p>`}
      ${contactForm()}`;
    notify();
  }

  /* ---------- События ---------- */
  function bind() {
    el.addEventListener("click", (e) => {
      const p = e.target.closest("[data-ration]");
      if (p) {
        const same = st.selected && st.selected.name === p.dataset.ration && st.selected.period === p.dataset.period;
        st.selected = same ? null : { name: p.dataset.ration, period: p.dataset.period };
        el.querySelectorAll("[data-ration]").forEach((b) => {
          const on = st.selected && b.dataset.ration === st.selected.name && b.dataset.period === st.selected.period;
          b.setAttribute("aria-pressed", String(!!on));
          b.closest(".r-card").classList.toggle("is-picked", !!(st.selected && b.dataset.ration === st.selected.name));
        });
        return notify();
      }
      const add = e.target.closest("[data-extra]");
      if (add) {
        const x = (window.EXTRAS || []).find((k) => k.id === add.dataset.extra);
        const card = add.closest(".x-card");
        if (st.extras[x.id]) delete st.extras[x.id];
        else st.extras[x.id] = { color: x.colors ? (card.querySelector('[aria-checked="true"]') || {}).dataset?.value || x.colors[0].id : null };
        // меняем только эту карточку — без перерисовки всего экрана
        const on = !!st.extras[x.id];
        card.classList.remove("q-anim");
        card.classList.toggle("is-added", on);
        add.setAttribute("aria-pressed", String(on));
        add.textContent = on ? "✓ " + t("ext.added") : "+ " + t("ext.add");
        return notify();
      }
      const col = e.target.closest("[data-extra-color]");
      if (col) {
        const id = col.dataset.extraColor;
        col.parentElement.querySelectorAll("[data-extra-color]").forEach((b) => b.setAttribute("aria-checked", String(b === col)));
        if (st.extras[id]) st.extras[id].color = col.dataset.value;
        return;
      }
      if (e.target.closest("[data-retry]")) { st.key = ""; load(); }
    });
    el.addEventListener("input", (e) => {
      const f = e.target.closest("[data-contact]");
      if (!f) return;
      if (f.dataset.contact === "phone") {
        // +995 уже стоит; клиент вводит 9 цифр, показываем как 599 12 34 56
        let d = f.value.replace(/\D/g, "");
        if (d.startsWith("995") && d.length > 9) d = d.slice(3);
        d = d.slice(0, 9);
        f.value = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
      }
      st.contact[f.dataset.contact] = f.value;
      notify();
    });
  }

  window.Results = {
    // «будим» скрипт Google при открытии квиза, чтобы первый расчёт не ждал его запуска
    warmup() {
      if (!API() || Results._warm) return;
      Results._warm = true;
      fetch(API() + "?action=ping").catch(() => {});
    },
    // на шаге «Активность» остальные ответы уже известны — считаем все три варианта заранее
    prefetch() {
      if (!API()) return;
      ["low", "medium", "high"].forEach((act) => request(query(act)).catch(() => {}));
    },
    mount(container, onChange) {
      el = container;
      notify = onChange || (() => {});
      bind();
      if (st.status === "sent") { st.status = "idle"; st.extras = {}; }
      st.stage = "form";
      load();
    },
    inExtras: () => st.status === "ready" && st.stage === "extras",
    extrasCount: () => Object.keys(st.extras).length,
    // «Оформить заказ» → экран дополнительных товаров
    toExtras() {
      if (!Results.canSubmit()) return;
      const hp = el.querySelector(".r-hp");
      st.hp = hp ? hp.value : "";
      st.stage = "extras";
      draw();
    },
    // «Назад» с экрана товаров — обратно к форме
    back() {
      if (!Results.inExtras()) return false;
      st.stage = "form";
      draw();
      return true;
    },
    canSubmit() {
      if (st.status !== "ready") return false;
      if (st.stage === "extras") return true;
      const hasList = (st.data.rations || []).length + (st.data.firstBite || []).length > 0;
      const c = st.contact;
      // обязательны имя, телефон и ссылка; адрес и «о питомце» — по желанию
      return (!hasList || !!st.selected) && c.name.trim().length > 1
        && c.phone.replace(/\D/g, "").length === 9 && c.link.trim().length >= 3;
    },
    isSent: () => st.status === "sent",
    async submit() {
      if (!Results.canSubmit()) return false;
      const body = {
        answers: Object.assign({}, A(), { pet: Store.get().pet }),
        ration: st.selected ? st.selected.name : "",
        period: st.selected ? st.selected.period : "",
        contact: Object.assign({}, st.contact, { phone: "+995 " + st.contact.phone }),
        lang: Store.get().lang,
        extras: extrasForLead(),
        website: st.hp,
      };
      // text/plain — без предварительного CORS-запроса к Apps Script
      const res = await fetch(API(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "error");
      st.status = "sent";
      draw();
      return true;
    },
  };
})();
