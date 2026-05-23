(function () {
  'use strict';

  var PACK_EMOJI = {
    cinnamoroll: '🐰',
    cinnamorollSm: '🐰',
    bubbletea: '🧋',
    plushie: '🧸',
    heart: '💗',
    heartPurple: '💗',
    heartAngel: '💗',
    heartSea: '🩵',
    bow: '🎀',
    bows: '🎀',
    star: '💗',
    starPixel: '✨',
    moon: '🌙',
    shell: '🐚',
    badge: '✓',
    wingSparkle: '✨',
    wingGlow: '✨',
    wingFlutterL: '🪽',
    wingFlutterR: '🪽',
    flame: '🕯️',
  };

  function resolveSrc(path) {
    var a = document.createElement('a');
    a.href = path;
    return a.href;
  }

  function emojiHtml(symbol) {
    return '<span class="emoji-sticker" aria-hidden="true">' + symbol + '</span>';
  }

  window.isPackKey = function (id) {
    return !!(id && window.EMOJI_PACK && Object.prototype.hasOwnProperty.call(window.EMOJI_PACK, id));
  };

  window.renderIcon = function (id) {
    if (!id) return '';

    if (window.isPackKey(id)) {
      var src = resolveSrc(window.EMOJI_PACK[id]);
      var fb = PACK_EMOJI[id] || '✨';
      return '<img class="emoji-sticker-img" src="' + src + '" alt="" data-fallback="' + fb + '" />';
    }

    if (PACK_EMOJI[id]) return emojiHtml(PACK_EMOJI[id]);

    return emojiHtml(id);
  };

  window.renderSticker = window.renderIcon;

  document.addEventListener(
    'error',
    function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || img.className.indexOf('emoji-sticker-img') < 0) return;
      var fb = img.getAttribute('data-fallback') || '✨';
      var span = document.createElement('span');
      span.className = 'emoji-sticker';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = fb;
      if (img.parentNode) img.parentNode.replaceChild(span, img);
    },
    true
  );
})();
