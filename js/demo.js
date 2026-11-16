/* Демо-приглашение: показывается на главной и открывается по ссылке ?demo=1.
   Ничего не отправляет и не сохраняет — просто показывает, как это работает. */
(function () {
  'use strict';
  const base = {
    id: 'demo',
    vibe: 'coral',
    openingTitle: 'Для тебя.\nС особым трепетом.',
    openingHint: 'Зажми узел в центре бантика и потяни его вправо',
    music: 'melody',
    image1: 'noto:1f48c',
    question: 'Аня, пойдёшь со мной на свидание?',
    yesText: 'Да! 😍',
    noText: 'Нет',
    yesAnim: 'hearts',
    noAnim: 'runaway',
    confirmTitle: 'Подожди, ты действительно сказала «да»? 😍',
    confirmSub: 'А я так волновался 😄',
    confirmBtn: 'Да, да, ДА!',
    image2: 'noto:1f970',
    dateMode: 'recipient',
    dateTitle: 'Когда тебе удобно? 🗓️',
    dateBtn: 'Подтвердить 💫',
    imageDate: 'noto:1f4c5',
    actTitle: 'Чем займёмся? 😋',
    actSub: 'Выбирай, что по душе',
    imageAct: 'noto:1f355',
    activities: [
      { emoji: '🍕', name: 'Пицца' },
      { emoji: '🎬', name: 'Кино' },
      { emoji: '🌳', name: 'Прогулка' },
      { emoji: '☕', name: 'Кофе' },
    ],
    finalTitle: 'Ура! Это свидание 💛',
    finalDesc: 'Жду тебя {Дата} в {Время}. Нас ждёт {Занятие} 💫',
    imageFinal: 'noto:1f389',
    secretMsg: 'P.S. Я влюбился в тебя ещё в тот день, когда мы впервые проговорили до утра.',
    album: [],
  };

  window.DEMO_INVITE = { ...base, opening: 'ribbon' };
  // для hero: сразу вопрос, без жеста — гостю на главной нечего развязывать
  window.DEMO_HERO = { ...base, opening: 'none' };
})();
