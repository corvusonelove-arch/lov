/* Упаковка приглашения в ссылку.
   Формат: <флаг><base64url>. Флаг z — deflate-raw, j — просто JSON.
   Всё лежит в #-фрагменте: он не уходит на сервер хостинга и не попадает
   в логи, а ссылку можно открыть с любого устройства. */
(function () {
  'use strict';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function b64u(bytes) {
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function unb64u(str) {
    let s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  const canDeflate = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

  async function deflate(bytes) {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }

  async function inflate(bytes) {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }

  async function pack(obj) {
    const bytes = enc.encode(JSON.stringify(obj));
    if (canDeflate) {
      try { return 'z' + b64u(await deflate(bytes)); } catch (e) { /* упадём в сырой JSON */ }
    }
    return 'j' + b64u(bytes);
  }

  async function unpack(str) {
    if (!str) return null;
    const flag = str[0];
    const body = str.slice(1);
    let bytes;
    try { bytes = unb64u(body); } catch (e) { return null; }
    try {
      if (flag === 'z') return JSON.parse(dec.decode(await inflate(bytes)));
      if (flag === 'j') return JSON.parse(dec.decode(bytes));
    } catch (e) { return null; }
    return null;
  }

  function uid(n) {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
    const arr = new Uint8Array(n || 10);
    (window.crypto || { getRandomValues: () => arr }).getRandomValues(arr);
    let s = '';
    for (let i = 0; i < arr.length; i++) s += abc[arr[i] % abc.length];
    return s;
  }

  /* Разбор #-фрагмента в объект. Значения не декодируются повторно:
     URLSearchParams уже сделал свою работу. */
  function parseHash(hash) {
    const out = {};
    String(hash || '').replace(/^#/, '').split('&').forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf('=');
      if (i < 0) out[decodeURIComponent(pair)] = '';
      else out[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return out;
  }

  function hasHash(hash) {
    return String(hash || '').replace(/^#/, '').length > 0;
  }

  window.Codec = { pack, unpack, uid, b64u, unb64u, parseHash, hasHash };
})();
