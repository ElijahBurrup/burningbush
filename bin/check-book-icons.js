/**
 * bin/check-book-icons.js — validate every drawn book icon on disk.
 *
 * The icons are authored by drawing agents that write straight into images/books/alt, so nothing
 * stands between a malformed file and the app. This is that gate: run it before every deploy.
 * A file that fails here would render as a blank box in the picker, which reads as a broken app.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'src', 'images', 'books', 'alt');
const SRC = path.join(ROOT, 'src', 'index.html');

const slugOf = w => w.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const known = new Set(
  fs.readFileSync(SRC, 'utf8').match(/const BOOK_IMAGES=\{([\s\S]*?)\n\};/)[1]
    .split('\n').flatMap(l => {
      const m = l.match(/^\s*\d+:\[(.*)\],?\s*$/);
      return m ? m[1].split('","').map(x => x.replace(/^"|"$/g, '')) : [];
    }).map(slugOf)
);

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.svg')) : [];
const bad = [];

files.forEach(f => {
  const slug = f.slice(0, -4);
  const svg = fs.readFileSync(path.join(DIR, f), 'utf8').trim();
  const fail = r => bad.push(f + ': ' + r);

  if (!known.has(slug)) return fail('not one of the 264 image names');
  if (/&lt;|&gt;|&amp;lt;/.test(svg)) return fail('HTML-escaped rather than raw SVG');
  if (!/^<svg[\s>]/.test(svg)) return fail('does not start with <svg');
  if (!/<\/svg>$/.test(svg)) return fail('does not end with </svg>');
  if (!/viewBox="0 0 96 96"/.test(svg)) return fail('wrong or missing viewBox');
  if (/<script|<image|xlink:href|href="http|url\(http/i.test(svg)) return fail('external or scripted content');
  if (/<text[\s>]/i.test(svg)) return fail('contains text, which will not read at 30px');

  const shapes = (svg.match(/<(path|circle|rect|ellipse|polygon|polyline|line)\b/g) || []).length;
  if (shapes < 3) return fail('only ' + shapes + ' shapes — too plain to read');
  if (svg.length > 6000) return fail('unusually large (' + svg.length + ' bytes)');

  // A gradient referenced but never defined paints the shape black.
  const used = new Set([...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]));
  const defined = new Set([...svg.matchAll(/<(?:linear|radial)Gradient[^>]*\bid="([^"]+)"/g)].map(m => m[1]));
  used.forEach(id => { if (!defined.has(id)) fail('references gradient #' + id + ' that is never defined'); });
});

console.log(files.length + ' of 264 book icons drawn');
if (bad.length) {
  console.log('\n' + bad.length + ' problem(s):');
  bad.forEach(b => console.log('  x ' + b));
  process.exit(1);
}
console.log('all valid');
