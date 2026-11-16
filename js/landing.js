/* Главная: живое демо в телефоне. */
(function () {
  'use strict';
  const host = document.getElementById('heroDemo');
  if (!host) return;
  const data = Object.assign({}, window.DEMO_HERO, { music: 'none' });
  const demo = window.InviteEngine.mount(host, data, { mode: 'preview' });
  const reset = document.getElementById('demoReset');
  if (reset) reset.addEventListener('click', () => demo.restart(false));
})();
