/* =========================================================
   Hero + PetSelector
   - переключатели [data-pet-btn] (в hero и в квизе) меняют питомца
   - смена питомца: карточка «сжимается», фон перетекает, питомцы меняются
   - скролл: карточка чуть уменьшается
   ========================================================= */
(function () {
  const card = document.querySelector(".hero__card");
  const wash = document.querySelector(".hero__wash");
  let switchTimer;

  function syncPetButtons() {
    const { pet } = Store.get();
    document.body.dataset.pet = pet;
    document.querySelectorAll("[data-pet-btn]").forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.petBtn === pet));
    });
  }

  function playSwitch(prevColor) {
    wash.style.backgroundColor = prevColor;
    restartClass(wash, "is-running");
    restartClass(card, "is-switching");
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => {
      card.classList.remove("is-switching");
    }, 1300);
  }

  function restartClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // перезапуск CSS-анимации
    el.classList.add(cls);
  }

  // Скролл-эффект: 0 → 1 на протяжении первого экрана
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = card.offsetHeight || 1;
      const p = Math.min(Math.max(window.scrollY / h, 0), 1);
      card.style.setProperty("--p", p.toFixed(4));
      card.style.setProperty("--s", (1 - p * 0.06).toFixed(4));
      ticking = false;
    });
  }

  window.Hero = {
    init() {
      syncPetButtons();

      document.querySelectorAll("[data-pet-btn]").forEach((b) => {
        b.addEventListener("click", () => Store.set({ pet: b.dataset.petBtn }));
      });

      Store.subscribe((s, changed) => {
        if (!changed.includes("pet")) return;
        const prevColor = getComputedStyle(card).backgroundColor;
        syncPetButtons();
        playSwitch(prevColor);
      });

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      // старт анимаций после первого кадра (без лоадера)
      const ready = () => document.body.classList.add("is-ready");
      requestAnimationFrame(ready);
      setTimeout(ready, 120); // запасной вариант, если вкладка в фоне
    },
  };
})();
