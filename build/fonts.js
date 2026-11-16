/* Скачивает шрифты Unbounded и Manrope и собирает css/fonts.css
   с @font-face на data:-URI. После этого сайт не зависит от Google Fonts.
   Запуск: node build/fonts.js
*/
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SRC = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Unbounded:wght@600;700&display=swap';
const OUT = path.join(__dirname, '..', 'css', 'fonts.css');

(async () => {
  const res = await fetch(SRC, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('fonts css: ' + res.status);
  const css = await res.text();

  const blocks = css.split('@font-face').slice(1).map((part) => {
    const end = part.indexOf('}');
    return '@font-face' + part.slice(0, end + 1);
  });

  const keep = [];
  let total = 0;
  for (const block of blocks) {
    const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1] || '';
    // только кириллица и базовая латиница — остальное на сайте не встречается
    if (!/U\+0400|U\+0000-00FF/i.test(range)) continue;
    const url = (block.match(/url\((https:[^)]+)\)/) || [])[1];
    if (!url) continue;
    const font = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!font.ok) throw new Error('font file: ' + font.status);
    const buf = Buffer.from(await font.arrayBuffer());
    total += buf.length;
    const data = 'data:font/woff2;base64,' + buf.toString('base64');
    keep.push(block.replace(url, data).replace(/url\([^)]*\)\s*format\('woff2'\)/, `url(${data}) format('woff2')`));
  }

  const header = '/* Локальные копии Unbounded и Manrope (Google Fonts, OFL).\n   Сгенерировано build/fonts.js — не редактируйте вручную. */\n';
  fs.writeFileSync(OUT, header + keep.join('\n\n') + '\n', 'utf8');
  console.log(`fonts: ${keep.length} файлов, ${(total / 1024).toFixed(0)} КБ -> ${path.relative(process.cwd(), OUT)}`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
