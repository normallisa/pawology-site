/* =========================================================
   Quiz — рендерит шаги из QUIZ_STEPS, хранит ответы в Store.answers
   Quiz.open(index?)  Quiz.close()
   ========================================================= */
(function () {
  const root = document.getElementById("quiz");
  const stage = document.getElementById("quiz-stage");
  const bar = root.querySelector(".quiz__progress-bar");
  const count = root.querySelector(".quiz__step-count");
  const btnBack = root.querySelector("[data-quiz-back]");
  const btnNext = root.querySelector("[data-quiz-next]");
  const nextLabel = root.querySelector(".quiz__next-label");

  const STEPS = window.QUIZ_STEPS;
  const QUESTION_STEPS = STEPS.filter((s) => s.type !== "result").length;
  let index = 0;
  let isOpen = false;
  let lastFocus = null;

  const A = () => Store.get().answers;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const vars = () => ({ name: esc((A().name || "").trim()) });
  const byPet = (v) => (v && typeof v === "object" ? v[Store.get().pet] : v);
  const icon = (id) => `<svg><use href="#${id}"/></svg>`;
  const breedNames = () => (window.BREEDS[Store.get().pet] || []).map((b) => (Store.get().lang === "en" ? b[1] : b[0]));

  /* ---------- Рендер полей ---------- */
  const render = {
    inputs(f) {
      return `<div class="q-inputs">${f.items.map((it, i) => {
        const val = A()[it.name] ?? "";
        const unit = it.units ? (A()[it.units.name] || it.units.options[0]) : null;
        const extra = it.units
          ? `<div class="q-seg" role="group">${it.units.options.map((u) =>
              `<button type="button" data-unit="${it.units.name}" data-value="${u}" aria-pressed="${u === unit}">${t("quiz.unit." + u)}</button>`).join("")}</div>`
          : it.suffix ? `<span class="field__suffix">${t(it.suffix)}</span>` : "";
        return `<div class="field q-anim ${extra ? "field--unit" : ""}" style="--i:${i}">
          <input id="q-${it.name}" data-name="${it.name}" type="text" placeholder=" "
            ${it.type === "number" ? `inputmode="decimal" data-decimal="1"` : ""}
            ${it.maxlength ? `maxlength="${it.maxlength}"` : ""} ${it.combo ? `data-combo-src="${it.combo}"` : ""}
            value="${esc(val)}" autocomplete="off">
          <label for="q-${it.name}">${t("quiz.f." + it.name)}${it.required ? "" : ""}</label>
          ${extra}
        </div>`;
      }).join("")}</div>`;
    },

    choice(f) {
      return group(f, `<div class="q-choice" role="radiogroup">${f.options.map((o, i) => `
        <button type="button" class="q-opt q-anim" style="--i:${i}" role="radio" data-opt="${f.name}" data-value="${o.value}"
          aria-checked="${A()[f.name] === o.value}">
          ${o.icon ? `<span class="q-opt__icon">${byPet(o.icon)}</span>` : ""}
          <span>${t(`quiz.opt.${f.name}.${o.value}`)}</span>
          <span class="q-opt__check">${icon("i-check")}</span>
        </button>`).join("")}</div>`);
    },

    multi(f) {
      const sel = A()[f.name] || [];
      return group(f, `<div class="q-chips">${f.options.map((o, i) => `
        <button type="button" class="q-opt q-anim ${o.wide ? "q-opt--wide" : ""}" style="--i:${i}" data-multi="${f.name}" data-value="${o.value}"
          aria-pressed="${sel.includes(o.value)}">
          <span class="q-opt__icon">${byPet(o.icon)}</span>
          <span>${t(`quiz.opt.${f.name}.${o.value}`)}</span>
          <span class="q-opt__check">${icon("i-check")}</span>
        </button>`).join("")}</div>`);
    },

    // отдельная карточка-флажок (например, «Есть заболевание»)
    flag(f) {
      const on = !!A()[f.name];
      return `<button type="button" class="q-opt q-opt--card q-opt--flag q-anim" data-flag="${f.name}" aria-pressed="${on}">
        <span class="q-opt__icon">${f.icon}</span>
        <span class="q-opt__text">
          <span class="q-opt__title">${t("quiz.f." + f.name)}</span>
          <span class="q-opt__desc">${t("quiz.desc." + f.name)}</span>
        </span>
        <span class="q-opt__check">${icon("i-check")}</span>
      </button>`;
    },

    cards(f) {
      return `<div class="q-cards" role="radiogroup">${f.options.map((o, i) => `
        <button type="button" class="q-opt q-opt--card q-anim" style="--i:${i}" role="radio" data-opt="${f.name}" data-value="${o.value}"
          aria-checked="${A()[f.name] === o.value}">
          <span class="q-opt__icon">${byPet(o.icon)}</span>
          <span class="q-opt__text">
            <span class="q-opt__title">${t(`quiz.opt.${f.name}.${o.value}`)}
              <span class="q-meter" aria-hidden="true">${[1, 2, 3].map((n) => `<i class="${n <= o.level ? "on" : ""}"></i>`).join("")}</span>
            </span>
            <span class="q-opt__desc">${t(`quiz.desc.${f.name}.${o.value}`)}</span>
          </span>
          <span class="q-opt__check">${icon("i-check")}</span>
        </button>`).join("")}</div>`;
    },
  };

  function group(f, inner) {
    const hint = f.hint ? ` <span class="q-group__hint">· ${t(f.hint)}</span>` : "";
    return `<div class="q-group"><span class="q-group__label q-anim">${t("quiz.f." + f.name)}${hint}</span>${inner}</div>`;
  }

  function renderResult() {
    const a = A();
    const chips = [];
    chips.push(Store.get().pet === "dog" ? "🐶 " + t("pet.dog") : "🐱 " + t("pet.cat"));
    if (a.breed) chips.push(esc(a.breed));
    if (a.age) chips.push(`${esc(a.age)} ${t("quiz.unit." + (a.ageUnit || "years"))}`);
    if (a.weight) chips.push(`${esc(a.weight)} ${t("quiz.unit.kg")}`);
    if (a.activity) chips.push(t("quiz.opt.activity." + a.activity));
    return `<div class="q-result">
      <div class="q-summary q-anim">${chips.map((c) => `<span>${c}</span>`).join("")}</div>
      <div class="q-plan q-anim" style="--i:1">
        <div class="q-plan__body">
          <div class="q-plan__label">${t("quiz.result.label")}</div>
          <div class="q-plan__title">${t("quiz.result.plan")}</div>
          <div class="q-plan__lines"><i></i><i></i><i></i></div>
        </div>
        <img src="assets/img/bowl.png" alt="">
      </div>
      <p class="q-sub q-anim" style="--i:2">${t("quiz.result.note")}</p>
    </div>`;
  }

  /* ---------- Шаг целиком ---------- */
  function draw(dir) {
    const step = STEPS[index];
    const body = step.type === "result"
      ? renderResult()
      : `<div class="q-fields">${step.fields.map((f) => render[f.type](f)).join("")}</div>`;

    stage.innerHTML = `<div class="q-step" ${dir ? `data-dir="${dir}"` : 'style="animation:none"'}>
      <h2 class="q-title" id="quiz-title">${t(step.title, vars())}</h2>
      ${step.sub ? `<p class="q-sub">${t(step.sub, vars())}</p>` : ""}
      ${body}
    </div>`;
    if (!dir) stage.querySelectorAll(".q-anim").forEach((el) => el.classList.remove("q-anim"));
    stage.querySelectorAll("[data-combo-src]").forEach((inp) => Combo.attach(inp, () => breedNames()));

    const isResult = step.type === "result";
    const n = Math.min(index + 1, QUESTION_STEPS);
    count.textContent = isResult ? t("quiz.done") : t("quiz.step", { n, total: QUESTION_STEPS });
    bar.style.width = (isResult ? 100 : (index / QUESTION_STEPS) * 100 + 100 / QUESTION_STEPS / 2) + "%";
    btnBack.hidden = index === 0;

    const nextIsResult = STEPS[index + 1] && STEPS[index + 1].type === "result";
    nextLabel.textContent = isResult ? t("quiz.order") : nextIsResult ? t("quiz.finish") : t("quiz.next");
    updateNext();
  }

  function isValid(step) {
    if (step.type === "result") return false; // оформление — следующий этап
    const fields = step.fields.flatMap((f) => (f.type === "inputs" ? f.items : [f]));
    return fields.filter((f) => f.required).every((f) => {
      const v = A()[f.name];
      return Array.isArray(v) ? v.length : String(v ?? "").trim() !== "";
    });
  }
  function updateNext() { btnNext.disabled = !isValid(STEPS[index]); }

  function go(to) {
    if (to < 0 || to >= STEPS.length) return;
    const dir = to > index ? "fwd" : "back";
    index = to;
    draw(dir);
    root.querySelector(".quiz__body").scrollTop = 0;
  }

  /* ---------- События ---------- */
  // после появления снимаем класс анимации, иначе при снятии галочки
  // элемент заново проигрывает появление («мигает»)
  stage.addEventListener("animationend", (e) => {
    if (e.animationName === "q-in") e.target.classList.remove("q-anim");
  });

  stage.addEventListener("input", (e) => {
    const el = e.target.closest("[data-name]");
    if (!el) return;
    let v = el.value;
    if (el.dataset.decimal) {
      // вес и возраст: можно писать и 5,5 и 5.5
      const clean = v.replace(/[^\d.,]/g, "");
      if (clean !== v) el.value = v = clean;
      v = v.replace(",", ".");
    }
    Store.setAnswer(el.dataset.name, v);
    updateNext();
  });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input") && !btnNext.disabled) btnNext.click();
  });

  stage.addEventListener("click", (e) => {
    const unit = e.target.closest("[data-unit]");
    if (unit) {
      Store.setAnswer(unit.dataset.unit, unit.dataset.value);
      unit.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === unit)));
      return;
    }

    const opt = e.target.closest("[data-opt]");
    if (opt) {
      const name = opt.dataset.opt;
      Store.setAnswer(name, opt.dataset.value);
      opt.parentElement.querySelectorAll("[data-opt]").forEach((b) => b.setAttribute("aria-checked", String(b === opt)));
      updateNext();
      const field = STEPS[index].fields.find((f) => f.name === name);
      if (field && field.autoNext) setTimeout(() => { if (!btnNext.disabled) go(index + 1); }, 420);
      return;
    }

    const flag = e.target.closest("[data-flag]");
    if (flag) {
      const on = flag.getAttribute("aria-pressed") !== "true";
      Store.setAnswer(flag.dataset.flag, on);
      flag.setAttribute("aria-pressed", String(on));
      return;
    }

    const chip = e.target.closest("[data-multi]");
    if (chip) {
      const name = chip.dataset.multi;
      const field = STEPS[index].fields.find((f) => f.name === name);
      let sel = [...(A()[name] || [])];
      const v = chip.dataset.value;
      if (sel.includes(v)) sel = sel.filter((x) => x !== v);
      else if (v === field.exclusive) sel = [v];
      else sel = sel.filter((x) => x !== field.exclusive).concat(v);
      Store.setAnswer(name, sel);
      chip.parentElement.querySelectorAll("[data-multi]").forEach((b) => b.setAttribute("aria-pressed", String(sel.includes(b.dataset.value))));
      updateNext();
    }
  });

  btnNext.addEventListener("click", () => { if (isValid(STEPS[index])) go(index + 1); });
  btnBack.addEventListener("click", () => go(index - 1));
  root.querySelectorAll("[data-quiz-close]").forEach((b) => b.addEventListener("click", () => Quiz.close()));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) Quiz.close(); });

  window.Quiz = {
    open(start = 0) {
      lastFocus = document.activeElement;
      index = start;
      draw("fwd");
      isOpen = true;
      root.classList.add("is-open");
      root.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      // фокус на первое поле — только на десктопе (на телефоне не открываем клавиатуру сразу)
      if (matchMedia("(pointer: fine)").matches) {
        setTimeout(() => { const f = stage.querySelector("input, button"); f && f.focus({ preventScroll: true }); }, 650);
      }
    },
    close() {
      isOpen = false;
      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    },
    rerender() { if (isOpen) draw(null); },
  };
})();
