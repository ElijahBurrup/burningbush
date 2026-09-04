/**
 * QA probe 19 — SEATS, GIVING, AND THE ONE TIME THE APP ASKS.
 *
 * Three new surfaces, all of which touch money or somebody's goodwill, so the rules matter more than
 * the pixels: an owner must be able to see which seats are going unused and take one back, a code
 * they choose must not be guessable in an evening, giving must be framed in people rather than
 * dollars, and the ask must be rare, well-timed, and stoppable for good.
 *
 * The server is stubbed. Nothing is bought and nothing is revoked by running this.
 *
 *   node tests/qa/licences.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(async () => {
    const res = {}, calls = [];
    closeEveryOverlay();
    Store.setJSON('vv_acct', { email: 'pastor@example.com' });
    Auth._token = 'stub'; Auth.user = { email: 'pastor@example.com' };
    const real = Auth._req;
    Auth._req = async (path, method, body) => {
      calls.push({ path, method, body });
      if (path === '/licence/mine') return { licences: [{
        code: 'BB-7K2M-QX4P', seats: 5, status: 'active', assignments: 3,
        expiresAt: Date.now() + 200 * 86400000,
        held: [
          { seatId: 11, email: 'keen@example.com',  since: '2026-08-01', daysThisMonth: 12, versesAll: 30, questionsAll: 400 },
          { seatId: 12, email: 'quiet@example.com', since: '2026-08-01', daysThisMonth: 0,  versesAll: 1,  questionsAll: 12 }
        ],
        past: [{ email: 'left@example.com', since: '2026-06-01', until: '2026-07-15' }]
      }]};
      if (path === '/licence/code') return { ok: true, code: String(body.code) };
      // Deliberately no url: the real client would navigate to Stripe on one, which destroys the
      // page context mid-probe. The call itself is what is being checked.
      return { ok: true };
    };

    // it is reachable from the Profile
    el('themeBtn').click(); buildProfileGrid(); paintProfileGrid();
    const slugs = [...document.querySelectorAll('#profGrid [data-prof]')].map(b => b.dataset.prof);
    res.inProfile = { licences: slugs.includes('group-licences'), give: slugs.includes('give') };
    closeEveryOverlay();

    // the owner's view
    openLicences();
    await new Promise(r2 => setTimeout(r2, 150));
    const txt = (el('licModal').innerText || '').replace(/\s+/g, ' ');
    res.owner = {
      code: /BB-7K2M-QX4P/.test(txt),
      usage: /2 of 5 seats in use/.test(txt),
      free: /3 free/.test(txt),
      flagsIdle: /not used this month/.test(txt),
      showsActivity: /12 days this month/.test(txt),
      revokeButtons: document.querySelectorAll('#licModal [data-revoke]').length,
      canChangeCode: !!document.querySelector('#licModal [data-newcode]')
    };

    // taking a seat back
    calls.length = 0;
    document.querySelector('#licModal [data-revoke]').click();
    await new Promise(r2 => setTimeout(r2, 120));
    res.revoked = calls.find(c => c.path === '/licence/revoke') || null;

    // the code rules, enforced before the server is troubled
    closeEveryOverlay(); askNewCode('BB-7K2M-QX4P', () => {});
    const tryCode = v => { el('csIn').value = v; el('csIn').oninput(); return !el('csGo').disabled; };
    res.codes = {
      tooShort: tryCode('GRACE1'), noDigit: tryCode('GRACEGRACE'), noLetter: tryCode('12345678'),
      symbols: tryCode('GRACE!!!2026'), good: tryCode('GRACE2026')
    };
    closeEveryOverlay();

    // giving, in people rather than dollars
    openGive();
    const gtxt = (el('giveModal').innerText || '').replace(/\s+/g, ' ');
    res.give = {
      people: /people/.test(gtxt) && /\$99/.test(gtxt),
      year: /One person for a year/.test(gtxt) && /\$35/.test(gtxt),
      any: !!el('gvAmt'),
      notDeductible: /not tax-deductible/i.test(gtxt),
      monthAtATime: /a month at a time/i.test(gtxt)
    };
    el('gvMore').click(); el('gvMore').click();
    const g3 = (el('giveModal').innerText || '').replace(/\s+/g, ' ');
    res.give.scales = /15/.test(g3) && /297/.test(g3);
    calls.length = 0; el('gvYear').click();
    await new Promise(r2 => setTimeout(r2, 100));
    res.gift = calls.find(c => c.path === '/gift/checkout') || null;
    closeEveryOverlay();

    // the ask: every reason not to show it
    Prog.nudge = {}; Prog.onboarded = true; Prog.memorized = ['a', 'b', 'c', 'd', 'e']; saveProg();
    res.nudge = { whenReady: nudgeAllowed() };
    Prog.memorized = ['a']; saveProg();            res.nudge.tooNew = !nudgeAllowed();
    Prog.memorized = ['a', 'b', 'c', 'd', 'e'];
    Prog.nudge = { at: Date.now() }; saveProg();   res.nudge.tooSoon = !nudgeAllowed();
    Prog.nudge = { dismissed: 2 }; saveProg();     res.nudge.twiceWavedAway = !nudgeAllowed();
    Prog.nudge = { off: 1 }; saveProg();           res.nudge.toldToStop = !nudgeAllowed();
    Prog.nudge = {}; saveProg();
    el('payModal').style.display = 'flex';         res.nudge.notOverSomething = !nudgeAllowed();
    el('payModal').style.display = 'none';

    // and it travels with the account
    const merged = mergeProg(migrateProg({ nudge: { off: 1 } }), migrateProg({ nudge: { dismissed: 1 } }));
    res.nudge.mergesOff = !!merged.nudge.off;

    Auth._req = real; closeEveryOverlay();
    return res;
  });

  say(r.inProfile.licences && r.inProfile.give, 'both new sections appear in the Profile menu');
  say(r.owner.code && r.owner.usage && r.owner.free, 'the owner sees the code, seats used, and seats free');
  say(r.owner.showsActivity, '...how much each seat is being used');
  say(r.owner.flagsIdle, '...and says plainly which one is going unused');
  say(r.owner.revokeButtons === 2, '...with a way to take each seat back');
  say(r.owner.canChangeCode, '...and a way to change the code');
  say(r.revoked && r.revoked.body.seatId === 11, 'taking a seat back calls the server with that seat');
  say(!r.codes.tooShort && !r.codes.noDigit && !r.codes.noLetter && !r.codes.symbols,
      'a weak code is refused before the server is troubled');
  say(r.codes.good, '...and a reasonable one is accepted');
  say(r.give.people && r.give.year && r.give.any, 'giving offers five people, one person, or any amount');
  say(r.give.scales, '...and scales in batches (three is 15 people, $297)');
  say(r.give.monthAtATime, '...saying the money is drawn a month at a time');
  say(r.give.notDeductible, '...and that it is not tax-deductible');
  say(r.gift && r.gift.body.cents === 3500, 'a gift opens checkout for the right amount');
  say(r.nudge.whenReady, 'the ask is allowed once somebody has five verses and is settled');
  say(r.nudge.tooNew, '...never before they have got something out of it');
  say(r.nudge.tooSoon, '...never twice inside three weeks');
  say(r.nudge.twiceWavedAway, '...never again after two brush-offs');
  say(r.nudge.toldToStop, '...and never once told to stop');
  say(r.nudge.notOverSomething, '...nor on top of something already open');
  say(r.nudge.mergesOff, '"never again" on one device is never again on all of them');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nLICENCES FAILED' : '\nlicences clean');
  await browser.close(); await H.stopServer();
})();
