// ─────────────────────────────────────────────────────────────────────────────
// Burning Bush — live content editor.
// Reads the book/number/image text out of index.html, serves an editable page,
// and on Save writes your edits straight back into index.html (the app's data).
// Each save makes a timestamped backup and runs a syntax check; a bad edit is
// rejected and the file is left untouched.
//
//   node content-editor.js        →  http://localhost:4300
// ─────────────────────────────────────────────────────────────────────────────
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, 'index.html');
const PORT = 4300;

// ── read a `const NAME = <literal>` block from source, respecting strings ──
function extractLiteral(src, prefix) {
  const i = src.indexOf(prefix);
  if (i < 0) throw new Error('Not found: ' + prefix);
  let j = i + prefix.length;
  while (/\s/.test(src[j])) j++;
  const open = src[j], close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, q = '';
  let k = j;
  for (; k < src.length; k++) {
    const c = src[k];
    if (inStr) { if (c === '\\') { k++; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { k++; break; } }
  }
  return { start: j, end: k, text: src.slice(j, k) };
}
const parseLiteral = (t) => (new Function('return (' + t + ')'))();
function replaceLiteral(src, prefix, newText) {
  const { start, end } = extractLiteral(src, prefix);
  return src.slice(0, start) + newText + src.slice(end);
}

// ── serializers that match the file's style (unquoted numeric keys) ──
const s = (v) => JSON.stringify(v);                       // safe string/array
function serNumObj(obj) {
  const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
  return '{' + keys.map(k => k + ':' + s(obj[k])).join(',') + '}';
}
function serMnem(obj) {
  const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
  return '{' + keys.map(k => {
    const e = obj[k];
    const fields = Object.keys(e).map(f => f + ':' + s(e[f])).join(',');
    return k + ':{' + fields + '}';
  }).join(',') + '}';
}

function readContent() {
  const src = fs.readFileSync(FILE, 'utf8');
  const get = (p) => parseLiteral(extractLiteral(src, p).text);
  return {
    PEGS: get('const PEGS = '),
    PEGS100: get('const PEGS100 = '),
    MNEM_NUM: get('const MNEM_NUM = '),
    DECODE: get('const DECODE = '),
    NOTE: get('const NOTE = '),
    MNEM_BOOK: get('const MNEM_BOOK = '),
    BOOKS: get('const BOOKS = ')
  };
}

// ── build the payload the editor UI needs ──
function toPayload() {
  const c = readContent();
  const numbers = {};
  for (let n = 0; n <= 176; n++) {
    const word = n <= 99 ? (c.PEGS[n] || '') : (c.PEGS100[n] || '');
    numbers[n] = { word, image: c.MNEM_NUM[n] || '', decode: c.DECODE[n] || '', note: c.NOTE[n] || '' };
  }
  const books = {};
  for (let b = 1; b <= 66; b++) {
    const e = c.MNEM_BOOK[b] || {};
    books[b] = { name: c.BOOKS[b - 1] || ('Book ' + b), s: e.s || '', t: e.t || '' };
  }
  return { numbers, books };
}

// ── apply edits back into index.html ──
function save(edits) {
  const c = readContent();
  // numbers
  for (let n = 0; n <= 176; n++) {
    const row = edits.numbers && edits.numbers[n];
    if (!row) continue;
    const word = (row.word || '').trim();
    if (word) { if (n <= 99) c.PEGS[n] = word; else c.PEGS100[n] = word; }
    const image = (row.image || '').trim();
    if (image) c.MNEM_NUM[n] = image; else delete c.MNEM_NUM[n];
    const note = (row.note || '').trim();
    if (note) c.NOTE[n] = note; else delete c.NOTE[n];
    const decode = (row.decode || '').trim();
    if (decode) c.DECODE[n] = decode; else delete c.DECODE[n];
  }
  // books — merge s/t, preserving any other fields already on the entry
  for (let b = 1; b <= 66; b++) {
    const row = edits.books && edits.books[b];
    if (!row) continue;
    const st = (row.s || '').trim(), tt = (row.t || '').trim();
    if (!st && !tt) continue;
    const e = c.MNEM_BOOK[b] || {};
    if (st) e.s = st; if (tt) e.t = tt;
    c.MNEM_BOOK[b] = e;
  }

  // rebuild source
  let src = fs.readFileSync(FILE, 'utf8');
  src = replaceLiteral(src, 'const PEGS = ', s(c.PEGS));
  src = replaceLiteral(src, 'const PEGS100 = ', serNumObj(c.PEGS100));
  src = replaceLiteral(src, 'const MNEM_NUM = ', serNumObj(c.MNEM_NUM));
  src = replaceLiteral(src, 'const DECODE = ', serNumObj(c.DECODE));
  src = replaceLiteral(src, 'const NOTE = ', serNumObj(c.NOTE));
  src = replaceLiteral(src, 'const MNEM_BOOK = ', serMnem(c.MNEM_BOOK));

  // validate: the whole <script> must still compile
  const m = src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!m) throw new Error('Could not locate the app script for validation.');
  new vm.Script(m[1]); // throws on syntax error → save aborts, file untouched

  // backup then write
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = FILE.replace(/index\.html$/, 'index.backup-' + stamp + '.html');
  fs.copyFileSync(FILE, backup);
  fs.writeFileSync(FILE, src);
  return { ok: true, backup: path.basename(backup) };
}

