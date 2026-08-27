/**
 * bin/rank-icon-legibility.js — flag book icons unlikely to read at 30px.
 *
 * The picker shows these at about 30 pixels, so the drawing has to survive a 3.2x shrink of the
 * 96-unit viewBox. This does not judge whether a picture is *right* — only whether it is likely
 * to turn to mush. Two things predict that, and both are measurable:
 *
 *   detail   how many shapes are so small they land under ~3px on screen and vanish
 *   clutter  how many shapes there are at all — past a dozen they stop reading as one object
 *
 * It measures crude bounding boxes from the path data rather than rendering, which is enough to
 * rank; the eye makes the final call on the contact sheet.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'images', 'books', 'alt');
const SCALE = 30 / 96;            // the size it is actually seen at
const VANISHES_UNDER = 3;         // px on screen below which a shape reads as a smudge

const nums = s => (s.match(/-?\d*\.?\d+/g) || []).map(Number);

function extent(tag, attrs, d) {
  if (tag === 'circle') { const r = +(/\br="([\d.]+)"/.exec(attrs) || [])[1] || 0; return r * 2; }
  if (tag === 'ellipse') {
    const rx = +(/\brx="([\d.]+)"/.exec(attrs) || [])[1] || 0;
    const ry = +(/\bry="([\d.]+)"/.exec(attrs) || [])[1] || 0;
    return Math.min(rx, ry) * 2;
  }
  if (tag === 'rect') {
    const w = +(/\bwidth="([\d.]+)"/.exec(attrs) || [])[1] || 0;
    const h = +(/\bheight="([\d.]+)"/.exec(attrs) || [])[1] || 0;
    return Math.min(w, h);
  }
  // path / line / polygon: span of the coordinate cloud, smaller axis
  const v = nums(d || attrs);
  if (v.length < 4) return 96;
  const xs = v.filter((_, i) => i % 2 === 0), ys = v.filter((_, i) => i % 2 === 1);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  return Math.max(Math.min(w, h), 0);
}

const rows = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.svg'))) {
  const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/, '');
  let tiny = 0, shapes = 0;
  for (const m of body.matchAll(/<(path|circle|rect|ellipse|polygon|polyline|line)\b([^>]*)>/g)) {
    // A hairline stroke with no fill is a line of detail, not a mass; count it but weight it same.
    shapes++;
    const d = (/\bd="([^"]*)"/.exec(m[2]) || [])[1];
    if (extent(m[1], m[2], d) * SCALE < VANISHES_UNDER) tiny++;
  }
  rows.push({ slug: f.slice(0, -4), shapes, tiny });
}

// Rank by how much of the drawing disappears, then by sheer shape count.
rows.sort((a, b) => (b.tiny - a.tiny) || (b.shapes - a.shapes));

const risky = rows.filter(r => r.tiny >= 3 || r.shapes > 12);
console.log(rows.length + ' icons measured at 30px\n');
if (!risky.length) { console.log('none look likely to turn to mush'); process.exit(0); }

console.log(risky.length + ' worth a second look on the contact sheet:\n');
console.log('  vanishing  shapes  icon');
risky.slice(0, 30).forEach(r => {
  console.log('  ' + String(r.tiny).padStart(9) + '  ' + String(r.shapes).padStart(6) + '  ' + r.slug);
});
if (risky.length > 30) console.log('\n  ...and ' + (risky.length - 30) + ' more');
