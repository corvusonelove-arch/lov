/* Локальное хранилище: список приглашений и полученные ответы.
   Всё живёт в браузере — сервера у личной версии нет. */
(function () {
  'use strict';
  const INVITES = 'invitik.invites.v1';
  const ANSWERS = 'invitik.answers.v1';
  const EDIT = 'invitik.edit.v1';

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  };

  window.Store = {
    invites() {
      const list = read(INVITES, []);
      return Array.isArray(list) ? list : [];
    },
    getInvite(id) {
      return this.invites().find((x) => x.id === id) || null;
    },
    saveInvite(record) {
      const list = this.invites().filter((x) => x.id !== record.id);
      list.unshift(record);
      return write(INVITES, list.slice(0, 60));
    },
    removeInvite(id) {
      write(INVITES, this.invites().filter((x) => x.id !== id));
    },
    answers(id) {
      const all = read(ANSWERS, {});
      const list = all[id];
      return Array.isArray(list) ? list : [];
    },
    addAnswer(id, answer) {
      const all = read(ANSWERS, {});
      const list = Array.isArray(all[id]) ? all[id] : [];
      const exists = list.some((a) => a && a.at === answer.at);
      if (!exists) list.unshift(answer);
      all[id] = list.slice(0, 20);
      write(ANSWERS, all);
      return list;
    },
    setEdit(data) { write(EDIT, data); },
    getEdit() { return read(EDIT, null); },
    clearEdit() { try { localStorage.removeItem(EDIT); } catch (e) {} },
  };
})();
