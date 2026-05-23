# Подготовка к виртуальному ужину

Статический сайт для Сони: вайб, меню, отправка заказа на почту Никиты.

## Настройка перед деплоем

1. **Email для FormSubmit** — в `assets/app.js` замени строку:

   ```js
   const FORMSUBMIT_EMAIL = 'belsta.nik@gmail.com';
   ```

   на свой реальный email.

2. При первой отправке FormSubmit пришлёт письмо с подтверждением — нужно один раз перейти по ссылке.

## GitHub Pages

Сайт: **https://belikof.github.io/virtual-dinner-prep/**

Репозиторий: https://github.com/Belikof/virtual-dinner-prep — ветка `main`, корень репо.

## Локально

Открой `index.html` в браузере или:

```bash
cd /Users/nikitabelikov/Projects/virtual-dinner-prep
python3 -m http.server 8080
```

Затем `http://localhost:8080`.

## Структура

- `index.html` — разметка, Tailwind CDN
- `assets/menu.js` — меню и вайбы
- `assets/app.js` — логика, таймер, корзина, отправка

Таймер считает до **ближайшего воскресенья 21:00** (часовой пояс `Europe/Moscow`).
