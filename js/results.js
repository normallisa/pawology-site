/* =========================================================
   Results — финальный экран квиза: подходящие рационы из Google Sheets
   (через Apps Script, см. apps-script/pawology-api.gs) + заявка менеджеру.
   Results.mount(el, onChange)  Results.canSubmit()  Results.submit()
   ========================================================= */
(function () {
  const API = () => (window.PAWOLOGY_API_URL || "").trim();
  const cache = {};
  let st = { status: "idle", key: "", data: null, selected: null, contact: { name: "", phone: "", link: "", address: "", about: "" } };
  let el = null;
  let notify = () => {};

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const A = () => Store.get().answers;

  // названия вкусов из таблицы → английский
  const EN = { "Говядина": "Beef", "Курица": "Chicken", "Рыба": "Fish", "Баранина": "Lamb", "без шей": "no necks", "кошки": "cats" };
  const tr = (s) => (Store.get().lang === "en" ? String(s).replace(/Говядина|Курица|Рыба|Баранина|без шей|кошки/g, (m) => EN[m]) : s);

  function query() {
    const a = A();
    const p = new URLSearchParams({
      action: "calc",
      pet: Store.get().pet,
      weight: a.weight || "",
      age: a.age || "",
      ageUnit: a.ageUnit || "years",
      activity: a.activity || "",
      allergies: (a.allergies || []).join(","),
      food: a.food || "",
    });
    return p.toString();
  }

  async function load() {
    const key = query();
    if (!API()) { st.status = "nokey"; return draw(); }
    if (st.key === key && (st.status === "ready" || st.status === "loading")) return draw();
    st.key = key;
    st.selected = null;
    if (cache[key]) { st.data = cache[key]; st.status = "ready"; return draw(); }
    st.status = "loading"; draw();
    try {
      const res = await fetch(API() + "?" + key);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "error");
      cache[key] = data;
      if (st.key !== key) return;
      st.data = data; st.status = "ready";
    } catch (e) {
      if (st.key !== key) return;
      st.status = "error";
    }
    draw();
  }

  /* ---------- Разметка ---------- */
  function priceBtn(r, period) {
    const sel = st.selected && st.selected.name === r.name && st.selected.period === period;
    return `<button type="button" class="r-price" data-ration="${esc(r.name)}" data-period="${period}" aria-pressed="${!!sel}">
      <b>${t("res.from")} ${r.prices[period]} ₾</b><span>${t("res.days", { n: period })}</span>
    </button>`;
  }

  function card(r, i) {
    const periods = Object.keys(r.prices);
    const picked = st.selected && st.selected.name === r.name;
    return `<li class="r-card q-anim ${picked ? "is-picked" : ""}" style="--i:${i}">
      <div class="r-card__head">
        <span class="r-card__line">${esc(tr(r.line))}</span>
        <span class="r-card__flavor">${esc(tr(r.flavor))}</span>
      </div>
      <div class="r-card__prices">${periods.map((p) => priceBtn(r, p)).join("")}</div>
    </li>`;
  }

  function contactForm() {
    const c = st.contact;
    const input = (k, type, ac, max) =>
      `<div class="field"><input id="r-${k}" data-contact="${k}" type="${type}" placeholder=" " maxlength="${max}" value="${esc(c[k])}" autocomplete="${ac}"><label for="r-${k}">${t("res.f." + k)}</label></div>`;
    return `<div class="r-form q-anim" style="--i:3">
      <h3 class="r-form__title">${t("res.form.title")}</h3>
      <div class="r-form__fields">
        ${input("name", "text", "name", 60)}
        ${input("phone", "tel", "tel", 30)}
        ${input("link", "text", "off", 120)}
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

  function draw() {
    if (!el) return;
    const a = A();
    if (st.status === "sent") {
      el.innerHTML = `<div class="r-done q-anim"><div class="r-done__icon">💌</div>
        <h3>${t("res.sent.title")}</h3><p class="q-sub">${t("res.sent.sub")}</p></div>`;
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
      ${list.length
        ? `<h3 class="r-h q-anim">${t("res.list.title", { line: esc(tr(list[0].line)) })}</h3><ul class="r-list">${list.map(card).join("")}</ul>`
        : `<p class="r-note q-anim">${t("res.empty")}</p>`}
      ${fb.length ? `<h3 class="r-h q-anim">${t("res.fb.title")}</h3><p class="q-sub r-h__sub">${t("res.fb.sub")}</p>
        <ul class="r-list">${fb.map((r, i) => card(r, i + list.length)).join("")}</ul>` : ""}
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
      if (e.target.closest("[data-retry]")) { st.key = ""; load(); }
    });
    el.addEventListener("input", (e) => {
      const f = e.target.closest("[data-contact]");
      if (!f) return;
      st.contact[f.dataset.contact] = f.value;
      notify();
    });
  }

  window.Results = {
    mount(container, onChange) {
      el = container;
      notify = onChange || (() => {});
      bind();
      if (st.status === "sent") st.status = "idle";
      load();
    },
    canSubmit() {
      if (st.status !== "ready") return false;
      const hasList = (st.data.rations || []).length + (st.data.firstBite || []).length > 0;
      const c = st.contact;
      return (!hasList || !!st.selected) && c.name.trim().length > 1
        && c.phone.replace(/\D/g, "").length >= 7 && c.address.trim().length >= 5;
    },
    isSent: () => st.status === "sent",
    async submit() {
      if (!Results.canSubmit()) return false;
      const hp = el.querySelector(".r-hp");
      const body = {
        answers: Object.assign({}, A(), { pet: Store.get().pet }),
        ration: st.selected ? st.selected.name : "",
        period: st.selected ? st.selected.period : "",
        contact: st.contact,
        lang: Store.get().lang,
        website: hp ? hp.value : "",
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
