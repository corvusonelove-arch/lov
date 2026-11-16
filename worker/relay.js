/* Необязательный релей для мгновенной доставки ответов.
   Cloudflare Worker + KV. Разворачивается бесплатно, см. README.

   POST /answer/:id   { key, answer }   — гость кладёт ответ
   GET  /answer/:id?k=:key              — кабинет забирает ответ
   POST /open/:id                       — отметка «открыли» (по желанию)
   GET  /ping                           — проверка живости
*/

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status) => new Response(JSON.stringify(data), {
  status: status || 200,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS },
});

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === '/ping') return json({ ok: true, at: Date.now() });

    const match = url.pathname.match(/^\/(answer|open)\/([a-zA-Z0-9_-]{4,64})$/);
    if (!match) return json({ error: 'not found' }, 404);
    const [, kind, id] = match;

    if (!env.INVITIK) return json({ error: 'KV binding INVITIK is missing' }, 500);

    if (kind === 'open') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      await env.INVITIK.put(`open:${id}`, String(Date.now()), { expirationTtl: 60 * 60 * 24 * 90 });
      return json({ ok: true });
    }

    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      if (!body || !body.answer || typeof body.answer !== 'object') return json({ error: 'empty answer' }, 400);
      const record = { key: String(body.key || ''), answer: body.answer, at: Date.now() };
      await env.INVITIK.put(`ans:${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 180 });
      return json({ ok: true });
    }

    const key = url.searchParams.get('k') || '';
    const raw = await env.INVITIK.get(`ans:${id}`);
    if (!raw) return json({ ok: true, answer: null });
    const record = JSON.parse(raw);
    if (record.key && record.key !== key) return json({ error: 'forbidden' }, 403);
    return json({ ok: true, answer: record.answer, at: record.at });
  },
};
