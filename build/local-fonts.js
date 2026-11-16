/* Подключает локальные шрифты вместо Google Fonts во всех страницах. */
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(path.join(__dirname, '..')).filter((f) => f.endsWith('.html'));
let changed = 0;

for (const name of files) {
  const p = path.join(__dirname, '..', name);
  let html = fs.readFileSync(p, 'utf8');
  const before = html;
  html = html.replace(/\s*<link rel="preconnect"[^>]*>\n?/g, '\n');
  html = html.replace(
    /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">/g,
    '<link rel="stylesheet" href="css/fonts.css">',
  );
  if (html !== before) {
    fs.writeFileSync(p, html, 'utf8');
    changed++;
    console.log('обновлён', name);
  }
}
console.log('итого:', changed);
