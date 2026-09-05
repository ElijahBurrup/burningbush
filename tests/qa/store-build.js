/**
 * QA probe 22 — NOTHING TAKES MONEY IN A STORE BUILD.
 *
 * The first submission to either store carries no way to spend money at all. Not because it is
 * forbidden outright — since 2025 a US app may link out to its own checkout, and Google now allows
 * it too for a fee — but because review is where an app gets stuck, and a submission with no
 * purchase surface gives a reviewer nothing to argue about.
 *
 * There are six routes to a payment and it only takes one to be missed, so this walks all of them.
 * It runs TWICE: once as the phone app, where every one must be shut, and once as the web, where
 * every one must still be open — because a rule like this is only half a rule until you have shown
 * it did not quietly delete the business everywhere else.
 *
 * What is not a purchase must survive both: redeeming a code somebody else bought, unlocking one
 * lesson with talents earned by using the app, restoring, cancelling, and deleting the account,
 * which Apple requires to be reachable in the app itself.
 *
 *   node tests/qa/store-build.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

// Everything the app can be asked about money, in one sweep, so both runs are compared like for like.
const SURVEY = async (page) => page.evaluate(async () => {
  const res = { calls: [] };
  const vis = id => { const b = document.getElementById(id); return !!b && b.style.display !== 'none'; };
  const tile = slug => !!document.querySelector('#profGrid [data-prof="' + slug + '"]:not([style*="display: none"])');

  // nothing may reach the server to open a checkout
  const realReq = Auth._req;
  Auth._req = async (path, method, body) => {
    res.calls.push(path);
    if (path === '/licence/mine') return { licences: [{ code: 'BB-TEST-0001', seats: 5, status: 'active',
      expiresAt: Date.now() + 200 * 86400000, held: [], past: [] }] };
    return { ok: true };                    // deliberately no url: the real client would navigate away
  };
  // Signed in for both runs. Buying seats and opening checkout each refuse an account-less visitor
  // for their own good reasons, and "it did not open" would then prove nothing about the store rule.
  Store.setJSON('vv_acct', { email: 'owner@example.com', provider: 'password', verified: true });
  Auth._token = 'stub'; Auth.user = { email: 'owner@example.com' };
  renderAcctBox();

  closeEveryOverlay();

  // 1 — the paywall
  openPaywall(null);
  res.pay = { yearly: vis('payYearly'), monthly: vis('payMonthly'), group: vis('payGroup'),
              note: vis('payIosNote'), code: vis('payCode'), lesson: vis('payLesson') };
  closeEveryOverlay();

  // 2 — the profile tiles
  el('themeBtn').click(); buildProfileGrid(); paintProfileGrid();
  res.tiles = { give: tile('give'), licences: tile('group-licences'), account: tile('account') };
  res.pGive = vis('pGive');
  closeEveryOverlay();

  // 3 — giving, and 4 — buying seats: the flows themselves must refuse, not merely be hard to reach
  openGive();     res.giveOpened  = !!(document.getElementById('giveModal')  || {}).style?.display?.includes('flex');
  closeEveryOverlay();
  // openGroupBuy makes its own modal; whatever it is called, a new one appearing IS the surface.
  const before = document.querySelectorAll('.modal').length;
  openGroupBuy();
  res.groupOpened = [...document.querySelectorAll('.modal')].some(x =>
    /seats|licence|group/i.test(x.innerText || '') && x.style.display === 'flex')
    || document.querySelectorAll('.modal').length > before;
  closeEveryOverlay();

  // 5 — checkout, called directly, as a last line
  res.calls.length = 0;
  await Billing.startCheckout('yearly');
  res.checkoutCalled = res.calls.includes('/checkout');

  // 6 — the ask
  Prog.nudge = {}; Prog.onboarded = true;
  Prog.memorized = ['a', 'b', 'c', 'd', 'e']; saveProg();
  res.asks = nudgeAllowed();

  // the owner's own seats stay manageable — that is not a purchase — but not extendable
  openLicences();
  await new Promise(r => setTimeout(r, 180));
  res.licences = { opened: !!document.getElementById('licModal'),
                   showsCode: /BB-TEST-0001/.test((document.getElementById('licModal') || {}).innerText || ''),
                   buyButton: !!document.getElementById('lcBuy') };
  closeEveryOverlay();

  // and the things Apple requires, or that are simply not purchases
  renderAcctBox();
  res.keeps = { deleteAccount: !!document.getElementById('delAcct'),
                redeemCode: typeof openCodeSheet === 'function',
                talentUnlock: typeof LESSON_UNLOCK_COST !== 'undefined' };

  Auth._req = realReq;
  closeEveryOverlay();
  return res;
});

(async () => {
  const browser = await H.chromium().launch();

  const shell = await SURVEY(await H.open(browser, { which: 'built', native: true, prog: H.SEEDED }));
  const web   = await SURVEY(await H.open(browser, { which: 'built', prog: H.SEEDED }));

  out.push('as the phone app — every route to a payment shut');
  say(!shell.pay.yearly && !shell.pay.monthly && !shell.pay.group, '  the paywall shows no price of any kind');
  say(shell.pay.note,        '  ...and says where Pro is set up instead');
  say(!shell.tiles.give && !shell.pGive, '  giving is not offered anywhere');
  say(!shell.giveOpened,     '  ...and the giving screen refuses to open even if something calls it');
  say(!shell.groupOpened,    '  buying seats refuses to open');
  say(!shell.checkoutCalled, '  checkout never reaches the server, called straight');
  say(!shell.asks,           '  the sponsorship ask never comes up');
  say(!shell.licences.buyButton, '  no "buy more seats" on the licence screen');

  out.push('');
  out.push('...while what is not a purchase survives');
  say(shell.pay.code,        '  a group code can still be redeemed');
  say(shell.pay.lesson,      '  one lesson can still be opened with talents');
  say(shell.tiles.licences && shell.licences.opened && shell.licences.showsCode,
                             '  seats already bought stay manageable');
  say(shell.tiles.account && shell.keeps.deleteAccount,
                             '  the account, and deleting it, stays reachable — Apple requires it');

  out.push('');
  out.push('on the web — nothing was quietly taken away');
  say(web.pay.yearly && web.pay.monthly && web.pay.group, '  every price is back');
  say(!web.pay.note,         '  ...and the store line is gone');
  say(web.tiles.give && web.pGive, '  giving is offered again');
  say(web.giveOpened,        '  ...and opens');
  say(web.groupOpened,       '  buying seats opens');
  say(web.checkoutCalled,    '  checkout reaches the server');
  say(web.asks,              '  the ask is allowed again');
  say(web.licences.buyButton, '  and more seats can be bought');

  console.log(out.join('\n'));
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nSTORE BUILD FAILED' : '\nstore build clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
