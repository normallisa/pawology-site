/* =========================================================
   Combo — поле с выпадающим списком и поиском (для «Породы»).
   Можно выбрать из списка или вписать своё значение.
   Combo.attach(input, () => ["вариант", ...])
   ========================================================= */
(function () {
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е").trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function attach(input, getList) {
    if (input.dataset.combo) return;
    input.dataset.combo = "1";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");

    const box = document.createElement("ul");
    box.className = "combo";
    box.setAttribute("role", "listbox");
    input.parentElement.appendChild(box);
    let items = [];
    let active = -1;

    function render() {
      const q = norm(input.value);
      const list = getList();
      items = q ? list.filter((b) => norm(b).includes(q)) : list.slice();
      // точное совпадение не нужно предлагать как «своё»
      const exact = list.some((b) => norm(b) === q);
      const custom = q && !exact;
      active = -1;
      box.innerHTML =
        items.slice(0, 80).map((b, i) => `<li role="option" data-i="${i}">${esc(b)}</li>`).join("") +
        (custom ? `<li role="option" class="combo__custom" data-custom="1">${esc(t("quiz.combo.custom", { value: esc(input.value.trim()) }))}</li>` : "");
      open(true);
    }

    function open(v) {
      box.classList.toggle("is-open", v && box.children.length > 0);
      input.setAttribute("aria-expanded", String(v));
    }

    function choose(value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      open(false);
    }

    function highlight(n) {
      const lis = box.querySelectorAll("li");
      if (!lis.length) return;
      active = (n + lis.length) % lis.length;
      lis.forEach((li, i) => li.classList.toggle("is-active", i === active));
      lis[active].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", render);
    input.addEventListener("input", (e) => { if (e.isTrusted) render(); });
    input.addEventListener("blur", () => setTimeout(() => open(false), 150));
    input.addEventListener("keydown", (e) => {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
      else if (e.key === "Enter" && active >= 0) {
        e.preventDefault(); e.stopPropagation();
        const li = box.querySelectorAll("li")[active];
        li.dataset.custom ? open(false) : choose(items[+li.dataset.i]);
      } else if (e.key === "Escape") { e.stopPropagation(); open(false); }
    });
    // mousedown, чтобы выбор срабатывал раньше blur
    box.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      e.preventDefault();
      li.dataset.custom ? open(false) : choose(items[+li.dataset.i]);
    });
  }

  window.Combo = { attach };
})();
