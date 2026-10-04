# Pawology — лендинг (черновик v1)

Чистые HTML / CSS / JS, без сборки и без зависимостей.

## Как открыть
```bash
cd site && python3 -m http.server 5173
```
Затем открыть http://127.0.0.1:5173
Ссылки для рекламы: `?pet=cat` — сразу «кошачья» версия, `?lang=en` — английский.

## Структура
```
index.html            — разметка всех блоков
css/tokens.css        — цвета, шрифты, радиусы (тема собак/кошек)
css/base.css          — общие элементы: кнопки, поля, переключатель питомца
css/header.css        — шапка, меню, переключатель языка
css/hero.css          — Screen 1 (карточка, вордмарк, питомцы, анимации)
css/intro.css         — Screen 2 (заголовок + строка входа в квиз)
css/benefits.css, how.css, footer.css
css/quiz.css          — квиз
js/i18n.js            — ВСЕ тексты RU / EN
js/state.js           — состояние: питомец, язык, ответы квиза
js/quiz-steps.js      — КОНФИГ квиза: вопросы и варианты (правьте здесь)
js/quiz.js            — движок квиза (рендерит шаги из конфига)
js/hero.js, header.js, reveal.js, main.js
assets/img/           — изображения
```

## Как добавить вопрос в квиз
1. Добавить поле в нужный шаг в `js/quiz-steps.js` (типы: inputs, choice, multi, cards).
2. Добавить тексты в `js/i18n.js` (`quiz.f.<name>`, `quiz.opt.<name>.<value>`).

После правок CSS/JS увеличьте `?v=` у подключений в `index.html`, чтобы браузер не взял старую версию из кэша.
