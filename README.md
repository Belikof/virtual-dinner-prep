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

1. Создай репозиторий на GitHub.
2. Залей содержимое этой папки.
3. Settings → Pages → Source: **main** / **root** (или `/docs`, если положишь сайт в `docs/`).
4. Сайт будет по адресу `https://<username>.github.io/<repo>/`.

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
