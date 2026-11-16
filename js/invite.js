/* Движок приглашения: вступление → вопрос → подтверждение → дата → занятие → финал.
   Один и тот же код крутит страницу гостя и живое превью в конструкторе. */
(function () {
  'use strict';

  const esc = window.escapeHtml;
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DEFAULT_ACTIVITIES = [
    { emoji: '🍕', name: 'Пицца' },
    { emoji: '🎬', name: 'Кино' },
    { emoji: '🌳', name: 'Прогулка' },
    { emoji: '☕', name: 'Кофе' },
  ];

  const DEFAULTS = {
    vibe: 'coral',
    opening: 'ribbon',
    openingTitle: 'Для тебя.\nС особым трепетом.',
    openingHint: 'Зажми узел в центре бантика и потяни его вправо',
    openAt: '',
    scheduledSticker: 'noto:1f48c',
    music: 'melody',
    musicUrl: '',
    image1: 'noto:1f48c',
    question: 'Пойдёшь со мной на свидание? 💌',
    yesText: 'Да! 😍',
    noText: 'Нет',
    yesAnim: 'hearts',
    noAnim: 'runaway',
    confirmTitle: 'Подожди, ты действительно сказала «да»? 😍',
    confirmSub: 'А я так волновался 😄',
    confirmBtn: 'Да, да, ДА!',
    image2: 'noto:1f60d',
    dateMode: 'recipient',
    dateOptions: [],
    dateTitle: 'Когда тебе удобно? 🗓️',
    dateBtn: 'Подтвердить 💫',
    imageDate: 'noto:1f4c5',
    actTitle: 'Чем займёмся? 😋',
    actSub: 'Выбирай, что по душе',
    imageAct: 'noto:1f355',
    activities: DEFAULT_ACTIVITIES,
    finalTitle: 'Ура! Это свидание 💛',
    finalDesc: 'Жду тебя {Дата} в {Время}. Нас ждёт {Занятие} 💫',
    imageFinal: 'noto:1f389',
    album: [],
    secretMsg: '',
  };

  function normalize(p) {
    const d = { ...DEFAULTS, ...(p || {}) };
    if (!Array.isArray(d.activities) || !d.activities.length) d.activities = DEFAULT_ACTIVITIES;
    if (!Array.isArray(d.dateOptions)) d.dateOptions = [];
    if (!Array.isArray(d.album)) d.album = [];
    d.activities = d.activities.filter((a) => a && String(a.name || '').trim()).slice(0, 8);
    if (!d.activities.length) d.activities = DEFAULT_ACTIVITIES;
    if (d.opening === 'none') { d.openingTitle = ''; d.openingHint = ''; }
    return d;
  }

  function fill(tpl, ans) {
    const when = ans && ans.when;
    const act = ans && ans.activity;
    const map = {
      'дата': when ? window.Dates.date(when) : '',
      'date': when ? window.Dates.date(when) : '',
      'день': when ? window.Dates.day(when) : '',
      'day': when ? window.Dates.day(when) : '',
      'время': when ? window.Dates.time(when) : '',
      'time': when ? window.Dates.time(when) : '',
      'занятие': act ? act.name : '',
      'activity': act ? act.name : '',
    };
    return String(tpl || '').replace(/\{(дата|date|день|day|время|time|занятие|activity)\}/gi, (m, k) => {
      const v = map[String(k).toLowerCase()];
      return v == null ? '' : v;
    });
  }

  const notoCache = new Map();
  function notoFor(emoji) {
    const s = String(emoji || '').trim();
    if (!s) return '';
    if (notoCache.has(s)) return notoCache.get(s);
    const cps = [...s].map((c) => c.codePointAt(0).toString(16));
    const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${cps.join('_')}/512.gif`;
    notoCache.set(s, url);
    return url;
  }

  function emojiNode(emoji) {
    const wrap = document.createElement('span');
    wrap.className = 'em';
    const glyph = String(emoji || '✨').trim() || '✨';
    const url = notoFor(glyph);
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => { wrap.textContent = glyph; }, { once: true });
    wrap.appendChild(img);
    return wrap;
  }

  const SCREENS = ['opening', 'ask', 'confirm', 'when', 'what', 'final'];

  /* Длинный текст не должен выдавливать кнопки за экран — подбираем кегль. */
  function fitTitle(el, text, host) {
    const n = String(text || '').length;
    el.classList.toggle('sm', n > 70 && n <= 150);
    el.classList.toggle('xs', n > 150);
    if (host) host.classList.toggle('is-long', n > 150);
  }

  function mount(root, payload, opts) {
    opts = opts || {};
    const mode = opts.mode || 'guest';
    const data = normalize(payload);

    root.className = 'iv';
    root.innerHTML = `
      <div class="iv-bg"></div>
      <div class="iv-top" hidden>
        <button class="iv-navbtn" type="button" data-back aria-label="Назад" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="iv-dots" aria-hidden="true"></div>
        <button class="iv-navbtn" type="button" data-mute aria-label="Выключить музыку" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path data-wave d="M15.5 8.5a5 5 0 0 1 0 7"/><path data-wave d="M18 6a8.5 8.5 0 0 1 0 12"/></svg>
        </button>
      </div>
      <div class="iv-stage"></div>
      <div class="iv-flash"></div>
      <div class="iv-confetti"></div>`;

    const bgLayer = root.querySelector('.iv-bg');
    window.spawnVibe(root, data.vibe, mode !== 'guest');

    const stage = root.querySelector('.iv-stage');
    const flash = root.querySelector('.iv-flash');
    const confettiBox = root.querySelector('.iv-confetti');
    const topbar = root.querySelector('.iv-top');
    const backBtn = root.querySelector('[data-back]');
    const muteBtn = root.querySelector('[data-mute]');
    const dots = root.querySelector('.iv-dots');

    const screens = {};
    SCREENS.forEach((name) => {
      const el = document.createElement('section');
      el.className = 'iv-screen';
      el.dataset.s = name;
      stage.appendChild(el);
      screens[name] = el;
    });

    const state = {
      step: mode === 'preview' ? 'ask' : (data.opening !== 'none' ? 'opening' : 'ask'),
      attempts: 0,
      date: '',
      time: '',
      activity: null,
      confirmed: false,
      answerSent: false,
      confettiShown: false,
      openedAt: Date.now(),
      destroyed: false,
    };

    let current = '';
    let openingCleanup = () => {};

    const api = {
      data,
      state,
      go,
      showStep,
      restart,
      refresh() { renderCurrent(true); },
      update(next) {
        const fresh = normalize({ ...data, ...(next || {}) });
        Object.keys(fresh).forEach((k) => { data[k] = fresh[k]; });
        renderScreen(current);
        paintChrome(current);
      },
      setVibe(id) {
        data.vibe = id;
        window.spawnVibe(root, id, mode !== 'guest');
      },
      destroy() {
        state.destroyed = true;
        openingCleanup();
        window.Music.stop();
      },
    };

    /* ---------- навигация ---------- */
    const backTarget = {
      confirm: 'ask',
      when: 'confirm',
      what: 'when',
      final: 'what',
    };

    function paintChrome(name) {
      const showTop = name !== 'opening' && name !== 'ask';
      topbar.hidden = !showTop;
      backBtn.hidden = !backTarget[name];
      muteBtn.hidden = !(data.music && data.music !== 'none');
      const order = ['ask', 'confirm', 'when', 'what', 'final'];
      const idx = order.indexOf(name);
      dots.innerHTML = order.map((s, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('');
      if (name === 'opening') {
        // верхняя панель не должна перекрывать жест
        topbar.hidden = true;
      }
    }

    function go(name, opts2) {
      if (state.destroyed || !screens[name]) return;
      if (name !== 'opening') openingCleanup();
      const prev = current;
      if (prev && prev !== name) {
        const old = screens[prev];
        old.classList.remove('is-active');
        old.classList.add('is-leaving');
        setTimeout(() => old.classList.remove('is-leaving'), 300);
      }
      current = name;
      state.step = name;
      if (name !== 'final') state.confettiShown = false;
      renderScreen(name);
      const el = screens[name];
      el.classList.add('is-active');
      el.scrollTop = 0;
      paintChrome(name);
      if (opts2 && opts2.focus !== false) {
        const focusable = el.querySelector('button:not([disabled]), a[href], input');
        if (focusable && mode !== 'guest') focusable.focus({ preventScroll: true });
      }
    }

    function renderCurrent(reset) {
      if (!reset) return;
      renderScreen(current);
    }

    function renderScreen(name) {
      if (name === 'opening') renderOpening();
      else if (name === 'ask') renderAsk();
      else if (name === 'confirm') renderConfirm();
      else if (name === 'when') renderWhen();
      else if (name === 'what') renderWhat();
      else if (name === 'final') renderFinal();
    }

    /* ---------- вступление ---------- */
    function renderOpening() {
      openingCleanup();
      openingCleanup = () => {};
      const el = screens.opening;
      el.innerHTML = '<div class="iv-inner"></div>';
      const host = el.querySelector('.iv-inner');
      openingCleanup = window.Opening.render(host, {
        kind: data.opening,
        title: data.openingTitle,
        hint: data.openingHint,
        openAt: data.openAt,
      }, () => {
        openingCleanup = () => {};
        go('ask');
      }) || (() => {});
    }

    /* ---------- экран 1: вопрос ---------- */
    function renderAsk() {
      const el = screens.ask;
      el.innerHTML = `
        <div class="iv-inner">
          <div class="iv-media" data-media></div>
          <h1 class="iv-q"></h1>
          <div class="iv-answers" data-answers>
            <button class="iv-btn iv-yes" type="button" data-yes></button>
            <button class="iv-btn iv-no" type="button" data-no></button>
          </div>
        </div>`;
      window.renderMedia(el.querySelector('[data-media]'), data.image1);
      const qEl = el.querySelector('.iv-q');
      qEl.textContent = data.question || 'Пойдёшь со мной?';
      fitTitle(qEl, qEl.textContent, el);
      const yes = el.querySelector('[data-yes]');
      const no = el.querySelector('[data-no]');
      yes.textContent = data.yesText || 'Да';
      no.textContent = data.noText || 'Нет';

      window.wireAnswers({
        yes, no,
        zone: el.querySelector('[data-answers]'),
        bounds: el,
        yesAnim: data.yesAnim,
        noAnim: data.noAnim,
        onNo: (n) => { state.attempts = n; },
        onYes: () => {
          state.confirmed = false;
          flash.classList.remove('go');
          void flash.offsetWidth;
          flash.classList.add('go');
          if (data.music && data.music !== 'none') window.Music.start(data.music, data.musicUrl);
          paintChrome(current);
          setTimeout(() => { if (state.step === 'ask') go('confirm'); }, reduced() ? 60 : 620);
        },
      });
    }

    /* ---------- экран 2: подтверждение ---------- */
    function renderConfirm() {
      const el = screens.confirm;
      el.innerHTML = `
        <div class="iv-inner">
          <div class="iv-media" data-media></div>
          <h1 class="iv-q"></h1>
          <p class="iv-sub" data-sub hidden></p>
          <div class="iv-answers">
            <button class="iv-btn iv-yes" type="button" data-ok></button>
          </div>
        </div>`;
      window.renderMedia(el.querySelector('[data-media]'), data.image2);
      const qEl2 = el.querySelector('.iv-q');
      qEl2.textContent = data.confirmTitle || 'Точно-точно?';
      fitTitle(qEl2, qEl2.textContent, el);
      const sub = el.querySelector('[data-sub]');
      if (data.confirmSub) { sub.hidden = false; sub.textContent = data.confirmSub; }
      const ok = el.querySelector('[data-ok]');
      ok.textContent = data.confirmBtn || 'Да!';
      ok.addEventListener('click', () => {
        state.confirmed = true;
        window.heartsBurst(el);
        setTimeout(() => { if (state.step === 'confirm') go('when'); }, reduced() ? 40 : 420);
      });
    }

    /* ---------- экран 3: дата и время ---------- */
    function renderWhen() {
      const el = screens.when;
      let suggested = data.dateMode === 'suggested' && data.dateOptions.length > 0;
      el.innerHTML = `
        <div class="iv-inner">
          <div class="iv-media" data-media></div>
          <h1 class="iv-q"></h1>
          <div data-body style="width:100%"></div>
          <div class="iv-answers">
            <button class="iv-btn iv-yes" type="button" data-next disabled></button>
          </div>
        </div>`;
      window.renderMedia(el.querySelector('[data-media]'), data.imageDate);
      const qEl3 = el.querySelector('.iv-q');
      qEl3.textContent = data.dateTitle || 'Когда тебе удобно?';
      fitTitle(qEl3, qEl3.textContent, el);
      const body = el.querySelector('[data-body]');
      const next = el.querySelector('[data-next]');
      next.textContent = data.dateBtn || 'Подтвердить';

      const sync = () => {
        next.disabled = !(state.date && state.time);
      };

      const calendarView = () => {
        body.innerHTML = `
          <div class="iv-cal">
            <div class="cal-head">
              <b data-month></b>
              <div class="cal-nav">
                <button type="button" data-prev aria-label="Предыдущий месяц">‹</button>
                <button type="button" data-nextm aria-label="Следующий месяц">›</button>
              </div>
            </div>
            <div class="cal-grid" data-grid></div>
          </div>
          <div class="time-chips" data-times></div>
          <div class="iv-custom-time">
            <span style="font-size:.85em;opacity:.8">Своё время</span>
            <input type="time" data-time value="${esc(state.time || '19:00')}" aria-label="Своё время">
          </div>`;

        const grid = body.querySelector('[data-grid]');
        const monthEl = body.querySelector('[data-month]');
        const timesEl = body.querySelector('[data-times]');
        const timeInput = body.querySelector('[data-time]');
        if (!state.time) state.time = '19:00';
        timeInput.value = state.time;
        sync();

        let offset = 0;
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const maxDate = new Date(base.getTime() + 120 * 864e5);

        const draw = () => {
          const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
          monthEl.textContent = `${window.Dates.MONTHS_NOM[first.getMonth()]} ${first.getFullYear()}`;
          const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
          const lead = (first.getDay() + 6) % 7;
          const cells = [];
          ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].forEach((d) => cells.push(`<span class="cal-dow">${d}</span>`));
          for (let i = 0; i < lead; i++) cells.push('<span class="cal-day empty"></span>');
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(first.getFullYear(), first.getMonth(), d);
            const iso = window.Dates.toLocalIso(date).slice(0, 10);
            const disabled = date < base || date > maxDate;
            const today = date.getTime() === base.getTime();
            const sel = state.date === iso;
            cells.push(`<button type="button" class="cal-day${sel ? ' sel' : ''}${today ? ' today' : ''}" data-day="${iso}" ${disabled ? 'disabled' : ''} aria-label="${d}" ${sel ? 'aria-pressed="true"' : ''}>${d}</button>`);
          }
          grid.innerHTML = cells.join('');
          const prev = body.querySelector('[data-prev]');
          const nextm = body.querySelector('[data-nextm]');
          prev.disabled = offset <= 0;
          const lastMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
          nextm.disabled = new Date(first.getFullYear(), first.getMonth() + 1, 1) > maxDate;
        };

        grid.addEventListener('click', (e) => {
          const b = e.target.closest('[data-day]');
          if (!b || b.disabled) return;
          state.date = b.dataset.day;
          draw();
          sync();
        });
        body.querySelector('[data-prev]').addEventListener('click', () => { offset = Math.max(0, offset - 1); draw(); });
        body.querySelector('[data-nextm]').addEventListener('click', () => { offset = Math.min(2, offset + 1); draw(); });

        const TIMES = ['12:00', '15:00', '18:00', '19:00', '19:30', '21:00'];
        timesEl.innerHTML = TIMES.map((t) => `<button type="button" class="time-chip${state.time === t ? ' sel' : ''}" data-t="${t}">${t}</button>`).join('');
        timesEl.addEventListener('click', (e) => {
          const b = e.target.closest('[data-t]');
          if (!b) return;
          state.time = b.dataset.t;
          timeInput.value = state.time;
          timesEl.querySelectorAll('.time-chip').forEach((x) => x.classList.toggle('sel', x.dataset.t === state.time));
          sync();
        });
        timeInput.addEventListener('change', () => {
          state.time = timeInput.value || '19:00';
          timesEl.querySelectorAll('.time-chip').forEach((x) => x.classList.toggle('sel', x.dataset.t === state.time));
          sync();
        });

        draw();
      };

      if (suggested) {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const opts = data.dateOptions
          .filter((iso) => window.Dates.parseLocal(iso) && window.Dates.parseLocal(iso) >= base)
          .sort();
        if (opts.length) {
          body.innerHTML = `<div class="iv-optlist">${opts.map((iso) => `
            <button type="button" class="iv-opt" data-opt="${esc(iso)}">
              <span class="em" aria-hidden="true">🗓️</span>
              <span style="flex:1;min-width:0">
                <span class="d" style="display:block">${esc(window.Dates.short(iso))}</span>
                <span class="t" style="display:block">${esc(window.Dates.time(iso))} · ${esc(window.Dates.day(iso))}</span>
              </span>
            </button>`).join('')}</div>
            <button type="button" class="op-skip" data-other style="margin:0 auto 8px">Предложить своё время</button>`;
          const list = body.querySelector('.iv-optlist');
          list.addEventListener('click', (e) => {
            const b = e.target.closest('[data-opt]');
            if (!b) return;
            const [d, t] = b.dataset.opt.split('T');
            state.date = d;
            state.time = t || '19:00';
            list.querySelectorAll('.iv-opt').forEach((x) => x.classList.toggle('sel', x === b));
            sync();
          });
          body.querySelector('[data-other]').addEventListener('click', () => { suggested = false; calendarView(); });
          sync();
        } else {
          calendarView();
        }
      } else {
        calendarView();
      }

      next.addEventListener('click', () => {
        if (!state.date || !state.time) return;
        window.heartsBurst(el);
        setTimeout(() => { if (state.step === 'when') go(data.activities.length ? 'what' : 'final'); }, reduced() ? 30 : 380);
      });
    }

    /* ---------- экран 4: занятие ---------- */
    function renderWhat() {
      const el = screens.what;
      el.innerHTML = `
        <div class="iv-inner">
          <div class="iv-media" data-media></div>
          <h1 class="iv-q"></h1>
          <p class="iv-sub" data-sub hidden></p>
          <div class="iv-acts" data-acts></div>
        </div>`;
      window.renderMedia(el.querySelector('[data-media]'), data.imageAct);
      const qEl4 = el.querySelector('.iv-q');
      qEl4.textContent = data.actTitle || 'Чем займёмся?';
      fitTitle(qEl4, qEl4.textContent, el);
      const sub = el.querySelector('[data-sub]');
      if (data.actSub) { sub.hidden = false; sub.textContent = data.actSub; }
      const acts = el.querySelector('[data-acts]');
      data.activities.forEach((a, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'iv-act';
        b.dataset.i = String(i);
        b.appendChild(emojiNode(a.emoji));
        const name = document.createElement('b');
        name.textContent = a.name;
        b.appendChild(name);
        acts.appendChild(b);
      });
      acts.addEventListener('click', (e) => {
        const b = e.target.closest('.iv-act');
        if (!b) return;
        const a = data.activities[+b.dataset.i];
        state.activity = { emoji: a.emoji || '✨', name: a.name };
        acts.querySelectorAll('.iv-act').forEach((x) => x.classList.toggle('sel', x === b));
        window.heartsBurst(el);
        setTimeout(() => { if (state.step === 'what') go('final'); }, reduced() ? 30 : 460);
      });
    }

    /* ---------- экран 5: финал ---------- */
    function buildAnswer() {
      return {
        id: data.id || '',
        yes: true,
        at: new Date().toISOString(),
        openedAt: new Date(state.openedAt).toISOString(),
        when: state.date && state.time ? `${state.date}T${state.time}` : '',
        activity: state.activity || (data.activities[0] ? { emoji: data.activities[0].emoji, name: data.activities[0].name } : null),
        attempts: state.attempts,
        confirmed: state.confirmed,
      };
    }

    function previewAnswer() {
      if (!state.date) {
        const d = new Date(Date.now() + 3 * 864e5);
        state.date = window.Dates.toLocalIso(d).slice(0, 10);
        state.time = '19:00';
      }
      if (!state.activity) {
        const a = data.activities[0];
        state.activity = a ? { emoji: a.emoji, name: a.name } : null;
      }
      return buildAnswer();
    }

    function renderFinal() {
      const el = screens.final;
      const ans = mode === 'preview' ? previewAnswer() : buildAnswer();
      const desc = fill(data.finalDesc, ans);
      const album = (data.album || []).filter((a) => a && a.url);

      el.innerHTML = `
        <div class="iv-inner iv-final">
          <div class="iv-media" data-media></div>
          <h1 class="iv-q"></h1>
          <p class="iv-final-text"></p>
          <div class="iv-plan" data-plan></div>
          <div class="iv-album" data-album hidden></div>
          <div class="iv-secret" data-secret hidden></div>
          <div class="iv-actions" data-actions></div>
          <div class="iv-return" data-return hidden></div>
          <div class="iv-foot">сделано с ♥ · <a href="index.html">invitik</a></div>
        </div>`;

      window.renderMedia(el.querySelector('[data-media]'), data.imageFinal);
      const qEl5 = el.querySelector('.iv-q');
      qEl5.textContent = data.finalTitle || 'Ура!';
      fitTitle(qEl5, qEl5.textContent, el);
      el.querySelector('.iv-final-text').textContent = desc;

      const plan = el.querySelector('[data-plan]');
      if (ans.when) {
        plan.innerHTML = `<span>📅 <b>${esc(window.Dates.date(ans.when))}</b>, ${esc(window.Dates.day(ans.when))}</span>
          <span>🕗 <b>${esc(window.Dates.time(ans.when))}</b></span>`
          + (ans.activity ? `<span>${esc(ans.activity.emoji || '✨')} <b>${esc(ans.activity.name)}</b></span>` : '');
      }

      if (album.length) {
        const box = el.querySelector('[data-album]');
        box.hidden = false;
        box.innerHTML = album.map((a) => `<figure><img src="${esc(a.url)}" alt="" loading="lazy">${a.caption ? `<figcaption>${esc(a.caption)}</figcaption>` : ''}</figure>`).join('');
        box.querySelectorAll('img').forEach((img) => {
          img.addEventListener('error', () => { const f = img.closest('figure'); if (f) f.remove(); }, { once: true });
        });
      }

      if (data.secretMsg) {
        const box = el.querySelector('[data-secret]');
        box.hidden = false;
        box.innerHTML = `<button type="button" class="iv-secret-btn" data-secret-btn>💌 <span>Открыть секретное послание</span></button>`;
        box.querySelector('[data-secret-btn]').addEventListener('click', () => {
          box.innerHTML = `<div class="iv-secret-body"></div>`;
          box.querySelector('.iv-secret-body').textContent = data.secretMsg;
        });
      }

      const actions = el.querySelector('[data-actions]');
      if (data.music && data.music !== 'none') {
        const mute = document.createElement('button');
        mute.type = 'button';
        mute.className = 'iv-btn ghost';
        mute.textContent = window.Music.muted ? '🔇 Включить музыку' : '🔊 Выключить музыку';
        mute.addEventListener('click', () => {
          const m = window.Music.toggleMute();
          mute.textContent = m ? '🔇 Включить музыку' : '🔊 Выключить музыку';
        });
        actions.appendChild(mute);
      }
      if (ans.when) {
        const ics = document.createElement('button');
        ics.type = 'button';
        ics.className = 'iv-btn ghost';
        ics.textContent = '📅 Добавить в календарь';
        ics.addEventListener('click', () => {
          const href = window.buildICS({
            title: data.finalTitle || 'Свидание',
            desc: `Приглашение: ${data.question || ''}`,
            at: ans.when,
          });
          if (href) {
            const a = document.createElement('a');
            a.href = href;
            a.download = 'svidanie.ics';
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
        });
        actions.appendChild(ics);
      }

      if (mode !== 'preview' && opts.onAnswer) {
        const slot = el.querySelector('[data-return]');
        slot.hidden = false;
        try { opts.onAnswer(ans, slot); } catch (e) { /* гость просто увидит финал */ }
      }

      if (!state.confettiShown) {
        state.confettiShown = true;
        window.confetti(confettiBox, 30);
      }
      if (data.music === 'melody' && window.Music.mode !== 'melody' && mode !== 'preview') {
        // музыка не должна включаться сама: браузер всё равно не даст без жеста
      }
    }

    /* ---------- верхняя панель ---------- */
    backBtn.addEventListener('click', () => {
      const target = backTarget[current];
      if (target) go(target);
    });
    muteBtn.addEventListener('click', () => {
      const muted = window.Music.toggleMute();
      muteBtn.setAttribute('aria-label', muted ? 'Включить музыку' : 'Выключить музыку');
      muteBtn.style.opacity = muted ? '.55' : '1';
    });

    /* ---------- превью: шаг конструктора -> экран ---------- */
    function showStep(i) {
      const map = ['ask', 'confirm', 'when', 'what', 'final'];
      const name = map[Math.max(0, Math.min(4, i))] || 'ask';
      go(name, { focus: false });
    }

    function restart(startAtOpening) {
      state.attempts = 0;
      state.date = '';
      state.time = '';
      state.activity = null;
      state.confirmed = false;
      window.Music.stop();
      if (startAtOpening && data.opening !== 'none') go('opening');
      else go('ask');
    }

    // первый показ
    if (state.step === 'opening') {
      paintChrome('opening');
      renderOpening();
      screens.opening.classList.add('is-active');
      current = 'opening';
    } else {
      go('ask', { focus: false });
    }

    return api;
  }

  window.InviteEngine = { mount, normalize, fill, DEFAULTS };
})();
