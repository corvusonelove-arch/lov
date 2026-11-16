/* Вайбы, медиа, музыка и даты — общий фундамент для всех страниц. */
(function () {
  'use strict';

  /* ---------- вайбы: градиент + тип живого фона ---------- */
  window.VIBES = {
    coral:    { grad: 'linear-gradient(150deg,#FF6B6B,#FF9E5E)', bg: 'petals',    name: 'Лепестки' },
    rose:     { grad: 'linear-gradient(150deg,#FF7EA8,#FFC3A0)', bg: 'bokeh',     name: 'Боке' },
    lavender: { grad: 'linear-gradient(150deg,#A18CD1,#FBC2EB)', bg: 'bokeh',     name: 'Сиреневый дым' },
    ocean:    { grad: 'linear-gradient(150deg,#43C6AC,#4A90E2)', bg: 'bubbles',   name: 'Пузырьки' },
    sunset:   { grad: 'linear-gradient(150deg,#F79D00,#FF5E62)', bg: 'embers',    name: 'Искры' },
    berry:    { grad: 'linear-gradient(150deg,#C31432,#8E2DE2)', bg: 'petals',    name: 'Лепестки' },
    night:    { grad: 'linear-gradient(150deg,#0F2027,#2C5364)', bg: 'stars',     name: 'Звёздная ночь' },
    mint:     { grad: 'linear-gradient(150deg,#38EF7D,#11998E)', bg: 'fireflies', name: 'Светлячки' },
    aurora:   { grad: 'linear-gradient(160deg,#12123a,#243b55)', bg: 'aurora',    name: 'Северное сияние' },
  };

  const rnd = (a, b) => a + Math.random() * (b - a);

  const BG_CFG = {
    petals:    { n: 15, cls: 'p-petal', emoji: ['🌸', '🌷', '💗', '🌸', '🍂'], size: [15, 28], dur: [8, 16] },
    bubbles:   { n: 16, cls: 'p-bubble', size: [9, 42], dur: [7, 14] },
    embers:    { n: 22, cls: 'p-ember', size: [4, 9], dur: [6, 11] },
    stars:     { n: 44, cls: 'p-star', size: [2, 4], dur: [2, 6], fixed: true },
    fireflies: { n: 18, cls: 'p-fly', size: [4, 8], dur: [6, 13] },
    bokeh:     { n: 12, cls: 'p-bokeh', size: [44, 120], dur: [12, 24], fixed: true },
  };

  /* Рисует живой фон в .iv-bg контейнера. light — вдвое меньше частиц,
     чтобы превью в конструкторе не ело батарею. */
  window.spawnVibe = function (root, id, light) {
    const bg = root.querySelector('.iv-bg');
    if (!bg) return;
    bg.querySelectorAll('.vibe-layer').forEach((n) => n.remove());
    const v = window.VIBES[id] || window.VIBES.coral;
    root.style.setProperty('--iv-grad', v.grad);
    root.dataset.vibe = id;

    const layer = document.createElement('div');
    layer.className = 'vibe-layer';
    bg.appendChild(layer);

    if (v.bg === 'aurora') {
      layer.innerHTML = '<span class="aurora a1"></span><span class="aurora a2"></span><span class="aurora a3"></span>';
      return v;
    }
    const cfg = BG_CFG[v.bg] || BG_CFG.petals;
    const count = light ? Math.ceil(cfg.n / 2) : cfg.n;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'vibe-p ' + cfg.cls;
      const size = rnd(cfg.size[0], cfg.size[1]);
      s.style.left = rnd(0, 100) + '%';
      if (cfg.fixed) {
        s.style.top = rnd(0, 100) + '%';
        s.style.animationDelay = (-rnd(0, 8)) + 's';
        s.style.animationDuration = rnd(cfg.dur[0], cfg.dur[1]) + 's';
      } else {
        s.style.animationDuration = rnd(cfg.dur[0], cfg.dur[1]) + 's';
        s.style.animationDelay = (-rnd(0, 12)) + 's';
      }
      if (cfg.emoji) {
        s.textContent = cfg.emoji[i % cfg.emoji.length];
        s.style.fontSize = size + 'px';
      } else {
        s.style.width = s.style.height = size + 'px';
      }
      layer.appendChild(s);
    }
    if (v.bg === 'stars' && !light) {
      const sh = document.createElement('span');
      sh.className = 'shooting';
      layer.appendChild(sh);
    }
    return v;
  };

  /* ---------- медиа ---------- */
  // Значение картинки: '' | 'noto:<codepoint>' | URL | data:URL
  const NOTO = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;

  // '1f48c' или '2764_fe0f' -> сам символ. Нужен, если CDN стикеров недоступен.
  const cpToEmoji = (cp) => String(cp).split('_').map((h) => String.fromCodePoint(parseInt(h, 16))).join('');
  window.cpToEmoji = cpToEmoji;

  window.mediaInfo = function (src) {
    if (!src) return null;
    if (/^noto:/.test(src)) return { url: NOTO(src.slice(5)), sticker: true, glyph: cpToEmoji(src.slice(5)) };
    return { url: src, sticker: /^(data:image\/gif)/i.test(src) || /notoemoji/i.test(src) };
  };

  window.renderMedia = function (container, src) {
    if (!container) return;
    if (container._src === src) return;
    container._src = src;
    container.innerHTML = '';
    container.classList.remove('is-glyph');
    const info = window.mediaInfo(src);
    if (!info) { container.hidden = true; return; }
    container.hidden = false;
    container.classList.toggle('is-sticker', info.sticker);
    const img = document.createElement('img');
    img.src = info.url;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'eager';
    img.addEventListener('error', () => {
      if (info.glyph) {
        container.innerHTML = '';
        container.classList.add('is-glyph');
        container.textContent = info.glyph;
      } else {
        container.hidden = true;
      }
    }, { once: true });
    container.appendChild(img);
  };

  /* ---------- музыка ---------- */
  /* Встроенная мелодия — тихий процедурный пад с колокольчиками.
     Ноль килобайт в ссылке и не зависит от чужих файлов. */
  const AC = window.AudioContext || window.webkitAudioContext;
  const CHORDS = [
    [110.00, 164.81, 220.00, 261.63],  // A  F  A  C
    [87.31, 130.81, 174.61, 220.00],   // F  C  F  A
    [130.81, 164.81, 196.00, 261.63],  // C  E  G  C
    [98.00, 146.83, 196.00, 246.94],   // G  D  G  B
  ];
  const SCALE = [440.00, 493.88, 523.25, 587.33, 659.25, 880.00];

  window.Music = {
    mode: '', ctx: null, master: null, delay: null, timer: null,
    audio: null, timerFade: null, muted: false, volume: 0.9,

    start(mode, url) {
      this.stop(true);
      this.mode = mode || '';
      this.muted = false;
      if (this.mode === 'melody') this._startMelody();
      else if (this.mode === 'url' && url) this._startAudio(url);
    },

    _startAudio(src) {
      try {
        const a = new Audio(src);
        a.loop = true; a.preload = 'auto'; a.volume = 0;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
        this.audio = a;
        this._fadeAudio(this.volume, 1600);
      } catch (e) { /* тихо живём без музыки */ }
    },

    _fadeAudio(target, ms) {
      clearInterval(this.timerFade);
      const a = this.audio;
      if (!a) return;
      const from = a.volume;
      const steps = Math.max(1, Math.round(ms / 60));
      let i = 0;
      this.timerFade = setInterval(() => {
        if (!this.audio) { clearInterval(this.timerFade); return; }
        i++;
        this.audio.volume = Math.min(1, Math.max(0, from + (target - from) * (i / steps)));
        if (i >= steps) clearInterval(this.timerFade);
      }, 60);
    },

    _startMelody() {
      if (!AC) return;
      try {
        const ctx = this.ctx = new AC();
        const master = this.master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);

        const delay = this.delay = ctx.createDelay(1.2);
        delay.delayTime.value = 0.34;
        const fb = ctx.createGain(); fb.gain.value = 0.3;
        const wet = ctx.createGain(); wet.gain.value = 0.33;
        const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2400;
        delay.connect(damp); damp.connect(fb); fb.connect(delay);
        delay.connect(wet); wet.connect(master);

        const pad = (freqs, t, dur) => {
          freqs.forEach((f, i) => {
            const o = ctx.createOscillator();
            o.type = i % 2 ? 'sine' : 'triangle';
            o.frequency.value = f;
            o.detune.value = (i - 1.5) * 3;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.05, t + 1.5);
            g.gain.setValueAtTime(0.05, t + Math.max(1.6, dur - 1.4));
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(master); g.connect(delay);
            o.start(t); o.stop(t + dur + 0.15);
          });
        };

        const bell = (freq, t) => {
          const o = ctx.createOscillator();
          o.type = 'sine'; o.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.075, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
          o.connect(g); g.connect(master); g.connect(delay);
          o.start(t); o.stop(t + 2);
        };

        let step = 0;
        const tick = () => {
          if (!this.ctx) return;
          const t = this.ctx.currentTime + 0.08;
          pad(CHORDS[step % CHORDS.length], t, 5.4);
          if (Math.random() < 0.8) bell(SCALE[Math.floor(Math.random() * SCALE.length)], t + 0.7);
          if (Math.random() < 0.4) bell(SCALE[Math.floor(Math.random() * SCALE.length)] * 2, t + 2.3);
          step++;
          this.timer = setTimeout(tick, 4800);
        };
        tick();
        master.gain.linearRampToValueAtTime(this.volume * 0.55, ctx.currentTime + 2.4);
      } catch (e) { /* нет WebAudio — не беда */ }
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.mode === 'melody' && this.master && this.ctx) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.volume * 0.55, this.ctx.currentTime + 0.25);
      } else if (this.audio) {
        this._fadeAudio(this.muted ? 0 : this.volume, 250);
      }
      return this.muted;
    },

    stop(keepMode) {
      clearTimeout(this.timer); this.timer = null;
      clearInterval(this.timerFade); this.timerFade = null;
      if (this.audio) { try { this.audio.pause(); } catch (e) {} this.audio = null; }
      const ctx = this.ctx;
      if (ctx) {
        this.ctx = null;
        try {
          if (this.master) this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
          setTimeout(() => { try { ctx.close(); } catch (e) {} }, 500);
        } catch (e) { try { ctx.close(); } catch (e2) {} }
      }
      this.master = null; this.delay = null;
      if (!keepMode) this.mode = '';
    },
  };

  /* ---------- даты ---------- */
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const DAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  // 'YYYY-MM-DDTHH:MM' -> локальная дата
  function parseLocal(iso) {
    if (!iso) return null;
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) { const d = new Date(iso); return isNaN(d) ? null : d; }
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function toLocalIso(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  window.Dates = {
    parseLocal, toLocalIso, MONTHS, MONTHS_NOM, DAYS, DAYS_SHORT,
    date: (iso) => {
      const d = parseLocal(iso);
      return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
    },
    day: (iso) => {
      const d = parseLocal(iso);
      return d ? DAYS[d.getDay()] : '';
    },
    short: (iso) => {
      const d = parseLocal(iso);
      return d ? `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
    },
    time: (iso) => {
      const d = parseLocal(iso);
      return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
    },
    full: (iso) => {
      const d = parseLocal(iso);
      return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}, ${DAYS[d.getDay()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
    },
  };

  /* ---------- .ics ---------- */
  window.buildICS = function (opts) {
    const o = opts || {};
    const iso = o.at;
    if (!iso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) return null;
    const start = parseLocal(iso);
    const end = new Date(start.getTime() + (o.durMin || 120) * 60000);
    const f = (x) => `${x.getFullYear()}${pad2(x.getMonth() + 1)}${pad2(x.getDate())}T${pad2(x.getHours())}${pad2(x.getMinutes())}00`;
    const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//invitik//date//RU', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@invitik`,
      `DTSTAMP:${f(new Date())}`,
      `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:${esc(o.title || 'Свидание 💌')}`,
      `DESCRIPTION:${esc(o.desc || '')}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Напоминание', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  };

  /* ---------- мелочи ---------- */
  window.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  window.copyText = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) { return false; }
    }
  };
})();
