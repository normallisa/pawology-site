/* ============ Плавное появление блоков при скролле ============ */
(function () {
  window.Reveal = {
    init() {
      const items = document.querySelectorAll("[data-reveal], [data-draw]");
      if (!("IntersectionObserver" in window)) {
        items.forEach((el) => el.classList.add("is-in"));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -2% 0px" });
      items.forEach((el) => io.observe(el));
    },
  };
})();
