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
  const breedNames = () => (window.BREEDS[Store.get().pet] || []).map((b) => (Store.get().lang === "en" ? b[1] : b[0]));
  Combo.attach(document.getElementById("qb-breed"), breedNames);
  // возраст: можно писать 1,5 и 1.5
  document.getElementById("qb-age").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^\d.,]/g, "");
  });
  bar.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(bar);
    ["name", "breed", "age"].forEach((k) => {
      let v = String(data.get(k) || "").trim();
      if (k === "age") v = v.replace(",", ".");
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
