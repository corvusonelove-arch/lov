/* Механика «Да» / «Нет» и праздничные эффекты.
   Один код обслуживает и страницу гостя, и превью в конструкторе —
   поэтому эффекты совпадают по построению. */
(function () {
  'use strict';

  const REPLIES = [
    'Неа', 'Не хочу', 'Не пойду', 'Точно нет', 'Ни за что', 'Не сегодня',
    'Я пас', 'Нетушки', 'Мимо', 'Отказываюсь', 'Может, всё-таки да?', 'Кнопка сломалась',
  ];

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Сердечки разлетаются из центра box. box обязан быть position:relative/absolute. */
  window.heartsBurst = function (box) {
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const k = Math.min(1, Math.max(0.4, rect.width / 420));
    const n = reduced() ? 8 : 24;
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span');
      h.className = 'iv-heart-particle';
      h.textContent = ['💕', '❤️', '💖', '💛', '✨', '💗'][i % 6];
      h.style.fontSize = Math.round((17 + Math.random() * 22) * k) + 'px';
      box.appendChild(h);
      const ang = Math.random() * Math.PI * 2;
      const dist = (110 + Math.random() * 250) * k;
      const anim = h.animate([
        { transform: 'translate(-50%,-50%) scale(.35)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1.15)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' });
      anim.onfinish = () => h.remove();
    }
  };

  /* Конфетти на финальном экране. */
  window.confetti = function (box, count) {
    if (!box || reduced()) return;
    const colors = ['#FFD166', '#FF6B6B', '#FF9E5E', '#FFFFFF', '#FFB3C7', '#9BE8C5'];
    for (let i = 0; i < (count || 26); i++) {
      const p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.width = (4 + Math.random() * 7) + 'px';
      p.style.height = (7 + Math.random() * 10) + 'px';
      p.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      p.style.animationDuration = (2.4 + Math.random() * 2.4) + 's';
      p.style.animationDelay = (Math.random() * 1.2) + 's';
      box.appendChild(p);
      setTimeout(() => p.remove(), 6500);
    }
  };

  window.NO_REPLIES = REPLIES;

  /* o = { yes, no, zone, bounds, yesAnim, noAnim, onYes, onNo }
     zone — контейнер кнопок (position:relative), bounds — область, за которую
     убегающей «Нет» нельзя выходить первые попытки (обычно весь экран). */
  window.wireAnswers = function (o) {
    const yes = o.yes;
    const no = o.no;
    const zone = o.zone;
    const bounds = o.bounds || zone;
    const onYes = o.onYes || function () {};
    const onNo = o.onNo || function () {};
    let attempts = 0;
    let replyIndex = 0;

    const bump = (target) => {
      attempts++;
      const label = REPLIES[replyIndex % REPLIES.length];
      replyIndex++;
      (target || no).textContent = label;
      onNo(attempts);
    };

    if (yes) {
      yes.addEventListener('click', () => {
        if ((o.yesAnim || 'hearts') === 'hearts') window.heartsBurst(bounds);
        onYes();
      });
    }
    if (!no) return;

    const mode = o.noAnim || 'runaway';

    if (mode === 'runaway') {
      const GAP = 14;        // зазор до «Да»
      const STEP = 112;      // насколько дальше с каждой попыткой
      const SQUASH = 0.6;    // область шире, чем выше
      const KEEP_VISIBLE = 6;
      const EDGE = 8;

      // mouseenter + pointerdown + click приходят на одно касание —
      // считаем попыткой только первое событие в коротком окне.
      let lastFlee = 0;
      const flee = () => {
        const now = performance.now();
        if (now - lastFlee < 160) return;
        lastFlee = now;
        bump();
        const w = no.offsetWidth;
        const h = no.offsetHeight;
        const homeL = no.offsetLeft;
        const homeT = no.offsetTop;
        const yl = yes.offsetLeft, yt = yes.offsetTop, yw = yes.offsetWidth, yh = yes.offsetHeight;
        const hitsYes = (l, t) => l < yl + yw + GAP && l + w > yl - GAP && t < yt + yh + GAP && t + h > yt - GAP;

        const zr = zone.getBoundingClientRect();
        const br = bounds.getBoundingClientRect();
        const vis = {
          left: Math.max(br.left, 0), top: Math.max(br.top, 0),
          right: Math.min(br.right, window.innerWidth), bottom: Math.min(br.bottom, window.innerHeight),
        };
        const limits = {
          left: vis.left + EDGE - zr.left,
          top: vis.top + EDGE - zr.top,
          right: vis.right - EDGE - w - zr.left,
          bottom: vis.bottom - EDGE - h - zr.top,
        };
        const clamped = attempts <= KEEP_VISIBLE;
        const cl = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
        const fit = (l, t) => (clamped
          ? { l: cl(l, limits.left, limits.right), t: cl(t, limits.top, limits.bottom) }
          : { l, t });

        const dist = STEP * attempts;
        const a0 = Math.random() * Math.PI * 2;
        let spot = null;
        for (let i = 0; i < 16 && !spot; i++) {
          const a = a0 + (i * Math.PI * 2) / 16;
          const ux = Math.cos(a), uy = Math.sin(a) * SQUASH;
          const len = Math.hypot(ux, uy) || 1;
          const p = fit(homeL + (ux / len) * dist, homeT + (uy / len) * dist);
          if (!hitsYes(p.l, p.t)) spot = p;
        }
        if (!spot) spot = fit(homeL + (homeL >= yl ? dist : -dist), homeT);
        no.style.transform = `translate(${Math.round(spot.l - homeL)}px, ${Math.round(spot.t - homeT)}px)`;
        if (!clamped) no.style.opacity = '0.15';
      };

      no.addEventListener('mouseenter', flee);
      no.addEventListener('pointerdown', (e) => { e.preventDefault(); flee(); });
      no.addEventListener('click', (e) => { e.preventDefault(); flee(); });
      return;
    }

    if (mode === 'shrink') {
      no.addEventListener('click', (e) => {
        e.preventDefault();
        bump();
        const s = Math.max(0.15, 1 - attempts * 0.16);
        no.style.transform = `scale(${s})`;
        if (yes) yes.style.transform = `scale(${Math.min(1 + attempts * 0.1, 1.65)})`;
        if (s <= 0.2) { no.style.opacity = '0'; no.style.pointerEvents = 'none'; }
      });
      return;
    }

    if (mode === 'multiply') {
      no.addEventListener('click', (e) => {
        e.preventDefault();
        bump();
        if (attempts > 10) return;
        const c = no.cloneNode(true);
        c.classList.add('ans-abs');
        c.style.left = Math.random() * Math.max(0, zone.clientWidth - no.offsetWidth) + 'px';
        c.style.top = (Math.random() * Math.max(0, zone.clientHeight - no.offsetHeight)) + 'px';
        c.style.transform = 'none';
        c.addEventListener('click', (ev) => { ev.preventDefault(); bump(c); });
        zone.appendChild(c);
        if (yes) yes.style.transform = `scale(${Math.min(1 + attempts * 0.06, 1.5)})`;
      });
      return;
    }

    // kiss
    let kissed = false;
    no.addEventListener('click', (e) => {
      e.preventDefault();
      if (kissed) return;
      kissed = true;
      bump();
      const k = document.createElement('span');
      k.className = 'iv-kiss';
      k.textContent = '😘';
      const size = Math.max(20, Math.round(no.offsetHeight * 0.8));
      const r = no.getBoundingClientRect();
      const zr = zone.getBoundingClientRect();
      k.style.fontSize = size + 'px';
      k.style.left = (r.left - zr.left + r.width / 2 - size / 2) + 'px';
      k.style.top = (r.top - zr.top - 6) + 'px';
      zone.appendChild(k);
      no.style.pointerEvents = 'none';
      no.style.opacity = '0';
      setTimeout(() => { no.style.visibility = 'hidden'; }, 320);
    });
  };
})();
