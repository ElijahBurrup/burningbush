/* tests/sound/run.js — the recordings, in a real browser.

   The palette used to be synthesised, and a synthesised sound cannot fail to arrive: the oscillator
   is always there. Recordings can fail in ways tones never could — a file missing from the build, a
   path that resolves against the wrong folder, a codec the browser will not decode, a key in the
   map naming a file nobody shipped. None of those throw; they are simply silent, which is the one
   failure a person cannot report precisely. So the browser is asked to fetch and DECODE every file
   the map names, and to say which ones it could not.

   Audio cannot be heard from here, and this does not pretend to judge how anything sounds. It
   checks that every sound the app can ask for is present, decodable, and reachable at the path the
   built app actually requests. */
const { chromium, open, stopServer } = require('../lib/harness');

let pass = 0, fail = 0;
const bad = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++; bad.push('  ✗ ' + name + (detail ? ' — ' + detail : ''));
}

(async () => {
  const browser = await chromium().launch();
  const page = await open(browser, { which: 'built' });

  // What the built app believes about its own sounds.
  const meta = await page.evaluate(() => ({
    dir: typeof SFX_DIR === 'undefined' ? null : SFX_DIR,
    keys: typeof SFX_FILES === 'undefined' ? null : Object.keys(SFX_FILES),
    files: typeof SFX_FILES === 'undefined' ? null
      : [...new Set([].concat(...Object.keys(SFX_FILES).map(k => SFX_FILES[k][0])))],
    gains: typeof SFX_FILES === 'undefined' ? null
      : Object.keys(SFX_FILES).map(k => SFX_FILES[k][1]),
    palette: typeof Sfx === 'undefined' || !Sfx._palette ? null : Object.keys(Sfx._palette)
  }));

  check('the map reached the built app', !!meta.keys, 'SFX_FILES is not defined');
  if (!meta.keys) { await browser.close(); stopServer(); return done(); }

  check('the sounds folder is root-absolute for the web', meta.dir === '/sounds/', 'SFX_DIR is ' + meta.dir);

  // Every key in the map must be a real palette entry, or it is a recording nothing can play.
  const orphan = meta.keys.filter(k => !meta.palette.includes(k));
  check('every mapped key exists in the palette', orphan.length === 0, orphan.join(', '));

  // Every gain must be sane. A gain of 0 is a silent sound that looks wired.
  const quiet = meta.keys.filter((k, i) => !(meta.gains[i] > 0 && meta.gains[i] <= 1));
  check('every gain is above zero and no louder than full', quiet.length === 0, quiet.join(', '));

  /* The real test: fetch and decode each file exactly as the app does. decodeAudioData is the
     step that catches a codec the browser refuses — a 200 response proves only that something
     was served, not that it is playable audio. */
  const result = await page.evaluate(async ({ dir, files }) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const missing = [], undecodable = [];
    let bytes = 0;
    for (const f of files) {
      let buf;
      try {
        const r = await fetch(dir + f);
        if (!r.ok) { missing.push(f + ' (' + r.status + ')'); continue; }
        buf = await r.arrayBuffer();
        bytes += buf.byteLength;
      } catch (e) { missing.push(f + ' (' + e.message + ')'); continue; }
      try {
        const d = await new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej));
        if (!d || !d.duration) undecodable.push(f + ' (empty)');
      } catch (e) { undecodable.push(f + ' (' + (e && e.message || 'decode failed') + ')'); }
    }
    return { missing, undecodable, bytes, count: files.length };
  }, { dir: meta.dir, files: meta.files });

  check('every recording is served', result.missing.length === 0, result.missing.slice(0, 6).join(', '));
  check('every recording decodes as audio', result.undecodable.length === 0, result.undecodable.slice(0, 6).join(', '));

  /* Asking for a sound must never throw, whether it has a recording or falls through to the tones.
     Each key is played through the same path the app uses, with the switch on. */
  const threw = await page.evaluate((keys) => {
    const out = [];
    try { Sfx.unlock(); } catch (e) { return ['unlock: ' + e.message]; }
    for (const k of keys) {
      try { Sfx._play(k); } catch (e) { out.push(k + ': ' + (e && e.message)); }
    }
    return out;
  }, meta.palette);
  check('playing every sound in the palette throws nothing', threw.length === 0, threw.slice(0, 5).join(', '));

  // A sound whose switch is off must stay silent, recordings included: the settings screen is the
  // whole reason the map goes through the same gate the tones did.
  const gated = await page.evaluate(() => {
    const k = Object.keys(SFX_FILES)[0];
    sfxSetEnabled(k, false);
    const off = sfxEnabled(k);
    sfxSetEnabled(k, true);
    return { off, on: sfxEnabled(k) };
  });
  check('a recording still answers to its own switch', gated.off === false && gated.on === true);

  await browser.close();
  stopServer();
  done(result);

  function done(r) {
    if (fail) {
      console.log('sound: ' + pass + '/' + (pass + fail) + ' passed');
      bad.forEach(b => console.log(b));
      process.exitCode = 1;
    } else {
      const mb = r ? (r.bytes / 1048576).toFixed(2) : '?';
      console.log('PASS — ' + pass + ' checks, ' + (r ? r.count : 0) + ' recordings decode (' + mb + 'MB)');
    }
  }
})().catch(e => { console.log('sound: ' + e.stack); process.exitCode = 1; });
