/**
 * QA probe 27 — WRITING WITH THE KEYBOARD UP.
 *
 * On a phone the keyboard takes the bottom half of the screen, so a writing box has to be sized to
 * what is LEFT rather than to what is in it. Everything here is a thing that is only wrong on a real
 * handset and looks perfectly fine on a laptop:
 *
 *   THE TICK IS ABOVE THE BOX.  Below it, it is behind the keyboard, and saving means dismissing the
 *                               keyboard first — an extra thought at the moment you have stopped
 *                               having thoughts.
 *   THE BOX DOES NOT GROW.      A box that grows under your thumbs pushes the sentence you are
 *                               writing up off the screen. It scrolls instead, newest line in view.
 *   IT GROWS WHEN THE KEYBOARD GOES.  Because then there is room, and nobody wants to scroll a
 *                               half-empty screen.
 *
 * The keyboard is simulated by shrinking visualViewport, which is exactly the signal the app reads.
 *
 *   node tests/qa/writing-box.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(async () => {
    const res = {};
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));

    // A keyboard, as the page learns about one: the visual viewport gets shorter.
    const realVV = window.visualViewport;
    let vh = window.innerHeight, listeners = [];
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get height() { return vh; },
        offsetTop: 0,
        addEventListener: (n, fn) => listeners.push(fn),
        removeEventListener: () => {}
      }
    });
    const keyboard = (up) => { vh = up ? Math.round(window.innerHeight * 0.45) : window.innerHeight;
                               listeners.forEach(f => f()); };

    // ── the scene editor ────────────────────────────────────────────────────────────────
    closeEveryOverlay();
    editText({ title: 'A scene', value: '', autoCap: true, onSave: v => { res.saved = v; } });
    await wait(80);

    const ta = document.getElementById('edTa');
    const tick = document.getElementById('edTick');
    res.ed = {
      hasTick: !!tick,
      tickAboveBox: !!tick && (tick.compareDocumentPosition(ta) & Node.DOCUMENT_POSITION_FOLLOWING) > 0,
      hasMic: !!document.getElementById('edMic')
    };

    keyboard(true); await wait(60);
    const withKb = ta.getBoundingClientRect().height;

    // typing a lot must NOT change the height
    ta.value = new Array(60).fill('a long sentence about a nasa ship and a hairbrush').join(' ');
    ta.dispatchEvent(new Event('input'));
    await wait(40);
    const afterTyping = ta.getBoundingClientRect().height;

    res.ed.staysPut = Math.abs(afterTyping - withKb) < 2;
    res.ed.scrolledToEnd = ta.scrollTop > 0 && (ta.scrollTop + ta.clientHeight) >= ta.scrollHeight - 4;
    res.ed.canScroll = getComputedStyle(ta).overflowY === 'auto' || getComputedStyle(ta).overflowY === 'scroll';

    // put the keyboard away and it takes the room
    keyboard(false); await wait(60);
    const noKb = ta.getBoundingClientRect().height;
    res.ed.growsWhenKeyboardGoes = noKb > withKb + 20;
    res.ed.heights = { withKb: Math.round(withKb), noKb: Math.round(noKb) };

    // the tick saves
    keyboard(true); await wait(40);
    ta.value = 'A rose grows out of a welcome mat.'; ta.dispatchEvent(new Event('input'));
    tick.click();
    await wait(60);
    res.ed.tickSaved = res.saved === 'A rose grows out of a welcome mat.';

    // ── the verse box, which had no microphone at all ───────────────────────────────────
    closeEveryOverlay();
    Object.defineProperty(navigator, 'userAgent',
      { value: 'Mozilla/5.0 (Linux; Android 14) Chrome/140', configurable: true });
    res.route = speechRoute();

    const V = document.getElementById('verse');
    // reach the scene step of the verse walk however the app gets there
    let reached = false;
    try {
      const k = Prog.memorized[0] || 'b43c3v16';
      const m = /b(\d+)c(\d+)v(\d+)/.exec(k) || [0, 43, 3, 16];
      openVerseWizard(+m[1], +m[2], +m[3], () => {});
      for (let i = 0; i < 8 && !document.getElementById('wScene'); i++) {
        const nx = V.querySelector('#wNext, #lvNext, .btn'); if (nx) nx.click();
        await wait(40);
      }
      reached = !!document.getElementById('wScene');
    } catch (e) { res.walkErr = String(e.message).slice(0, 80); }

    res.verse = { reached };
    if (reached) {
      const w = document.getElementById('wScene');
      res.verse.hasMic = !!document.getElementById('wMic');
      res.verse.micLabel = (document.getElementById('wMic') || {}).textContent || '';
      res.verse.hasTick = !!document.getElementById('wTick');
      res.verse.tickAboveBox = !!document.getElementById('wTick') &&
        (document.getElementById('wTick').compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
      keyboard(true); await wait(60);
      const a = w.getBoundingClientRect().height;
      w.value = new Array(60).fill('a giant rose smashes into a welcome mat').join(' ');
      w.dispatchEvent(new Event('input'));
      await wait(40);
      res.verse.staysPut = Math.abs(w.getBoundingClientRect().height - a) < 2;
      res.verse.scrolledToEnd = w.scrollTop > 0;
      keyboard(false); await wait(60);
      res.verse.growsWhenKeyboardGoes = w.getBoundingClientRect().height > a + 20;
    }

    Object.defineProperty(window, 'visualViewport', { configurable: true, value: realVV });
    Object.defineProperty(navigator, 'userAgent',
      { value: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140', configurable: true });
    closeEveryOverlay();
    return res;
  });

  say(r.ed.hasTick && r.ed.tickAboveBox, 'the scene editor has a tick, above the box where the keyboard is not');
  say(r.ed.staysPut, 'typing a lot does NOT grow the box (' + r.ed.heights.withKb + 'px, unchanged)');
  say(r.ed.canScroll, '...it scrolls instead');
  say(r.ed.scrolledToEnd, '...and the newest line stays in view');
  say(r.ed.growsWhenKeyboardGoes,
      'putting the keyboard away grows the box (' + r.ed.heights.withKb + 'px → ' + r.ed.heights.noKb + 'px)');
  say(r.ed.tickSaved, 'the tick saves, with the keyboard still up');

  say(r.route === 'keyboard', 'on an Android phone the app points at the keyboard mic');
  say(r.verse.reached, 'the verse scene box was reached' + (r.walkErr ? ' (' + r.walkErr + ')' : ''));
  if (r.verse.reached) {
    say(r.verse.hasMic, '...the verse box now has a speak button, which it never had');
    say(/Speak it/.test(r.verse.micLabel), '...saying "' + r.verse.micLabel.trim() + '"');
    say(r.verse.hasTick && r.verse.tickAboveBox, '...a tick above the box');
    say(r.verse.staysPut, '...which does not grow as you type');
    say(r.verse.scrolledToEnd, '...keeps the newest line in view');
    say(r.verse.growsWhenKeyboardGoes, '...and grows when the keyboard goes away');
  }

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nWRITING BOX FAILED' : '\nwriting box clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
