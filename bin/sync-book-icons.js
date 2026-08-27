/**
 * bin/sync-book-icons.js — rewrite BOOK_IMG_DRAWN from what is actually on disk.
 *
 * The book-image picker only reaches for an icon it knows exists. Without this the app would
 * request a file for every option and log a 404 for each one not yet drawn, which is noise in
 * every user's console and hides real errors. Run it after adding icons to images/books/alt.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'src', 'images', 'books', 'alt');
const SRC = path.join(ROOT, 'src', 'index.html');

const slugs = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)).sort()
  : [];

let h = fs.readFileSync(SRC, 'utf8');
const line = 'const BOOK_IMG_DRAWN=new Set(' + JSON.stringify(slugs) + ');';
const re = /const BOOK_IMG_DRAWN=new Set\(\[[^\]]*\]\);/;

if (re.test(h)) h = h.replace(re, line);
else {
  const anchor = 'function bookImageOptions(n){';
  if (!h.includes(anchor)) { console.error('FAIL: anchor not found'); process.exit(1); }
  h = h.replace(anchor, '// Which of the 264 pictures have been drawn. Kept in step by bin/sync-book-icons.js.\n' + line + '\n' + anchor);
}
fs.writeFileSync(SRC, h);
console.log(slugs.length + ' of 264 book icons drawn — BOOK_IMG_DRAWN updated');
