/**
 * QA probe 24 — A COMP CODE IS A LOAN.
 *
 * A code travels by being said out loud, and this one is in the shipped HTML where anybody can read
 * it. As a permanent grant it was a permanent hole in the paid app. Ninety days keeps it useful —
 * for testing, and for carrying somebody who needs it — while making it something that has to be
 * renewed rather than something quietly given away for ever.
 *
 * The case worth having a test for is the second one below. The grant is recorded in TWO places:
 * on the account, which syncs between devices, and in the browser, which does not. If the browser
 * copy is allowed to outlive the account one, an expired code goes on working on the device that
 * typed it — which is the one device where it matters that it stopped.
 *
 *   node tests/qa/comp-code.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(() => {
    const res = {};
    const age = days => { Prog.compPro = Date.now() - days * 86400000; saveProg(); return Billing.isPro(); };

    Billing.revoke();
    res.days = COMP_DAYS;
    res.before = Billing.isPro();
    res.wrongCode = Billing.redeem('notacode');
    res.rightCode = Billing.redeem('elijahsentme');
    res.immediately = Billing.isPro();

    res.day1  = age(1);
    res.day89 = age(89);
    res.day91 = age(91);
    res.day400 = age(400);

    // what the Account screen says about it, which must not imply it is for ever
    Prog.compPro = Date.now(); saveProg();
    renderAcctBox();
    res.saysWhen = (document.getElementById('acctBox') || document.body).innerText.replace(/\s+/g, ' ');

    // and revoking still clears it completely
    Billing.revoke();
    res.afterRevoke = Billing.isPro();
    return res;
  });

  say(r.days === 90,          'a comp code lasts ' + r.days + ' days');
  say(!r.before,              'not Pro before redeeming');
  say(r.wrongCode === false,  'a wrong code is refused');
  say(r.rightCode === true && r.immediately === true, 'the code is accepted and grants Pro at once');
  say(r.day1 === true,        'still Pro the next day');
  say(r.day89 === true,       'still Pro on day 89');
  say(r.day91 === false,      'NOT Pro on day 91 — and the browser copy cannot outlive it');
  say(r.day400 === false,     '...nor a year later');
  say(/Ends \d/.test(r.saysWhen), 'the Account screen says when it ends: ' +
      ((r.saysWhen.match(/Comp code[^·]*·?\s*(Ends [^\s]+)/) || [])[1] || '(not shown)'));
  say(r.afterRevoke === false, 'revoking clears it completely');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nCOMP CODE FAILED' : '\ncomp code clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
