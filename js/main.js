/* ============ Точка входа ============ */
(function () {
  I18n.apply();
  Header.init();
  Hero.init();
  Reveal.init();

  // Любая кнопка «Подобрать рацион» открывает квиз
  document.querySelectorAll("[data-open-quiz]").forEach((b) => {
    b.addEventListener("click", () => Quiz.open(0));
  });

  // Стартовая строка на втором экране: переносим ответы в квиз
  const bar = document.getElementById("quiz-bar");
  bar.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(bar);
    ["name", "breed", "age"].forEach((k) => {
      const v = String(data.get(k) || "").trim();
      if (v) Store.setAnswer(k, v);
    });
    if (data.get("age")) Store.setAnswer("ageUnit", "years");
    Quiz.open(0);
  });

  // Язык или питомец поменялись — обновляем тексты и квиз
  Store.subscribe((s, changed) => {
    if (changed.includes("lang") || changed.includes("pet")) {
      I18n.apply();
      Quiz.rerender();
    }
  });
})();
