/* =========================================================
   Дополнительные товары (экран после формы заказа, перед отправкой).
   Чтобы поменять тексты или цену — правьте здесь.
   - img: файл из assets/img/extras/ без расширения (нет фото — покажется значок icon)
   - price: цена в лари (пока нет — строка с ценой не показывается);
     oldPrice — зачёркнутая цена, если нужна
   - colors: варианты цвета (у миски)
   - pets: кому показывать ("dog", "cat"); по умолчанию — всем
   ========================================================= */
window.EXTRAS = [
  {
    id: "icecream-apple", img: "icecream-apple-pie", icon: "🍨", pets: ["dog"],
    title: { ru: "Мороженое «Яблоко»", en: "Apple ice cream" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
  },
  {
    id: "icecream-blueberry", img: "icecream-vitamin-boost", icon: "🍨", pets: ["dog"],
    title: { ru: "Мороженое «Черника»", en: "Blueberry ice cream" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
  },
  {
    id: "icecream-3", icon: "🍨", pets: ["dog"],
    title: { ru: "Мороженое", en: "Ice cream" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
  },
  {
    id: "icecream-4", icon: "🍨", pets: ["dog"],
    title: { ru: "Мороженое", en: "Ice cream" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
  },
  {
    id: "soup-1", icon: "🥣",
    title: { ru: "Суп", en: "Soup" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
  },
  {
    id: "soup-2", icon: "🥣",
    title: { ru: "Суп", en: "Soup" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
  },
  {
    id: "bowl-slow", img: "bowl-slow", icon: "🥣",
    title: { ru: "Миска для медленного кормления", en: "Slow-feeding bowl" },
    sub: { ru: "Описание скоро добавим", en: "Description coming soon" },
    colors: [
      { id: "pink", hex: "#F4A3A3", title: { ru: "розовая", en: "pink" } },
      { id: "green", hex: "#A8D89A", title: { ru: "зелёная", en: "green" } },
    ],
  },
];
