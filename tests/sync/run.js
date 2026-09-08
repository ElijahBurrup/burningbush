/**
 * Two devices, one account.
 *
 * Every other layer runs one browser. This one runs two, with separate storage — a phone and a
 * computer — against a cloud held in memory here. Both sides run the real client: the real
 * mergeProg, the real mergeSRS, the real pull-then-push cycle. Only the server is a stand-in, and
 * it stores exactly what the live one stores: a progress blob, a card blob, and the time it was
 * last written.
 *
 * It exists because "they should stay in lock step" cannot be checked by reading the merge. Two
 * devices diverged in the field while both reported syncing successfully, twice, and each time the
 * reasoning looked sound on paper. This walks the actual cycle until the two screens agree.
 *
 *   node tests/sync/run.js
 */
const { chromium, open, stopServer } = require('../lib/harness');

let pass = 0, fail = 0;
const no = (cond, msg) => ok(!cond, msg);
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + msg); } };
const is = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  ✗ ' + msg + '\n      expected ' + JSON.stringify(want) +
                             '\n      got      ' + JSON.stringify(got)); }
};
const say = m => console.log('\n' + m);

/** The account row, as the live table holds it. */
function makeCloud() {
  return { progJson: null, srsJson: null, updatedAt: 0 };
}

/** One device: a browser page with its own storage, wired to the shared cloud. */
async function device(browser, cloud, label) {
  const page = await open(browser, { which: 'built' });

  await page.route('**/api/**', async route => {
    const req = route.request(), url = req.url(), method = req.method();
    const json = obj => route.fulfill({ status: 200, contentType: 'application/json',
                                        body: JSON.stringify(obj) });
    if (/\/api\/sync\b/.test(url)) {
      if (method === 'GET') return json(cloud);
      const body = JSON.parse(req.postData() || '{}');
      cloud.progJson = body.progJson;
      cloud.srsJson = body.srsJson;
      cloud.updatedAt = Number(body.updatedAt) || Date.now();
      return json({ ok: true });
    }
    if (/\/entitlement\b/.test(url)) return json({ pro: false });
    return json({});
  });

  // Signed in, without a login round trip: the token is all _req needs.
  await page.evaluate(email => {
    Auth._token = 'test-token';
    Auth.user = { email, uid: 'u1' };
  }, 'elijahdburrup@gmail.com');

  page.__label = label;
  return page;
}

/** Put a device into a known state, the way a person's device gets there. */
async function seed(page, spec) {
  await page.evaluate(s => {
    Prog.owner = 'elijahdburrup@gmail.com';
    Prog.dailyGoal = s.goal;
    Prog.goalMode = 'same';
    Prog.memorized = s.memorized || [];
    Prog.doneSkills = s.doneSkills || [];
    if (s.srDay) Prog.srDay = dayKey(new Date()); else delete Prog.srDay;
    if (s.settingsAt) Prog.settingsAt = s.settingsAt; else delete Prog.settingsAt;
    SRS = {};
    (s.due || []).forEach(n => { SRS['sk:num:' + n] = { box: 2, due: Date.now() - 99999 }; });
    (s.notDue || []).forEach(n => { SRS['sk:num:' + n] = { box: 4, due: Date.now() + 40 * 86400000 }; });
    saveProg(); save(SRS_KEY, SRS); bustCaches(); updateMetrics();
    try { Store.set('vv_localts', String(s.writtenAt || Date.now())); } catch (e) {}
  }, spec);
}

/** What the person actually sees. */
async function screen(page) {
  return page.evaluate(() => ({
    goal: goalToday(),
    dueTotal: reviewDueCount(),
    numbersDue: numbersDueCount(),
    dots: (() => { const d = document.createElement('div'); d.innerHTML = libStatusHTML();
      return d.querySelectorAll('.gb-dot').length; })(),
    line: (() => { const d = document.createElement('div'); d.innerHTML = libStatusHTML();
      return (d.querySelector('.gb-title') || {}).textContent || ''; })(),
  }));
}

const pull = page => page.evaluate(() => Auth.pull());

