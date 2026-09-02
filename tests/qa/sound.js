/**
 * QA probe 8 — SOUND.
 *
 * Two things the behaviour suite cannot check, because by the time it gets there it has clicked
 * several thousand times and one of those clicks woke the audio engine:
 *
 *   1. a page nobody has touched makes no sound at all;
 *   2. the wake gesture is what changes that, and it takes itself off afterwards.
 *
 * Everything else about sound — the counts, the switch, the per-screen motifs — is in behaviour.js.
 *
 *   node tests/qa/sound.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    let made = 0;
    const proto = (window.AudioContext || window.webkitAudioContext).prototype;
    const real = proto.createOscillator;
    proto.createOscillator = function () { made++; return real.apply(this, arguments); };
    const count = fn => { made = 0; try { fn(); } catch (e) { return 'threw: ' + e.message; } return made; };

    // nothing has been touched yet
    const cold = count(() => { Sfx.right(); Sfx.wrong(); Sfx.coins(50); Sfx.screen('verse'); });
    const alsoCold = count(() => show('verse'));          // even arriving somewhere is silent

    // the reader touches the screen, which is what browsers require and what manners require
    window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const warm = count(() => Sfx.right());

    // and the wake listeners are done with — a second gesture changes nothing
    window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const stillWarm = count(() => Sfx.right());

    proto.createOscillator = real;
    return { cold, alsoCold, warm, stillWarm };
  });

  say(r.cold === 0, 'a page nobody has touched is silent');
  say(r.alsoCold === 0, '...even walking into a screen makes no sound');
  say(r.warm > 0, 'the first touch anywhere wakes it');
  say(r.stillWarm > 0, '...and it stays awake');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nSOUND FAILED' : '\nsound clean');
  await browser.close(); await H.stopServer();
})();
