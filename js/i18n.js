/* =========================================================
   Тексты сайта: RU / EN
   - Обычная строка: "текст"
   - Зависит от питомца: { dog: "...", cat: "..." }
   - С подстановкой: (v) => `... ${v.name} ...`
   В HTML: data-i18n="key" (текст), data-i18n-html (разметка),
           data-i18n-aria (aria-label), data-i18n-ph (placeholder)
   ========================================================= */
(function () {
  // выделение слова с «рукописным» подчёркиванием
  const HL = (w) =>
    `<span class="hl">${w}<svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path d="M4 13 C 70 5, 190 3, 296 11"/></svg></span>`;

  const DICT = {
    ru: {
      "meta.title": "Pawology — натуральное питание для собак и кошек в Тбилиси",

      "nav.menu": "Меню",
      "nav.meals": "Рационы",
      "nav.delivery": "Доставка",
      "nav.about": "О нас",
      "nav.faq": "FAQ",

      "cta.pick": "Подобрать рацион",
      "cta.start": "Начать подбор",

      "pet.question": "Для кого подбираем рацион?",
      "pet.dog": "Собака",
      "pet.cat": "Кошка",

      "hero.h1": "Pawology — натуральное питание для собак и кошек с доставкой по Тбилиси",
      "hero.title": "Натуральные рационы для кошек и собак",
      "hero.sub": "с доставкой по Тбилиси",
      "hero.promo": 'Скидка <span class="badge">−50%</span> на первый заказ',
      "pet.forDogs": "Для собак",
      "pet.forCats": "Для кошек",

      "intro.title": `Подберём рацион ${HL("именно для вашего")} питомца`,
      "intro.sub": "Ответьте на пару вопросов о питомце — и мы соберём рацион, который подойдёт именно ему.",
      "intro.note": "2 минуты · без регистрации",

      "benefits.title": `Почему это ${HL("удобно")}`,
      "benefits.sticker": "порционно и без хлопот",
      "benefits.1.t": "Натуральные ингредиенты",
      "benefits.1.d": "Понятный состав — без необходимости самостоятельно собирать рацион.",
      "benefits.2.t": "Готовые порции",
      "benefits.2.d": "Не нужно закупать продукты, считать граммы и готовить.",
      "benefits.3.t": "Подбор под питомца",
      "benefits.3.d": "Учитываем основные параметры питомца, когда подбираем рацион.",
      "benefits.4.t": "Доставка по Тбилиси",
      "benefits.4.d": "Привозим заказ прямо домой — никуда ехать не нужно.",

      "how.title": `Как работает ${HL("Pawology")}`,
      "how.1.t": "Подбираем рацион",
      "how.1.d": "Вы рассказываете немного о питомце, а мы подбираем подходящий вариант питания.",
      "how.2.t": "Оформляем заказ",
      "how.2.d": "Вы выбираете рацион и оформляете заказ — прямо здесь, на сайте.",
      "how.3.t": "Доставляем",
      "how.3.d": "Готовим ваш заказ — на это уходит около 5 дней — и привозим его домой по Тбилиси.",

      "footer.title": "Остались вопросы?",
      "footer.text": "Раздел FAQ скоро появится здесь. А пока — напишите нам, ответим.",
      "footer.ig": "Написать в Instagram",

      /* ---------- Квиз ---------- */
      "quiz.close": "Закрыть",
      "quiz.back": "Назад",
      "quiz.next": "Далее",
      "quiz.finish": "Посмотреть рацион",
      "quiz.order": "Оформить заказ",
      "quiz.step": (v) => `Шаг ${v.n} из ${v.total}`,
      "quiz.done": "Готово",

      "quiz.f.name": "Имя питомца",
      "quiz.f.breed": "Порода",
      "quiz.f.age": "Возраст",
      "quiz.f.ageYears": "Возраст, лет",
      "quiz.f.weight": "Вес",
      "quiz.unit.years": "лет",
      "quiz.unit.months": "мес",
      "quiz.unit.kg": "кг",

      "quiz.about.title": "Давайте знакомиться",
      "quiz.about.sub": { dog: "Пара слов о вашей собаке — и мы поймём, с чего начать.", cat: "Пара слов о вашей кошке — и мы поймём, с чего начать." },

      "quiz.health.title": (v) => (v.name ? `${v.name}: немного о здоровье` : "Немного о здоровье"),
      "quiz.health.sub": "Это поможет исключить то, что питомцу не подходит.",
      "quiz.f.sterilized": "Питомец стерилизован?",
      "quiz.opt.sterilized.yes": "Да",
      "quiz.opt.sterilized.no": "Нет",
      "quiz.f.allergies": "Есть ли аллергия?",
      "quiz.f.allergies.hint": "можно выбрать несколько",
      "quiz.opt.allergies.chicken": "Курица",
      "quiz.opt.allergies.beef": "Говядина",
      "quiz.opt.allergies.pumpkin": "Тыква",
      "quiz.opt.allergies.broccoli": "Брокколи",
      "quiz.opt.allergies.zucchini": "Кабачок",
      "quiz.opt.allergies.none": "Нет аллергии",

      "quiz.activity.title": (v) => (v.name ? `${v.name}: какой уровень активности?` : "Какой уровень активности?"),
      "quiz.activity.sub": "Выберите самое похожее — без осуждения 🙂",
      "quiz.opt.activity.low": "Низкий",
      "quiz.opt.activity.medium": "Средний",
      "quiz.opt.activity.high": "Высокий",
      "quiz.desc.activity.low": {
        dog: "Профессиональный диванный эксперт. Прогулка — до ближайших кустов и обратно.",
        cat: "Спит 20 часов в сутки, а оставшиеся 4 — отдыхает.",
      },
      "quiz.desc.activity.medium": {
        dog: "Пара прогулок в день, мячик — с удовольствием, но без фанатизма.",
        cat: "Охотится на мячики и ноги хозяев — строго по расписанию.",
      },
      "quiz.desc.activity.high": {
        dog: "Тренировки, хайкинг, аджилити. Отдыхает только во сне — и то не всегда.",
        cat: "Ночной паркур по шкафам и забеги в 3 часа ночи.",
      },

      "quiz.result.title": (v) => (v.name ? `Почти готово, ${v.name}!` : "Почти готово!"),
      "quiz.result.sub": "Скоро здесь появится подобранный рацион — с граммовкой и ценой.",
      "quiz.result.label": "Ваш рацион",
      "quiz.result.plan": { dog: "Рацион для собаки подбирается…", cat: "Рацион для кошки подбирается…" },
      "quiz.result.note": "Оформление заказа подключим на следующем этапе.",

      "breeds": {
        dog: ["Метис", "Лабрадор", "Французский бульдог", "Джек-рассел-терьер", "Шпиц", "Корги", "Бультерьер", "Такса", "Хаски", "Мальтипу", "Самоед", "Доберман"],
        cat: ["Беспородная", "Британская", "Шотландская вислоухая", "Мейн-кун", "Сфинкс", "Сиамская", "Бенгальская", "Персидская"],
      },
    },

    en: {
      "meta.title": "Pawology — natural food for dogs and cats in Tbilisi",

      "nav.menu": "Menu",
      "nav.meals": "Meals",
      "nav.delivery": "Delivery",
      "nav.about": "About us",
      "nav.faq": "FAQ",

      "cta.pick": "Find a meal plan",
      "cta.start": "Get started",

      "pet.question": "Who are we choosing for?",
      "pet.dog": "Dog",
      "pet.cat": "Cat",

      "hero.h1": "Pawology — natural food for dogs and cats, delivered across Tbilisi",
      "hero.title": "Natural meals for cats and dogs",
      "hero.sub": "delivered across Tbilisi",
      "hero.promo": '<span class="badge">−50%</span> off your first order',
      "pet.forDogs": "For dogs",
      "pet.forCats": "For cats",

      "intro.title": `A meal plan made ${HL("just for your")} pet`,
      "intro.sub": "Answer a few questions about your pet and we’ll put together a plan that suits them perfectly.",
      "intro.note": "2 minutes · no sign-up",

      "benefits.title": `Why it’s so ${HL("easy")}`,
      "benefits.sticker": "portioned, no fuss",
      "benefits.1.t": "Natural ingredients",
      "benefits.1.d": "A clear, simple recipe — no need to put a diet together yourself.",
      "benefits.2.t": "Ready portions",
      "benefits.2.d": "No grocery runs, no weighing grams, no cooking.",
      "benefits.3.t": "Tailored to your pet",
      "benefits.3.d": "We take your pet’s key details into account when choosing a plan.",
      "benefits.4.t": "Delivery in Tbilisi",
      "benefits.4.d": "We bring your order right to your door.",

      "how.title": `How ${HL("Pawology")} works`,
      "how.1.t": "We find the plan",
      "how.1.d": "Tell us a little about your pet and we’ll suggest the right meals.",
      "how.2.t": "You place the order",
      "how.2.d": "Choose your plan and check out — right here on the website.",
      "how.3.t": "We deliver",
      "how.3.d": "We prepare your order — it takes about 5 days — and bring it to your home in Tbilisi.",

      "footer.title": "Still have questions?",
      "footer.text": "Our FAQ is coming soon. Meanwhile, just drop us a message.",
      "footer.ig": "Message us on Instagram",

      "quiz.close": "Close",
      "quiz.back": "Back",
      "quiz.next": "Next",
      "quiz.finish": "See my plan",
      "quiz.order": "Place order",
      "quiz.step": (v) => `Step ${v.n} of ${v.total}`,
      "quiz.done": "Done",

      "quiz.f.name": "Pet’s name",
      "quiz.f.breed": "Breed",
      "quiz.f.age": "Age",
      "quiz.f.ageYears": "Age, years",
      "quiz.f.weight": "Weight",
      "quiz.unit.years": "yrs",
      "quiz.unit.months": "mos",
      "quiz.unit.kg": "kg",

      "quiz.about.title": "Nice to meet you",
      "quiz.about.sub": { dog: "A few words about your dog and we’ll know where to start.", cat: "A few words about your cat and we’ll know where to start." },

      "quiz.health.title": (v) => (v.name ? `${v.name}: a bit about health` : "A bit about health"),
      "quiz.health.sub": "This helps us leave out anything that doesn’t suit your pet.",
      "quiz.f.sterilized": "Is your pet spayed / neutered?",
      "quiz.opt.sterilized.yes": "Yes",
      "quiz.opt.sterilized.no": "No",
      "quiz.f.allergies": "Any allergies?",
      "quiz.f.allergies.hint": "pick as many as needed",
      "quiz.opt.allergies.chicken": "Chicken",
      "quiz.opt.allergies.beef": "Beef",
      "quiz.opt.allergies.pumpkin": "Pumpkin",
      "quiz.opt.allergies.broccoli": "Broccoli",
      "quiz.opt.allergies.zucchini": "Zucchini",
      "quiz.opt.allergies.none": "No allergies",

      "quiz.activity.title": (v) => (v.name ? `How active is ${v.name}?` : "How active is your pet?"),
      "quiz.activity.sub": "Pick the closest match — no judgement 🙂",
      "quiz.opt.activity.low": "Low",
      "quiz.opt.activity.medium": "Medium",
      "quiz.opt.activity.high": "High",
      "quiz.desc.activity.low": {
        dog: "A certified couch expert. A walk means to the nearest bush and back.",
        cat: "Sleeps 20 hours a day and spends the other 4 resting.",
      },
      "quiz.desc.activity.medium": {
        dog: "A couple of walks a day, happy to chase a ball — within reason.",
        cat: "Hunts toys and human ankles — strictly on schedule.",
      },
      "quiz.desc.activity.high": {
        dog: "Training, hiking, agility. Only rests while asleep — and not always then.",
        cat: "Night-time parkour across the wardrobes and 3 a.m. sprints.",
      },

      "quiz.result.title": (v) => (v.name ? `Almost there, ${v.name}!` : "Almost there!"),
      "quiz.result.sub": "Your matched meal plan — with portions and price — will appear here soon.",
      "quiz.result.label": "Your plan",
      "quiz.result.plan": { dog: "Choosing the plan for your dog…", cat: "Choosing the plan for your cat…" },
      "quiz.result.note": "Checkout will be connected in the next stage.",

      "breeds": {
        dog: ["Mixed breed", "Labrador", "French Bulldog", "Jack Russell Terrier", "Pomeranian", "Corgi", "Bull Terrier", "Dachshund", "Husky", "Maltipoo", "Samoyed", "Doberman"],
        cat: ["Mixed breed", "British Shorthair", "Scottish Fold", "Maine Coon", "Sphynx", "Siamese", "Bengal", "Persian"],
      },
    },
  };

  function t(key, vars) {
    const s = window.Store ? Store.get() : { lang: "ru", pet: "dog" };
    let v = DICT[s.lang][key];
    if (v === undefined) v = DICT.ru[key];
    if (v === undefined) return key;
    if (typeof v === "function") return v(vars || {});
    if (v && typeof v === "object" && !Array.isArray(v) && (v.dog || v.cat)) return v[s.pet] ?? v.dog;
    return v;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", t(el.dataset.i18nPh)); });
    if (root === document) {
      const s = Store.get();
      document.documentElement.lang = s.lang;
      document.title = t("meta.title");
      const dl = document.getElementById("breeds");
      if (dl) dl.innerHTML = t("breeds").map((b) => `<option value="${b}"></option>`).join("");
    }
  }

  window.I18n = { t, apply, HL };
  window.t = t;
})();
