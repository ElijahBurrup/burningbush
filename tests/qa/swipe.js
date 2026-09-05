/**
 * QA probe 25 — TURNING THE PAGE WITH A THUMB.
 *
 * Swipe left for the next, right for the one before. On a book's chapter list that means the next
 * BOOK; inside a chapter it means the next CHAPTER and never the next book, because a swipe that
 * carried you out of Malachi into Matthew would move you 400 years without your having chosen to.
 *
 * Two failures matter more than the happy path and are the reason this exists:
 *
 *   IT MUST NOT STACK.  #journey survives every render, so handlers attached inside a render
 *                       function would accumulate — and by the fourth chapter one swipe would jump
 *                       four. Navigating repeatedly and then swipING once proves it moved by one.
 *   IT MUST LOSE TIES.  These are long scrolling lists. A gesture that steals an intended scroll is
 *                       worse than one that occasionally misses, so a mostly-vertical drag, a short
 *                       one, and a slow one must all be ignored.
 *
 *   node tests/qa/swipe.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  // A real finger, as the page receives one. Playwright's touchscreen taps but cannot drag, and the
  // gesture is defined by the drag, so the events are made here.
  await page.evaluate(() => {
    window.__swipe = (dx, dy, ms) => {
      const host = document.getElementById('journey');
      const mk = (type, x, y) => {
        const touch = new Touch({ identifier: 1, target: host, clientX: x, clientY: y });
        return new TouchEvent(type, { touches: type === 'touchend' ? [] : [touch],
                                      changedTouches: [touch], bubbles: true, cancelable: true });
      };
      host.dispatchEvent(mk('touchstart', 200, 400));
      const t0 = performance.now();
      while (performance.now() - t0 < (ms || 0)) { /* hold, so the clock really moves */ }
      host.dispatchEvent(mk('touchend', 200 + dx, 400 + dy));
    };
  });

  const at = () => page.evaluate(() => {
    const h = (document.querySelector('#journey h2') || {}).textContent || '';
    const kind = (document.querySelector('#journey .screenkind') || {}).textContent || '';
    return { title: h.trim(), kind: kind.replace(/\s+/g, ' ').trim() };
  });
  const toastText = () => page.evaluate(() => {
    const t = document.getElementById('vvToast');
    return (t && t.style.opacity === '1') ? t.textContent : '';
  });
  const clearToast = () => page.evaluate(() => { const t = document.getElementById('vvToast'); if (t) t.style.opacity = '0'; });

  // ── the chapter list: swiping turns BOOKS ──────────────────────────────────────────────
  await page.evaluate(() => { show('journey'); renderBookScreen(2); });   // Exodus
  let a = await at();
  say(/Exodus/.test(a.title) && /CHAPTERS/.test(a.kind), 'on a book\'s chapter list (' + a.title + ')');

  await page.evaluate(() => window.__swipe(-120, 5, 100));
  a = await at();
  say(/Leviticus/.test(a.title), 'swipe left goes to the next book (' + a.title + ')');

  await page.evaluate(() => window.__swipe(120, -5, 100));
  a = await at();
  say(/Exodus/.test(a.title), 'swipe right goes back (' + a.title + ')');

  // ── it must not stack: navigate a lot, then swipe once ────────────────────────────────
  await page.evaluate(() => { for (let b = 1; b <= 8; b++) renderBookScreen(b); });
  await page.evaluate(() => window.__swipe(-120, 0, 100));
  a = await at();
  // Ruth is book 8, so one swipe must land on book 9 — not book 16, which is where eight stacked
  // handlers would have taken it.
  say(/1 Samuel/.test(a.title), 'after eight renders, one swipe still moves ONE book (' + a.title + ')');

  // ── the covers of the Bible ───────────────────────────────────────────────────────────
  await clearToast();
  await page.evaluate(() => renderBookScreen(1));
  await page.evaluate(() => window.__swipe(120, 0, 100));
  a = await at();
  say(/Genesis/.test(a.title), 'swiping back from Genesis stays put');
  say(/first book/i.test(await toastText()), '...and says why: "' + (await toastText()) + '"');

  await clearToast();
  await page.evaluate(() => renderBookScreen(66));
  await page.evaluate(() => window.__swipe(-120, 0, 100));
  a = await at();
  say(/Revelation/.test(a.title), 'swiping on from Revelation stays put');
  say(/last book/i.test(await toastText()), '...and says why: "' + (await toastText()) + '"');

  // ── inside a chapter: swiping turns CHAPTERS ──────────────────────────────────────────
  await clearToast();
  await page.evaluate(() => renderChapterScreen(2, 3));    // Exodus 3
  a = await at();
  say(/Exodus 3/.test(a.title) && /VERSES/.test(a.kind), 'inside a chapter (' + a.title + ')');

  await page.evaluate(() => window.__swipe(-120, 0, 100));
  a = await at();
  say(/Exodus 4/.test(a.title), 'swipe left is the next chapter (' + a.title + ')');

  await page.evaluate(() => window.__swipe(120, 0, 100));
  a = await at();
  say(/Exodus 3/.test(a.title), 'swipe right is the previous chapter (' + a.title + ')');

  // ── and never out of the book ─────────────────────────────────────────────────────────
  await clearToast();
  await page.evaluate(() => renderChapterScreen(2, 1));
  await page.evaluate(() => window.__swipe(120, 0, 100));
  a = await at();
  say(/Exodus 1/.test(a.title), 'swiping back from chapter 1 does NOT leave the book');
  say(/Start of Exodus/i.test(await toastText()), '...and says so: "' + (await toastText()) + '"');

  await clearToast();
  const last = await page.evaluate(() => { const n = chapCount(2); renderChapterScreen(2, n); return n; });
  await page.evaluate(() => window.__swipe(-120, 0, 100));
  a = await at();
  say(new RegExp('Exodus ' + last).test(a.title), 'swiping on from the last chapter does NOT leave the book');
  say(/End of Exodus/i.test(await toastText()), '...and says so: "' + (await toastText()) + '"');

  // ── it must lose ties with the scroll ─────────────────────────────────────────────────
  await page.evaluate(() => renderChapterScreen(2, 3));
  await page.evaluate(() => window.__swipe(-120, 200, 100));   // mostly vertical
  a = await at();
  say(/Exodus 3/.test(a.title), 'a mostly-vertical drag is a scroll, and is ignored');

  await page.evaluate(() => window.__swipe(-30, 0, 100));      // too short
  a = await at();
  say(/Exodus 3/.test(a.title), 'a short drag is ignored');

  await page.evaluate(() => window.__swipe(-120, 0, 800));     // too slow
  a = await at();
  say(/Exodus 3/.test(a.title), 'a slow drag is somebody scrolling, and is ignored');

  // ── and the all-books grid has nothing to turn ────────────────────────────────────────
  await page.evaluate(() => renderJourney());
  const before = await page.evaluate(() => (document.querySelector('#journey') || {}).innerHTML.length);
  await page.evaluate(() => window.__swipe(-120, 0, 100));
  const after = await page.evaluate(() => (document.querySelector('#journey') || {}).innerHTML.length);
  say(before === after, 'swiping the all-books grid does nothing — there is no next Bible');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nSWIPE FAILED' : '\nswipe clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
