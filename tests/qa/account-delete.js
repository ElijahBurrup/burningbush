/**
 * QA probe 18 — DELETING AN ACCOUNT.
 *
 * Both app stores require this, require it to be reachable from inside the app, and require it to be
 * a real deletion rather than a flag on a row. It is a rejection item, so it is worth a probe of its
 * own — and it is the one action in the app that cannot be undone, so the guards matter more here
 * than anywhere else.
 *
 * The server is stubbed throughout. Nothing real is deleted by running this.
 *
 *   node tests/qa/account-delete.js
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
    closeEveryOverlay();

    // signed in, with progress worth losing
    Store.setJSON('vv_acct', { email: 'someone@example.com' });
    Auth._token = 'stub'; Auth.user = { email: 'someone@example.com' };
    Prog.memorized = ['43:3:16', '19:119:11']; Prog.talents = 900; saveProg();

    // the server never actually answers in here
    const calls = [];
    const realReq = Auth._req;
    Auth._req = async (path, method, body) => { calls.push({ path, method, body }); return { ok: true }; };

    el('themeBtn').click(); renderAcctBox();
    res.offered = !!el('delAcct');
    el('delAcct').click();
    res.asks = { email: !!el('daEmail'), password: !!el('daPw'), armed: !el('daGo').disabled };

    // the warning has to name what is really being deleted
    const txt = (el('delAcctModal').innerText || '').replace(/\s+/g, ' ');
    res.warns = { kingdom: /Kingdom Builders/i.test(txt), undone: /cannot be undone/i.test(txt),
                  billing: /charged again|cancelled/i.test(txt) };

    // wrong email, right password: still refused
    el('daEmail').value = 'someoneelse@example.com'; el('daEmail').oninput();
    el('daPw').value = 'hunter2'; el('daPw').oninput();
    res.wrongEmail = el('daGo').disabled;

    // right email, no password: still refused
    el('daEmail').value = 'someone@example.com'; el('daEmail').oninput();
    el('daPw').value = ''; el('daPw').oninput();
    res.noPassword = el('daGo').disabled;

    // both right: armed
    el('daPw').value = 'hunter2'; el('daPw').oninput();
    res.armed = !el('daGo').disabled;

    await el('daGo').onclick();
    res.called = calls.length === 1 ? calls[0] : null;
    res.after = { token: Auth._token, acct: Store.getJSON('vv_acct', null),
                  verses: (Prog.memorized || []).length, talents: Prog.talents || 0,
                  sheetGone: getComputedStyle(el('delAcctModal')).display === 'none' };

    // a server that refuses must leave everything exactly as it was
    Auth._req = async () => { throw new Error('Incorrect password.'); };
    Store.setJSON('vv_acct', { email: 'someone@example.com' });
    Auth._token = 'stub'; Prog.memorized = ['43:3:16']; saveProg();
    el('themeBtn').click(); renderAcctBox(); el('delAcct').click();
    el('daEmail').value = 'someone@example.com'; el('daEmail').oninput();
    el('daPw').value = 'wrong'; el('daPw').oninput();
    await el('daGo').onclick();
    res.refused = { stillSignedIn: !!Auth._token, versesKept: (Prog.memorized || []).length,
                    said: (el('daMsg').innerText || '').trim(),
                    canRetry: !el('daGo').disabled };

    Auth._req = realReq; closeEveryOverlay();
    return res;
  });

  say(r.offered, 'the account section offers a way to delete the account');
  say(r.asks.email && r.asks.password, '...asking for the email and the password');
  say(!r.asks.armed, '...and refusing until both are given');
  say(r.warns.kingdom, 'the warning says this is the Kingdom Builders account, not only this app');
  say(r.warns.undone, '...that it cannot be undone');
  say(r.warns.billing, '...and that any subscription is cancelled with it');
  say(r.wrongEmail, 'a mistyped email will not arm it');
  say(r.noPassword, '...nor will a missing password');
  say(r.armed, '...and both together will');
  say(r.called && r.called.path === '/account/delete' && r.called.method === 'POST', 'it calls the delete endpoint');
  say(r.called && r.called.body && r.called.body.email === 'someone@example.com' && !!r.called.body.password,
      '...sending the typed email and the password');
  say(!r.after.token && !r.after.acct, 'afterwards the session and the stored account are gone');
  say(r.after.verses === 0 && r.after.talents === 0, '...and nothing of theirs is left on the device');
  say(r.after.sheetGone, '...and the sheet closes behind it');
  say(r.refused.stillSignedIn && r.refused.versesKept === 1, 'a refusal from the server changes nothing');
  say(/incorrect/i.test(r.refused.said), '...says why (' + r.refused.said + ')');
  say(r.refused.canRetry, '...and lets them try again');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nDELETE FAILED' : '\ndelete clean');
  await browser.close(); await H.stopServer();
})();
