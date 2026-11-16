/* Необязательный релей: мгновенная доставка ответа в кабинет.
   Без него всё тоже работает — ответ возвращается ссылкой.
   Адрес релея кладётся в js/config.js и дублируется в приглашении. */
(function () {
  'use strict';

  const clean = (u) => String(u || '').replace(/\/+$/, '');
  const timeout = (ms) => {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  };

  async function call(url, opts) {
    const res = await fetch(url, { cache: 'no-store', signal: timeout(9000), ...(opts || {}) });
    if (!res.ok) throw new Error('relay ' + res.status);
    return res.json();
  }

  window.Sync = {
    enabled(relay) { return !!clean(relay); },

    async send(relay, id, key, answer) {
      if (!clean(relay) || !id) return false;
      try {
        await call(`${clean(relay)}/answer/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, answer }),
        });
        return true;
      } catch (e) { return false; }
    },

    async opened(relay, id) {
      if (!clean(relay) || !id) return false;
      try {
        await call(`${clean(relay)}/open/${encodeURIComponent(id)}`, { method: 'POST' });
        return true;
      } catch (e) { return false; }
    },

    async get(relay, id, key) {
      if (!clean(relay) || !id) return null;
      try {
        return await call(`${clean(relay)}/answer/${encodeURIComponent(id)}?k=${encodeURIComponent(key)}`);
      } catch (e) { return null; }
    },

    async ping(relay) {
      if (!clean(relay)) return false;
      try {
        const r = await call(`${clean(relay)}/ping`);
        return r && r.ok === true;
      } catch (e) { return false; }
    },
  };
})();