// ── HTTP ──
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Burning Bush · Content Editor</title>
<style>
 :root{--bg:#0f1115;--panel:#171a21;--panel2:#1e222b;--ink:#e9ecf1;--muted:#9aa3b2;--gold:#e3b34a;--line:#2a2f3a;--good:#4bbf73;--miss:#ff8a8a}
 *{box-sizing:border-box} body{margin:0;background:#0b0d11;color:var(--ink);font-family:"Segoe UI",system-ui,sans-serif}
 header{position:sticky;top:0;z-index:5;background:#0b0d11;border-bottom:1px solid var(--line);padding:12px 18px;display:flex;align-items:center;gap:14px}
 header h1{font-size:16px;margin:0;color:var(--gold)} .tabs{display:flex;gap:8px;margin-left:8px}
 .tab{background:var(--panel2);border:1px solid var(--line);color:var(--ink);padding:7px 14px;border-radius:9px;cursor:pointer;font-weight:700;font-size:13px}
 .tab.on{background:linear-gradient(135deg,#e3b34a,#c9962f);color:#241a02;border-color:var(--gold)}
 .save{margin-left:auto;background:linear-gradient(135deg,#6d9bff,#4b76e6);color:#fff;border:none;padding:9px 18px;border-radius:9px;font-weight:800;cursor:pointer}
 #status{font-size:13px;color:var(--muted)}
 .wrap{max-width:1100px;margin:0 auto;padding:16px}
 table{width:100%;border-collapse:collapse} th{position:sticky;top:56px;background:#0b0d11;text-align:left;color:var(--muted);font-size:12px;padding:6px 8px;border-bottom:1px solid var(--line)}
 td{padding:5px 8px;border-bottom:1px solid #191d25;vertical-align:top} tr:hover td{background:#12151b}
 .n{color:var(--gold);font-weight:800;width:44px} .bk{color:var(--muted);width:120px;font-size:13px}
 input,textarea{width:100%;background:var(--panel2);border:1px solid var(--line);color:var(--ink);border-radius:7px;padding:7px;font:inherit;font-size:13px;resize:vertical}
 textarea{min-height:34px;line-height:1.35} .hide{display:none}
 .hint{color:var(--muted);font-size:12px;margin:2px 0 12px}
</style></head><body>
<header>
 <h1>🔥 Content Editor</h1>
 <div class="tabs"><button class="tab on" data-t="numbers">Numbers 0–176</button><button class="tab" data-t="books">Books 1–66</button></div>
 <button class="save" id="save">💾 Save to app</button><span id="status"></span>
</header>
<div class="wrap">
 <p class="hint">Edit any field, then click <b>Save to app</b>. Changes write straight into index.html (a backup is made every save).</p>
 <div id="numbers"></div>
 <div id="books" class="hide"></div>
</div>
<script>
let DATA=null;
const el=id=>document.getElementById(id);
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
async function load(){
  DATA=await (await fetch('/api/content')).json();
  // numbers table
  let rows='';
  for(let n=0;n<=176;n++){const r=DATA.numbers[n];
    rows+=\`<tr><td class="n">\${n}</td>
      <td style="width:130px"><input data-nk="\${n}" data-f="word" value="\${esc(r.word)}"></td>
      <td><textarea data-nk="\${n}" data-f="image" placeholder="image / scene text">\${esc(r.image)}</textarea></td>
      <td style="width:200px"><input data-nk="\${n}" data-f="note" value="\${esc(r.note)}" placeholder="short note (optional)"></td>
      <td style="width:230px"><textarea data-nk="\${n}" data-f="decode" placeholder="0–5 decode hook (optional)">\${esc(r.decode)}</textarea></td></tr>\`;}
  el('numbers').innerHTML='<table><thead><tr><th>#</th><th>Word</th><th>Image / scene text</th><th>Note</th><th>Decode</th></tr></thead><tbody>'+rows+'</tbody></table>';
  // books table
  let brows='';
  for(let b=1;b<=66;b++){const r=DATA.books[b];
    brows+=\`<tr><td class="n">\${b}</td><td class="bk">\${esc(r.name)}</td>
      <td style="width:300px"><input data-bk="\${b}" data-f="s" value="\${esc(r.s)}" placeholder="soundalike"></td>
      <td><textarea data-bk="\${b}" data-f="t" placeholder="full relationship text">\${esc(r.t)}</textarea></td></tr>\`;}
  el('books').innerHTML='<table><thead><tr><th>#</th><th>Book</th><th>Soundalike</th><th>Full image / relationship text</th></tr></thead><tbody>'+brows+'</tbody></table>';
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));
  el('numbers').classList.toggle('hide',t.dataset.t!=='numbers');
  el('books').classList.toggle('hide',t.dataset.t!=='books');
});
el('save').onclick=async()=>{
  const edits={numbers:{},books:{}};
  document.querySelectorAll('[data-nk]').forEach(i=>{const n=i.dataset.nk;(edits.numbers[n]=edits.numbers[n]||{})[i.dataset.f]=i.value;});
  document.querySelectorAll('[data-bk]').forEach(i=>{const b=i.dataset.bk;(edits.books[b]=edits.books[b]||{})[i.dataset.f]=i.value;});
  el('status').textContent='Saving…';
  try{const res=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(edits)});
    const j=await res.json();
    el('status').innerHTML = j.ok ? '<span style="color:#4bbf73">✓ Saved to index.html (backup: '+j.backup+')</span>'
                                  : '<span style="color:#ff8a8a">✗ '+esc(j.error)+'</span>';
  }catch(e){el('status').innerHTML='<span style="color:#ff8a8a">✗ '+esc(e.message)+'</span>';}
};
load();
</script></body></html>`;

http.createServer((req, res) => {
  try {
    if (req.url === '/' || req.url === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGE); return;
    }
    if (req.url === '/api/content') {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(toPayload())); return;
    }
    if (req.url === '/api/save' && req.method === 'POST') {
      let body = ''; req.on('data', d => body += d);
      req.on('end', () => {
        try { const r = save(JSON.parse(body)); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(r)); }
        catch (e) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: e.message })); }
      });
      return;
    }
    res.writeHead(404); res.end('not found');
  } catch (e) { res.writeHead(500); res.end(e.message); }
}).listen(PORT, () => {
  console.log('\n  🔥 Burning Bush content editor → http://localhost:' + PORT + '\n     Editing: ' + FILE + '\n');
});
