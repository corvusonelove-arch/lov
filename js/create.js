/* Конструктор: состояние, живое превью и сборка ссылок. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = window.escapeHtml;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const DRAFT_KEY = 'invitik.draft.v1';

  const FIELDS = [
    'vibe', 'opening', 'openingTitle', 'openingHint', 'openAt', 'scheduledSticker',
    'music', 'musicUrl', 'image1', 'question', 'yesText', 'noText', 'yesAnim', 'noAnim',
    'confirmTitle', 'confirmSub', 'confirmBtn', 'image2',
    'dateMode', 'dateOptions', 'dateTitle', 'dateBtn', 'imageDate',
    'actTitle', 'actSub', 'activities', 'imageAct',
    'finalTitle', 'finalDesc', 'imageFinal', 'album', 'secretMsg',
  ];

  const state = Object.assign(clone(window.InviteEngine.DEFAULTS), {
    id: '', createdAt: 0, relay: (window.INVITIK_CONFIG.relayUrl || ''), key: '',
  });

  let step = 0;
  let preview = null;
  let editRecord = null;
  let toastTimer = 0;
  let sizeTimer = 0;
  let draftTimer = 0;

  const toast = (msg) => {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  };

  /* ---------- черновик ---------- */
  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveDraft() {
    if (editRecord) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ state, step, at: Date.now() })); } catch (e) {}
    }, 350);
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  /* ---------- служебное ---------- */
  function payloadForLink() {
    const payload = { v: 1 };
    FIELDS.forEach((k) => { payload[k] = state[k]; });
    return payload;
  }

  let renderQueued = false;
  function render() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (preview) preview.update(payloadForLink());
    });
    scheduleSize();
    saveDraft();
  }

  function scheduleSize() {
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(async () => {
      const note = $('sizeNote');
      try {
        const packed = await window.Codec.pack(payloadForLink());
        const len = packed.length + 60;
        note.textContent = 'Ссылка ≈ ' + (len / 1024).toFixed(1) + ' КБ';
        note.classList.toggle('warn', len > 3500);
        if (len > 3500) note.textContent += ' — длинновато для мессенджеров';
      } catch (e) { note.textContent = ''; }
    }, 600);
  }

  /* ---------- вайбы ---------- */
  function buildVibes() {
    const grid = $('vibeGrid');
    grid.innerHTML = Object.entries(window.VIBES).map(([id, v]) => `
      <button type="button" class="vibe-sw" data-vibe="${id}" style="background:${v.grad}" title="${esc(v.name)}" aria-label="${esc(v.name)}" aria-pressed="false"></button>`).join('');
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-vibe]');
      if (!b) return;
      state.vibe = b.dataset.vibe;
      syncVibes();
      if (preview) preview.setVibe(state.vibe);
      render();
    });
  }
  function syncVibes() {
    document.querySelectorAll('[data-vibe]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vibe === state.vibe)));
    const v = window.VIBES[state.vibe] || window.VIBES.coral;
    $('vibeName').textContent = 'Вайб: ' + v.name;
  }

  /* ---------- вступление ---------- */
  const OPENINGS = [
    ['ribbon', '🎀', 'Развязать ленту', 'Зажать узел и потянуть вправо'],
    ['heart', '💗', 'Согреть сердечко', 'Прикоснуться и подержать'],
    ['fog', '☁️', 'Запотевшее стекло', 'Стереть дымку пальцем'],
    ['note', '💌', 'Вытянуть записку', 'Потянуть карточку вверх'],
    ['scheduled', '⏳', 'В назначенное время', 'Отсчёт до выбранной даты'],
    ['none', '⚡', 'Без вступления', 'Сразу к вопросу'],
  ];
  const openingDrafts = {};

  function buildOpenings() {
    const grid = $('openingGrid');
    grid.innerHTML = OPENINGS.map(([id, ico, title, sub]) => `
      <button type="button" class="opening-card" data-opening="${id}" aria-pressed="false">
        <span class="ico" aria-hidden="true">${ico}</span>
        <b>${title}</b>
        <small>${sub}</small>
      </button>`).join('');
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-opening]');
      if (!b) return;
      setOpening(b.dataset.opening);
    });
  }

  function setOpening(kind) {
    if (kind === state.opening) return;
    if (state.opening !== 'none') {
      openingDrafts[state.opening] = { title: state.openingTitle, hint: state.openingHint };
    }
    state.opening = kind;
    if (kind === 'none') {
      state.openingTitle = '';
      state.openingHint = '';
    } else {
      const d = openingDrafts[kind] || window.Opening.defaults[kind] || { title: '', hint: '' };
      state.openingTitle = d.title;
      state.openingHint = d.hint;
      openingDrafts[kind] = { title: d.title, hint: d.hint };
    }
    syncOpening();
    render();
  }

  function syncOpening() {
    document.querySelectorAll('[data-opening]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.opening === state.opening)));
    const none = state.opening === 'none';
    $('openingCopy').hidden = none;
    $('scheduledBox').hidden = state.opening !== 'scheduled';
    $('openingTitle').value = state.openingTitle || '';
    $('openingHint').value = state.openingHint || '';

    if (state.opening === 'scheduled') {
      const at = state.openAt || '';
      const [d, t] = at.split('T');
      const tomorrow = new Date(Date.now() + 864e5);
      $('openDate').value = d || window.Dates.toLocalIso(tomorrow).slice(0, 10);
      $('openTime').value = t || '19:00';
      state.openAt = `${$('openDate').value}T${$('openTime').value}`;
    }
  }

  /* ---------- музыка ---------- */
  function syncMusic() {
    document.querySelectorAll('#musicSeg [data-m]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === state.music)));
    $('musicUrl').hidden = state.music !== 'url';
    $('musicUrl').value = state.musicUrl || '';
  }

  /* ---------- картинки ---------- */
  function notoUrl(cp) { return `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`; }

  function initPickers() {
    document.querySelectorAll('.imgpick').forEach((host) => {
      const key = host.dataset.key;
      let cat = 0;
      host.innerHTML = `
        <div class="imgpick-cats"></div>
        <div class="imgpick-current" hidden></div>
        <div class="imgpick-grid"></div>
        <div class="imgpick-custom">
          <input type="url" placeholder="Ссылка на картинку или гифку" aria-label="Ссылка на картинку">
          <button class="btn sm ghost" type="button" data-apply>Применить</button>
          <button class="btn sm ghost" type="button" data-upload>Загрузить</button>
        </div>`;
      const cats = host.querySelector('.imgpick-cats');
      const grid = host.querySelector('.imgpick-grid');
      const current = host.querySelector('.imgpick-current');
      const input = host.querySelector('input');
      const file = document.createElement('input');
      file.type = 'file';
      file.accept = 'image/*';

      cats.innerHTML = window.STICKER_SETS.map((s, i) => `<button type="button" class="imgpick-cat" data-cat="${i}" aria-pressed="false">${esc(s.name)}</button>`).join('');
      cats.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        cat = +b.dataset.cat;
        drawGrid();
      });

      function drawGrid() {
        const set = window.STICKER_SETS[cat];
        grid.innerHTML = set.items.map((cp) => `
          <button type="button" class="imgpick-item" data-cp="${cp}" aria-label="${esc(window.cpToEmoji(cp))}" aria-pressed="false">
            <img src="${notoUrl(cp)}" alt="" loading="lazy">
          </button>`).join('');
        grid.querySelectorAll('img').forEach((img) => {
          img.addEventListener('error', () => {
            const b = img.closest('button');
            b.classList.add('glyph');
            b.textContent = window.cpToEmoji(b.dataset.cp);
          }, { once: true });
        });
        cats.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cat === cat)));
        mark();
      }

      function mark() {
        const v = state[key] || '';
        grid.querySelectorAll('[data-cp]').forEach((b) => b.setAttribute('aria-pressed', String(v === 'noto:' + b.dataset.cp)));
        const info = window.mediaInfo(v);
        if (info) {
          current.hidden = false;
          current.innerHTML = `<img src="${esc(info.url)}" alt=""><span>${/^noto:/.test(v) ? 'Стикер' : /^data:/.test(v) ? 'Загруженное фото' : 'Своя картинка'}</span><button type="button" data-clear>Убрать</button>`;
          current.querySelector('[data-clear]').addEventListener('click', () => setValue(''));
        } else {
          current.hidden = true;
          current.innerHTML = '';
        }
      }

      function setValue(v) {
        state[key] = v;
        mark();
        render();
      }

      grid.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cp]');
        if (!b) return;
        setValue('noto:' + b.dataset.cp);
      });
      host.querySelector('[data-apply]').addEventListener('click', () => {
        const v = input.value.trim();
        if (!v) return;
        if (!/^(https?:\/\/|data:image\/)/i.test(v)) { toast('Нужна ссылка на картинку (http…) или файл'); return; }
        setValue(v);
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); host.querySelector('[data-apply]').click(); } });
      host.querySelector('[data-upload]').addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        try {
          const v = await fileToValue(f);
          setValue(v);
          toast('Картинка добавлена');
        } catch (err) { toast(err.message || 'Не получилось загрузить картинку'); }
      });

      drawGrid();
      mark();
    });
  }

  async function fileToValue(file) {
    const gif = /gif/i.test(file.type);
    if (gif) {
      if (file.size > 700 * 1024) throw new Error('Гифка больше 700 КБ — ссылка станет слишком длинной. Возьмите гифку поменьше или ссылку.');
      return await readDataURL(file);
    }
    if (!/^image\//.test(file.type)) throw new Error('Это не картинка');
    const url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    const max = 620;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/webp', 0.68);
  }

  const readDataURL = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const loadImage = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

  /* ---------- дата ---------- */
  function syncDateMode() {
    document.querySelectorAll('#dateMode [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.dateMode)));
    $('dateOptionsEditor').hidden = state.dateMode !== 'suggested';
  }

  function renderDateRows() {
    const list = $('dateOptionsList');
    list.innerHTML = state.dateOptions.map((iso, i) => {
      const [d = '', t = ''] = String(iso || '').split('T');
      return `<div class="date-row" data-i="${i}">
        <span class="n">${i + 1}</span>
        <input type="date" value="${esc(d)}" data-part="date" aria-label="Дата варианта ${i + 1}">
        <input type="time" value="${esc(t)}" data-part="time" aria-label="Время варианта ${i + 1}">
        <button class="rm" type="button" aria-label="Удалить вариант ${i + 1}">×</button>
      </div>`;
    }).join('');
    $('dateCount').textContent = state.dateOptions.length + ' из 6';
    $('addDate').disabled = state.dateOptions.length >= 6;
  }

  function readDateRow(row) {
    const i = +row.dataset.i;
    const d = row.querySelector('[data-part="date"]').value;
    const t = row.querySelector('[data-part="time"]').value || '19:00';
    state.dateOptions[i] = d ? `${d}T${t}` : '';
  }

  function addDateOption() {
    if (state.dateOptions.length >= 6) return;
    const days = 1 + state.dateOptions.length;
    const d = new Date(Date.now() + days * 864e5);
    state.dateOptions.push(window.Dates.toLocalIso(d).slice(0, 10) + 'T19:00');
    renderDateRows();
    render();
  }

  /* ---------- занятия ---------- */
  function renderActs() {
    $('actList').innerHTML = state.activities.map((a, i) => `
      <div class="act-row" data-i="${i}">
        <button class="emoji-btn" type="button" data-emoji aria-label="Выбрать эмодзи">${esc(a.emoji || '✨')}</button>
        <input value="${esc(a.name)}" maxlength="30" aria-label="Занятие ${i + 1}">
        <button class="rm" type="button" aria-label="Удалить занятие ${i + 1}">×</button>
      </div>`).join('');
    $('actCount').textContent = state.activities.length + ' из 6';
    $('addAct').disabled = state.activities.length >= 6;
    $('actStatus').textContent = state.activities.length ? '' : 'Добавьте хотя бы один вариант';
  }

  function buildPresets() {
    const cats = $('presetCats');
    const list = $('presetList');
    let active = 0;
    const draw = () => {
      cats.innerHTML = window.ACTIVITY_PRESETS.map((c, i) => `<button type="button" class="chip" data-pc="${i}" aria-pressed="${i === active}">${esc(c.name)}</button>`).join('');
      const items = window.ACTIVITY_PRESETS[active].items;
      list.innerHTML = items.map((it) => `<button type="button" class="preset-item" data-p="${esc(it.name)}"><span>${esc(it.emoji)}</span><span>${esc(it.name)}</span></button>`).join('');
    };
    cats.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pc]');
      if (!b) return;
      active = +b.dataset.pc;
      draw();
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      const all = window.ACTIVITY_PRESETS.flatMap((c) => c.items);
      const item = all.find((x) => x.name === b.dataset.p);
      if (!item) return;
      if (state.activities.length >= 6) { toast('Максимум 6 вариантов'); return; }
      if (state.activities.some((a) => a.name === item.name)) { toast('Такой вариант уже есть'); return; }
      state.activities.push({ emoji: item.emoji, name: item.name });
      renderActs();
      render();
    });
    draw();
  }

  function openEmoji(anchor, onPick) {
    document.querySelectorAll('.emoji-pop').forEach((n) => n.remove());
    const pop = document.createElement('div');
    pop.className = 'emoji-pop';
    pop.innerHTML = window.EMOJI_PALETTE.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join('');
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.min(window.innerWidth - pop.offsetWidth - 12, Math.max(8, r.left)) + 'px';
    pop.style.top = (r.bottom + window.scrollY + 6) + 'px';
    const close = (ev) => {
      if (!pop.contains(ev.target) && ev.target !== anchor) { pop.remove(); document.removeEventListener('pointerdown', close, true); }
    };
    setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('[data-e]');
      if (!b) return;
      onPick(b.dataset.e);
      pop.remove();
    });
  }

  /* ---------- альбом ---------- */
  function renderAlbum() {
    const list = $('albumList');
    list.innerHTML = state.album.map((a, i) => `
      <div class="album-row" data-i="${i}">
        <input value="${esc(a.url || '')}" placeholder="Ссылка на фото" aria-label="Фото ${i + 1}">
        <input value="${esc(a.caption || '')}" placeholder="Подпись" maxlength="60" aria-label="Подпись ${i + 1}">
        <button class="rm" type="button" aria-label="Удалить фото ${i + 1}">×</button>
      </div>`).join('');
    $('addAlbum').disabled = state.album.length >= 6;
  }

  /* ---------- навигация ---------- */
  function goStep(i, opts) {
    step = Math.max(0, Math.min(4, i));
    document.querySelectorAll('.wstep').forEach((s) => { s.hidden = +s.dataset.step !== step; });
    document.querySelectorAll('#czTabs button').forEach((b, idx) => {
      b.setAttribute('aria-current', String(idx === step));
      b.classList.toggle('done', idx < step);
    });
    $('backBtn').hidden = step === 0;
    $('nextBtn').hidden = step === 4;
    $('publishBtn').hidden = step !== 4;
    $('progressLabel').textContent = 'Шаг ' + (step + 1) + ' из 5';
    if (preview && !(opts && opts.noPreview)) preview.showStep(step);
    saveDraft();
    if (!(opts && opts.silent)) {
      const anchor = document.querySelector('.cz-tabs');
      const y = anchor.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }

  /* ---------- сборка ---------- */
  async function publish() {
    if (!String(state.question || '').trim()) { goStep(0); toast('Заполните вопрос на первом экране'); return; }
    if (state.dateMode === 'suggested' && !state.dateOptions.filter(Boolean).length) {
      goStep(2); toast('Добавьте хотя бы один вариант даты'); return;
    }
    if (!state.activities.length) { goStep(3); toast('Добавьте хотя бы одно занятие'); return; }

    const id = (editRecord && editRecord.id) || state.id || window.Codec.uid(8);
    const payload = {
      v: 1,
      id,
      createdAt: state.createdAt || Date.now(),
      relay: window.INVITIK_CONFIG.relayUrl || '',
      key: state.key || window.Codec.uid(14),
    };
    FIELDS.forEach((k) => { payload[k] = state[k]; });
    if (payload.dateMode === 'suggested') {
      payload.dateOptions = [...new Set(payload.dateOptions.filter(Boolean))].sort();
    }

    const btn = $('publishBtn');
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Собираем…';
    try {
      const packed = await window.Codec.pack(payload);
      const guest = new URL('i.html', location.href).href + '#d=' + packed;
      const cab = new URL('cabinet.html', location.href).href + '#d=' + packed;

      window.Store.saveInvite({
        id, createdAt: payload.createdAt, payload: packed,
        question: payload.question, data: payload,
      });
      clearDraft();

      const demo = new URLSearchParams(location.search).has('demo');
      $('doneIntro').textContent = editRecord
        ? 'Изменения сохранены. Ссылка обновилась — отправьте новую версию гостю, старая останется прежней.'
        : 'Отправьте первую ссылку тому, кого приглашаете. Вторая — ваша: по ней вы увидите ответ.';
      $('doneModal').querySelector('h2').textContent = editRecord ? 'Изменения сохранены' : 'Приглашение готово';

      $('guestLink').value = guest;
      $('cabLink').value = cab;
      const text = 'Приглашение для тебя 💌';
      $('shareTg').href = 'https://t.me/share/url?url=' + encodeURIComponent(guest) + '&text=' + encodeURIComponent(text);
      $('shareWa').href = 'https://wa.me/?text=' + encodeURIComponent(text + '\n' + guest);
      $('openGuest').href = guest;
      $('goCabinet').href = cab;

      const hint = $('lengthHint');
      if (packed.length > 3500) {
        hint.textContent = 'Ссылка длинная (' + (packed.length / 1024).toFixed(1) + ' КБ): Telegram может её обрезать. Ссылка короче — если заменить фото на стикер.';
        hint.style.color = 'var(--warn)';
      } else {
        hint.textContent = 'Ссылка короткая — поместится в любой мессенджер.';
        hint.style.color = '';
      }

      $('doneModal').hidden = false;
      document.body.style.overflow = 'hidden';
      if (!demo) editRecord = null;
    } catch (e) {
      toast('Не получилось собрать приглашение: ' + (e.message || 'неизвестная ошибка'));
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* ---------- инициализация ---------- */
  function bindText() {
    const map = {
      openingTitle: 'openingTitle', openingHint: 'openingHint',
      question: 'question', yesText: 'yesText', noText: 'noText',
      confirmTitle: 'confirmTitle', confirmSub: 'confirmSub', confirmBtn: 'confirmBtn',
      dateTitle: 'dateTitle', dateBtn: 'dateBtn',
      actTitle: 'actTitle', actSub: 'actSub',
      finalTitle: 'finalTitle', finalDesc: 'finalDesc', secretMsg: 'secretMsg',
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = $(id);
      el.value = state[key] || '';
      el.addEventListener('input', () => {
        state[key] = el.value;
        if ((key === 'openingTitle' || key === 'openingHint') && state.opening !== 'none') {
          openingDrafts[state.opening] = { title: state.openingTitle, hint: state.openingHint };
        }
        render();
      });
    });
    $('musicUrl').addEventListener('input', (e) => { state.musicUrl = e.target.value.trim(); render(); });
    $('openDate').addEventListener('change', () => { state.openAt = $('openDate').value + 'T' + ($('openTime').value || '19:00'); render(); });
    $('openTime').addEventListener('change', () => { state.openAt = $('openDate').value + 'T' + ($('openTime').value || '19:00'); render(); });
  }

  function bindSegments() {
    $('musicSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      state.music = b.dataset.m;
      syncMusic();
      render();
    });
    $('yesAnimSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      state.yesAnim = b.dataset.a;
      syncSeg('yesAnimSeg', state.yesAnim);
      render();
    });
    $('noAnimSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      state.noAnim = b.dataset.a;
      syncSeg('noAnimSeg', state.noAnim);
      render();
    });
    $('dateMode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      state.dateMode = b.dataset.mode;
      if (state.dateMode === 'suggested' && !state.dateOptions.length) {
        const d = new Date(Date.now() + 864e5);
        state.dateOptions.push(window.Dates.toLocalIso(d).slice(0, 10) + 'T19:00');
      }
      syncDateMode();
      renderDateRows();
      render();
    });
    $('addDate').addEventListener('click', addDateOption);
    $('dateOptionsList').addEventListener('input', (e) => {
      const row = e.target.closest('.date-row');
      if (!row) return;
      readDateRow(row);
      render();
    });
    $('dateOptionsList').addEventListener('click', (e) => {
      const b = e.target.closest('.rm');
      if (!b) return;
      const row = b.closest('.date-row');
      state.dateOptions.splice(+row.dataset.i, 1);
      renderDateRows();
      render();
    });
  }

  function syncSeg(id, value) {
    document.querySelectorAll(`#${id} [data-a]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.a === value)));
  }

  function bindActivities() {
    $('addAct').addEventListener('click', () => {
      if (state.activities.length >= 6) return;
      state.activities.push({ emoji: '✨', name: '' });
      renderActs();
      render();
      const rows = $('actList').querySelectorAll('.act-row');
      const last = rows[rows.length - 1];
      if (last) last.querySelector('input').focus();
    });
    $('actList').addEventListener('input', (e) => {
      const row = e.target.closest('.act-row');
      if (!row) return;
      state.activities[+row.dataset.i].name = e.target.value;
      render();
    });
    $('actList').addEventListener('click', (e) => {
      const rm = e.target.closest('.rm');
      if (rm) {
        const row = rm.closest('.act-row');
        state.activities.splice(+row.dataset.i, 1);
        renderActs();
        render();
        return;
      }
      const em = e.target.closest('[data-emoji]');
      if (em) {
        const row = em.closest('.act-row');
        const i = +row.dataset.i;
        openEmoji(em, (emoji) => {
          state.activities[i].emoji = emoji;
          renderActs();
          render();
        });
      }
    });
  }

  function bindAlbum() {
    $('addAlbum').addEventListener('click', () => {
      if (state.album.length >= 6) return;
      state.album.push({ url: '', caption: '' });
      renderAlbum();
      render();
    });
    $('albumList').addEventListener('input', (e) => {
      const row = e.target.closest('.album-row');
      if (!row) return;
      const i = +row.dataset.i;
      const inputs = row.querySelectorAll('input');
      state.album[i] = { url: inputs[0].value.trim(), caption: inputs[1].value.trim() };
      render();
    });
    $('albumList').addEventListener('click', (e) => {
      const b = e.target.closest('.rm');
      if (!b) return;
      state.album.splice(+b.closest('.album-row').dataset.i, 1);
      renderAlbum();
      render();
    });
  }

  function bindVarchips() {
    document.querySelectorAll('.varchip').forEach((b) => {
      b.addEventListener('click', () => {
        const el = $('finalDesc');
        const v = b.dataset.var;
        const s = el.selectionStart == null ? el.value.length : el.selectionStart;
        const e = el.selectionEnd == null ? el.value.length : el.selectionEnd;
        el.value = el.value.slice(0, s) + v + el.value.slice(e);
        state.finalDesc = el.value;
        el.focus();
        el.selectionStart = el.selectionEnd = s + v.length;
        render();
      });
    });
  }

  function bindNav() {
    $('czTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      goStep(+b.dataset.step);
    });
    $('nextBtn').addEventListener('click', () => goStep(step + 1));
    $('backBtn').addEventListener('click', () => goStep(step - 1));
    $('publishBtn').addEventListener('click', publish);
    $('tryOpening').addEventListener('click', () => {
      if (preview) {
        preview.update(payloadForLink());
        preview.restart(true);
      }
    });
    $('resetPreview').addEventListener('click', () => {
      if (preview) { preview.update(payloadForLink()); preview.restart(false); }
    });
    $('togglePreview').addEventListener('click', () => {
      const col = document.querySelector('.cz-preview');
      const closed = col.classList.toggle('collapsed');
      $('togglePreview').textContent = closed ? 'Показать превью' : 'Свернуть превью';
    });
    $('doneModal').addEventListener('click', (e) => {
      if (e.target === $('doneModal')) closeDone();
    });
    $('newInvite').addEventListener('click', () => {
      clearDraft();
      location.href = 'create.html';
    });
    document.querySelectorAll('#doneModal [data-copy]').forEach((b) => {
      b.addEventListener('click', async () => {
        const ok = await window.copyText($(b.dataset.copy).value);
        toast(ok ? 'Скопировано' : 'Не получилось скопировать');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('doneModal').hidden) closeDone();
    });
  }

  function closeDone() {
    $('doneModal').hidden = true;
    document.body.style.overflow = '';
  }

  function initPreview() {
    preview = window.InviteEngine.mount($('preview'), payloadForLink(), { mode: 'preview' });
  }

  function hydrateFromDraft() {
    const draft = readDraft();
    if (!draft || !draft.state) return false;
    FIELDS.forEach((k) => { if (draft.state[k] !== undefined) state[k] = draft.state[k]; });
    step = Math.min(4, Math.max(0, Number(draft.step) || 0));
    const note = document.querySelector('.cz-intro-note span:last-child');
    if (note) note.textContent = 'Черновик восстановлен';
    return true;
  }

  function init() {
    const params = new URLSearchParams(location.search);
    const isEdit = params.has('edit');
    if (isEdit) {
      editRecord = window.Store.getEdit();
      if (editRecord && editRecord.data) {
        Object.assign(state, editRecord.data);
        const note = document.querySelector('.cz-intro-note span:last-child');
        if (note) note.textContent = 'Режим правки: ссылка после сохранения изменится';
      }
    } else {
      hydrateFromDraft();
    }

    // текст из библиотеки идей: create.html?q=…
    const q = params.get('q');
    if (q && !isEdit) state.question = q.slice(0, 280);

    buildVibes(); syncVibes();
    buildOpenings();
    buildPresets();
    bindText();
    bindSegments();
    bindActivities();
    bindAlbum();
    bindVarchips();
    initPickers();
    bindNav();

    syncOpening();
    syncMusic();
    syncDateMode();
    syncSeg('yesAnimSeg', state.yesAnim);
    syncSeg('noAnimSeg', state.noAnim);
    $('openingTitle').value = state.openingTitle || '';
    $('openingHint').value = state.openingHint || '';
    renderDateRows();
    renderActs();
    renderAlbum();

    initPreview();
    goStep(step, { silent: true, noPreview: false });
    if (isEdit && editRecord) $('publishBtn').textContent = 'Сохранить изменения 💾';
    scheduleSize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
