#!/usr/bin/env node
/* Rebuilds tests/fixtures/content.json from the live content bundle.

   The tests never reach the API: tests/lib/harness.js hands every page this file as its answer to
   GET /api/content. Its videos are the real ones, so the specs and snapshots see what users see; its
   announcements and settings are emptied, because those are exercised by specs that set their own,
   and a live announcement must not turn up in a snapshot. Run after a change to the videos that the
   tests should know about, then bless the snapshots that move:

     node tools/content-fixture.js            (production)
     node tools/content-fixture.js --qa       (the sandbox API)                                   */
const fs = require('fs'), path = require('path'), https = require('https');
const url = process.argv.includes('--qa')
  ? 'https://burningbush-api-qa.onrender.com/api/content'
  : 'https://burningbush-api.onrender.com/api/content';
const out = path.join(__dirname, '..', 'tests', 'fixtures', 'content.json');

https.get(url, { timeout: 120000 }, res => {
  if (res.statusCode !== 200) { console.error('GET', url, '→', res.statusCode); process.exit(1); }
  let body = '';
  res.setEncoding('utf8');
  res.on('data', c => body += c);
  res.on('end', () => {
    const b = JSON.parse(body);
    if (!b.media || !b.media.chapter) { console.error('No media in the bundle.'); process.exit(1); }
    const fixture = { v: 'fixture', media: b.media, announcements: [], config: null, suggested: null, stories: null };
    fs.writeFileSync(out, JSON.stringify(fixture));
    const n = l => Object.keys(b.media[l] || {}).length;
    console.log(`wrote ${path.relative(process.cwd(), out)}: ${n('book')} books, ${n('chapter')} chapters, ${n('verse')} verses with video`);
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
