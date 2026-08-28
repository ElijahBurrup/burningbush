#!/usr/bin/env node
/**
 * bin/build.js — turn src/ into the published burningbush/ folder.
 *
 * The only transformation is path rewriting. The app is served at
 * https://kingdombuilders.ai/burningbush WITH NO TRAILING SLASH, so every relative asset
 * path in src/index.html would resolve against "/" and 404. Each rule below makes one such
 * path absolute.
 *
 * Every rule asserts how many sites it expects to hit. If you add or remove an asset
 * reference this build FAILS rather than silently shipping a broken path — that is the point.
 *
 *   node bin/build.js            build
 *   node bin/build.js --check    verify the published output is up to date, change nothing
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'burningbush');
const CHECK = process.argv.includes('--check');

// [find, replace, expected number of sites]
const RULES = [
  ['src="kjv.js"', 'src="/burningbush/kjv.js"', 1],
  ['href="fonts/fonts.css"', 'href="/burningbush/fonts/fonts.css"', 1],
  ['href="manifest.webmanifest"', 'href="/burningbush/manifest.webmanifest"', 1],
  ['href="images/', 'href="/burningbush/images/', 2],
  ['src="images/', 'src="/burningbush/images/', 4],   // +1 picker default, +1 the fallback when a chosen book image will not load
  ['`images/books/', '`/burningbush/images/books/', 1],   // now only images/books/alt: the default icon moved to a plain src= above
  ['`images/pegs/', '`/burningbush/images/pegs/', 3],
  // VIDEOS[].src is handed to a <video> element at runtime, so a relative path would resolve
  // against /burningbush with no trailing slash and 404. One site per film that has a recording.
  ['src:"videos/', 'src:"/burningbush/videos/', 1],
  // one per translation that is fetched on demand; the KJV is the only one loaded with the page
  ['file:"bibles/', 'file:"/burningbush/bibles/', 5],   // +2 the tile thumbnail (chosen word, then the default)
  // fetched by absolute path: a relative one would resolve to /sw.js against the trailing-slash-less URL
  ['register("sw.js")', 'register("/burningbush/sw.js")', 1],
  ['one("strongs.js")', 'one("/burningbush/strongs.js")', 1],
  ['one("kjvtag.js")', 'one("/burningbush/kjvtag.js")', 1],
];

// copied through untouched
const COPY_FILES = ['sw.js', 'manifest.webmanifest', 'kjv.js', 'strongs.js', 'kjvtag.js'];
const COPY_DIRS = ['images', 'fonts', 'videos', 'bibles'];
// dev-only helpers that live beside the art but must never ship
const SKIP = new Set(['preview.html', 'books-preview.html', 'manifest.json']);

const fail = (m) => { console.error('BUILD FAILED: ' + m); process.exit(1); };

function buildHtml() {
  let h = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const counts = {};
  for (const [from, to, expect] of RULES) {
    const n = h.split(from).length - 1;
    counts[from] = n;
    if (n !== expect) fail(`rule "${from}" matched ${n} site(s), expected ${expect}.\n` +
      `  An asset reference was added, removed or renamed. Update RULES in bin/build.js to match.`);
    h = h.split(from).join(to);
  }
  // nothing relative may survive. ${...} values are built elsewhere or are external URLs.
  const left = [
    ...h.matchAll(/src="(?!\/|https?:|data:|\$\{)[^"]*"/g),
    ...h.matchAll(/href="(?!\/|https?:|#|mailto:|\$\{)[^"]*"/g),
    ...h.matchAll(/`images\/[^`]*`/g),
  ].map(m => m[0]);
  if (left.length) fail('relative paths survived the rewrite: ' + [...new Set(left)].join(', '));
  return { html: h, counts };
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else if (!SKIP.has(e.name)) fs.copyFileSync(a, b);
  }
}
const same = (a, b) => fs.existsSync(a) && fs.existsSync(b) &&
  fs.readFileSync(a).equals(fs.readFileSync(b));

const { html, counts } = buildHtml();
const outHtml = path.join(OUT, 'index.html');
const ver = (html.match(/const APP_VERSION="([^"]+)"/) || [])[1] || '?';

if (CHECK) {
  const stale = [];
  if (!fs.existsSync(outHtml) || fs.readFileSync(outHtml, 'utf8') !== html) stale.push('index.html');
  for (const f of COPY_FILES) if (!same(path.join(SRC, f), path.join(OUT, f))) stale.push(f);
  if (stale.length) fail('published output is stale — run `node bin/build.js`:\n  ' + stale.join(', '));
  console.log(`build --check OK · v${ver} · published output matches src/`);
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(outHtml, html);
for (const f of COPY_FILES) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
for (const d of COPY_DIRS) copyDir(path.join(SRC, d), path.join(OUT, d));

console.log(`built v${ver} → burningbush/`);
console.log('  rewrites: ' + Object.entries(counts).map(([k, v]) => `${v}×${k.slice(0, 22)}`).join(', '));
console.log(`  index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)}KB, ${COPY_FILES.length} data files, ${COPY_DIRS.join(' + ')}`);
