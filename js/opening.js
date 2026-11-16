/* Вступление перед приглашением: маленький жест, который делает открытие
   ссылки событием. Каждый вариант умеет «пропустить» — сюрприз не должен
   превращаться в препятствие. */
(function () {
  'use strict';

  const esc = window.escapeHtml;
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DEFAULTS = {
    ribbon: { title: 'Для тебя.\nС особым трепетом.', hint: 'Зажми узел в центре бантика и потяни его вправо' },
    heart: { title: 'Одно сердечко\nдля тебя.', hint: 'Прикоснись и подержи — оно согреется' },
    fog: { title: 'Сотри дымку.\nЗа ней — послание.', hint: 'Проведи пальцем по стеклу' },
    note: { title: 'Тебе записка.', hint: 'Потяни карточку вверх' },
    scheduled: { title: 'Пока рано.\nНо уже скоро.', hint: 'Ссылка откроется в назначенное время' },
    none: { title: '', hint: '' },
  };

  function bowScene(host, data, done) {
    const d = { ...DEFAULTS.ribbon, title: data.title || DEFAULTS.ribbon.title, hint: data.hint || DEFAULTS.ribbon.hint };
    host.innerHTML = `
      <div class="op op-ribbon">
        <div class="op-title">${esc(d.title)}</div>
        <div class="bow" aria-hidden="true">
          <span class="bow-loop l1"></span>
          <span class="bow-loop l2"></span>
          <span class="bow-tail t1"></span>
          <span class="bow-tail t2"></span>
          <button class="bow-knot" type="button" aria-label="${esc(d.hint)}"></button>
          <span class="bow-progress"><i></i></span>
        </div>
        <p class="op-hint">${esc(d.hint)}</p>
        <button class="op-skip" type="button">Открыть без сюрприза</button>
      </div>`;

    const bow = host.querySelector('.bow');
    const knot = host.querySelector('.bow-knot');
    const l1 = host.querySelector('.bow-loop.l1');
    const l2 = host.querySelector('.bow-loop.l2');
    const t1 = host.querySelector('.bow-tail.t1');
    const t2 = host.querySelector('.bow-tail.t2');
    const bar = host.querySelector('.bow-progress i');
    const unit = (bow.clientWidth || 240) / 100;

    let dragging = false, startX = 0, p = 0, opened = false;

    const paint = (v) => {
      p = Math.max(0, Math.min(1, v));
      const px = p * unit * 46;
      l1.style.transform = `translate(${-px}px, ${p * unit * 5}px) rotate(${-p * 26}deg)`;
      l2.style.transform = `translate(${px}px, ${p * unit * 5}px) rotate(${p * 26}deg)`;
      t1.style.transform = `translate(${-px * 0.55}px, ${p * unit * 6}px) rotate(${8 + p * 20}deg)`;
      t2.style.transform = `translate(${px * 0.55}px, ${p * unit * 6}px) rotate(${-8 - p * 20}deg)`;
      knot.style.transform = `translateX(${px * 1.15}px) rotate(${p * 12}deg)`;
      bar.style.width = (p * 100) + '%';
      l1.style.opacity = l2.style.opacity = 1 - p * 0.55;
    };

    const finish = () => {
      if (opened) return;
      opened = true;
      l1.style.transition = l2.style.transition = t1.style.transition = t2.style.transition = 'transform .5s cubic-bezier(.2,.8,.3,1), opacity .45s';
      l1.style.transform = 'translate(-160px,-40px) rotate(-55deg)';
      l2.style.transform = 'translate(160px,-40px) rotate(55deg)';
      t1.style.transform = 'translate(-70px,70px) rotate(40deg)';
      t2.style.transform = 'translate(70px,70px) rotate(-40deg)';
      l1.style.opacity = l2.style.opacity = t1.style.opacity = t2.style.opacity = '0';
      bar.style.width = '100%';
      setTimeout(done, reduced() ? 60 : 430);
    };

    const down = (e) => {
      if (opened) return;
      dragging = true;
      startX = e.clientX;
      try { (e.currentTarget === knot ? knot : bow).setPointerCapture(e.pointerId); } catch (err) {}
      bow.style.setProperty('--drag', '1');
    };
    const move = (e) => {
      if (!dragging || opened) return;
      paint((e.clientX - startX) / (unit * 46));
      if (p >= 0.94) finish();
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      if (!opened && p < 0.9) {
        l1.style.transition = l2.style.transition = t1.style.transition = t2.style.transition = knot.style.transition = 'transform .45s cubic-bezier(.2,.9,.3,1.1), opacity .3s';
        paint(0);
        setTimeout(() => {
          [l1, l2, t1, t2, knot].forEach((el) => { el.style.transition = ''; });
        }, 460);
      }
    };

    bow.addEventListener('pointerdown', down);
    knot.addEventListener('pointerdown', down);
    bow.addEventListener('pointermove', move);
    bow.addEventListener('pointerup', up);
    bow.addEventListener('pointercancel', up);
    const skip = host.querySelector('.op-skip');
    skip.addEventListener('click', finish);

    return () => { bow.removeEventListener('pointerdown', down); };
  }

  function heartScene(host, data, done) {
    const d = { ...DEFAULTS.heart, title: data.title || DEFAULTS.heart.title, hint: data.hint || DEFAULTS.heart.hint };
    host.innerHTML = `
      <div class="op op-heart">
        <div class="op-title">${esc(d.title)}</div>
        <div class="heart-wrap">
          <svg class="heart-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46"></circle>
          </svg>
          <button class="heart-hold" type="button" aria-label="${esc(d.hint)}">
            <svg viewBox="0 0 32 30" aria-hidden="true">
              <path class="hpath" d="M16 28.2C8 22.2 2 16.2 2 9.6 2 5.1 5.5 1.8 9.6 1.8c2.7 0 5 1.4 6.4 3.6 1.4-2.2 3.7-3.6 6.4-3.6 4.1 0 7.6 3.3 7.6 7.8 0 6.6-6 12.6-14 18.6Z"/>
            </svg>
          </button>
        </div>
        <p class="op-hint">${esc(d.hint)}</p>
        <button class="op-skip" type="button">Открыть без сюрприза</button>
      </div>`;

    const wrap = host.querySelector('.heart-wrap');
    const btn = host.querySelector('.heart-hold');
    const circle = host.querySelector('.heart-ring circle');
    const skip = host.querySelector('.op-skip');
    const C = 2 * Math.PI * 46;
    circle.style.strokeDasharray = String(C);
    circle.style.strokeDashoffset = String(C);
    let raf = 0, start = 0, progress = 0, pressing = false, opened = false;

    const tick = (now) => {
      if (!pressing) return;
      if (!start) start = now;
      progress = Math.min(1, (now - start) / 1500);
      circle.style.strokeDashoffset = String(C * (1 - progress));
      if (progress >= 1 && !opened) {
        opened = true;
        wrap.classList.add('done');
        setTimeout(done, reduced() ? 40 : 260);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const press = (e) => {
      if (opened) return;
      e.preventDefault();
      pressing = true;
      wrap.classList.add('pressing');
      start = 0;
      raf = requestAnimationFrame(tick);
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const release = () => {
      if (opened) return;
      pressing = false;
      cancelAnimationFrame(raf);
      wrap.classList.remove('pressing');
      const decay = setInterval(() => {
        progress = Math.max(0, progress - 0.06);
        circle.style.strokeDashoffset = String(C * (1 - progress));
        if (progress <= 0) clearInterval(decay);
      }, 16);
    };

    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    skip.addEventListener('click', () => { if (!opened) { opened = true; done(); } });
    return () => { pressing = false; cancelAnimationFrame(raf); };
  }

  function fogScene(host, data, done) {
    const d = { ...DEFAULTS.fog, title: data.title || DEFAULTS.fog.title, hint: data.hint || DEFAULTS.fog.hint };
    host.innerHTML = `
      <div class="fog-scene">
        <div class="fog-behind">
          <div class="op-title">${esc(d.title)}</div>
        </div>
        <div class="fog-wrap"><canvas></canvas></div>
        <div class="fog-ui">
          <p class="op-hint">${esc(d.hint)}</p>
          <div class="fog-meter"><i></i></div>
        </div>
        <button class="op-skip" type="button">Открыть без сюрприза</button>
      </div>`;

    const wrapEl = host.querySelector('.fog-wrap');
    const canvas = host.querySelector('canvas');
    const meter = host.querySelector('.fog-meter i');
    const skip = host.querySelector('.op-skip');
    const ctx = canvas.getContext('2d');
    const COLS = 14, ROWS = 22;
    const cells = new Uint8Array(COLS * ROWS);
    let cleared = 0, doneFlag = false, dpr = 1, w = 0, h = 0, brush = null, noise = null;

    const makeNoise = () => {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 72;
      const tc = tile.getContext('2d');
      const img = tc.createImageData(72, 72);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 205 + Math.random() * 50;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = Math.min(255, v + 6);
        img.data[i + 3] = Math.random() * 90;
      }
      tc.putImageData(img, 0, 0);
      return tile;
    };

    const buildFog = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = wrapEl.clientWidth; h = wrapEl.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
      g.addColorStop(0, '#f7fbff');
      g.addColorStop(.45, '#e8f2fb');
      g.addColorStop(1, '#f4eefb');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // мягкие вертикальные разводы — как на замёрзшем стекле
      for (let i = 0; i < 7; i++) {
        const x = Math.random() * w;
        const lg = ctx.createLinearGradient(x, 0, x + 40, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(.5, 'rgba(255,255,255,.5)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x - 30, 0, 90, h);
      }

      if (!noise) noise = makeNoise();
      const pat = ctx.createPattern(noise, 'repeat');
      if (pat) {
        ctx.globalAlpha = .55;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // кисть с мягким краем
      brush = document.createElement('canvas');
      const R = Math.max(30, w * 0.13);
      brush.width = brush.height = R * 2 * dpr;
      const bc = brush.getContext('2d');
      const bg = bc.createRadialGradient(R * dpr, R * dpr, 0, R * dpr, R * dpr, R * dpr);
      bg.addColorStop(0, 'rgba(0,0,0,1)');
      bg.addColorStop(.5, 'rgba(0,0,0,.9)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      bc.fillStyle = bg;
      bc.fillRect(0, 0, brush.width, brush.height);
      brush._r = R;
      ctx.globalCompositeOperation = 'destination-out';
    };

    const wipe = (x, y) => {
      const R = brush._r;
      ctx.drawImage(brush, x - R, y - R, R * 2, R * 2);
      const cx = Math.floor((x / w) * COLS);
      const cy = Math.floor((y / h) * ROWS);
      const rx = Math.ceil((R / w) * COLS), ry = Math.ceil((R / h) * ROWS);
      for (let j = cy - ry; j <= cy + ry; j++) {
        for (let i = cx - rx; i <= cx + rx; i++) {
          if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
          const k = j * COLS + i;
          if (!cells[k]) { cells[k] = 1; cleared++; }
        }
      }
      const pct = cleared / (COLS * ROWS);
      meter.style.width = Math.min(100, pct * 130) + '%';
      if (pct > 0.5 && !doneFlag) {
        doneFlag = true;
        wrapEl.style.transition = 'opacity .6s ease';
        wrapEl.style.opacity = '0';
        host.querySelector('.fog-ui').style.transition = 'opacity .4s';
        host.querySelector('.fog-ui').style.opacity = '0';
        setTimeout(done, reduced() ? 30 : 540);
      }
    };

    let drawing = false;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onDown = (e) => { drawing = true; wipe(...pos(e)); };
    const onMove = (e) => {
      if (drawing) { wipe(...pos(e)); return; }
      if (e.pointerType === 'mouse') wipe(...pos(e));
    };
    const onUp = () => { drawing = false; };

    buildFog();
    wrapEl.addEventListener('pointerdown', onDown);
    wrapEl.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    wrapEl.style.touchAction = 'none';
    skip.addEventListener('click', () => { if (!doneFlag) { doneFlag = true; done(); } });

    const onResize = () => { buildFog(); };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
    };
  }

  function noteScene(host, data, done) {
    const d = { ...DEFAULTS.note, title: data.title || DEFAULTS.note.title, hint: data.hint || DEFAULTS.note.hint };
    host.innerHTML = `
      <div class="op op-note">
        <div class="op-title">${esc(d.title)}</div>
        <div class="note-wrap">
          <div class="note-card"><span aria-hidden="true">💌</span></div>
          <div class="note-envelope"></div>
          <div class="note-hint">↑ потяни вверх</div>
        </div>
        <p class="op-hint">${esc(d.hint)}</p>
        <button class="op-skip" type="button">Открыть без сюрприза</button>
      </div>`;

    const wrap = host.querySelector('.note-wrap');
    const card = host.querySelector('.note-card');
    const skip = host.querySelector('.op-skip');
    const unit = (wrap.clientWidth || 240) / 100;
    let dragging = false, startY = 0, p = 0, opened = false;

    const paint = (v) => {
      p = Math.max(0, Math.min(1, v));
      card.style.transform = `translateY(${-p * unit * 62}px) rotate(${p * -3}deg) scale(${1 + p * 0.06})`;
      wrap.style.setProperty('--pull', p);
    };
    const finish = () => {
      if (opened) return;
      opened = true;
      wrap.classList.add('open');
      card.style.transition = 'transform .55s cubic-bezier(.2,.8,.3,1), opacity .4s';
      card.style.transform = 'translateY(-170px) rotate(-6deg) scale(1.08)';
      setTimeout(done, reduced() ? 40 : 480);
    };

    const down = (e) => {
      if (opened) return;
      dragging = true; startY = e.clientY;
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const move = (e) => {
      if (!dragging || opened) return;
      if (e.cancelable) e.preventDefault();
      paint((startY - e.clientY) / (unit * 62));
      if (p >= 0.88) finish();
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      if (!opened && p < 0.85) {
        card.style.transition = 'transform .4s cubic-bezier(.2,.9,.3,1.1)';
        paint(0);
        setTimeout(() => { card.style.transition = ''; }, 420);
      }
    };

    wrap.addEventListener('pointerdown', down);
    wrap.addEventListener('pointermove', move, { passive: false });
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
    skip.addEventListener('click', finish);
    return () => {};
  }

  function scheduledScene(host, data, done) {
    const d = { ...DEFAULTS.scheduled, title: data.title || DEFAULTS.scheduled.title, hint: data.hint || DEFAULTS.scheduled.hint };
    const at = data.openAt ? window.Dates.parseLocal(data.openAt) : null;
    host.innerHTML = `
      <div class="op op-scheduled">
        <div class="op-title">${esc(d.title)}</div>
        <div class="countdown">
          <div class="cd-cell"><b data-cd="d">00</b><span>дней</span></div>
          <div class="cd-cell"><b data-cd="h">00</b><span>часов</span></div>
          <div class="cd-cell"><b data-cd="m">00</b><span>минут</span></div>
          <div class="cd-cell"><b data-cd="s">00</b><span>секунд</span></div>
        </div>
        <p class="op-lock" data-lock>${at ? 'Откроется ' + esc(window.Dates.full(at.toISOString())) : 'Совсем скоро'}</p>
        <button class="iv-btn iv-yes" type="button" data-open hidden>Открыть приглашение</button>
        <p class="op-hint">${esc(d.hint)}</p>
        <button class="op-skip" type="button" hidden>Открыть сейчас</button>
      </div>`;

    const cells = {
      d: host.querySelector('[data-cd="d"]'),
      h: host.querySelector('[data-cd="h"]'),
      m: host.querySelector('[data-cd="m"]'),
      s: host.querySelector('[data-cd="s"]'),
    };
    const lock = host.querySelector('[data-lock]');
    const openBtn = host.querySelector('[data-open]');
    const skip = host.querySelector('.op-skip');
    const pad = (n) => String(n).padStart(2, '0');
    let timer = 0, doneFlag = false;
    let target = at ? at.getTime() : Date.now();

    const unlock = () => {
      openBtn.hidden = false;
      skip.hidden = false;
      lock.textContent = 'Время пришло — открывайте 💛';
      clearInterval(timer);
    };

    const tick = () => {
      const left = target - Date.now();
      if (left <= 0) {
        ['d', 'h', 'm', 's'].forEach((k) => { cells[k].textContent = '00'; });
        unlock();
        return;
      }
      const s = Math.floor(left / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor((s % 86400) / 3600));
      cells.m.textContent = pad(Math.floor((s % 3600) / 60));
      cells.s.textContent = pad(s % 60);
    };

    if (!at) {
      // нет даты — нечего ждать
      unlock();
    } else if (Date.now() >= target) {
      unlock();
    } else {
      tick();
      timer = setInterval(tick, 1000);
    }

    const go = () => { if (!doneFlag) { doneFlag = true; done(); } };
    openBtn.addEventListener('click', go);
    skip.addEventListener('click', go);
    return () => clearInterval(timer);
  }

  window.Opening = {
    defaults: DEFAULTS,
    render(host, data, done) {
      const kind = data && data.kind ? data.kind : 'none';
      switch (kind) {
        case 'ribbon': return bowScene(host, data, done);
        case 'heart': return heartScene(host, data, done);
        case 'fog': return fogScene(host, data, done);
        case 'note': return noteScene(host, data, done);
        case 'scheduled': return scheduledScene(host, data, done);
        default:
          setTimeout(done, 0);
          return () => {};
      }
    },
  };
})();
