/* ============ Header: плашка при скролле, мобильное меню, язык ============ */
(function () {
  const header = document.getElementById("header");
  const menu = document.getElementById("menu");
  const burger = document.querySelector("[data-menu-toggle]");

  // вниз — прячем, вверх — плавно показываем
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    const menuOpen = menu.classList.contains("is-open");
    if (!menuOpen && Math.abs(y - lastY) > 6) {
      header.classList.toggle("is-hidden", y > lastY && y > 160);
      lastY = y;
    }
  }

  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("is-locked", open);
  }

  function syncLang() {
    const { lang } = Store.get();
    document.querySelectorAll("[data-lang-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang));
    });
  }

  window.Header = {
    init() {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });

      burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
      menu.querySelectorAll("a, button").forEach((el) => el.addEventListener("click", () => setMenu(false)));

      document.querySelectorAll("[data-lang-btn]").forEach((b) => {
        b.addEventListener("click", () => Store.set({ lang: b.dataset.langBtn }));
      });
      syncLang();
      Store.subscribe((s, changed) => { if (changed.includes("lang")) syncLang(); });
    },
  };
})();
