/* =========================================================
   КОНФИГ КВИЗА — чтобы добавить/убрать вопрос, правьте только этот файл
   (+ тексты в i18n.js).

   Типы полей:
   - inputs  — группа текстовых/числовых полей (items: text | number)
   - choice  — один вариант из нескольких (кнопки в ряд)
   - multi   — несколько вариантов (чипсы с иконками); exclusive — «сбрасывающий» вариант
   - cards   — крупные карточки с описанием (один вариант); autoNext — сам листает дальше

   Тексты берутся по ключам:
   label  -> "quiz.f.<name>",  вариант -> "quiz.opt.<name>.<value>",
   описание варианта -> "quiz.desc.<name>.<value>"
   ========================================================= */
window.QUIZ_STEPS = [
  {
    id: "about",
    title: "quiz.about.title",
    sub: "quiz.about.sub",
    fields: [
      {
        type: "inputs",
        items: [
          { type: "text", name: "name", required: true, maxlength: 40 },
          { type: "text", name: "breed", list: "breeds", maxlength: 60 },
          { type: "number", name: "age", step: "0.5", units: { name: "ageUnit", options: ["years", "months"] } },
          { type: "number", name: "weight", step: "0.1", suffix: "quiz.unit.kg" },
        ],
      },
    ],
  },
  {
    id: "health",
    title: "quiz.health.title",
    sub: "quiz.health.sub",
    fields: [
      { type: "choice", name: "sterilized", options: [{ value: "yes" }, { value: "no" }] },
      {
        type: "multi",
        name: "allergies",
        hint: "quiz.f.allergies.hint",
        exclusive: "none",
        options: [
          { value: "chicken", icon: "🍗" },
          { value: "beef", icon: "🥩" },
          { value: "pumpkin", icon: "🎃" },
          { value: "broccoli", icon: "🥦" },
          { value: "zucchini", icon: "🥒" },
          { value: "none", icon: "🙌", wide: true },
        ],
      },
    ],
  },
  {
    id: "activity",
    title: "quiz.activity.title",
    sub: "quiz.activity.sub",
    fields: [
      {
        type: "cards",
        name: "activity",
        required: true,
        autoNext: true,
        options: [
          { value: "low", level: 1, icon: { dog: "🛋️", cat: "😴" } },
          { value: "medium", level: 2, icon: { dog: "🎾", cat: "🧶" } },
          { value: "high", level: 3, icon: { dog: "⛰️", cat: "⚡" } },
        ],
      },
    ],
  },
  // финальный экран — пока заглушка под будущий подбор рациона
  { id: "result", type: "result", title: "quiz.result.title", sub: "quiz.result.sub" },
];
