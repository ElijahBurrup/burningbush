/**
 * QA probe 14 — WHAT BELONGS TO AN ACCOUNT.
 *
 * The worst bug this app has had was one person's verses showing up under another person's email.
 * Since then several new things have been added to progress — which Library tools have been used,
 * whether a comp code was redeemed — and each of them is another thing that could cross between two
 * accounts on one device, or fail to follow one account to a second device.
 *
 * This checks both directions for every field that travels: nothing crosses on a switch, and
 * nothing is lost on a merge.
 *
 *   node tests/qa/account-fields.js
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

    // Everything a reader accumulates that is theirs and nobody else's.
    const mine = () => ({
      verses: (Prog.memorized || []).length,
      tools: Object.keys(Prog.libUsed || {}).sort().join(','),
      comp: !!Prog.compPro,
      talents: Prog.talents || 0,
      tickets: (Prog.scratchWon || []).join(','),
      unlocks: (Prog.lessonUnlocks || []).join(','),
      palaces: (Prog.palaces || []).filter(Boolean).length,
      goal: Prog.dailyGoal,
    });

    // ---- one reader, well along ----
    closeEveryOverlay();
    Prog.memorized = ['43:3:16', '19:119:11', '40:6:33'];
    Prog.libUsed = { learn: 1, mem: 1, verses: 1, w4w: 1 };
    Prog.compPro = Date.now(); Prog.talents = 4242; Prog.dailyGoal = 7;
    Prog.scratchWon = ['verse', 'journey']; Prog.lessonUnlocks = ['book:46'];
    Prog.palaces = [{ place: 'Mine', stations: ['a', 'b'], sr: {} }];
    setProgOwner('first@example.com'); saveProg();
    res.before = mine();

    // ---- they sign out; the device is wiped of everything that was theirs ----
    wipeLocalUserData();
    const left = Store.getJSON(PROG_KEY, null) || {};
    res.wiped = { empty: !(left.memorized || []).length && !Object.keys(left.libUsed || {}).length && !left.compPro,
                  owner: progOwner(), pro: !Store.getJSON('vv_pro', null) };

    // ---- somebody else signs in on the same device ----
    Prog = migrateProg({});
    setProgOwner('second@example.com'); saveProg();
    res.second = mine();

    // ---- and the first reader signs in again, on a device that knows nothing ----
    const fresh = migrateProg({ libBackfilled: 1 });
    const cloud = migrateProg({ libBackfilled: 1,
      memorized: ['43:3:16', '19:119:11', '40:6:33'],
      libUsed: { learn: 1, mem: 1, verses: 1, w4w: 1 },
      compPro: 1700000000000, talents: 4242, dailyGoal: 7,
      scratchWon: ['verse', 'journey'], lessonUnlocks: ['book:46'],
      palaces: [{ place: 'Mine', stations: ['a', 'b'], sr: {} }],
    });
    const merged = mergeProg(fresh, cloud);
    res.restored = {
      verses: (merged.memorized || []).length,
      tools: Object.keys(merged.libUsed || {}).sort().join(','),
      comp: !!merged.compPro,
      talents: merged.talents || 0,
      tickets: (merged.scratchWon || []).join(','),
      unlocks: (merged.lessonUnlocks || []).join(','),
      palaces: (merged.palaces || []).filter(Boolean).length,
      goal: merged.dailyGoal,
    };

    // ---- two devices used in parallel: neither loses what the other did ----
    const deviceA = migrateProg({ libBackfilled: 1, memorized: ['43:3:16'], libUsed: { learn: 1 }, talents: 100, dailyGoal: 3 });
    const deviceB = migrateProg({ libBackfilled: 1, memorized: ['19:119:11'], libUsed: { verses: 1 }, talents: 250 });
    const both = mergeProg(deviceA, deviceB);
    res.twoDevices = {
      verses: (both.memorized || []).slice().sort().join(','),
      tools: Object.keys(both.libUsed || {}).sort().join(','),
      talents: both.talents,
      goal: both.dailyGoal,
    };
    return res;
  });

  const b = r.before;
  say(b.verses === 3 && b.tools === 'learn,mem,verses,w4w' && b.comp, 'a reader accumulates verses, tools and a comp code');

  say(r.wiped.empty, 'signing out leaves nothing of theirs on the device');
  say(!r.wiped.owner, '...and the name on it');
  say(r.wiped.pro, '...and the Pro flag kept in this browser');

  const s = r.second;
  say(s.verses === 0, 'the next person to sign in sees no verses of theirs');
  say(s.tools === '', '...no record of tools they never used');
  say(!s.comp, '...and no comp code they never redeemed');
  say(s.talents === 0 && !s.palaces && s.tickets === '' && s.unlocks === '',
      '...nor their talents, palaces, tickets or bought lessons');

  const rr = r.restored;
  say(rr.verses === 3, 'signing in on a bare device brings the verses back');
  say(rr.tools === 'learn,mem,verses,w4w', '...which tools had been used');
  say(rr.comp, '...the comp code');
  say(rr.talents === 4242 && rr.goal === 7, '...the talents and the daily goal');
  say(rr.tickets === 'verse,journey' && rr.unlocks === 'book:46' && rr.palaces === 1,
      '...the tickets, the lessons bought and the palaces');

  const t = r.twoDevices;
  say(t.verses === '19:119:11,43:3:16', 'two devices used in parallel keep both sets of verses');
  say(t.tools === 'learn,verses', '...and both sets of tools used');
  say(t.talents === 250, '...with the higher talent count kept, not the older one');
  say(t.goal === 3, '...and a goal set on one device is not lost by the other');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nACCOUNT FIELDS FAILED' : '\naccount fields clean');
  await browser.close(); await H.stopServer();
})();
