(function () {
  'use strict';

  const MEMORY_PAIRS = [
    { id: 'sushi', emoji: '🍣', label: 'суши' },
    { id: 'pizza', emoji: '🍕', label: 'пицца' },
    { id: 'cake', emoji: '🍰', label: 'десерт' },
    { id: 'wine', emoji: '🍷', label: 'вино' },
    { id: 'pasta', emoji: '🍝', label: 'паста' },
  ];

  const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const CRYPTO_PLAIN = 'AKUSUKAKAMU';
  const CRYPTO_KEY = 'BARNAUL';
  const CRYPTO_CIPHER = vigenereLatin(CRYPTO_PLAIN, CRYPTO_KEY, false);
  const CRYPTO_READABLE = 'Aku suka kamu';
  const CRYPTO_HINTS = [
    'Лучший город на земле',
    'Наши первые обои в чате',
    'Начинается на B',
  ];
  const TRANSLATION_OK = [
    'ты мне нравишься',
    'мне ты нравишься',
    'ты мне очень нравишься',
    'мне очень нравишься ты',
    'мне ты очень нравишься',
    'ты очень мне нравишься',
    'нравишься мне ты',
    'мне нравишься ты',
  ];
  const TRANSLATE_HINTS = [
    { type: 'flag' },
    { type: 'text', text: 'Я использовал этот язык в первом шифре для тебя' },
  ];

  const TITLES = {
    memory: 'menu_match.exe',
    crypto: 'crypto_museum.exe',
  };

  function normalizeLatin(str) {
    return String(str).toUpperCase().replace(/[^A-Z]/g, '');
  }

  function normalizeRuInput(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/ё/g, 'е')
      .replace(/[^а-я\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  function vigenereLatin(text, key, decode) {
    const k = normalizeLatin(key);
    if (!k) return '';
    let ki = 0;
    return normalizeLatin(text)
      .split('')
      .map((ch) => {
        const i = LATIN.indexOf(ch);
        if (i < 0) return '';
        const ks = LATIN.indexOf(k[ki % k.length]);
        ki += 1;
        const next = decode ? (i - ks + 26) % 26 : (i + ks) % 26;
        return LATIN[next];
      })
      .join('');
  }

  function translationMatches(input) {
    const n = normalizeRuInput(input);
    return TRANSLATION_OK.some((a) => n === a);
  }

  let activeCleanup = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return (root || document).querySelectorAll(sel);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function closeModal() {
    const modal = $('#minigame-modal');
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }
    if (modal) modal.classList.add('hidden');
  }

  function setProgress(fillEl, score, target) {
    if (!fillEl) return;
    fillEl.style.width = `${clamp((score / target) * 100, 0, 100)}%`;
  }

  function clearAllTimers(list) {
    list.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    list.length = 0;
  }

  function runMemory(body, onComplete) {
    let first = null;
    let lock = true;
    let matched = 0;
    let moves = 0;
    let streak = 0;
    let done = false;
    const timers = [];

    const deck = shuffle(
      MEMORY_PAIRS.flatMap((p) => [
        { uid: `${p.id}-a`, pairId: p.id, emoji: p.emoji, label: p.label },
        { uid: `${p.id}-b`, pairId: p.id, emoji: p.emoji, label: p.label },
      ])
    );

    body.innerHTML = `
      <p class="minigame-hint" id="memory-hint">Запомни карточки…</p>
      <div class="memory-stats">
        <p class="minigame-score" id="mg-score">Пары: 0 / ${MEMORY_PAIRS.length}</p>
        <p class="memory-moves" id="memory-moves">Ходы: 0</p>
      </div>
      <div class="minigame-progress" aria-hidden="true">
        <div class="minigame-progress-fill" id="mg-fill" style="width:0%"></div>
      </div>
      <p class="memory-toast hidden" id="memory-toast" aria-live="polite"></p>
      <div class="memory-grid" id="memory-grid" role="application" aria-label="Найди пары"></div>
      <div class="minigame-actions">
        <p class="mg-done-msg hidden" id="mg-done">Все пары найдены ✨</p>
        <button type="button" class="win-btn primary cta-big hidden" id="mg-continue">Далее →</button>
      </div>`;

    const grid = $('#memory-grid', body);
    const scoreEl = $('#mg-score', body);
    const movesEl = $('#memory-moves', body);
    const fillEl = $('#mg-fill', body);
    const hintEl = $('#memory-hint', body);
    const toastEl = $('#memory-toast', body);
    const doneMsg = $('#mg-done', body);
    const continueBtn = $('#mg-continue', body);

    grid.innerHTML = deck
      .map(
        (card) => `
      <button type="button" class="memory-card" data-uid="${card.uid}" data-pair="${card.pairId}" aria-label="${card.label}">
        <span class="memory-card-inner">
          <span class="memory-face memory-back" aria-hidden="true">
            <span class="memory-back-mark">menu</span>
          </span>
          <span class="memory-face memory-front" aria-hidden="true">
            <span class="memory-emoji">${card.emoji}</span>
            <span class="memory-label">${card.label}</span>
          </span>
        </span>
      </button>`
      )
      .join('');

    function showToast(text) {
      if (!toastEl) return;
      toastEl.textContent = text;
      toastEl.classList.remove('hidden');
      toastEl.classList.add('is-show');
      timers.push(
        setTimeout(() => {
          toastEl.classList.remove('is-show');
          timers.push(setTimeout(() => toastEl.classList.add('hidden'), 280));
        }, 1100)
      );
    }

    function updateHud() {
      if (scoreEl) scoreEl.textContent = `Пары: ${matched} / ${MEMORY_PAIRS.length}`;
      if (movesEl) movesEl.textContent = `Ходы: ${moves}`;
      setProgress(fillEl, matched, MEMORY_PAIRS.length);
    }

    function finish() {
      done = true;
      lock = true;
      if (hintEl) hintEl.textContent = `Готово за ${moves} ходов — молодец!`;
      showToast('Идеально!');
      doneMsg?.classList.remove('hidden');
      continueBtn?.classList.remove('hidden');
      grid?.classList.add('memory-done');
    }

    function runPreview() {
      const cards = $$('.memory-card', grid);
      cards.forEach((c) => c.classList.add('is-flipped', 'is-preview'));
      timers.push(
        setTimeout(() => {
          cards.forEach((c) => {
            c.classList.remove('is-flipped', 'is-preview');
          });
          lock = false;
          if (hintEl) hintEl.textContent = 'Открой две карточки — найди все пары';
        }, 2400)
      );
    }

    function tryMatch() {
      const cards = $$('.memory-card.is-flipped:not(.is-matched)', grid);
      if (cards.length < 2) return;
      lock = true;
      const [a, b] = cards;
      if (a.dataset.pair === b.dataset.pair) {
        setTimeout(() => {
          a.classList.add('is-matched');
          b.classList.add('is-matched');
          matched += 1;
          streak += 1;
          updateHud();
          if (streak >= 2) showToast(streak >= 3 ? 'Супер серия!' : 'Отлично!');
          first = null;
          lock = false;
          if (matched >= MEMORY_PAIRS.length) finish();
        }, 380);
      } else {
        streak = 0;
        a.classList.add('is-wrong');
        b.classList.add('is-wrong');
        setTimeout(() => {
          a.classList.remove('is-flipped', 'is-wrong');
          b.classList.remove('is-flipped', 'is-wrong');
          first = null;
          lock = false;
        }, 820);
      }
    }

    grid.querySelectorAll('.memory-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (done || lock || btn.classList.contains('is-matched') || btn.classList.contains('is-flipped')) return;
        btn.classList.add('is-flipped');
        if (!first) {
          first = btn;
          return;
        }
        if (first === btn) return;
        moves += 1;
        updateHud();
        tryMatch();
      });
    });

    updateHud();
    runPreview();

    continueBtn?.addEventListener('click', () => {
      closeModal();
      onComplete();
    });

    return () => clearAllTimers(timers);
  }

  function runCrypto(body, onComplete) {
    let done = false;
    let cipherDone = false;
    let hintStep = 0;
    let translateHintStep = 0;

    body.innerHTML = `
      <div id="crypto-phase-cipher">
        <p class="minigame-hint crypto-vigenere-note">Используется шифр Виженера</p>
        <p class="crypto-label">Зашифровано:</p>
        <div class="crypto-cipher win-inset" id="crypto-cipher"></div>
        <p class="crypto-label">Ключ <span class="crypto-label-sub">(введи слово)</span></p>
        <input type="text" class="crypto-key-input win-inset" id="crypto-key" placeholder="слово латиницей" autocomplete="off" spellcheck="false" />
        <p class="crypto-label">Расшифровка:</p>
        <div class="crypto-decoded win-inset" id="crypto-decoded" aria-live="polite">···</div>
        <p class="crypto-hint-text hidden" id="crypto-hint"></p>
        <div class="crypto-actions-row crypto-actions-spaced">
          <button type="button" class="win-btn" id="crypto-hint-btn">Подсказка</button>
          <button type="button" class="win-btn primary" id="crypto-cipher-ok">Расшифровала →</button>
        </div>
      </div>
      <div id="crypto-phase-translate" class="hidden">
        <div class="crypto-id-phrase win-inset" id="crypto-id-phrase"></div>
        <div class="crypto-translate-hint hidden" id="crypto-translate-hint" aria-live="polite"></div>
        <div class="crypto-answer-win win-inset">
          <p class="crypto-answer-label">Введи, что получилось:</p>
          <input type="text" class="crypto-translate-input" id="crypto-translate" placeholder="" autocomplete="off" />
        </div>
        <p class="crypto-translate-err hidden" id="crypto-translate-err">Пока не то — попробуй ещё</p>
        <div class="crypto-translate-play" id="crypto-translate-play">
          <div class="crypto-actions-row crypto-actions-spaced">
            <button type="button" class="win-btn" id="crypto-translate-hint-btn">Подсказка</button>
            <button type="button" class="win-btn primary" id="crypto-translate-ok">Готово →</button>
          </div>
        </div>
        <div class="crypto-thanks hidden" id="crypto-thanks">
          <div class="crypto-thanks-sticker" aria-hidden="true">${typeof window.renderIcon === 'function' ? window.renderIcon('heartAngel') : '💗'}</div>
          <p class="crypto-thanks-row"><span>Спасибо</span><span class="crypto-thanks-sep">·</span><span>И ты мне</span></p>
        </div>
      </div>
      <div class="minigame-actions">
        <button type="button" class="win-btn primary cta-big hidden" id="mg-continue">К заданиям →</button>
      </div>`;

    const phaseCipher = $('#crypto-phase-cipher', body);
    const phaseTranslate = $('#crypto-phase-translate', body);
    const cipherEl = $('#crypto-cipher', body);
    const decodedEl = $('#crypto-decoded', body);
    const keyInput = $('#crypto-key', body);
    const idPhrase = $('#crypto-id-phrase', body);
    const hintEl = $('#crypto-hint', body);
    const hintBtn = $('#crypto-hint-btn', body);
    const cipherOkBtn = $('#crypto-cipher-ok', body);
    const translateInput = $('#crypto-translate', body);
    const translateErr = $('#crypto-translate-err', body);
    const translateOkBtn = $('#crypto-translate-ok', body);
    const translateHintBtn = $('#crypto-translate-hint-btn', body);
    const translateHintEl = $('#crypto-translate-hint', body);
    const translatePlay = $('#crypto-translate-play', body);
    const thanksEl = $('#crypto-thanks', body);
    const continueBtn = $('#mg-continue', body);
    if (cipherEl) cipherEl.textContent = CRYPTO_CIPHER;

    function decodeNow() {
      return vigenereLatin(CRYPTO_CIPHER, keyInput?.value || '', true);
    }

    function isCipherSolved() {
      return normalizeLatin(decodeNow()) === normalizeLatin(CRYPTO_PLAIN);
    }

    function renderDecode() {
      const key = keyInput?.value || '';
      const raw = decodeNow();
      const ok = isCipherSolved();
      if (decodedEl) {
        if (!normalizeLatin(key)) {
          decodedEl.textContent = '···';
          decodedEl.classList.remove('is-solved', 'is-wrong');
        } else if (ok) {
          decodedEl.textContent = CRYPTO_READABLE;
          decodedEl.classList.add('is-solved');
          decodedEl.classList.remove('is-wrong');
        } else {
          decodedEl.textContent = raw;
          decodedEl.classList.remove('is-solved');
        }
      }
      cipherOkBtn?.classList.toggle('primary', ok);
    }

    function lockCipherUi() {
      hintBtn.disabled = true;
      cipherOkBtn.disabled = true;
      keyInput.disabled = true;
    }

    function showTranslatePhase() {
      cipherDone = true;
      lockCipherUi();
      phaseCipher?.classList.add('hidden');
      phaseTranslate?.classList.remove('hidden');
      if (idPhrase) idPhrase.textContent = CRYPTO_READABLE;
      translateInput?.focus();
    }

    function showTranslateHint() {
      const i = Math.min(translateHintStep, TRANSLATE_HINTS.length - 1);
      const h = TRANSLATE_HINTS[i];
      if (!translateHintEl || !h) return;
      translateHintEl.classList.remove('hidden');
      if (h.type === 'flag') {
        translateHintEl.innerHTML = '<span class="crypto-flag" aria-hidden="true">🇮🇩</span>';
      } else {
        translateHintEl.textContent = h.text;
      }
      translateHintStep += 1;
      if (translateHintStep >= TRANSLATE_HINTS.length) translateHintBtn.disabled = true;
    }

    function showThanks() {
      done = true;
      translateOkBtn.disabled = true;
      translateHintBtn.disabled = true;
      translateInput.disabled = true;
      translatePlay?.classList.add('hidden');
      translateErr?.classList.add('hidden');
      thanksEl?.classList.remove('hidden');
      continueBtn?.classList.remove('hidden');
    }

    keyInput?.addEventListener('input', renderDecode);

    hintBtn?.addEventListener('click', () => {
      const i = Math.min(hintStep, CRYPTO_HINTS.length - 1);
      if (hintEl) {
        hintEl.textContent = CRYPTO_HINTS[i];
        hintEl.classList.remove('hidden');
      }
      hintStep += 1;
      if (hintStep >= CRYPTO_HINTS.length) hintBtn.disabled = true;
    });

    cipherOkBtn?.addEventListener('click', () => {
      if (done || cipherDone) return;
      if (isCipherSolved()) {
        showTranslatePhase();
        return;
      }
      decodedEl?.classList.add('is-wrong');
      setTimeout(() => decodedEl?.classList.remove('is-wrong'), 450);
      if (hintStep < CRYPTO_HINTS.length) hintBtn?.classList.add('crypto-hint-pulse');
    });

    translateOkBtn?.addEventListener('click', () => {
      if (done || !cipherDone) return;
      const val = translateInput?.value || '';
      if (translationMatches(val)) {
        translateErr?.classList.add('hidden');
        showThanks();
        return;
      }
      translateErr?.classList.remove('hidden');
      translateInput?.classList.add('is-wrong');
      setTimeout(() => translateInput?.classList.remove('is-wrong'), 450);
    });

    translateHintBtn?.addEventListener('click', showTranslateHint);

    translateInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') translateOkBtn?.click();
    });

    continueBtn?.addEventListener('click', () => {
      closeModal();
      onComplete();
    });

    renderDecode();
    return () => {};
  }


  function showMiniGame(id, onComplete) {
    const modal = $('#minigame-modal');
    const title = $('#minigame-title');
    const body = $('#minigame-body');
    if (!modal || !body) {
      onComplete();
      return;
    }

    closeModal();
    if (title) title.textContent = TITLES[id] || 'game.exe';
    body.innerHTML = '';
    modal.classList.remove('hidden');

    if (id === 'memory') activeCleanup = runMemory(body, onComplete);
    else if (id === 'crypto') activeCleanup = runCrypto(body, onComplete);
    else {
      closeModal();
      onComplete();
    }
  }

  const FINALE_FLOAT_KEYS = ['heart', 'heartAngel', 'star', 'bow', 'wingSparkle', 'bubbletea', 'heartPurple'];

  function buildFinaleFloats() {
    const render = typeof window.renderIcon === 'function' ? window.renderIcon : (id) => '✨';
    return FINALE_FLOAT_KEYS.map((key, i) => {
      const left = 6 + (i * 13) % 86;
      const dur = 14 + (i % 5) * 2;
      const delay = -(i * 2.1);
      return `<span class="finale-float-item" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s">${render(key)}</span>`;
    }).join('');
  }

  function pluralPositions(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'позиция';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'позиции';
    return 'позиций';
  }

  function formatDishList(names, extra) {
    if (!names?.length) return '';
    let text = names.join(', ');
    if (extra > 0) text += ` и ещё ${extra}`;
    return text;
  }

  function renderFinalePersonal(container, lines) {
    if (!container || !lines?.length) return;
    container.innerHTML = lines.map((line) => `<p class="finale-personal-line">${line}</p>`).join('');
  }

  function renderFinaleSummary(listEl, snapshot) {
    if (!listEl) return;
    if (!snapshot) {
      listEl.innerHTML = '';
      listEl.classList.add('hidden');
      return;
    }
    const items = [];
    if (snapshot.vibeTitle && snapshot.vibeTitle !== '—') {
      items.push(`<li><span class="finale-summary-label">Вайб</span> ${snapshot.vibeTitle}</li>`);
    }
    if (snapshot.cartCount > 0) {
      const dishes = formatDishList(snapshot.dishNames, snapshot.dishExtra);
      const dishPart = dishes ? ` · ${dishes}` : '';
      items.push(
        `<li><span class="finale-summary-label">Заказ</span> ${snapshot.cartCount} ${pluralPositions(snapshot.cartCount)}${dishPart}</li>`
      );
    }
    if (snapshot.tasksTotal > 0) {
      const tasksText = snapshot.tasksDone
        ? 'все задания ✓'
        : `${snapshot.tasksDoneCount} из ${snapshot.tasksTotal}`;
      items.push(`<li><span class="finale-summary-label">Подготовка</span> ${tasksText}</li>`);
    }
    if (!items.length) {
      listEl.innerHTML = '';
      listEl.classList.add('hidden');
      return;
    }
    listEl.classList.remove('hidden');
    listEl.innerHTML = items.join('');
  }

  function showFinale(options) {
    const screen = $('#finale-screen');
    if (!screen) return;
    const opts = options || {};
    const floats = screen.querySelector('.finale-float');
    if (floats && !floats.childElementCount) floats.innerHTML = buildFinaleFloats();
    renderFinalePersonal($('#finale-personal', screen), opts.personalLines);
    renderFinaleSummary($('#finale-summary', screen), opts.snapshot);
    document.body.classList.add('is-finale');
    screen.classList.remove('hidden');
    screen.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => screen.classList.add('is-visible'));
    });
  }

  window.showMiniGame = showMiniGame;
  window.showFinale = showFinale;
})();
