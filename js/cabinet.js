/* Кабинет: показывает ответ гостя по ссылке и хранит список приглашений. */
(function () {
  'use strict';
  const cab = document.getElementById('cab');
  const esc = window.escapeHtml;
  const params = Object.assign(
    Object.fromEntries(new URLSearchParams(location.search)),
    window.Codec.parseHash(location.hash),
  );

  const MONTHS = window.Dates.MONTHS;
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  let toastTimer = 0;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function copyRow(value, id) {
    return `<div class="copyrow">
      <input readonly value="${esc(value)}" aria-label="Ссылка" id="link-${id}">
      <button class="btn sm" type="button" data-copy="${id}">Копировать</button>
    </div>`;
  }

  function base(path) {
    return new URL(path, location.href).href.split('#')[0];
  }

  function guestLink(raw, isDemo) {
    return isDemo ? base('i.html') + '?demo=1' : base('i.html') + '#d=' + raw;
  }
  function cabinetLink(raw, isDemo) {
    return isDemo ? base('cabinet.html') + '#demo=1' : base('cabinet.html') + '#d=' + raw;
  }

  /* ---------- список ---------- */
  function renderList() {
    const invites = window.Store.invites();
    const body = invites.length ? `<div class="inv-list">${invites.map((it) => {
      const answers = window.Store.answers(it.id);
      const last = answers[0];
      const vibe = window.VIBES[it.data && it.data.vibe] || window.VIBES.coral;
      const emoji = (it.data && it.data.activities && it.data.activities[0] && it.data.activities[0].emoji) || '💌';
      return `<a class="card inv-item" href="cabinet.html#d=${it.payload}">
        <span class="inv-thumb" style="background:${vibe.grad}">${esc(emoji)}</span>
        <span class="inv-body">
          <h3>${esc(it.data && it.data.question ? it.data.question : 'Приглашение')}</h3>
          <p>Создано ${stamp(it.createdAt)}${last && last.when ? ' · ' + esc(window.Dates.short(last.when)) : ''}</p>
        </span>
        <span class="inv-state ${last ? 'done' : 'wait'}">${last ? 'Ответ есть' : 'Ждём ответ'}</span>
      </a>`;
    }).join('')}</div>` : `<div class="card cab-empty">
        <div class="big">💌</div>
        <h2>Пока ни одного приглашения</h2>
        <p>Соберите первое — это пара минут. Ссылки на приглашение и на этот кабинет появятся сразу после создания.</p>
        <a class="btn lg" href="create.html">Создать приглашение</a>
      </div>`;

    cab.innerHTML = `
      <section class="cab-hero">
        <div class="cab-hero-top">
          <span class="cab-status"><span class="dot"></span> Кабинет</span>
          <a class="btn sm ghost" href="create.html">+ Создать</a>
        </div>
        <h1>Ваши приглашения</h1>
        <p class="cab-sub">Ссылки и ответы гостей. Всё хранится только в этом браузере.</p>
        <div class="cab-hero-emoji" aria-hidden="true">💌</div>
      </section>
      ${body}
      <section class="card cab-card" style="margin-top:22px">
        <h2>Открыть по ссылке</h2>
        <p class="muted small" style="margin-bottom:12px">Если гость прислал ссылку с ответом — вставьте её целиком, и кабинет откроет нужное приглашение.</p>
        <div class="cab-paste">
          <input type="text" data-paste-input placeholder="https://…/cabinet.html#d=…&a=…">
          <button class="btn ghost" type="button" data-paste-go>Открыть</button>
        </div>
        <p class="tiny muted" style="margin-top:12px">Не нашли свои приглашения? Они привязаны к браузеру: в другом браузере или после очистки данных список будет пуст. Ссылка на кабинет у вас всё равно остаётся.</p>
      </section>`;

    const go = () => {
      const v = (cab.querySelector('[data-paste-input]') || {}).value || '';
      const m = String(v).match(/#(.+)$/);
      if (!m) { toast('В ссылке нет #-части с приглашением'); return; }
      location.hash = m[1];
      location.reload();
    };
    cab.querySelector('[data-paste-go]').addEventListener('click', go);
    cab.querySelector('[data-paste-input]').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  /* ---------- карточка ответа ---------- */
  function answerBlock(invite, answer, isDemo) {
    if (!answer) {
      return `<div class="waiting">
        <div class="big">⏳</div>
        <h3>Пока ждём ответ</h3>
        <p>Сейчас приглашение живёт по ссылке. Когда гость ответит и нажмёт «Передать ответ», откроется эта страница с готовым ответом.</p>
        <button class="btn" type="button" data-open-guest>Открыть приглашение</button>
        <div class="hint">Если подключить релей (см. README), ответ появится здесь сам — без лишнего нажатия у гостя.</div>
      </div>`;
    }

    const when = answer.when;
    const act = answer.activity;
    const n = Number(answer.attempts) || 0;
    const quip = n === 0
      ? 'Кнопку «Нет» даже не тронули. Сразу «да» — это по-нашему.'
      : n <= 2
        ? `Попыток нажать «Нет»: ${n}. Небольшое сопротивление — и сдался.`
        : n <= 6
          ? `${n} попыток найти «Нет». Упорно, но кнопка хитрее.`
          : `${n} попыток. Кнопка «Нет» сдалась первой.`;

    return `<div class="answer-big">
        <div class="answer-yes">Да! <span aria-hidden="true">💛</span></div>
        <p class="muted" style="margin:0">${esc(invite.finalTitle || '')}</p>
      </div>
      ${when ? `<div class="answer-plan">
        <span>📅 ${esc(window.Dates.date(when))}, ${esc(window.Dates.day(when))}</span>
        <span>🕗 ${esc(window.Dates.time(when))}</span>
        ${act ? `<span>${esc(act.emoji || '✨')} ${esc(act.name)}</span>` : ''}
      </div>` : ''}
      <div class="answer-meta">
        <div>Приглашение открыли: <b>${esc(stamp(answer.openedAt) || '—')}</b></div>
        <div>Ответили: <b>${esc(stamp(answer.at) || '—')}</b></div>
        <div>Попыток нажать «Нет»: <b>${n}</b></div>
      </div>
      <div class="answer-quip">${esc(quip)}</div>`;
  }

  /* ---------- детальная страница ---------- */
  function renderDetail(invite, raw, answer, isDemo) {
    const id = invite.id || 'invite';
    if (answer && !isDemo) window.Store.addAnswer(id, answer);
    if (!answer && !isDemo) {
      const saved = window.Store.answers(id);
      if (saved.length) answer = saved[0];
    }

    const vibe = window.VIBES[invite.vibe] || window.VIBES.coral;
    const gLink = guestLink(raw, isDemo);
    const cLink = cabinetLink(raw, isDemo);
    const answers = isDemo ? [] : window.Store.answers(id);

    cab.innerHTML = `
      <section class="cab-hero" style="--cab-grad:${vibe.grad}">
        <div class="cab-hero-top">
          <span class="cab-status ${answer ? '' : 'wait'}"><span class="dot"></span>${answer ? 'Ответ получен' : 'Ждём ответ'}</span>
          <a class="btn sm ghost" href="create.html">+ Создать ещё</a>
        </div>
        <h1>${esc(invite.question || 'Приглашение')}</h1>
        <p class="cab-sub">${esc(invite.finalTitle || '')}</p>
        <div class="cab-hero-emoji" aria-hidden="true">💌</div>
      </section>

      <div class="cab-grid">
        <section class="card cab-card">
          <h2>${answer ? 'Что выбрали' : 'Ответ'}</h2>
          ${answerBlock(invite, answer, isDemo)}
          ${answers.length > 1 ? `<div class="answer-history">
            <details><summary>Ещё ответы (${answers.length - 1})</summary>
              ${answers.slice(1).map((a) => `<div style="padding:8px 0;border-bottom:1px solid var(--line)">
                ${esc(stamp(a.at))} · ${a.when ? esc(window.Dates.full(a.when)) : 'без даты'}${a.activity ? ' · ' + esc(a.activity.name) : ''}
              </div>`).join('')}
            </details>
          </div>` : ''}
        </section>

        <section class="card cab-card">
          <h2>Ссылки</h2>
          <div class="cab-links">
            <div class="cab-link">
              <span class="lbl">Для гостя</span>
              ${copyRow(gLink, 'guest')}
              <a class="link small" href="${esc(gLink)}" target="_blank" rel="noopener">Открыть приглашение ↗</a>
            </div>
            <div class="cab-link">
              <span class="lbl">Этот кабинет</span>
              ${copyRow(cLink, 'cab')}
              <span class="tiny muted">Сохраните ссылку — по ней вы вернётесь к ответу.</span>
            </div>
            <div class="cab-divider"></div>
            <div class="cab-actions">
              ${isDemo ? '<a class="btn" href="create.html">Собрать своё 💌</a>' : `
                <button class="btn ghost" type="button" data-edit>Редактировать приглашение</button>
                <button class="btn ghost" type="button" data-delete>Удалить из списка</button>`}
            </div>
          </div>
        </section>
      </div>

      <div class="cab-note" style="margin-top:22px">
        <b>Как это работает.</b> Приглашение целиком лежит в ссылке — сервера нет.
        Ответ возвращается так же: гость нажимает «Передать ответ» и отправляет вам ссылку,
        а вы открываете её здесь. Ничего не регистрируется и никуда не уходит.
      </div>`;

    cab.querySelectorAll('[data-copy]').forEach((b) => {
      b.addEventListener('click', async () => {
        const input = document.getElementById('link-' + b.dataset.copy);
        const ok = await window.copyText(input ? input.value : '');
        toast(ok ? 'Скопировано' : 'Не получилось скопировать');
      });
    });

    const openGuest = cab.querySelector('[data-open-guest]');
    if (openGuest) openGuest.addEventListener('click', () => window.open(gLink, '_blank', 'noopener'));

    const edit = cab.querySelector('[data-edit]');
    if (edit) edit.addEventListener('click', () => {
      window.Store.setEdit({ id, payload: raw, data: invite });
      location.href = 'create.html?edit=1';
    });

    const del = cab.querySelector('[data-delete]');
    if (del) del.addEventListener('click', () => {
      if (!confirm('Убрать приглашение из списка? Ссылки продолжат работать.')) return;
      window.Store.removeInvite(id);
      location.href = 'cabinet.html';
    });

    if (answer && params.a) toast('Ответ получен 💛');

    // если подключён релей — ждём ответ, не перезагружая страницу вручную
    if (!answer && invite.relay && invite.id) {
      const poll = setInterval(async () => {
        const res = await window.Sync.get(invite.relay, invite.id, invite.key);
        if (res && res.answer) {
          clearInterval(poll);
          window.Store.addAnswer(id, res.answer);
          location.reload();
        }
      }, 5000);
      window.addEventListener('pagehide', () => clearInterval(poll), { once: true });
    }
  }

  (async function boot() {
    const isDemo = params.demo === '1';
    const raw = params.d || '';
    let invite = null;
    if (raw) invite = await window.Codec.unpack(raw);
    if (!invite && isDemo) invite = window.DEMO_INVITE;

    let answer = null;
    if (params.a) answer = await window.Codec.unpack(params.a);

    if (!invite) {
      if (raw) {
        cab.innerHTML = `<div class="card cab-empty"><div class="big">🫥</div>
          <h2>Ссылка не читается</h2>
          <p>Похоже, она обрезалась при копировании. Попросите прислать её ещё раз целиком.</p>
          <a class="btn" href="cabinet.html">К списку</a></div>`;
        return;
      }
      renderList();
      return;
    }
    renderDetail(invite, raw, answer, isDemo);
  })();
})();
