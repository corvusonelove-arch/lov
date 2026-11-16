/* Страница гостя: принимает приглашение из #-фрагмента и возвращает ответ. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const params = Object.assign(
    Object.fromEntries(new URLSearchParams(location.search)),
    window.Codec.parseHash(location.hash),
  );
  const raw = params.d || '';
  const isDemo = params.demo === '1';

  const showError = (msg) => {
    loading.hidden = true;
    error.hidden = false;
    const p = error.querySelector('[data-msg]');
    if (p && msg) p.textContent = msg;
  };

  async function boot() {
    let payload = null;
    if (raw) {
      try { payload = await window.Codec.unpack(raw); } catch (e) { payload = null; }
    }
    if (!payload && isDemo) payload = window.DEMO_INVITE;
    if (!payload || !payload.question) {
      showError();
      return;
    }

    document.title = payload.question.replace(/<[^>]+>/g, '') + ' 💌';
    if (payload.vibe && window.VIBES[payload.vibe]) {
      document.querySelector('meta[name="theme-color"]').setAttribute('content', window.VIBES[payload.vibe].grad.match(/#[0-9a-f]{6}/i)[0]);
    }

    loading.hidden = true;
    app.hidden = false;

    if (payload.relay && payload.id) {
      try { window.Sync.opened(payload.relay, payload.id); } catch (e) {}
    }

    const engine = window.InviteEngine.mount(app, payload, {
      mode: 'guest',
      onAnswer: (answer, slot) => buildReturn(payload, answer, slot),
    });

    if (isDemo) {
      const badge = document.createElement('a');
      badge.className = 'demo-badge';
      badge.href = 'create.html';
      badge.innerHTML = 'Это пример · создать своё 💌';
      app.appendChild(badge);
    }

    return engine;
  }

  async function buildReturn(payload, answer, slot) {
    const answerBody = { ...answer, v: 1 };
    const answerPack = await window.Codec.pack(answerBody);

    const cabinetBase = new URL('cabinet.html', location.href).href.split('#')[0];
    let link;
    if (isDemo) {
      link = cabinetBase + '#demo=1&a=' + answerPack;
    } else {
      link = cabinetBase + '#d=' + raw + '&a=' + answerPack;
    }

    // если у приглашения есть релей — тихо отправляем ответ туда
    if (payload.relay) {
      try { window.Sync.send(payload.relay, payload.id || '', payload.key || '', answer); } catch (e) {}
    }

    slot.innerHTML = `
      <p>Передайте ответ автору — он откроется по этой ссылке.</p>
      <button class="iv-btn iv-yes" type="button" data-share>Передать ответ 💌</button>
      <div class="iv-return-share">
        <a data-tg target="_blank" rel="noopener">Telegram</a>
        <a data-wa target="_blank" rel="noopener">WhatsApp</a>
        <button type="button" data-copy>Скопировать ссылку</button>
      </div>`;

    const text = 'Мой ответ на приглашение 💛';
    slot.querySelector('[data-tg]').href = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text);
    slot.querySelector('[data-wa]').href = 'https://wa.me/?text=' + encodeURIComponent(text + '\n' + link);

    const shareBtn = slot.querySelector('[data-share]');
    const copyBtn = slot.querySelector('[data-copy]');

    const toast = (msg) => {
      let t = document.querySelector('.toast');
      if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('show'), 2600);
    };

    const copy = async () => {
      const ok = await window.copyText(link);
      toast(ok ? 'Ссылка с ответом скопирована' : 'Не получилось скопировать — выделите ссылку вручную');
    };

    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Мой ответ 💌', text, url: link });
          toast('Готово — ответ у автора');
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return;
        }
      }
      await copy();
    });
    copyBtn.addEventListener('click', copy);

    if (payload.relay) {
      const note = document.createElement('p');
      note.style.cssText = 'font-size:.85em;opacity:.75;margin-top:8px';
      note.textContent = 'Ответ уже отправлен автору автоматически. Кнопка выше — запасной путь.';
      slot.insertBefore(note, slot.firstChild.nextSibling);
    }
  }

  boot();
})();
