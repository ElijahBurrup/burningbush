/**
 * tests/layout/overflow.js — nothing may run off the right edge, and the way forward must
 * always be reachable.
 *
 * This is the class of bug that shipped twice: the Verses hub whose grid tracks blew past the
 * content box (v1.2.0), and Caesar's Build button pushed below the fold once the result text
 * appeared (v1.9.1). Both were invisible in code review and obvious in a measured browser.
 */
const { chromium, open, stopServer, SEEDED } = require('../lib/harness');
const T = require('../lib/t');
const { describe, is, ok } = T;

const THEMES = ['classic', 'illumined', 'glass', 'quest', 'buddy'];
const WIDTHS = [[320, 568], [360, 640], [390, 844], [414, 896]];
const TABS = ['learn', 'verse', 'palace', 'journey', 'stories'];

(async () => {
  const browser = await chromium().launch();

  // A phase prize must fit inside its ticket. Phase names run long, and it spilled past the box.
  describe('scratch card', () => { });
  for (const [w, h] of WIDTHS) {
    const page = await open(browser, { width: w, height: h, prog: SEEDED });
    const worst = await page.evaluate(() => {
      let over = 0, where = '';
      phaseIdxs().forEach(idx => {
        openPhaseScratch(idx);
        const box = document.querySelector('#scov .scticket').getBoundingClientRect().height;
        const need = document.querySelector('#scov .scprize').scrollHeight;
        if (need - box > over) { over = need - box; where = UNITS[idx].name; }
        el('scov').classList.remove('on');
      });
      return { over, where };
    });
    ok(worst.over <= 1, 'every phase prize fits its ticket at ' + w + 'x' + h + (worst.over > 1 ? ' (' + worst.where + ' over by ' + Math.round(worst.over) + 'px)' : ''));
    await page.close();
  }

  describe('tabs', () => { });
  for (const [w, h] of WIDTHS) {
    const page = await open(browser, { width: w, height: h, prog: SEEDED });
    for (const theme of THEMES) {
      await page.evaluate(t => applyTheme(t), theme);
      const worst = await page.evaluate(tabs => {
        let worst = 0, where = '';
        for (const tab of tabs) {
          show(tab); refreshCurrentView();
          document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
          const c = document.querySelector('.content'), cr = c.getBoundingClientRect();
          c.querySelectorAll('*').forEach(e => {
            const r = e.getBoundingClientRect();
            if (r.width && r.right - cr.right > worst) { worst = Math.round(r.right - cr.right); where = tab + ' ' + (e.className || e.tagName); }
          });
          if (c.scrollWidth - c.clientWidth > worst) { worst = c.scrollWidth - c.clientWidth; where = tab + ' (horizontal scroll)'; }
        }
        return { worst, where };
      }, TABS);
      is(worst.worst, 0, `${w}×${h} ${theme}: nothing overflows${worst.worst ? ' — ' + worst.where : ''}`);
    }
    await page.close();
  }

  describe('overlays', () => { });
  for (const [w, h] of WIDTHS) {
    const page = await open(browser, { width: w, height: h, pro: true, prog: SEEDED });
    // Rome's letter must be readable without scrolling
    const letter = await page.evaluate(() => {
      Prog.romeLetterSeen = false; saveProg(); openRomeLetter();
      const ov = el('taxov');
      const r = { scroll: Math.max(0, ov.scrollHeight - ov.clientHeight),
        topbarClear: ov.getBoundingClientRect().top >= document.querySelector('.topbar').getBoundingClientRect().bottom - 1 };
      ov.classList.remove('on', 'march'); return r;
    });
    is(letter.scroll, 0, `${w}×${h}: Rome's letter fits on one screen`);
    ok(letter.topbarClear, `${w}×${h}: the counters stay visible behind Caesar`);

    // and after the wheel stops, the way forward must be in reach
    const wheel = await page.evaluate(async () => {
      Prog.talents = 3000; Prog.taxAt = Date.now() - 8 * 86400000;
      Prog.church = { given: 0, built: 0, total: 0 }; saveProg();
      openTaxWheel(false); el('taxGo').click();
      await new Promise(r => setTimeout(r, 5200));
      const ov = el('taxov'), b = el('taxBuild');
      const ovr = ov.getBoundingClientRect(), br = b.getBoundingClientRect();
      const r = { visible: br.bottom <= ovr.bottom + 1 && br.top >= ovr.top - 1, clearance: Math.round(ovr.bottom - br.bottom) };
      ov.classList.remove('on', 'march'); return r;
    });
    ok(wheel.visible, `${w}×${h}: the Build button is fully on screen (${wheel.clearance}px clear)`);
    await page.close();
  }

  await browser.close(); stopServer();
  process.exit(T.report('layout') ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