(async () => {
  const browser = await chromium().launch();
  console.log('Burning Bush — two devices, one account');
  console.log('================================================');

  // ── the reported case ────────────────────────────────────────────────────────────────────────
  // A goal of five set on the phone, and a computer still on ten. Neither profile carries a
  // settings stamp, because both existed before stamps did — which is every real profile.
  say('— a goal set on one device, an older one on the other');
  {
    const cloud = makeCloud();
    const phone = await device(browser, cloud, 'phone');
    const pc = await device(browser, cloud, 'pc');

    await seed(phone, { goal: 5, srDay: true, doneSkills: ['num:67', 'num:68', 'num:69'],
                        notDue: [67, 68, 69], writtenAt: 2000 });
    await seed(pc, { goal: 10, doneSkills: ['num:67', 'num:68', 'num:69'],
                     due: [67, 68, 69], writtenAt: 1000 });

    await pull(phone);          // the phone syncs first, seeding the account
    await pull(pc);             // the computer pulls what the phone left
    await pull(phone);          // and the phone takes back whatever the computer pushed

    const a = await screen(phone), b = await screen(pc);
    is(a.goal, b.goal, 'both devices agree on the daily goal');
    is(b.goal, 5, '...and it is the one that was actually chosen');
    is(a.dots, b.dots, 'both draw the same number of goal dots');
    is(a.dueTotal, b.dueTotal, 'both agree on how much is due');
    await phone.close(); await pc.close();
  }

  // ── cards ────────────────────────────────────────────────────────────────────────────────────
  say('— reviews done on one device do not come back on the other');
  {
    const cloud = makeCloud();
    const phone = await device(browser, cloud, 'phone');
    const pc = await device(browser, cloud, 'pc');
    const done = ['num:67', 'num:68', 'num:69', 'num:70', 'num:71', 'num:72'];

    await seed(pc, { goal: 5, doneSkills: done, notDue: [67, 68, 69, 70, 71, 72], writtenAt: 3000 });
    await seed(phone, { goal: 5, doneSkills: done, due: [67, 68, 69, 70, 71, 72], writtenAt: 1000 });

    const before = await screen(phone);
    ok(before.numbersDue > 0, 'the phone starts with a pile of cards due');

    await pull(pc);             // the computer, which did the work, syncs first
    await pull(phone);          // the phone pulls it
    const a = await screen(phone), b = await screen(pc);
    is(a.numbersDue, 0, '...and after syncing the phone agrees they are done');
    is(a.numbersDue, b.numbersDue, '...both showing the same count');

    await pull(pc);             // and the computer does not get the staleness back
    const b2 = await screen(pc);
    is(b2.numbersDue, 0, '...and the computer keeps its own work after the phone pushes');
    await phone.close(); await pc.close();
  }

  // ── settling ─────────────────────────────────────────────────────────────────────────────────
  say('— and they settle rather than argue');
  {
    const cloud = makeCloud();
    const phone = await device(browser, cloud, 'phone');
    const pc = await device(browser, cloud, 'pc');
    await seed(phone, { goal: 5, doneSkills: ['num:67'], due: [67], writtenAt: 2000 });
    await seed(pc, { goal: 10, doneSkills: ['num:67'], notDue: [67], writtenAt: 1000 });

    for (let i = 0; i < 3; i++) { await pull(phone); await pull(pc); }
    const a = await screen(phone), b = await screen(pc);
    is(a.goal, b.goal, 'three rounds later the goal still agrees');
    is(a.dueTotal, b.dueTotal, '...and so does what is due');
    is(a.line, b.line, '...and both goal buttons say the same thing');
    await phone.close(); await pc.close();
  }

  // ── everything reviewDueCount counts, not just numbers ───────────────────────────────────────
  // The field report was 13 due against 7. Numbers alone cannot explain that, so this puts verses,
  // palaces and books in too, and gives the two devices different learned sets — which is what
  // decides WHICH cards each of them even considers.
  say('— verses, palaces and books, with different histories on each device');
  {
    const cloud = makeCloud();
    const phone = await device(browser, cloud, 'phone');
    const pc = await device(browser, cloud, 'pc');

    const rich = (extra) => Object.assign({
      goal: 5, memorized: ['1:1:1', '19:23:1', '43:3:16'],
      doneSkills: ['num:67', 'num:68', 'num:69', 'num:70'],
    }, extra);

    // The phone knows four numbers and has three verses waiting; the computer knows two more
    // numbers, has walked its palace, and has already reviewed one of the verses.
    await seed(phone, rich({ due: [67, 68, 69, 70], writtenAt: 1000 }));
    await phone.evaluate(() => {
      Prog.verseSR = { '1:1:1': { learnedAt: 1, step: 1, dueAt: 1 },
                       '19:23:1': { learnedAt: 1, step: 1, dueAt: 1 },
                       '43:3:16': { learnedAt: 1, step: 1, dueAt: 1 } };
      Prog.verseStage = { '1:1:1': 'mem', '19:23:1': 'mem', '43:3:16': 'mem' };
      Prog.palaces = [{ place: 'House', stations: ['A', 'B', 'C'], learnedAt: 1, step: 1, sr: {} }];
      saveProg(); bustCaches(); updateMetrics();
    });

    await seed(pc, rich({ doneSkills: ['num:67','num:68','num:69','num:70','num:71','num:72'],
                          notDue: [67, 68, 69, 70, 71, 72], writtenAt: 2000 }));
    await pc.evaluate(() => {
      Prog.verseSR = { '1:1:1': { learnedAt: 1, step: 3, dueAt: Date.now() + 7 * 86400000 },
                       '19:23:1': { learnedAt: 1, step: 1, dueAt: 1 },
                       '43:3:16': { learnedAt: 1, step: 1, dueAt: 1 } };
      Prog.verseStage = { '1:1:1': 'mem', '19:23:1': 'mem', '43:3:16': 'mem' };
      Prog.palaces = [{ place: 'House', stations: ['A', 'B', 'C'],
                        learnedAt: 1, step: 3, dueAt: Date.now() + 7 * 86400000, sr: {} }];
      saveProg(); bustCaches(); updateMetrics();
    });

    const before = { a: await screen(phone), b: await screen(pc) };
    ok(before.a.dueTotal !== before.b.dueTotal, 'the two devices start out disagreeing, as reported');

    await pull(pc); await pull(phone); await pull(pc);
    const a = await screen(phone), b = await screen(pc);
    is(a.dueTotal, b.dueTotal, 'after syncing they agree on the total due');
    is(a.goal, b.goal, '...and on the goal');
    is(a.dots, b.dots, '...and draw the same dots');
    is(a.line, b.line, '...and say the same thing on the button');

    // the work the computer did is not undone by the phone pushing afterwards
    await pull(phone); await pull(pc);
    const b2 = await screen(pc);
    is(b2.dueTotal, b.dueTotal, '...and it stays settled after another round');
    await phone.close(); await pc.close();
  }

  // ── the store build, left behind ─────────────────────────────────────────────────────────────
  // A shell on an older release merges by the OLD rules and then pushes the result, writing its
  // stale state over an account two corrected devices had just agreed on. One forgotten phone can
  // undo everything, so it is stopped from syncing at all rather than merely warned.
  say('— an app that has fallen behind the web');
  {
    const cloud = makeCloud();
    const web = await device(browser, cloud, 'web');
    const app = await device(browser, cloud, 'android');

    // the shell reports itself as android, and the site says it is newer than this bundle
    await app.evaluate(() => {
      window.Capacitor = { getPlatform: () => 'android' };
      // Keep the real fetch BEFORE replacing it: saving it afterwards captures the replacement and
      // every ordinary request recurses into the stand-in instead of reaching the route handler.
      const realFetch = window.fetch.bind(window);
      window.fetch = (u, o) => (String(u).indexOf('version.json') >= 0)
        ? Promise.resolve({ ok: true, json: async () => ({ version: '9.9.9' }) })
        : realFetch(u, o);
    });

    await seed(web, { goal: 5, doneSkills: ['num:67'], notDue: [67], writtenAt: 3000 });
    await seed(app, { goal: 10, doneSkills: ['num:67'], due: [67], writtenAt: 1000 });

    await pull(web);                                    // the account holds the good state
    const cloudBefore = cloud.progJson;

    const stale = await app.evaluate(() => Auth.versionCheck());
    ok(stale, 'the app notices the website has moved on');
    const warned = await app.evaluate(() => {
      const m = el('staleAppModal');
      return !!m && m.style.display === 'flex' && /will not sync/i.test(m.textContent || ''); });
    ok(warned, '...and says so, plainly, rather than failing quietly');

    await app.evaluate(() => Auth.push());
    is(cloud.progJson, cloudBefore, '...and cannot write its stale state over the account');
    await pull(app);
    is(cloud.progJson, cloudBefore, '...nor through a pull, which ends in a push');

    const w = await screen(web);
    is(w.goal, 5, 'the account keeps the goal the up-to-date device chose');

    // once updated, it syncs again
    await app.evaluate(() => { Auth._stale = false; });
    await pull(app);
    const a2 = await screen(app);
    is(a2.goal, 5, '...and the moment it is updated it catches up');
    await web.close(); await app.close();
  }

  // ── and the browser is never gated ───────────────────────────────────────────────────────────
  say('— the browser is never told it is out of date');
  {
    const cloud = makeCloud();
    const web = await device(browser, cloud, 'web');
    await web.evaluate(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = (u, o) => (String(u).indexOf('version.json') >= 0)
        ? Promise.resolve({ ok: true, json: async () => ({ version: '9.9.9' }) })
        : realFetch(u, o);
    });
    const stale = await web.evaluate(() => Auth.versionCheck());
    no(stale, 'a browser is current by definition and is never blocked');
    await web.close();
  }

  await browser.close();
  stopServer();
  console.log('\n================================================');
  console.log(fail ? `FAIL — ${fail} problem(s), ${pass} passed` : `PASS — ${pass} checks, two devices agree`);
  process.exit(fail ? 1 : 0);
})();
