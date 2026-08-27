/**
 * bin/make-icon-sheet.js — build a contact sheet of every book image.
 *
 * The whole question about this artwork is whether a picture still reads once it is shrunk to
 * the size it actually appears at in the picker. So every icon is shown twice: large enough to
 * judge the drawing, and at 30px, which is the size that decides whether it works as a memory
 * hook. Undrawn options are shown as gaps rather than hidden, so the set's coverage is honest.
 *
 *   node bin/make-icon-sheet.js  ->  writes the sheet next to this repo for publishing
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'src', 'images', 'books', 'alt');
const SRC = path.join(ROOT, 'src', 'index.html');
const OUT = process.argv[2] || path.join(ROOT, 'book-icons.html');

const html = fs.readFileSync(SRC, 'utf8');
const slugOf = w => w.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BOOKS = html.slice(html.indexOf('const BOOKS = ['))
  .slice(0, 1400).match(/"[^"]+"/g).map(x => x.slice(1, -1)).slice(0, 66);

const byBook = new Map();
html.match(/const BOOK_IMAGES=\{([\s\S]*?)\n\};/)[1].split('\n').forEach(l => {
  const m = l.match(/^\s*(\d+):\[(.*?)\],?\s*$/);
  if (m) byBook.set(+m[1], m[2].split('","').map(x => x.replace(/^"|"$/g, '')));
});

let drawn = 0, total = 0;
const sections = [];
for (let n = 1; n <= 66; n++) {
  const words = byBook.get(n) || [];
  const cells = words.map(w => {
    total++;
    const f = path.join(DIR, slugOf(w) + '.svg');
    if (!fs.existsSync(f)) {
      return `<figure class="cell empty"><div class="art"><span class="todo">not yet drawn</span></div>
      <figcaption>${esc(w)}</figcaption></figure>`;
    }
    drawn++;
    // Inline the SVG twice at different sizes. Gradient ids are slug-derived, so no collisions;
    // the second copy strips <defs> and points at the first one's gradient.
    const svg = fs.readFileSync(f, 'utf8').trim();
    const big = svg.replace(/\swidth="96"\sheight="96"/, ' class="big"');
    const small = svg.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/\swidth="96"\sheight="96"/, ' class="small"');
    return `<figure class="cell"><div class="art">${big}<div class="thumb" title="the size it is actually remembered at">${small}</div></div>
      <figcaption>${esc(w)}</figcaption></figure>`;
  }).join('\n');

  sections.push(`<section class="book"><h2><span class="num">${n}</span>${esc(BOOKS[n - 1] || 'Book ' + n)}</h2>
  <div class="grid">${cells}</div></section>`);
}

const page = `<title>The Book Images</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Karla:wght@400;600;700&display=swap">
<style>
:root{
  --ground:#f4efe4; --panel:#fffdf8; --edge:#e2d9c6;
  --ink:#1d2b22; --muted:#6b7a6f; --gold:#b5791b; --ember:#c2521a;
  --shadow:0 1px 2px rgba(29,43,34,.07), 0 8px 24px rgba(29,43,34,.06);
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --ground:#0e1a14; --panel:#16261d; --edge:#263b2e;
  --ink:#eae4d5; --muted:#93a598; --gold:#ffcf4d; --ember:#ff8a1e;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 30px rgba(0,0,0,.35);
}}
:root[data-theme="dark"]{
  --ground:#0e1a14; --panel:#16261d; --edge:#263b2e;
  --ink:#eae4d5; --muted:#93a598; --gold:#ffcf4d; --ember:#ff8a1e;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 30px rgba(0,0,0,.35);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font:400 16px/1.6 Karla, ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px; margin:0 auto; padding:56px 24px 96px}

header{margin-bottom:56px; max-width:60ch}
h1{
  font:700 clamp(38px,6vw,64px)/1.02 "Cormorant Garamond", Georgia, serif;
  margin:0 0 14px; letter-spacing:-.01em; text-wrap:balance;
}
.lede{margin:0 0 26px; color:var(--muted); font-size:17px; max-width:56ch}
.tally{
  display:flex; gap:28px; flex-wrap:wrap; align-items:baseline;
  padding:16px 20px; background:var(--panel); border:1px solid var(--edge); border-radius:12px;
}
.tally b{font:700 26px/1 Karla, sans-serif; color:var(--gold); font-variant-numeric:tabular-nums}
.tally span{display:block; font-size:13px; color:var(--muted); margin-top:3px}

.book{margin:0 0 40px}
h2{
  display:flex; align-items:baseline; gap:12px; margin:0 0 16px;
  font:600 22px/1.2 "Cormorant Garamond", Georgia, serif; letter-spacing:.01em;
  padding-bottom:9px; border-bottom:1px solid var(--edge);
}
.num{
  font:700 12px/1 Karla, sans-serif; color:var(--gold);
  font-variant-numeric:tabular-nums; letter-spacing:.08em;
  border:1px solid var(--edge); border-radius:5px; padding:5px 7px;
}
.grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(196px,1fr)); gap:14px}

.cell{
  margin:0; background:var(--panel); border:1px solid var(--edge); border-radius:12px;
  padding:16px 14px 13px; box-shadow:var(--shadow);
}
.art{position:relative; display:flex; align-items:center; justify-content:center; height:104px}
.big{width:92px; height:92px; display:block}
.thumb{
  position:absolute; right:2px; bottom:2px;
  width:38px; height:38px; display:grid; place-items:center;
  border:1px dashed var(--edge); border-radius:8px;
}
.small{width:30px; height:30px; display:block}
figcaption{
  margin-top:11px; font-size:13.5px; line-height:1.35; color:var(--ink);
  text-align:center; text-wrap:balance;
}
.empty .art{border:1px dashed var(--edge); border-radius:10px}
.empty figcaption{color:var(--muted)}
.todo{font-size:11px; color:var(--muted); letter-spacing:.04em}

footer{margin-top:64px; padding-top:22px; border-top:1px solid var(--edge); color:var(--muted); font-size:14px; max-width:62ch}
</style>

<div class="wrap">
<header>
  <h1>The Book Images</h1>
  <p class="lede">Four pictures for every book of the Bible &mdash; the one you choose becomes the
  image you see whenever you think of that book. Each is shown at the size you pick it,
  and again in the dashed square at the size it has to survive: about thirty pixels, glanced at,
  on a phone. If it does not read there, it is not yet a memory hook.</p>
  <div class="tally">
    <div><b>${drawn}</b><span>drawn</span></div>
    <div><b>${total}</b><span>pictures in the set</span></div>
    <div><b>66</b><span>books</span></div>
  </div>
</header>

${sections.join('\n')}

<footer>Look for the ones that turn to mush in the dashed square. Where a picture cannot carry its
phrase at that size, the fix is usually the phrase &mdash; a scene like &ldquo;talking face to face&rdquo;
has no single shape, while a thing like &ldquo;a horn of oil&rdquo; does.</footer>
</div>`;

fs.writeFileSync(OUT, page);
console.log('wrote ' + OUT + ' — ' + drawn + ' of ' + total + ' drawn, ' + Math.round(page.length / 1024) + 'KB');
