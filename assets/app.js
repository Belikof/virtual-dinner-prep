(function () {
  'use strict';

  const STORAGE_KEY = 'dinner-prep-state';
  const SUBMITTED_KEY = 'dinner-submitted';
  const FINALE_SNAPSHOT_KEY = 'dinner-finale-snapshot';
  const FINALE_AUTO_MS = 1600;

  const FINALE_PERSONAL_LINES = [
    'Спасибо, что прошла всё это.',
    'До встречи!',
  ];
  const TOTAL_STEPS = 5;
  const FORMSUBMIT_EMAIL = 'belsta.nik@gmail.com';

  const WINDOW_TITLES = {
    1: 'welcome.html',
    2: 'evening_plan.txt',
    3: 'menu.exe',
    4: 'tasks.exe',
    5: 'order_final.txt',
  };

  const STEP_HUMAN = {
    1: 'Шаг 1 — Привет',
    2: 'Шаг 2 — Вечер',
    3: 'Шаг 3 — Меню',
    4: 'Шаг 4 — Задания',
    5: 'Шаг 5 — Итого',
  };

  const STEP_SHORT = ['Привет', 'Вечер', 'Меню', 'Задания', 'Итого'];

  const STEP_NAV = [
    { n: 1, label: 'привет', icon: '🏠' },
    { n: 2, label: 'вечер', icon: '⭐' },
    { n: 3, label: 'меню', icon: '💗' },
    { n: 4, label: 'задания', icon: '📁' },
    { n: 5, label: 'итого', icon: '✉️' },
  ];

  const MENU_ICONS = {
    sushi: ['🍣', '🍱', '🥢', '🍙', '🐟', '🦐', '🥒', '🍥'],
    pasta: ['🍝', '🍲', '🧀', '🍅', '🫒', '🥖'],
    pizza: ['🍕', '🧀', '🍅', '🫑', '🥓'],
    salads: ['🥗', '🥙', '🧀', '🫒', '🍅', '🥒'],
    hot: ['🥩', '🍖', '🐟', '🍗', '🦆', '🥘'],
    desserts: ['🍰', '🧁', '🍫', '🍮', '🍨', '🍪'],
    drinks: ['🍷', '🥂', '🍾', '🧃', '☕', '🍹', '🥤', '💧'],
  };

  const defaultTasks = () => ({
    candles: false,
    candlesNeedOrder: false,
    table: false,
    'order-review': false,
    mood: false,
  });

  const state = {
    step: 1,
    vibe: null,
    cart: {},
    openCategories: {},
    cartOpen: false,
    tasks: defaultTasks(),
    submitted: false,
    finale: false,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.vibe) state.vibe = saved.vibe;
      if (saved.cart) state.cart = saved.cart;
      if (saved.tasks) {
        state.tasks = { ...defaultTasks(), ...saved.tasks };
        if (saved.tasks.candlesOrdered) state.tasks.candlesNeedOrder = true;
      }
      if (saved.openCategories) state.openCategories = saved.openCategories;
      if (saved.cartOpen) state.cartOpen = saved.cartOpen;
      if (saved.step && saved.step >= 1 && saved.step <= TOTAL_STEPS) state.step = saved.step;
    } catch (_) {}
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: state.step,
        vibe: state.vibe,
        cart: state.cart,
        tasks: state.tasks,
        openCategories: state.openCategories,
        cartOpen: state.cartOpen,
      })
    );
  }

  function getNextSunday21MSK() {
    const now = Date.now();
    const tz = 'Europe/Moscow';

    for (let offset = 0; offset < 14; offset++) {
      const probe = new Date(now + offset * 86400000);
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(probe);
      if (weekday !== 'Sun') continue;

      const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(probe);
      const target = new Date(`${dateKey}T21:00:00+03:00`).getTime();
      if (target > now) return target;
    }

    return now + 7 * 86400000;
  }

  let targetTs = getNextSunday21MSK();
  const weekMs = 7 * 86400000;

  function updateDinnerMeter(diffMs) {
    const pct = Math.min(100, Math.max(4, 100 - (diffMs / weekMs) * 100));
    const main = $('#dinner-meter-fill');
    const widget = $('#widget-meter-fill');
    if (main) main.style.width = `${pct}%`;
    if (widget) widget.style.width = `${Math.min(pct + 10, 100)}%`;
  }

  function updateTaskbarClock() {
    const el = $('#taskbar-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function updateTimer() {
    const el = $('#countdown');
    if (!el) return;

    const now = Date.now();
    let diff = targetTs - now;

    if (diff <= 0) {
      targetTs = getNextSunday21MSK();
      diff = targetTs - now;
    }

    updateDinnerMeter(diff);

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);

    el.innerHTML = `
      <div class="flex gap-2 w-full">
        ${timerUnit(d, 'дн')}
        ${timerUnit(h, 'ч')}
        ${timerUnit(min, 'мин')}
        ${timerUnit(sec, 'сек')}
      </div>`;
  }

  function timerUnit(value, label) {
    return `
      <div class="timer-cell">
        <div class="timer-val">${String(value).padStart(2, '0')}</div>
        <div class="timer-lbl">${label}</div>
      </div>`;
  }

  function cartCount() {
    return Object.values(state.cart).reduce((s, q) => s + q, 0);
  }

  function cartLines() {
    const lines = [];
    const categories = window.MENU_CATEGORIES || [];
    for (const cat of categories) {
      for (const item of cat.items) {
        const q = state.cart[item.id];
        if (q) lines.push({ ...item, category: cat.title, qty: q });
      }
    }
    return lines;
  }

  function getVibeTitle() {
    const list = window.VIBE_OPTIONS || [];
    const v = list.find((x) => x.id === state.vibe);
    return v ? v.title : '—';
  }

  function pluralPositions(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'позиция';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'позиции';
    return 'позиций';
  }

  function prepTasksProgress() {
    const prep = activePrepTasks();
    let done = 0;
    for (const t of prep) {
      if (t.id === 'candles') {
        if (candlesReady()) done += 1;
      } else if (state.tasks[t.id]) {
        done += 1;
      }
    }
    return { done, total: prep.length };
  }

  function buildFinaleSnapshot() {
    const lines = cartLines();
    const names = lines.map((l) => l.name);
    const { done, total } = prepTasksProgress();
    return {
      vibeTitle: getVibeTitle(),
      cartCount: cartCount(),
      dishNames: names.slice(0, 3),
      dishExtra: Math.max(0, names.length - 3),
      tasksDone: allTasksDone(),
      tasksDoneCount: done,
      tasksTotal: total,
    };
  }

  function loadFinaleSnapshot() {
    try {
      const raw = sessionStorage.getItem(FINALE_SNAPSHOT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function formatFinaleCountdown() {
    const now = Date.now();
    let diff = targetTs - now;
    if (diff <= 0) {
      targetTs = getNextSunday21MSK();
      diff = targetTs - now;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const parts = [];
    if (d > 0) parts.push(`${d} дн`);
    parts.push(`${h} ч`);
    parts.push(`${min} мин`);
    return `До ужина осталось: ${parts.join(' ')}`;
  }

  let finaleCountdownTimer = null;
  let finaleAutoTimer = null;

  function startFinaleCountdown() {
    const el = $('#finale-countdown');
    if (!el) return;
    const tick = () => {
      el.textContent = formatFinaleCountdown();
    };
    tick();
    clearInterval(finaleCountdownTimer);
    finaleCountdownTimer = setInterval(tick, 1000);
  }

  function stopFinaleCountdown() {
    clearInterval(finaleCountdownTimer);
    finaleCountdownTimer = null;
  }

  function stepNavItem({ n, label, icon }, isMobile) {
    const active = n === state.step;
    const done = n < state.step;
    const canGo = done || active;
    const stateCls = active ? 'is-active' : done ? 'is-done' : 'is-locked';
    const mobileCls = isMobile ? 'shrink-0 !w-auto !inline-block' : '';
    return `
      <button type="button" data-goto-step="${n}" ${canGo ? '' : 'disabled'}
        class="step-nav-btn ${stateCls} ${mobileCls}">
        <span class="ql-icon" aria-hidden="true">${icon || '✨'}</span>
        ${label}
      </button>`;
  }

  function renderStepStrip() {
    const el = $('#step-strip');
    if (!el) return;
    const name = STEP_SHORT[state.step - 1] || '';
    el.innerHTML = `
      <div class="step-strip-head">
        <span class="step-strip-meta">Шаг ${state.step} из ${TOTAL_STEPS}</span>
        <span class="step-strip-name">${name}</span>
      </div>
      <div class="step-dots" role="presentation">
        ${STEP_SHORT.map((_, i) => {
          const n = i + 1;
          const cls = n === state.step ? 'active' : n < state.step ? 'done' : '';
          return `<span class="step-dot ${cls}"></span>`;
        }).join('')}
      </div>`;
  }

  function renderProgress() {
    const desktop = $('#step-nav');
    if (!desktop) return;
    const html = STEP_NAV.map((s) => stepNavItem(s, false)).join('');
    desktop.innerHTML = html;
    desktop.querySelectorAll('[data-goto-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = +btn.dataset.gotoStep;
        if (target <= state.step) showStep(target);
      });
    });
  }

  function updateChrome() {
    const title = $('#main-window-title');
    const human = $('#main-window-title-human');
    const tab = document.querySelector('.taskbar-tab[data-tab="main"]');
    const taskLabel = $('#taskbar-step-label');
    const tech = WINDOW_TITLES[state.step] || 'dinner.exe';
    const label = STEP_HUMAN[state.step] || tech;
    if (title) title.textContent = tech;
    if (human) human.textContent = label;
    if (tab) tab.textContent = tech;
    if (taskLabel) taskLabel.textContent = label;
    renderStepStrip();
  }

  function showStep(step) {
    state.step = step;
    if (step === 3) state.openCategories = {};
    saveState();
    document.body.classList.toggle('is-menu-step', step === 3);
    document.body.dataset.currentStep = String(step);
    $$('[data-step]').forEach((panel) => {
      const n = +panel.dataset.step;
      const active = n === step;
      panel.classList.toggle('hidden', !active);
      panel.hidden = !active;
    });

    const back = $('#btn-back');
    const next = $('#btn-next');
    const footer = $('#nav-footer');
    if (back) {
      const showBack = step > 1;
      back.classList.toggle('hidden', !showBack);
      back.hidden = !showBack;
    }
    if (next) {
      const showNext = step < TOTAL_STEPS;
      next.classList.toggle('hidden', !showNext);
      next.hidden = !showNext;
    }
    if (footer) {
      const showFooter = step > 1 && !state.submitted;
      footer.classList.toggle('hidden', !showFooter);
      footer.hidden = !showFooter;
    }

    updateChrome();
    renderProgress();
    try {
      if (step === 2) renderVibes();
      if (step === 3) renderMenu();
      if (step === 4) renderTasks();
      if (step === 5) renderSummary();
      renderCart();
    } catch (err) {
      console.error('render step failed', err);
    }
  }

  function candlesReady() {
    return state.tasks.candles || state.tasks.candlesNeedOrder;
  }

  function allTasksDone() {
    if (!candlesReady()) return false;
    if (!state.tasks.table) return false;
    if (!state.tasks.mood) return false;
    if (cartCount() > 0 && !state.tasks['order-review']) return false;
    return true;
  }

  function activePrepTasks() {
    return (window.PREP_TASKS || []).filter((t) => {
      if (t.onlyWithCart) return cartCount() > 0;
      return true;
    });
  }

  function menuItemIcon(catId, index) {
    const set = MENU_ICONS[catId] || ['🍽️'];
    return set[index % set.length];
  }

  function categoryIcon(catId) {
    return (MENU_ICONS[catId] || ['🍽️'])[0];
  }

  function renderTasks() {
    const root = $('#tasks-root');
    if (!root || !window.PREP_TASKS) return;

    root.innerHTML = activePrepTasks()
      .map((task) => {
        const done = state.tasks[task.id];
        const needOrder = task.id === 'candles' && state.tasks.candlesNeedOrder;
        const candlesBlock =
          task.id === 'candles'
            ? `
          <div class="task-actions mt-2">
            <button type="button" class="win-btn task-check-btn ${state.tasks.candles ? 'primary' : ''}" data-task-toggle="candles">
              ${state.tasks.candles ? '✓ Свечи есть' : 'Свечи есть'}
            </button>
            <button type="button" class="win-btn task-order-btn ${needOrder ? 'primary' : ''}" data-task-order="candles">
              ${needOrder ? '✓ Отмечено: заказать' : task.orderLabel}
            </button>
          </div>`
            : `
          <button type="button" class="win-btn task-check-btn mt-2 ${done ? 'primary' : ''}" data-task-toggle="${task.id}">
            ${done ? '✓ Готово' : 'Готово'}
          </button>`;

        return `
        <div class="prep-task win-inset mb-3 ${done || needOrder ? 'prep-task-done' : ''}">
          <div class="prep-task-head">
            ${(window.renderIcon || window.renderSticker || ((id) => id))(task.sticker || task.emoji)}
            <div>
              <p class="prep-task-title">${task.title}</p>
              ${task.desc ? `<p class="prep-task-desc">${task.desc}</p>` : ''}
            </div>
          </div>
          ${candlesBlock}
        </div>`;
      })
      .join('');

    root.querySelectorAll('[data-task-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.taskToggle;
        state.tasks[id] = !state.tasks[id];
        if (id === 'candles' && state.tasks.candles) state.tasks.candlesNeedOrder = false;
        saveState();
        renderTasks();
      });
    });

    root.querySelectorAll('[data-task-order]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tasks.candlesNeedOrder = true;
        state.tasks.candles = false;
        saveState();
        renderTasks();
      });
    });
  }

  function renderVibes() {
    const container = $('#vibe-cards');
    const outfitEl = $('#vibe-outfit');
    const vibes = window.VIBE_OPTIONS;
    if (!container || !vibes?.length) return;

    const icon = window.renderIcon || window.renderSticker;
    const fallbackIcon = (id) => {
      const em = { plushie: '🧸', bows: '🎀', bubbletea: '🧋' };
      return `<span class="emoji-sticker" aria-hidden="true">${em[id] || id || '✨'}</span>`;
    };
    const draw = icon || fallbackIcon;

    container.innerHTML = `
      <div class="vibe-pick-grid">
        ${vibes.map((v) => {
          const selected = state.vibe === v.id;
          return `
          <button type="button" data-vibe="${v.id}" class="vibe-pick-card ${selected ? 'selected' : ''}">
            ${draw(v.pickSticker || v.pickEmoji)}
            <span class="vibe-pick-label">${v.title}</span>
          </button>`;
        }).join('')}
      </div>`;

    container.querySelectorAll('[data-vibe]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.vibe = btn.dataset.vibe;
        saveState();
        renderVibes();
      });
    });

    if (outfitEl) {
      const selected = vibes.find((x) => x.id === state.vibe);
      if (selected) {
        outfitEl.classList.remove('hidden');
        outfitEl.innerHTML = `
          <div class="win outfit-settings-win">
            <div class="win-title">
              <span class="win-title-text">evening_setup.exe — настройки вечера</span>
              <div class="win-controls desktop-only"><span class="win-ctrl">×</span></div>
            </div>
            <div class="win-body inset outfit-settings-body">
              <p class="outfit-settings-tag">✓ вайб выбран</p>
              <div class="outfit-sticker-row">
                ${(selected.outfitStickers || selected.outfitEmojis || []).map((e) => draw(e)).join('')}
              </div>
              <p class="outfit-sticker-caption">${selected.outfitLine || ''}</p>
            </div>
          </div>`;
      } else {
        outfitEl.classList.add('hidden');
        outfitEl.innerHTML = '';
      }
    }
  }

  function renderMenu() {
    const root = $('#menu-root');
    const categories = window.MENU_CATEGORIES;
    if (!root || !categories?.length) return;

    const icon = window.renderIcon || window.renderSticker || ((id) => id);

    root.innerHTML = categories.map((cat) => {
      const open = !!state.openCategories[cat.id];
      return `
        <div class="win menu-cat mb-2" data-cat="${cat.id}">
          <button type="button" class="cat-head accordion-btn" aria-expanded="${open}">
            <span class="cat-head-inner">${icon(categoryIcon(cat.id))}<span>${cat.title}</span></span>
            <span class="accordion-icon font-bold text-lg leading-none ${open ? 'rotate-45 inline-block' : ''}">+</span>
          </button>
          <div class="accordion-body win-body inset flush ${open ? '' : 'hidden'}">
            ${cat.items.map((item, i) => menuItemCard(item, cat.id, i)).join('')}
          </div>
        </div>`;
    }).join('');

    root.querySelectorAll('.accordion-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.menu-cat');
        const catId = wrap?.dataset.cat;
        const body = btn.nextElementSibling;
        const icon = btn.querySelector('.accordion-icon');
        const isHidden = body.classList.toggle('hidden');
        const isOpen = !isHidden;
        if (catId) state.openCategories[catId] = isOpen;
        btn.setAttribute('aria-expanded', isOpen);
        icon?.classList.toggle('rotate-45', isOpen);
        if (isOpen) btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        saveState();
      });
    });

    root.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.dataset.add);
      });
    });

    root.querySelectorAll('[data-qty-change]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.qtyChange;
        const delta = +btn.dataset.delta;
        setQty(id, (state.cart[id] || 0) + delta);
      });
    });
  }

  function menuItemCard(item, catId, index) {
    const qty = state.cart[item.id] || 0;
    const icon = window.renderIcon || window.renderSticker || ((id) => id);
    return `
      <div class="menu-item">
        ${icon(menuItemIcon(catId, index))}
        <div class="flex-1 min-w-0">
          <div class="menu-item-name">${item.name}</div>
          <div class="menu-item-desc">${item.desc}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${
            qty > 0
              ? `
            <button type="button" data-qty-change="${item.id}" data-delta="-1" class="win-btn py-1 px-2">−</button>
            <span class="w-6 text-center font-bold tabular-nums text-sm">${qty}</span>
            <button type="button" data-qty-change="${item.id}" data-delta="1" class="win-btn py-1 px-2">+</button>`
              : `
            <button type="button" data-add="${item.id}" class="win-btn primary py-1 px-2">
              + заказ
            </button>`
          }
        </div>
      </div>`;
  }

  function addToCart(id) {
    setQty(id, (state.cart[id] || 0) + 1);
  }

  function setQty(id, qty) {
    if (qty <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(99, qty);
    saveState();
    if (state.step === 3) renderMenu();
    renderCart();
    if (state.step === 5) renderSummary();
  }

  function applyCartUI() {
    const panel = $('#cart-panel');
    const dock = document.querySelector('.cart-dock');
    const panelOpen = state.step === 3 && state.cartOpen;
    panel?.classList.toggle('hidden', !panelOpen);
    panel?.classList.toggle('open', panelOpen);
    dock?.classList.toggle('cart-open', panelOpen);
  }

  function setCartOpen(open) {
    state.cartOpen = open;
    applyCartUI();
    saveState();
  }

  function renderCart() {
    const bar = $('#cart-bar');
    const sheet = $('#cart-sheet');
    if (!bar) return;

    const count = cartCount();
    const onMenu = state.step === 3;
    bar.classList.toggle('hidden', !onMenu);
    bar.hidden = !onMenu;

    const countEl = $('#cart-count');
    if (countEl) countEl.textContent = count;

    applyCartUI();

    if (!sheet) return;
    const lines = cartLines();
    if (lines.length === 0) {
      sheet.innerHTML = '<p class="text-meta py-2">пусто</p>';
      return;
    }

    sheet.innerHTML = lines
      .map(
        (line) => `
      <div class="flex items-center justify-between gap-2 py-2 border-b border-dotted border-[#ccc] last:border-0">
        <div class="min-w-0">
          <div class="text-xs font-bold truncate">${line.name}</div>
          <div class="text-caption">${line.category}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" class="cart-delta win-btn py-0 px-2 text-xs" data-id="${line.id}" data-delta="-1">−</button>
          <span class="w-5 text-center text-xs font-bold tabular-nums">${line.qty}</span>
          <button type="button" class="cart-delta win-btn py-0 px-2 text-xs" data-id="${line.id}" data-delta="1">+</button>
        </div>
      </div>`
      )
      .join('');

    sheet.querySelectorAll('.cart-delta').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setQty(btn.dataset.id, (state.cart[btn.dataset.id] || 0) + +btn.dataset.delta);
      });
    });
  }

  function renderSummary() {
    const vibeEl = $('#summary-vibe');
    const orderEl = $('#summary-order');
    const tasksEl = $('#summary-tasks');
    const submitBtn = $('#btn-submit');

    if (vibeEl) vibeEl.textContent = getVibeTitle();

    if (tasksEl) {
      tasksEl.innerHTML = allTasksDone()
        ? '<p class="summary-tasks-ok">✓ Все задания выполнены успешно</p>'
        : '<p class="summary-tasks-warn">Отметь все задания на прошлом шаге</p>';
    }

    const lines = cartLines();
    if (orderEl) {
      orderEl.innerHTML =
        lines.length === 0
          ? '<p class="text-[#888]">Ничего не выбрано</p>'
          : `<ul class="space-y-1 m-0 p-0 list-none">${lines
              .map(
                (l) =>
                  `<li class="flex justify-between gap-2 text-xs"><span>${l.name}</span><span class="text-[#ff66b2] tabular-nums">× ${l.qty}</span></li>`
              )
              .join('')}</ul>`;
    }

    if (submitBtn) {
      submitBtn.disabled = !state.vibe || lines.length === 0;
    }
  }

  function buildOrderText() {
    return cartLines()
      .map((l) => `${l.name} — ${l.qty} шт. (${l.category})`)
      .join('\n');
  }

  function buildTasksText() {
    return activePrepTasks()
      .map((t) => {
        if (t.id === 'candles') {
          if (state.tasks.candles) return `${t.title}: есть`;
          if (state.tasks.candlesNeedOrder) return `${t.title}: нужно заказать`;
          return `${t.title}: не отмечено`;
        }
        return `${t.title}: ${state.tasks[t.id] ? 'готово' : 'не отмечено'}`;
      })
      .join('\n');
  }

  function setDeliveryModal(mode) {
    const modal = $('#delivery-modal');
    const status = modal?.querySelector('.delivery-status');
    const done = modal?.querySelector('.delivery-done');
    if (!modal) return;

    if (mode === 'hidden') {
      modal.classList.remove('is-leaving');
      modal.classList.add('hidden');
      return;
    }
    modal.classList.remove('hidden', 'is-leaving');
    status?.classList.toggle('hidden', mode !== 'sending');
    done?.classList.toggle('hidden', mode !== 'done');
  }

  function finishOrderAfterSubmit(emailSent) {
    state.submitted = true;
    try {
      sessionStorage.setItem(FINALE_SNAPSHOT_KEY, JSON.stringify(buildFinaleSnapshot()));
      sessionStorage.setItem(SUBMITTED_KEY, '1');
    } catch (_) {}
    localStorage.removeItem(STORAGE_KEY);
    setDeliveryModal('done');
    $('#nav-footer')?.classList.add('hidden');
    $('#cart-bar')?.classList.add('hidden');
    if (!emailSent) console.warn('dinner.exe: письмо на FormSubmit не ушло — проверь FORMSUBMIT_EMAIL');
    scheduleFinaleAfterDelivery();
  }

  function scheduleFinaleAfterDelivery() {
    clearTimeout(finaleAutoTimer);
    finaleAutoTimer = setTimeout(() => {
      finaleAutoTimer = null;
      showFinaleScreen();
    }, FINALE_AUTO_MS);
  }

  async function submitOrder() {
    if (!state.vibe || cartCount() === 0) return;

    const btn = $('#btn-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Отправка…';
    }

    setDeliveryModal('sending');

    const formData = new FormData();
    formData.append('_subject', 'Ужин: выбор Сони');
    formData.append('_template', 'table');
    formData.append('_captcha', 'false');
    formData.append('Вайб', getVibeTitle());
    formData.append('Заказ', buildOrderText());
    formData.append('Задания', buildTasksText());
    formData.append('Нужно заказать свечи', state.tasks.candlesNeedOrder ? 'да' : 'нет');
    formData.append('Всего позиций', String(cartCount()));

    let emailSent = false;
    const emailConfigured =
      FORMSUBMIT_EMAIL && FORMSUBMIT_EMAIL !== 'YOUR_EMAIL@example.com' && FORMSUBMIT_EMAIL.includes('@');

    if (emailConfigured) {
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(FORMSUBMIT_EMAIL)}`, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('submit failed');
        emailSent = true;
      } catch (e) {
        console.warn('FormSubmit error', e);
      }
    }

    finishOrderAfterSubmit(emailSent);
  }

  function showFinaleScreen() {
    const screen = $('#finale-screen');
    if (screen && !screen.classList.contains('hidden') && screen.classList.contains('is-visible')) return;

    clearTimeout(finaleAutoTimer);
    finaleAutoTimer = null;

    const modal = $('#delivery-modal');
    const runShow = () => {
      setDeliveryModal('hidden');
      $('#nav-footer')?.classList.add('hidden');
      $('#cart-bar')?.classList.add('hidden');
      state.finale = true;
      const snapshot = loadFinaleSnapshot();
      if (typeof window.showFinale === 'function') {
        window.showFinale({
          snapshot,
          personalLines: FINALE_PERSONAL_LINES,
        });
      }
      startFinaleCountdown();
    };

    if (modal && !modal.classList.contains('hidden')) {
      modal.classList.add('is-leaving');
      setTimeout(runShow, 420);
      return;
    }
    runShow();
  }

  function bindEvents() {
    $('#btn-start')?.addEventListener('click', () => {
      if (typeof window.showMiniGame === 'function') {
        window.showMiniGame('memory', () => showStep(2));
      } else {
        showStep(2);
      }
    });

    $('#btn-back')?.addEventListener('click', () => {
      if (state.step > 1) showStep(state.step - 1);
    });

    $('#btn-next')?.addEventListener('click', () => {
      if (state.step === 2 && !state.vibe) {
        $('#vibe-hint')?.classList.remove('hidden');
        return;
      }
      $('#vibe-hint')?.classList.add('hidden');

      if (state.step === 3 && cartCount() === 0) {
        alert('Добавь хотя бы одно блюдо в заказ');
        return;
      }

      if (state.step === 4 && !allTasksDone()) {
        $('#tasks-hint')?.classList.remove('hidden');
        const hint = $('#tasks-hint');
        if (hint) hint.textContent = 'Отметь все задания, потом «Далее»';
        return;
      }
      $('#tasks-hint')?.classList.add('hidden');

      if (state.step === 3) {
        if (typeof window.showMiniGame === 'function') {
          window.showMiniGame('crypto', () => showStep(4));
        } else {
          showStep(4);
        }
        return;
      }

      if (state.step < TOTAL_STEPS) showStep(state.step + 1);
    });

    $('#btn-submit')?.addEventListener('click', submitOrder);

    $('#cart-toggle')?.addEventListener('click', () => {
      setCartOpen(!state.cartOpen);
    });

    $('#cart-close')?.addEventListener('click', () => {
      setCartOpen(false);
    });
  }

  function init() {
    loadState();
    bindEvents();
    updateTimer();
    updateTaskbarClock();
    setInterval(updateTimer, 1000);
    setInterval(updateTaskbarClock, 30000);
    let wasSubmitted = false;
    try {
      wasSubmitted = sessionStorage.getItem(SUBMITTED_KEY) === '1';
    } catch (_) {}
    if (state.submitted || wasSubmitted) {
      showFinaleScreen();
    } else {
      showStep(state.step);
    }
    renderCart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
