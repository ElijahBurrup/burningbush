/**
 * tests/spec/behaviour.js — what the app must actually DO.
 *
 * Snapshots pin what every screen looks like; these pin the rules underneath. Written as
 * characterisation tests: they record today's behaviour so a refactor has to preserve it.
 */
const { chromium, open, stopServer, SEEDED, FIXED_NOW } = require('../lib/harness');
const T = require('../lib/t');
const { describe, is, ok, no, near, has, hasNot } = T;

const DAY = 86400000;

(async () => {
  const browser = await chromium().launch();
  const page = await open(browser, { prog: SEEDED });
  const $ = fn => page.evaluate(fn);
  const $$ = (fn, a) => page.evaluate(fn, a);

  // ─────────────────────────────── data integrity ───────────────────────────────
  describe('data', () => { });
  const data = await $(() => ({
    books: BOOKS.length,
    pegs: PEGS.length,
    verses: totalVerses(),
    taxWeeks: TAX_WEEKS.length,
    taxWeeksUnique: new Set(TAX_WEEKS.map(w => w[0])).size,
    pieces: PIECES.length,
    piecesWithGlyph: PIECES.filter(p => p.g).length,
    crafts: PIECES.reduce((n, p) => n + p.w.length, 0),
    blessings: W4W_BLESSINGS.length + W4W_MASTERY.length,
    blessingsUnresolved: [...W4W_BLESSINGS, ...W4W_MASTERY].filter(([, r]) => !(kjvText(r[0], r[1], r[2]) || '').length).length,
    paceUnresolved: PACE_VERSES.filter(([r]) => !(kjvText(r[0], r[1], r[2]) || '').length).length,
    storiesTagged: STORY_GROUPS.reduce((n, g) => n + g.s.length, 0),
    growUnresolved: GROW_VERSES.filter(r => !(kjvText(r[0], r[1], r[2]) || '').length).length,
    wordUnresolved: WORD_VERSES.filter(r => !(kjvText(r[0], r[1], r[2]) || '').length).length,
  }));
  is(data.books, 66, 'sixty-six books');
  is(data.pegs, 100, 'a hundred base pegs');
  is(data.verses, 31102, 'the whole KJV is present');
  is(data.taxWeeks, 52, 'a summons for every week of the year');
  is(data.taxWeeksUnique, 52, 'no two summonses share a headline');
  is(data.pieces, 14, 'fourteen church pieces');
  is(data.piecesWithGlyph, 14, 'every piece has its own tool glyph');
  ok(data.crafts >= 60, 'every piece carries several trades');
  ok(data.blessings >= 30, 'at least thirty blessings to rotate');
  is(data.blessingsUnresolved, 0, 'every blessing resolves to real KJV text');
  is(data.paceUnresolved, 0, 'every pacing verse resolves');
  is(data.growUnresolved + data.wordUnresolved, 0, 'every encouragement verse resolves');
  is(data.storiesTagged, 130, 'a hundred and thirty Bible stories');

  // ─────────────────────────────── the Major System ───────────────────────────────
  describe('major system', () => { });
  const peg = await $(() => ({
    two: pegFor(2).word, fiftyTwo: pegFor(52).word,
    decode: decodeSentence(2),
    reach: reachable(19, 23, 1),
    pad: pad2(7),
  }));
  is(peg.two, 'Sun', '2 is a Sun');
  is(peg.fiftyTwo, 'Lion', '52 is a Lion');
  has(peg.decode, 'Major System', 'a decode sentence explains itself');
  ok(peg.reach, 'a verse whose numbers are known is reachable');
  is(peg.pad, '07', 'single digits are padded');

  // ─────────────────────────────── access & economy ───────────────────────────────
  describe('economy', () => { });
  const econ = await $(() => {
    Billing.revoke();
    Prog.doneSkills = ['video:major', 'snd:0-4', 'snd:5-9', 'book:1', 'book:2', 'book:3', 'book:4', 'book:5', 'book:40', 'video:verse', 'video:palace', 'palace:0', 'video:sr'];
    Prog.lessonUnlocks = []; Prog.talents = 1200; bustCaches(); saveProg();
    show('learn'); Prog.phaseMax = 99; renderPath();
    const tiles = [...document.querySelectorAll('#learn .tile:not(.tickettile):not(.video)')];
    const free = { total: tiles.length, buyable: tiles.filter(t => t.classList.contains('pro') && !t.disabled).length,
      skippable: tiles.filter(t => t.classList.contains('pro') && t.classList.contains('locked') && !t.disabled).length };
    Billing.grant(); bustCaches(); show('learn'); Prog.phaseMax = 99; renderPath();
    const t2 = [...document.querySelectorAll('#learn .tile:not(.tickettile):not(.video)')];
    const pro = { open: t2.filter(t => !t.disabled).length, priced: t2.filter(t => t.querySelector('.lockbadge')).length };
    const lastBook = UNITS.flatMap((U, ui) => U.skills.map((sk, si) => ({ sk, ui, si }))).filter(x => x.sk.kind === 'book').slice(-1)[0];
    return { free, pro, cost: LESSON_UNLOCK_COST, lastBookOpenToPro: skillUnlocked(lastBook.ui, lastBook.si), proFreeze: freezeMax(), freeFreeze: (Billing.revoke(), freezeMax()) };
  });
  is(econ.cost, 1000, 'a book costs a thousand talents');
  is(econ.free.buyable, 1, 'a free user may buy exactly the next book');
  is(econ.free.skippable, 0, 'a free user can never skip ahead');
  ok(econ.pro.open > 60, 'a subscriber has the whole path open');
  is(econ.pro.priced, 0, 'a subscriber is never shown a price');
  ok(econ.lastBookOpenToPro, 'a subscriber may start Revelation on day one');
  is(econ.proFreeze, 10, 'ten freezes is the cap');
  is(econ.freeFreeze, 10, '…for everyone, subscriber or not');

  // ─────────────────────────────── the daily goal ───────────────────────────────
  describe('daily goal', () => { });
  const goal = await $(() => {
    const at = dow => { const real = Date.prototype.getDay; Date.prototype.getDay = function () { return dow; }; const g = goalToday(); Date.prototype.getDay = real; return g; };
    Prog.goalMode = 'same'; Prog.dailyGoal = 7; saveProg();
    const same = { wed: at(3), sat: at(6) };
    Prog.goalMode = 'week'; Prog.goalWeekday = 4; Prog.goalWeekend = 9; saveProg();
    const week = { wed: at(3), sat: at(6), sun: at(0) };
    Prog.goalMode = 'days'; Prog.goalByDay = { 0: 8, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }; saveProg();
    const days = { sun: at(0), thu: at(4) };
    return { same, week, days, paceAt: PACE_AT };
  });
  is(goal.same.wed, 7, 'one number every day'); is(goal.same.sat, 7, '…weekends included');
  is(goal.week.wed, 4, 'weekdays take the weekday number');
  is(goal.week.sat, 9, 'Saturday takes the weekend number');
  is(goal.week.sun, 9, 'Sunday too');
  is(goal.days.sun, 8, 'per-day mode honours Sunday');
  is(goal.days.thu, 4, '…and Thursday');
  is(goal.paceAt, 20, 'the pacing word arrives at twenty');

  const goalMax = await $(() => {
    Prog.goalMode = 'same'; Prog.dailyGoal = 15; saveProg(); const at15 = goalToday();
    Prog.dailyGoal = 99; saveProg(); const clamped = goalToday();
    return { max: GOAL_MAX, at15, clamped };
  });
  is(goalMax.max, 15, 'a daily goal may be as high as fifteen');
  is(goalMax.at15, 15, '…and fifteen is honoured');
  is(goalMax.clamped, 15, '…and nothing above it is');

  const d1 = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.dailyGoal = 5;
    Prog.goalDay = { date: dayKey(new Date()), count: 0, celebrated: true };
    Prog.verseSR = { '43:3:16': { learnedAt: Date.now() - 86400000 - 1000, step: 1, r0: 1 } }; saveProg();
    const a = goalCount(); reviewVerseSR('43:3:16'); const afterD1 = goalCount() - a;
    Prog.verseSR = { '43:3:16': { learnedAt: Date.now() - 9 * 86400000, step: 3, r0: 1 } }; saveProg();
    const b = goalCount(); reviewVerseSR('43:3:16'); const afterLater = goalCount() - b;
    return { afterD1, afterLater };
  });
  is(d1.afterD1, 1, "yesterday's verse, reviewed today, counts toward the goal");
  is(d1.afterLater, 0, '…while a later checkpoint does not');

  const pace = await $(async () => {
    Prog.goalMode = 'same'; Prog.dailyGoal = 3; Prog.paceIdx = 0;
    Prog.goalDay = { date: dayKey(new Date()), count: PACE_AT - 2, celebrated: true }; saveProg();
    bumpGoal(); await new Promise(r => setTimeout(r, 1400));
    const early = !!(el('paceModal') && el('paceModal').style.display === 'flex');
    bumpGoal(); await new Promise(r => setTimeout(r, 1400));
    const onTime = !!(el('paceModal') && el('paceModal').style.display === 'flex');
    const txt = el('paceModal') ? el('paceModal').innerText.replace(/\s+/g, ' ') : '';
    el('paceModal').style.display = 'none';
    bumpGoal(); await new Promise(r => setTimeout(r, 1400));
    const again = !!(el('paceModal') && el('paceModal').style.display === 'flex');
    return { early, onTime, again, txt };
  });
  no(pace.early, 'silent one short of the threshold');
  ok(pace.onTime, 'speaks up on reaching it');
  no(pace.again, 'and only once that day');
  has(pace.txt, 'little, and often', 'it teaches the rhythm');

  // ─────────────────────────────── the streak ───────────────────────────────
  describe('streak', () => { });
  const streak = await $(() => {
    Prog.lastReviewDay = null; Prog.dayStreak = 0;
    Prog.goalDay = { date: dayKey(new Date()), count: 0, celebrated: false }; Prog.dailyGoal = 3; saveProg();
    creditToday(); const withoutGoal = Prog.lastReviewDay;
    Prog.goalDay.count = 99; saveProg();
    creditToday();
    return { blockedWithoutGoal: withoutGoal === null, due: reviewDueCount(), creditedAfter: Prog.lastReviewDay !== null };
  });
  ok(streak.blockedWithoutGoal, 'no streak while the goal is unmet');
  ok(streak.creditedAfter, 'credited once goal and reviews are both done');

  // ─────────────────────────────── Caesar ───────────────────────────────
  describe('caesar', () => { });
  const rome = await $(() => {
    const run = band => { const c = {}; for (let i = 0; i < 60000; i++) { const r = pickTaxRate(TAX_TABLES[band]); c[r] = (c[r] || 0) + 1; } return c; };
    const rich = run('rich'), poor = run('poor');
    const N = 60000;
    let landedFree = 0;
    for (const band of ['rich', 'poor']) {
      const vals = TAX_WHEEL[band];
      for (let i = 0; i < 8000; i++) {
        const rate = pickTaxRate(TAX_TABLES[band]);
        const seats = vals.map((v, j) => (v === rate ? j : -1)).filter(j => j >= 0);
        if (!vals[seats[Math.floor(Math.random() * seats.length)]]) landedFree++;
      }
    }
    return {
      rich90: rich[90] / N * 100, rich80: rich[80] / N * 100, rich70: rich[70] / N * 100, rich50: rich[50] / N * 100,
      poor70: poor[70] / N * 100, poor90: poor[90] / N * 100,
      bandLow: taxBand(199), bandPoor: taxBand(200), bandPoor2: taxBand(999), bandRich: taxBand(1000),
      landedFree, wheelLen: TAX_WHEEL.rich.length,
      noTaxSeats: TAX_WHEEL.rich.filter(v => !v).length,
      churchGoal: CHURCH_GOAL, taps: CHURCH_TAPS, toChurch: TAX_TO_CHURCH,
    };
  });
  near(rome.rich90, 60, 1.5, 'the wealthy lose nine tenths three weeks in five');
  near(rome.rich80, 30, 1.5, '…and four fifths most of the rest');
  near(rome.rich70, 7, 1.0, '…seldom only seven tenths');
  near(rome.rich50, 3, 0.8, '…and rarely half');
  near(rome.poor70, 60, 1.5, 'a smaller purse is assessed at seven tenths');
  near(rome.poor90, 7, 1.0, '…and seldom at nine');
  is(rome.bandLow, null, 'Caesar takes no notice of the poor');
  is(rome.bandPoor, 'poor', 'two hundred is the threshold');
  is(rome.bandPoor2, 'poor', 'nine hundred and ninety-nine is still modest');
  is(rome.bandRich, 'rich', 'a thousand is wealth');
  is(rome.landedFree, 0, 'the wheel never stops on NO TAX when a levy is owed');
  is(rome.wheelLen, 14, 'fourteen wedges');
  is(rome.noTaxSeats, 2, 'two of them hopeful');
  is(rome.churchGoal, 2500, 'a church costs two and a half thousand');
  is(rome.taps, 25, 'twenty-five taps of work');
  is(rome.toChurch, 0.5, 'half of every levy becomes stone');

  const levy = await $(async () => {
    Billing.grant(); Prog.talents = 2000; Prog.church = { given: 0, built: 0, total: 0 };
    Prog.taxAt = Date.now() - 8 * 86400000; Prog.taxLog = []; saveProg();
    openTaxWheel(false); el('taxGo').click();
    await new Promise(r => setTimeout(r, 4700));
    const log = Prog.taxLog[0] || {};
    const out = { took: log.took, church: log.church, left: Prog.talents,
      arithmetic: Prog.talents + log.took === 2000,
      half: log.church === Math.round(log.took * 0.5),
      buildShown: !!(el('taxBuild') && el('taxBuild').style.display !== 'none'),
      peaceShown: !!(el('taxDone') && el('taxDone').style.display !== 'none') };
    el('taxov').classList.remove('on', 'march');
    return out;
  });
  ok(levy.arithmetic, 'what Caesar takes leaves the purse exactly');
  ok(levy.half, 'exactly half of it becomes stone');
  ok(levy.buildShown, 'a levy sends you to lay the stone');
  no(levy.peaceShown, '…and offers no other way past');

  const church = await $(() => {
    Prog.church = { given: 0, built: 0, total: 0 }; saveProg();
    const a = churchAdd(CHURCH_GOAL - 10);
    const b = churchAdd(20);
    const c = churchAdd(CHURCH_GOAL * 3);
    return { none: a, one: b, several: c, built: Prog.church.built, carried: Prog.church.given, total: Prog.church.total };
  });
  is(church.none, 0, 'a part-built church is not yet a church');
  is(church.one, 1, 'the last stone finishes it');
  is(church.several, 3, 'a great levy can finish several');
  is(church.built, 4, 'and the tally keeps count');
  ok(church.carried < 2500, 'the remainder carries to the next');

  // ─────────────────────────────── verses ───────────────────────────────
  describe('verses', () => { });
  const verse = await $(() => {
    Prog.palaces = [{ place: 'K', stations: ['Sink'], learnedAt: Date.now(), step: 1 }];
    Prog.memorized = []; Prog.customScene = {}; Prog.verseLoc = {}; saveProg();
    openVerseWizard(40, 6, 33, () => { });
    const noKnowButton = !el('wKnow');
    el('wToScene').click();
    el('wScene').value = 'a scene';
    el('wDone').click(); const blockedNoPalace = !Prog.memorized.includes('40:6:33');
    el('wPalace').value = '0'; el('wPalace').dispatchEvent(new Event('change'));
    el('wDone').click(); const blockedNoRoom = !Prog.memorized.includes('40:6:33');
    el('wRoom').value = 'Sink'; el('wDone').click();
    return { noKnowButton, blockedNoPalace, blockedNoRoom, saved: Prog.memorized.includes('40:6:33'), loc: Prog.verseLoc['40:6:33'] };
  });
  ok(verse.noKnowButton, '"I already know this" is gone');
  ok(verse.blockedNoPalace, 'a verse will not be saved without a palace');
  ok(verse.blockedNoRoom, '…nor without a room');
  ok(verse.saved, 'both given, it is kept');
  is(verse.loc && verse.loc.room, 'Sink', 'and it remembers where it lives');

  const promise = await $(() => {
    Prog.memorized = ['45:8:28']; Prog.extraKnown = Array.from({ length: 176 }, (_, i) => i + 1); bustCaches(); saveProg();
    show('journey'); renderChapterScreen(45, 8);
    const box = [...document.querySelectorAll('#journey .vbox')].find(b => b.textContent.trim().startsWith('28'));
    return { cls: box.className, isPromise: isPromiseVerse(45, 8, 28), notAPromise: isPromiseVerse(45, 8, 1) };
  });
  ok(promise.isPromise, "Romans 8:28 is one of God's promises");
  no(promise.notAPromise, '…and Romans 8:1 is not');
  has(promise.cls, 'promise', 'a promise is marked in the grid');

  // ─────────────────────────────── the dictionary ───────────────────────────────
  describe('dictionary', () => { });
  const dict = await $(async () => {
    const before = dictLoaded();
    await loadDict();
    const probe = (b, c, v, i) => { const e = strongsEntry(strongsAt(b, c, v, i)); return e ? e.num + ' ' + e.t : null; };
    return { lazyAtBoot: !before,
      god: probe(1, 1, 1, 3), lord: probe(19, 23, 1, 1), loved: probe(43, 3, 16, 3),
      hebrew: Object.keys(STRONGS.h).length, greek: Object.keys(STRONGS.g).length };
  });
  ok(dict.lazyAtBoot, 'the lexicon is not loaded until it is wanted');
  has(dict.god, 'H430', 'Genesis 1:1 "God" is elohim');
  has(dict.lord, 'H3068', 'Psalm 23:1 "LORD" is Yehovah');
  has(dict.loved, 'G25', 'John 3:16 "loved" is agapao');
  is(dict.hebrew, 8674, "Strong's Hebrew, entire");
  is(dict.greek, 5523, "Strong's Greek, entire");

  // ─────────────────────────────── backup round-trip ───────────────────────────────
  describe('backup', () => { });
  const backup = await $(() => {
    Prog.talents = 4321; Prog.memorized = ['19:23:1', '43:3:16']; Prog.dayStreak = 9; saveProg();
    const snap = JSON.parse(JSON.stringify(Prog));
    const round = migrateProg(JSON.parse(JSON.stringify(snap)));
    return { talents: round.talents, verses: round.memorized.length, streak: round.dayStreak,
      shapeKept: Object.keys(snap).every(k => k in round) };
  });
  is(backup.talents, 4321, 'a restore keeps the talents');
  is(backup.verses, 2, '…the verses');
  is(backup.streak, 9, '…and the streak');
  ok(backup.shapeKept, 'migration never drops a field');

  // ─────────────────────────────── migration from older saves ───────────────────────────────
  describe('migration', () => { });
  const migrate = await $(() => {
    const old = { memorized: ['19:23:1'], talents: 50, reminder: { on: true, time: '07:30' }, goalByDay: { 1: 4 }, dailyGoal: 2 };
    const m = migrateProg(old);
    const empty = migrateProg(null);
    return {
      remindersMoved: Array.isArray(m.reminder.times) && m.reminder.times[0].t === '07:30',
      goalModeInferred: m.goalMode, emptyGoalMode: empty.goalMode,
      churchSeeded: !!m.church && m.church.given === 0,
      blessSeeded: m.blessIdx === 0, taxSeeded: m.taxAt === 0,
      versesKept: m.memorized.length === 1, talentsKept: m.talents === 50,
      emptyIsUsable: empty.memorized.length === 0 && empty.talents === 0,
    };
  });
  ok(migrate.remindersMoved, 'an old single reminder becomes the first alarm');
  is(migrate.goalModeInferred, 'days', 'a per-day setup keeps its meaning');
  is(migrate.emptyGoalMode, 'same', 'a new account starts simple');
  ok(migrate.churchSeeded, 'the church ledger appears empty');
  ok(migrate.blessSeeded && migrate.taxSeeded, 'the new counters start at zero');
  ok(migrate.versesKept && migrate.talentsKept, 'nothing of the old save is lost');
  ok(migrate.emptyIsUsable, 'a null save still boots');

  // ─────────────────────────────── no self-praise ───────────────────────────────
  describe('reverence', () => { });
  const rev = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.w4w = {}; Prog.blessIdx = 0; saveProg();
    show('verse'); TT = { b: 43, c: 3, v: 16, ret: null, hintUsed: false, words: [] }; typeTestComplete();
    const win = el('verse').innerText.replace(/\s+/g, ' ');
    NT = { qs: [1], i: 1, ok: 15, wrong: 0, round: 1, hasMore: false }; finishNumberTest();
    const nums = el('verse').innerText.replace(/\s+/g, ' ');
    return { win, nums, partyInPage: (document.documentElement.innerHTML.match(/\u{1F389}/gu) || []).length };
  });
  is(rev.partyInPage, 0, 'no party popper anywhere in the app');
  hasNot(rev.win, 'You did it', 'the win screen does not congratulate the user');
  has(rev.win, 'heart', '…it speaks of the Word being kept');
  hasNot(rev.nums, 'flawless', 'a clean round is not called flawless');

  // ─────────────────────────────── prices & gates (v1.10) ───────────────────────────────
  describe('prices', () => { });
  const price = await $(() => {
    Billing.revoke(); Prog.talents = 5000; Prog.palaceSlots = 0; Prog.storySections = [];
    Prog.palaces = [1,2,3,4].map(i => ({ place: 'P'+i, stations: ['a'], learnedAt: Date.now(), step: 1 }));
    saveProg();
    const atFour = canBuildPalace();
    Prog.palaces.push({ place: 'P5', stations: ['a'], learnedAt: Date.now(), step: 1 }); saveProg();
    const atFive = canBuildPalace();
    const before = Prog.talents; const bought = buyPalaceSlot();
    const spent = before - Prog.talents, afterBuy = canBuildPalace();
    Billing.grant(); const proAny = canBuildPalace(); Billing.revoke();
    return { freeze: FREEZE_COST, palace: PALACE_COST, palaceFree: PALACE_FREE, section: STORY_SECTION_COST,
      atFour, atFive, bought, spent, afterBuy, proAny };
  });
  is(price.freeze, 250, 'a Streak Freeze costs 250');
  is(price.palace, 1000, 'a palace beyond the free ones costs 1000');
  is(price.palaceFree, 5, 'the first five palaces are free');
  is(price.section, 500, 'a Bible-story section costs 500');
  ok(price.atFour, 'a fifth palace is still free');
  no(price.atFive, 'a sixth is not');
  ok(price.bought && price.spent === 1000, 'buying a slot costs exactly 1000');
  ok(price.afterBuy, '…and then the palace can be built');
  ok(price.proAny, 'a subscriber never pays for a palace');

  const shop = await $(() => {
    Billing.revoke(); Prog.talents = 5000; saveProg(); openStore();
    const t = el('storeModal').innerText;
    el('storeModal').style.display = 'none';
    return { peek: /Peek/i.test(t), freeze250: /250/.test(t), palaceRow: /memory palace/i.test(t) };
  });
  no(shop.peek, 'Peek tokens are no longer sold');
  ok(shop.freeze250, 'the store quotes 250 for a freeze');
  ok(shop.palaceRow, 'a free account can buy a palace from the store');

  const story = await $(() => {
    const ui = UNITS.findIndex(U => U.story);
    Billing.revoke(); Prog.talents = 5000; Prog.storySections = []; saveProg();
    show('stories'); renderStories();
    const grid = el('stories').innerText;
    const out = { section: /Creation/.test(grid), hidden: !/Noah/.test(grid),
      tiles: el('stories').querySelectorAll('[data-sgrp]').length };
    openStorySection(ui);                       // the stories live one tap behind the tile
    out.buy = !!document.querySelector('#storySecModal [data-buysec]');
    out.lockedList = !/Noah/.test(el('storySecModal').innerText);
    const before = Prog.talents;
    document.querySelector('#storySecModal [data-buysec]').click();
    el('spYes').click();
    out.spent = before - Prog.talents;
    out.owned = storySectionOwned(ui);
    out.shownAfter = /Noah/.test(el('storySecModal').innerText);
    out.done = !!el('ssDone');
    el('ssDone').click();
    out.closed = el('storySecModal').style.display === 'none';
    Billing.grant(); Prog.storySections = []; saveProg();
    out.proSeesAll = storySectionOwned(ui);
    Billing.revoke();
    return out;
  });
  ok(story.tiles > 0, 'the stories screen is a grid of sections');
  ok(story.section, '...each named on its tile');
  ok(story.hidden, '...with the stories themselves not on the front screen');
  ok(story.buy, 'a locked section offers to open itself');
  ok(story.lockedList, '...and shows no stories until it is');
  is(story.spent, 500, 'opening a section costs 500');
  ok(story.owned && story.shownAfter, '...after which the stories are right there');
  ok(story.done, 'the popup has a Done button, like Profile');
  ok(story.closed, '...which closes it');
  ok(story.proSeesAll, 'a subscriber sees every section');

  // ─────────────────────────────── the church deck ───────────────────────────────
  describe('church pieces', () => { });
  const deck = await $(() => {
    Prog.piecesUsed = []; saveProg();
    const first = [], second = [];
    for (let i = 0; i < PIECES.length; i++) first.push(nextPieceIndex());
    for (let i = 0; i < PIECES.length; i++) second.push(nextPieceIndex());
    return { n: PIECES.length, firstUnique: new Set(first).size, secondUnique: new Set(second).size };
  });
  is(deck.firstUnique, deck.n, 'every church piece is dealt before any repeats');
  is(deck.secondUnique, deck.n, '…and the deck reshuffles cleanly');

  // ─────────────────────────────── the profile menu ───────────────────────────────
  describe('profile', () => { });
  const prof = await $(() => {
    el('themeBtn').click();
    const secs = [...document.querySelectorAll('#themeModal .prof-sect')].map(s => s.textContent.replace(/[▸▾]\s*/, '').trim());
    const out = { first: secs[0], secs,
      startOver: !!el('resetBtn'), reminder: !!el('reminderBox'), share: !!el('pShare'), store: !!el('pStore'),
      resetFn: typeof resetAllProgress !== 'undefined',
      adminForCustomer: getComputedStyle(el('adminWrap')).display !== 'none' };
    Auth.user = { email: 'erinburrup@gmail.com' }; applyAdminVisibility();
    out.adminForAdmin = getComputedStyle(el('adminWrap')).display !== 'none';
    Auth.user = { email: 'nobody@example.com' }; applyAdminVisibility();
    out.adminForOther = getComputedStyle(el('adminWrap')).display !== 'none';
    Auth.user = null; applyAdminVisibility();
    el('themeModal').style.display = 'none';
    return out;
  });
  no(prof.startOver, '"Start over" is gone from Profile');
  no(prof.resetFn, '…and resetAllProgress cannot be called at all');
  no(prof.reminder, 'the reminder lives on the goal screen, not here');
  no(prof.share, 'Share progress is gone');
  no(prof.store, 'the Talents Store is gone (it is on the top bar)');
  no(prof.adminForCustomer, 'a signed-out visitor sees no Admin block');
  ok(prof.adminForAdmin, 'an admin account does');
  no(prof.adminForOther, 'another signed-in account does not');
  has(prof.secs.join(' | '), 'Badges', 'Badges is near the top');

  // ─────────────────────────────── the tab bar ───────────────────────────────
  describe('tabs', () => { });
  const tabs = await $(() => {
    const order = () => [...document.querySelectorAll('.tabbar button')].map(b => b.dataset.tab);
    Prog.scratchWon = ['verse', 'palace', 'journey', 'stories']; saveProg(); updateTabLocks();
    const won = order();
    Prog.scratchWon = []; saveProg(); updateTabLocks();
    const fresh = order();
    Prog.scratchWon = ['verse', 'palace', 'journey', 'stories']; saveProg(); updateTabLocks();
    const L = SCRATCH_LADDER.find(x => x.tab === 'journey');
    return { won, fresh, ticketName: L.name, ticketSvg: !!(L.iconHtml && L.iconHtml().includes('<svg')) };
  });
  is(tabs.won[0], 'journey', 'the Bible takes the far-left slot once earned');
  is(tabs.fresh[0], 'learn', '…and Learn has it on a fresh account');
  is(tabs.ticketName, 'Bible', 'the scratch-off names it Bible, not Journey');
  ok(tabs.ticketSvg, '…and shows the Bible icon');

  // ---------------- verse practice: any vpOrder, vpSticky boxes, snooze popup (v1.11) ----------------
  describe('verse practice', () => { });

  // the pickers must open in ANY vpOrder - no "pick a book first" gate
  const vpOrder = await $(() => {
    show('verse'); askVerse('43:3:16'); memTestWrong = 1;      // >0 suppresses the auto-Check timer
    const out = {};
    el('mtFieldV').click();                                    // verse FIRST, with nothing else chosen
    out.verseOpensFirst = el('mtOverlay').style.display !== 'none' && el('mtVerseGrid').style.display !== 'none';
    const anyV = document.querySelector('#mtVerseGrid [data-vn]'); if (anyV) anyV.click();
    out.verseHeld = mtSel.v;
    el('mtFieldC').click();                                    // then chapter, still no book
    out.chapOpensFirst = el('mtOverlay').style.display !== 'none' && el('mtChapGrid').style.display !== 'none';
    const anyC = document.querySelector('#mtChapGrid [data-cn]'); if (anyC) anyC.click();
    out.chapHeld = mtSel.c;
    out.verseSurvived = mtSel.v;
    return out;
  });
  ok(vpOrder.verseOpensFirst, 'the verse picker opens with no book chosen');
  ok(vpOrder.verseHeld > 0, '...and the choice is kept');
  ok(vpOrder.chapOpensFirst, 'the chapter picker opens with no book chosen');
  ok(vpOrder.chapHeld > 0, '...and a chapter can be chosen after the verse');
  ok(vpOrder.verseSurvived > 0, '...without losing the verse already picked');

  // a wrong answer must not empty the boxes
  const vpSticky = await $(() => {
    show('verse'); askVerse('43:3:16');
    mtSel = { b: 1, c: 1, v: 1 };                              // deliberately wrong - the verse is John 3:16
    el('mtCheck').click();
    return { b: mtSel.b, c: mtSel.c, v: mtSel.v, warned: !!el('mtWarn').textContent };
  });
  ok(vpSticky.warned, 'a wrong answer is marked wrong');
  is(vpSticky.b, 1, '...and the book stays put');
  is(vpSticky.c, 1, '...and the chapter stays put');
  is(vpSticky.v, 1, '...and the verse stays put');

  // a new choice clears another ONLY when it makes it impossible.
  // Driven through the real buttons, so it is the shipped handler being tested.
  const vpRange = await $(() => {
    show('verse'); askVerse('43:3:16'); memTestWrong = 1;
    const openB = () => el('mtFieldB').click();
    const books = () => [...document.querySelectorAll('#mtBookList [data-bk]')];
    openB();
    const impossibleC = [], possibleC = [];
    books().forEach(btn => { mtSel = { b: 0, c: 200, v: 0 }; btn.click(); impossibleC.push(mtSel.c); openB(); });
    books().forEach(btn => { mtSel = { b: 0, c: 1, v: 0 }; btn.click(); possibleC.push(mtSel.c); openB(); });
    el('mtFieldB').click();                                     // close the book sheet
    const openC = () => el('mtFieldC').click();
    const chaps = () => [...document.querySelectorAll('#mtChapGrid [data-cn]')];
    openC();
    const impossibleV = [], possibleV = [];
    chaps().forEach(btn => { mtSel = { b: 43, c: 0, v: 999 }; btn.click(); impossibleV.push(mtSel.v); openC(); });
    chaps().forEach(btn => { mtSel = { b: 43, c: 0, v: 1 }; btn.click(); possibleV.push(mtSel.v); openC(); });
    return {
      books: impossibleC.length, chaps: impossibleV.length,
      cCleared: impossibleC.every(c => c === 0), cKept: possibleC.every(c => c === 1),
      vCleared: impossibleV.every(v => v === 0), vKept: possibleV.every(v => v === 1),
    };
  });
  ok(vpRange.books > 0 && vpRange.chaps > 0, 'there are books and chapters to try');
  ok(vpRange.cCleared, 'a chapter no book has is cleared when the book changes');
  ok(vpRange.cKept, '...but chapter 1 survives every book');
  ok(vpRange.vCleared, 'a verse no chapter has is cleared when the chapter changes');
  ok(vpRange.vKept, '...but verse 1 survives every chapter');

  // five in a row asks about resting the verse - in a popup, not at the foot of the card
  const vpSnz = await $(() => {
    const kk = '43:3:16';
    Prog.verseSR = { [kk]: Object.assign(newSR(), { cr: 4, rd: false }) }; saveProg();
    show('verse'); askVerse(kk);
    mtSel = { b: 43, c: 3, v: 16 }; el('mtCheck').click();
    return { inlineOffer: /Rest this verse/i.test(el('mtFb').innerText), cr: vsr(kk).cr };
  });
  no(vpSnz.inlineOffer, 'the rest offer is no longer printed under the card');
  is(vpSnz.cr, 5, '...and five clean recalls is what triggers it');
  await page.waitForFunction(() => { const m = el('snoozeModal'); return m && m.style.display === 'flex'; }, { timeout: 4000 }).catch(() => { });
  const vpSnzModal = await $(() => {
    const m = el('snoozeModal');
    const out = { shown: !!m && m.style.display === 'flex', txt: m ? m.innerText : '' };
    if (out.shown) {
      el('szYes').click();
      out.snoozed = (vsr('43:3:16').sz || 0) > Date.now();
      out.closed = m.style.display === 'none';
    }
    return out;
  });
  ok(vpSnzModal.shown, 'it is asked in a popup of its own');
  has(vpSnzModal.txt, '14 days', '...naming the fortnight');
  ok(vpSnzModal.snoozed, '...and accepting rests the verse');
  ok(vpSnzModal.closed, '...and closes the popup');

  // ---------------- number & book practice set-up (v1.11) ----------------
  describe('number practice set-up', () => { });
  const ntsAll = await $(() => {
    Prog.ntPrefs = {}; saveProg();
    const d = ntPrefs();
    const out = { defaults: d.types.length, count: d.count, forms: NT_FORMS.length,
      labels: NT_FORMS.map(f => f.label).join(' | ') };
    openNumTestSetup();
    out.screen = !!el('ntsForms');
    out.rows = document.querySelectorAll('#ntsForms [data-form]').length;
    out.allChecked = document.querySelectorAll('#ntsForms [data-form].sel').length;
    out.countShown = el('ntsCount').textContent;
    document.querySelectorAll('#ntsForms [data-form]').forEach(b => { if (b.dataset.form !== 'q_n2b') b.click(); });
    out.leftChecked = document.querySelectorAll('#ntsForms [data-form].sel').length;
    el('ntsGo').click();
    out.askedTypes = [...new Set((NT.qs || []).map(q => q.type))];
    out.qCount = (NT.qs || []).length;
    out.allBookNumbers = (NT.qs || []).every(q => q.n <= 66);
    return out;
  });
  is(ntsAll.forms, 6, 'six forms - three pairs, each run both ways');
  is(ntsAll.defaults, 6, 'all six are on by default');
  is(ntsAll.count, 15, 'and fifteen questions by default');
  has(ntsAll.labels, 'Numbers to Books', 'Numbers to Books is offered');
  has(ntsAll.labels, 'Images to Books', 'Images to Books is offered');
  ok(ntsAll.screen, 'practice opens on a set-up screen');
  is(ntsAll.rows, 6, '...listing every form');
  is(ntsAll.allChecked, 6, '...all ticked to start');
  is(ntsAll.countShown, '15', '...and showing fifteen');
  is(ntsAll.leftChecked, 1, 'the others can be unticked');
  is(ntsAll.askedTypes.join(','), 'q_n2b', 'and then ONLY that form is asked');
  is(ntsAll.qCount, 15, 'fifteen questions were built');
  ok(ntsAll.allBookNumbers, 'a book form never draws a number above 66');

  const ntsKept = await $(() => {
    Prog.ntPrefs = { types: ['q_i2n'], count: 40 }; saveProg();
    openNumTestSetup();
    const out = {
      checked: [...document.querySelectorAll('#ntsForms [data-form].sel')].map(b => b.dataset.form).join(','),
      count: el('ntsCount').textContent,
      choices: NT_COUNTS[0] + '-' + NT_COUNTS[NT_COUNTS.length - 1],
    };
    el('ntsGo').click();
    out.built = (NT.qs || []).length;
    out.types = [...new Set((NT.qs || []).map(q => q.type))].join(',');
    return out;
  });
  is(ntsKept.checked, 'q_i2n', 'returning to the screen shows the last set-up');
  is(ntsKept.count, '40', '...including how many to ask');
  is(ntsKept.choices, '5-50', 'the count may be set anywhere from 5 to 50');
  is(ntsKept.built, 40, '...and that many are asked');
  is(ntsKept.types, 'q_i2n', '...in the one form chosen');

  const ntsEmpty = await $(() => {
    Prog.ntPrefs = {}; saveProg(); openNumTestSetup();
    document.querySelectorAll('#ntsForms [data-form]').forEach(b => b.click());   // untick every one
    return { disabled: el('ntsGo').disabled, warned: !!el('ntsWarn').textContent };
  });
  ok(ntsEmpty.disabled, 'with nothing ticked there is nothing to begin');
  ok(ntsEmpty.warned, '...and the screen says so');

  // ---------------- Rome: a romeLevy stands until it is paid (v1.11) ----------------
  describe('the romeLevy', () => { });
  const romeLevy = await $(() => {
    Billing.grant();
    Prog.talents = 3000; Prog.taxOwed = 0; Prog.romeLetterSeen = true;
    Prog.taxAt = Date.now() - 8 * 86400000; saveProg();
    const out = { dueBefore: taxPending() };
    openTaxWheel(false);
    out.owedOnOpen = Prog.taxOwed > 0;
    el('taxov').classList.remove('on', 'march');                // walk away - exactly what closing the app does
    Prog.taxAt = Date.now(); saveProg();                        // even with the schedule reset, the debt stands
    out.stillPending = taxPending();
    out.talentsUntouched = Prog.talents;
    return out;
  });
  ok(romeLevy.dueBefore, 'a romeLevy falls due after seven days');
  ok(romeLevy.owedOnOpen, 'the demand is recorded the moment the wheel is raised');
  ok(romeLevy.stillPending, 'walking away does NOT discharge it');
  is(romeLevy.talentsUntouched, 3000, '...and nothing was taken');

  await page.evaluate(() => { Prog.taxOwed = Date.now(); Prog.talents = 3000; saveProg(); openTaxWheel(false); el('taxGo').click(); });
  await page.waitForFunction(() => Prog.taxOwed === 0, { timeout: 9000 }).catch(() => { });
  const romeSettled = await $(() => ({ owed: Prog.taxOwed, talents: Prog.talents }));
  is(romeSettled.owed, 0, 'facing the wheel settles the romeLevy');
  ok(romeSettled.talents < 3000, '...because talents actually left the purse');

  const romeMerged = await $(() => {
    const mk = o => migrateProg(Object.assign(JSON.parse(JSON.stringify(Prog)), o));
    const m1 = mergeProg(mk({ taxOwed: 5000, taxAt: 0 }), mk({ taxOwed: 0, taxAt: 0 }));
    const m2 = mergeProg(mk({ taxOwed: 5000, taxAt: 0 }), mk({ taxOwed: 0, taxAt: 6000 }));
    return { unsynced: m1.taxOwed, paid: m2.taxOwed };
  });
  ok(romeMerged.unsynced > 0, 'a romeLevy owed on one device survives a sync from another');
  is(romeMerged.paid, 0, '...unless that other device has already romeSettled it');

  await $(() => {
    Billing.revoke(); Prog.taxOwed = 0; Prog.taxAt = 0; saveProg();
    ['taxov', 'buildov'].forEach(id => { const o = el(id); if (o) o.classList.remove('on', 'march'); });
    return true;
  });

  // ---------------- the word-pick warm-up (v1.12) ----------------
  describe('word pick', () => { });
  // Sample the tiles at a dozen points in the verse - any single step may happen to draw only
  // clean words, so one screenful proves nothing either way.
  const wpTiles = await $(() => {
    startWordPick(43, 3, 16, () => { });                       // John 3:16 - commas throughout
    let rawPunct = 0, blank = 0, total = 0; const edged = [];
    for (let i = 0; i < Math.min(12, WP.words.length); i++) {
      WP.idx = i; WP.opts = null; renderWordPick();
      [...document.querySelectorAll('.wpopt')].forEach(t => {
        total++;
        const L = t.textContent;
        if (/^[^A-Za-z0-9]|[^A-Za-z0-9]$/.test(t.dataset.w)) rawPunct++;
        if (!L.trim()) blank++;
        if (/[A-Za-z0-9]/.test(L) && /^[^A-Za-z0-9]|[^A-Za-z0-9]$/.test(L)) edged.push(L);
      });
    }
    return { total, rawPunct, blank, edged: edged.join(','), skip: !!el('wpSkip') };
  });
  ok(wpTiles.total > 20, 'the warm-up offers tiles throughout the verse');
  ok(wpTiles.rawPunct > 0, '...drawn from words that really do carry punctuation');
  is(wpTiles.edged, '', '...yet no tile shows it hanging off the word');
  is(wpTiles.blank, 0, 'and no tile is left blank');
  ok(wpTiles.skip, 'the warm-up can be skipped');

  is(await $(() => wpLabel('world,')), 'world', 'a trailing comma is dropped from the tile');
  is(await $(() => wpLabel('(and')), 'and', 'so is an opening bracket');
  is(await $(() => wpLabel("LORD's")), "LORD's", "...but an apostrophe inside a word is not");
  is(await $(() => wpLabel('well-beloved')), 'well-beloved', '...nor a hyphen');

  // stripping the label must not change what is MATCHED, nor what the verse builds into
  const wpFound = await $(() => {
    startWordPick(43, 3, 16, () => { });
    const correct = WP.words[WP.idx];
    const tile = [...document.querySelectorAll('.wpopt')].find(t => normWord(t.dataset.w) === normWord(correct));
    if (tile) tile.click();
    return { found: !!tile, correct };
  });
  ok(wpFound.found, 'the right word is still findable by its bare label');
  await page.waitForFunction(() => WP && WP.idx === 1, { timeout: 3000 }).catch(() => { });
  const wpAfter = await $(() => ({ idx: WP && WP.idx, built: el('wpDisplay') ? el('wpDisplay').textContent : '' }));
  is(wpAfter.idx, 1, '...and choosing it still advances the warm-up');
  has(wpAfter.built, wpFound.correct, '...building the verse with its punctuation intact');

  const wpSkip = await $(() => {
    startWordPick(43, 3, 16, () => { });
    el('wpSkip').click();
    return { typing: !!el('ttIn'), wpEnded: WP === null, sameVerse: TT && TT.b + ':' + TT.c + ':' + TT.v };
  });
  ok(wpSkip.typing, 'skipping goes straight to typing it from memory');
  ok(wpSkip.wpEnded, '...ending the warm-up');
  is(wpSkip.sameVerse, '43:3:16', '...on the same verse');

  // ================= THE VERSE LADDER (v1.13) =================
  // These rewrite Prog freely, so the seeded account is snapshotted and put back at the end.
  const ladderSnap = await $(() => JSON.stringify(Prog));
  await $(() => { setFeat('w4w', true); return true; });   // the ladder is a Feature Store switch now

  describe('bible stories: the order, and what a reorder must not cost', () => { });
  const order = await $(() => {
    const titles = STORY_GROUPS.map(g => g.t);
    const at = t => titles.indexOf(t);
    return {
      total: STORY_TOTAL, sections: titles.length,
      parablesRun: [1,2,3,4,5,6,7].map((n, i) => at('Parables of Jesus ' + ['I','II','III','IV','V','VI','VII'][i])),
      wp1: at('Word Pictures of Jesus I'), wp2: at('Word Pictures of Jesus II'),
      cross: at('The Cross & Resurrection'), church: at('The Early Church'), paul: at('Paul & the End'),
      icons: STORY_GROUPS.length,
      tail: titles.slice(-3).join(' | '),
    };
  });
  is(order.sections, 26, 'twenty-six sections');
  is(order.total, 130, '...holding 130 stories');
  is(order.parablesRun.join(','), '14,15,16,17,18,19,20', 'the seven parable sections run consecutively');
  is(order.wp1, 21, '...then the word pictures');
  is(order.wp2, 22, '...both of them');
  is(order.tail, 'The Cross & Resurrection | The Early Church | Paul & the End', '...and the cross, the church and Paul close the list');

  // The one that matters: a story is stored by its POSITION, so reordering the list renames every
  // id. What must survive is not the id but the STORY — whatever was finished must still be.
  const carriedOver = await $(() => {
    const names = [];
    let i = 0;
    const byId = {};
    STORY_GROUPS.forEach(g => g.s.forEach(st => { byId[i] = st[0]; i++; }));
    // Rebuild the order as it shipped in v1.35.0 and pick some finished stories from it.
    const V1 = ['Creation & the Fall','Abraham & the Patriarchs','Jacob & Joseph','Moses & the Exodus',
      'Wilderness & the Law','Conquest & Judges','From Ruth to King David','David & Solomon','Elijah & Elisha',
      'Prophets & Suffering','Exile & Deliverance','The Birth of Jesus','Jesus Begins His Ministry','Miracles of Jesus',
      'Parables of Jesus I','Parables of Jesus II','Parables of Jesus III','The Cross & Resurrection','The Early Church',
      'Paul & the End','Parables of Jesus IV','Parables of Jesus V','Parables of Jesus VI','Parables of Jesus VII',
      'Word Pictures of Jesus I','Word Pictures of Jesus II'];
    const oldName = {};
    let j = 0;
    V1.forEach(t => { const g = STORY_GROUPS.find(x => x.t === t); g.s.forEach(st => { oldName[j] = st[0]; j++; }); });

    // one from each affected band, plus one that must not move at all
    const oldIds = [3, 84, 85, 89, 99, 100, 119, 129];
    const wanted = oldIds.map(n => oldName[n]);

    const p = { doneSkills: oldIds.map(n => 'story:' + n), storySections: [] };
    migrateProg(p);
    const got = p.doneSkills.map(s => byId[+s.split(':')[1]]);
    return { wanted: wanted.join(' | '), got: got.join(' | '), flag: !!p.storyOrderV2,
             again: (() => { migrateProg(p); return p.doneSkills.map(s => byId[+s.split(':')[1]]).join(' | '); })() };
  });
  is(carriedOver.got, carriedOver.wanted, 'every finished story is still the same story after the reorder');
  ok(carriedOver.flag, '...the migration marks itself done');
  is(carriedOver.again, carriedOver.wanted, '...and running it twice moves nothing a second time');

  // A bought section was stored by position too, which the reorder would have turned into a
  // different section. They are stored by name now, and the old numbers are converted.
  const bought = await $(() => {
    const first = UNITS.findIndex(u => u.story);
    Prog.storySections = [first + 17];           // v1.35.0: position 17 was The Cross & Resurrection
    saveProg();
    location.hash = '';                          // (no navigation needed; just re-run the upgrade)
    const list = Prog.storySections;
    // re-run the same upgrade the app runs at boot
    Prog.storySections = list.map(x => typeof x === 'number' ? (STORY_ORDER_V1[x - first] || null) : x).filter(Boolean);
    const owned = t => storySectionOwned(UNITS.findIndex(u => u.name === t));
    return { stored: Prog.storySections.join(','), cross: owned('The Cross & Resurrection'),
             parables4: owned('Parables of Jesus IV') };
  });
  is(bought.stored, 'The Cross & Resurrection', 'a section bought by position is converted to its name');
  ok(bought.cross, '...and is still the section that was paid for');
  no(bought.parables4, '...not whatever now sits at that position');

  describe('the long trail', () => { });
  const trail = await $(() => ({
    seen: SR_TRAIL.join(','), all: SR_ALL.join(','),
    names: [60, 180, 730].map(d => SR_LONG_NAME[d]).join(','),
    // the drawn trail must stay six dots no matter how far along a verse is
    drawnAtEnd: (() => { const d = document.createElement('div');
      d.innerHTML = srTrailHTML({ step: SR_ALL.length, learnedAt: 1 });
      return d.querySelectorAll('.srn').length; })(),
    sealedAtThirty: palaceTrailDone({ step: SR_TRAIL.length }),
  }));
  is(trail.seen, '0,1,3,7,16,30', 'the trail you can see is still six checkpoints');
  is(trail.all, '0,1,3,7,16,30,60,180,730', '...and the engine walks three more behind it');
  is(trail.names, 'two month,six month,two year', '...which have names for when you pass one');
  is(trail.drawnAtEnd, 6, 'the long ones are never drawn — six dots stay six dots');
  ok(trail.sealedAtThirty, '...and a verse is still sealed when the visible trail is done');

  // Three clean runs should leave the verse asked again at D16.
  const walk = await $(() => {
    const o = { learnedAt: Date.now(), step: 1, dueAt: Date.now() + DAY, r0: 1 };
    const steps = [];
    for (let i = 0; i < 3; i++) {
      const passed = srAdvanceClean(o);
      steps.push(passed + '->' + Math.round((o.dueAt - Date.now()) / DAY));
    }
    return { steps: steps.join(' '), step: o.step, nextCheckpoint: SR_ALL[o.step], lt: o.lt || null };
  });
  is(walk.steps, '1->2 3->4 7->9', 'each clean run completes the next checkpoint and sets the gap to the one after');
  is(walk.nextCheckpoint, 16, 'three clean runs and the verse is next asked at D16');
  is(walk.lt, null, '...with nothing recorded from the long tail yet');

  const longTail = await $(() => {
    const o = { learnedAt: Date.now(), step: 5, dueAt: Date.now(), r0: 1 };   // about to complete D30
    const out = [];
    out.push(srAdvanceClean(o));            // D30 — still the visible trail
    const afterThirty = o.lt || null;
    out.push(srAdvanceClean(o));            // two month
    const two = o.lt;
    out.push(srAdvanceClean(o));            // six month
    const six = o.lt;
    out.push(srAdvanceClean(o));            // two year
    const yr = o.lt;
    return { passed: out.join(','), afterThirty, two, six, yr,
             exhausted: srAdvanceClean(o), sealed: palaceTrailDone(o) };
  });
  is(longTail.passed, '30,60,180,730', 'past D30 the trail carries on at two months, six months and two years');
  is(longTail.afterThirty, null, 'finishing the visible trail records nothing — it is not a long checkpoint');
  is(longTail.two, 60, 'passing the two month review is remembered');
  is(longTail.six, 180, '...and the six month');
  is(longTail.yr, 730, '...and the two year');
  is(longTail.exhausted, null, 'and there is nothing after the last one');
  ok(longTail.sealed, '...the verse having been sealed since D30');

  describe('one clean run a day', () => { });
  const gap = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.w4wSR = { [k]: { cr: 1, n: 1, ok: 1, at: Date.now() } }; saveProg();
    const afterClean = w4wTestLocked(k);
    Prog.revPrefs = { loc: false, w4w: true }; saveProg();
    askVerseIn(k);
    const askedByAddress = !el('ttIn');
    Prog.w4wSR[k] = { cr: 0, n: 2, ok: 1, at: Date.now() }; saveProg();     // a MISS, just now
    const afterMiss = w4wTestLocked(k);
    Prog.w4wSR[k] = { cr: 3, n: 5, ok: 4, at: Date.now() - 25 * 3600000 }; saveProg();
    return { afterClean, askedByAddress, afterMiss, aDayLater: w4wTestLocked(k) };
  });
  ok(gap.afterClean, 'a verse that just came back clean rests before it can be tested again');
  ok(gap.askedByAddress, '...and review asks it by address meanwhile rather than skipping it');
  no(gap.afterMiss, 'a MISSED run does not lock — getting it wrong should never make you wait');
  no(gap.aDayLater, '...and a day later it can be tested again');

  const joins = await $(() => {
    const k = '19:23:1';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.verseSR = {}; saveProg();
    setVerseStage(k, 'heart');
    const o = Prog.verseSR[k] || {};
    return { has: !!Prog.verseSR[k], step: o.step, firstLookDone: !!o.r0,
             dueInDays: Math.round((o.dueAt - Date.now()) / DAY), inDeck: deckKeys().includes(k) };
  });
  ok(joins.has, 'claiming a verse puts it into spaced repetition there and then');
  is(joins.step, 1, '...at D1');
  ok(joins.firstLookDone, '...past the four-hour first look, because it is being tested now');
  is(joins.dueInDays, 1, '...so it comes round tomorrow');
  ok(joins.inDeck, '...and it is in the deck');

  describe('my verses: books three to a row', () => { });
  const grid = await $(() => {
    Prog.memorized = ['43:3:16', '43:11:35', '19:23:1', '40:5:9'];
    Prog.verseStage = { '43:3:16': 'heart' };
    Prog.verseSR = {}; saveProg();
    show('verse'); vView = 'mem'; renderVerse();
    const btns = [...document.querySelectorAll('#verse [data-bookgrid]')];
    const out = {
      books: btns.length,
      cols: getComputedStyle(document.querySelector('#verse .bookgrid')).gridTemplateColumns.split(' ').length,
      labels: btns.map(b => b.querySelector('.bg-n').textContent).join(' | '),
      accordionGone: !document.querySelector('#verse .bookhead'),
      heartsShown: !!document.querySelector('#verse .bookbtn .heart-etch'),
    };
    // tapping a book brings its verses up in a popup that scrolls on its own
    btns.find(b => b.dataset.bookgrid.endsWith(':43')).click();
    const m = document.getElementById('bkVerseModal');
    out.popupOpen = !!m && m.style.display === 'flex';
    out.popupTitle = m.querySelector('.lv-topbar div').textContent.trim();
    out.rows = m.querySelectorAll('.vlist [data-vb]').length;
    out.scrolls = getComputedStyle(m.querySelector('.bkverses')).overflowY;
    out.onlyThatBook = [...m.querySelectorAll('[data-vb]')].every(r => r.dataset.vb.startsWith('43:'));
    out.hasClose = !!m.querySelector('#bvClose') && !!m.querySelector('#bvDone');
    m.style.display = 'none';
    return out;
  });
  is(grid.books, 3, 'one button per book you have verses in');
  is(grid.cols, 3, '...three to a row');
  is(grid.labels, 'Psalms | Matthew | John', '...named and in book order');
  ok(grid.accordionGone, '...and the old accordion is gone');
  ok(grid.heartsShown, 'a book holding verses known by heart says so');
  ok(grid.popupOpen, 'tapping a book opens its verses in a popup');
  is(grid.popupTitle, 'John', '...titled with the book');
  is(grid.rows, 2, '...listing its verses');
  ok(grid.onlyThatBook, '...and only that book\'s');
  is(grid.scrolls, 'auto', '...scrolling on its own rather than growing the page');
  ok(grid.hasClose, '...with a cross and a Done, like every other popup');

  describe('the bible screen', () => { });
  const bib = await $(() => {
    Prog.memorized = ['43:3:16', '43:11:35'];
    Prog.verseStage = { '43:3:16': 'heart' }; saveProg();
    show('journey'); renderJourney();
    const top = el('journey').innerText;
    const out = {
      saysWhatItIs: /Every book, chapter and verse/.test(top),
      mentionsUnlocking: /opening as you learn its numbers/.test(top),
      mentionsYourVerses: /your own verses in that book/.test(top),
      wholeBibleGone: !/whole Bible/i.test(top),
      countShown: /of 66 books open/.test(top),
    };
    renderBookScreen(43);
    const bk = el('journey').innerText;
    out.inBook = /YOUR VERSES/.test(bk);
    out.inBookCount = /2 in John/.test(bk);
    out.inBookHearts = /1 known by heart/.test(bk);
    out.inBookRows = document.querySelectorAll('#journey .bkverses [data-vb]').length;
    out.backLabel = el('bkBack').textContent.trim();
    renderBookScreen(1);
    out.emptyBookQuiet = !/YOUR VERSES/.test(el('journey').innerText);
    return out;
  });
  ok(bib.saysWhatItIs, 'the Bible screen says what it is');
  ok(bib.mentionsUnlocking, '...that it opens as you learn the numbers');
  ok(bib.mentionsYourVerses, '...and that your own verses are in there');
  ok(bib.wholeBibleGone, '"The whole Bible" is gone — the screen already says Bible');
  ok(bib.countShown, '...replaced by how many of the 66 books you have opened');
  ok(bib.inBook, 'a book shows your verses in it, under the chapters');
  ok(bib.inBookCount, '...counted');
  ok(bib.inBookHearts, '...saying how many you know by heart');
  is(bib.inBookRows, 2, '...and listing them');
  is(bib.backLabel, '← All books', 'the way back does not repeat the word Bible either');
  ok(bib.emptyBookQuiet, 'a book you have no verses in says nothing at all');

  describe('pull to refresh', () => { });
  const ptr = await $(() => {
    const out = {};
    const sc = document.querySelector('.content');
    const ind = document.getElementById('ptr');
    out.exists = !!ind;
    out.hiddenAtRest = !!ind && !ind.classList.contains('on');
    const touch = (type, y) => sc.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), {
      touches: type === 'touchend' ? [] : [{ clientY: y }]
    }));
    sc.scrollTop = 0;
    // a short pull is not enough
    touch('touchstart', 100); touch('touchmove', 130);
    out.shortShows = ind.classList.contains('on');
    out.shortArmed = ind.classList.contains('armed');
    touch('touchend', 130);
    out.shortReset = !ind.classList.contains('on');
    // a long pull arms it
    touch('touchstart', 100); touch('touchmove', 100 + PTR_TRIGGER + 10);
    out.longArmed = ind.classList.contains('armed');
    out.says = ind.querySelector('.ptr-t').textContent;
    // an upward drag is never a refresh
    touch('touchstart', 200); touch('touchmove', 150);
    out.upIgnored = !ind.classList.contains('armed') && !ind.classList.contains('on');
    // ...and neither is a pull that begins part-way down the page. The scroller needs something
    // to scroll before scrollTop will hold a value at all, hence the filler.
    const filler = document.createElement('div'); filler.style.height = '2000px'; sc.appendChild(filler);
    sc.scrollTop = 60;
    out.reallyScrolled = sc.scrollTop > 0;
    touch('touchstart', 100); touch('touchmove', 300);
    out.scrollingIgnored = !ind.classList.contains('armed');
    filler.remove(); sc.scrollTop = 0;
    return out;
  });
  ok(ptr.exists, 'the app carries its own pull-to-refresh, because a contained scroller kills the browser one');
  ok(ptr.hiddenAtRest, '...invisible until you actually pull');
  ok(ptr.shortShows, 'a small pull shows the hint');
  no(ptr.shortArmed, '...without arming it');
  ok(ptr.shortReset, '...and letting go puts it away without reloading');
  ok(ptr.longArmed, 'pulling past the trigger arms it');
  is(ptr.says, 'Release to refresh', '...and says so');
  ok(ptr.upIgnored, 'dragging upward never arms it');
  ok(ptr.reallyScrolled, 'with the page genuinely scrolled down');
  ok(ptr.scrollingIgnored, '...a downward drag from there is a scroll, not a refresh');

  describe('ladder: two rungs', () => { });
  const st = await $(() => {
    const k = '43:3:16';
    if (!Prog.memorized.includes(k)) Prog.memorized.push(k);
    Prog.verseStage = {}; Prog.locPast = {}; Prog.w4wSR = {};
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } }; saveProg();
    const out = { stages: V_STAGES.join(','), fresh: verseStage(k), memBefore: Prog.memorized.length };
    setVerseStage(k, 'heart');
    out.now = verseStage(k);
    out.heldAfter = !!(Prog.verseLoc || {})[k];        // claiming a verse must NOT cost it its heartStation
    out.memAfter = Prog.memorized.length;
    setVerseStage(k, 'loc');
    out.back = verseStage(k);
    out.stillHeld = !!(Prog.verseLoc || {})[k];
    return out;
  });
  is(st.stages, 'loc,heart', 'two rungs, in order');
  is(st.fresh, 'loc', 'a verse starts at Located with nothing stored');
  is(st.now, 'heart', 'it can be claimed as Known by heart');
  ok(st.heldAfter, '...and KEEPS its palace heartStation while it is being tested');
  is(st.memAfter, st.memBefore, 'and it still counts as one of your verses');
  is(st.back, 'loc', 'the claim is reversible');
  ok(st.stillHeld, '...with the heartStation untouched throughout');

  const oldRung = await $(() => {
    const k = '43:3:16';
    Prog.verseStage = { [k]: 'w4w' };
    const readsAs = verseStage(k);                     // defensive: before any migration runs
    migrateProg(Prog);
    return { readsAs, stored: Prog.verseStage[k] };
  });
  is(oldRung.readsAs, 'heart', 'a stage left on the old middle rung READS as Known by heart');
  is(oldRung.stored, 'heart', '...and migration carries it UP, never back down to Located');

  describe('ladder: a claimed verse is the one worked hardest', () => { });
  const heartDeck = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.verseSR = { [k]: Object.assign(newSR(), { step: 1, dueAt: Date.now() - 86400000, r0: 1 }) };
    Prog.revPrefs = { loc: true, w4w: true }; saveProg();
    return { inDeck: deckKeys().includes(k), due: verseDue(k), dueN: versesDueCount(),
             pool: w4wPoolSize(), counts: stageCounts() };
  });
  ok(heartDeck.inDeck, 'a claimed verse stays in the practice heartDeck');
  ok(heartDeck.due, '...still falls due');
  is(heartDeck.dueN, 1, '...and is counted as due');
  is(heartDeck.pool, 1, '...and is what the word-for-word pool is made of');
  is(heartDeck.counts.heart, 1, '...counted under By heart');

  describe('ladder: the word-for-word test', () => { });
  const clean = await $(() => {
    const k = '43:11:35';                                    // "Jesus wept." - two words
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' }; Prog.w4wSR = {}; Prog.verseLoc = {}; saveProg();
    startW4WTest(43, 11, 35, () => { });
    const out = { isTest: !!TT.test, hintHidden: el('ttHint').style.display === 'none', misses0: TT.misses };
    out.header = el('verse').innerText.split('\n')[0] + ' ' + (el('verse').innerText.match(/John 11:35/) ? 'John 11:35' : '');
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    TT.words.slice().forEach(put);
    const r = w4wsr(k) || {};
    out.n = r.n; out.ok = r.ok; out.cr = r.cr;
    out.result = el('verse').innerText;
    return out;
  });
  ok(clean.isTest, 'a test knows it is a test');
  ok(clean.hintHidden, '...and offers no reveal-a-letter');
  has(clean.header, 'John 11:35', '...showing only the reference at the top');
  is(clean.misses0, 0, '...starting with a clean sheet');
  is(clean.n, 1, 'finishing it records a test');
  is(clean.ok, 1, '...a passed one');
  is(clean.cr, 1, '...and starts the streak');
  has(clean.result, 'Clean runs in a row: 1 of 5', 'the result says how far along the streak is');

  const dirty = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.w4wSR = { [k]: { cr: 3, n: 3, ok: 3, at: 0 } }; saveProg();
    startW4WTest(43, 11, 35, () => { });
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    put('Jesux');                                            // same length, wrong word
    const misses = TT.misses;
    TT.words.slice().forEach(put);
    const r = w4wsr(k) || {};
    const out = { misses, cr: r.cr, n: r.n, ok: r.ok };
    el('wtDone').click();                                     // a miss on a CLAIMED verse asks about it
    const m = el('demoteModal');
    out.asked = !!m && m.style.display === 'flex';
    out.txt = m ? m.innerText : '';
    return out;
  });
  is(dirty.misses, 1, 'a wrong word is counted');
  is(dirty.n, 4, '...the attempt still counts as a test');
  is(dirty.ok, 3, '...but not as a pass');
  is(dirty.cr, 0, '...and a single slip breaks the run of five');
  ok(dirty.asked, 'missing a word on a claimed verse ASKS whether to put it back in practice');
  has(dirty.txt, 'No — I know this one', '...and the claim is never taken back without an answer');

  describe('ladder: the heartStation is earned back', () => { });
  const heartStation = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } };
    Prog.locPast = {}; Prog.w4wSR = { [k]: { cr: 3, n: 3, ok: 3, at: 0 } }; saveProg();
    const held = !heartMaybeFreeStation(k);
    Prog.w4wSR[k].cr = W4W_TEST_CR; saveProg();
    const freed = heartMaybeFreeStation(k);
    return { held, freed: freed ? stationName(freed) : '', gone: !(Prog.verseLoc || {})[k],
             remembered: JSON.stringify((Prog.locPast || {})[k] || null) };
  });
  ok(heartStation.held, 'three clean runs is not enough to give up the heartStation');
  is(heartStation.freed, 'My Kitchen · Front door', 'five in a row frees it, and names it');
  ok(heartStation.gone, '...the place in the palace is released');
  is(heartStation.remembered, '{"p":0,"room":"Front door"}', '...but remembered, in case the verse comes back');

  describe('ladder: giving the claim back', () => { });
  const heartDemote = await $(() => {
    const k = '43:11:35';
    const setup = count => {
      Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
      Prog.w4w = { [k]: { count, times: [] } };
      Prog.w4wSR = { [k]: { cr: 2, n: 2, ok: 2, at: 0 } };
      Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
      Prog.locPast = { [k]: { p: 0, room: 'Front door' } }; Prog.verseLoc = {};
      Prog.stageAsk = { [k]: { heart: W4W_PRACTICE_FOR_POOL } }; saveProg();
    };
    setup(W4W_PRACTICE_FOR_POOL);                    // it EARNED the claim
    const wasReset = demoteFromHeart(k);
    const earned = { wasReset, count: w4wCount(k), stage: verseStage(k),
                     heartStation: !!(Prog.verseLoc || {})[k], streak: w4wTestStreak(k),
                     askable: !((Prog.stageAsk || {})[k]) };
    setup(3);                                         // claimed EARLY, three practices in
    const earlyReset = demoteFromHeart(k);
    return { earned, earlyClaim: { wasReset: earlyReset, count: w4wCount(k), stage: verseStage(k) } };
  });
  ok(heartDemote.earned.wasReset, 'a verse that EARNED its claim starts the practices again');
  is(heartDemote.earned.count, 0, '...back to nought');
  is(heartDemote.earned.stage, 'loc', '...and back to Located');
  ok(heartDemote.earned.heartStation, '...with its place in the palace handed back');
  is(heartDemote.earned.streak, 0, '...and the clean run wiped');
  ok(heartDemote.earned.askable, '...and it can be offered again once it is ready');
  no(heartDemote.earlyClaim.wasReset, 'a verse claimed EARLY is treated differently');
  is(heartDemote.earlyClaim.count, 3, '...it keeps the practices it had and carries on from there');
  is(heartDemote.earlyClaim.stage, 'loc', '...still back in practice');

  describe('ladder: promotions', () => { });
  const sevenUp = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.stageAsk = {};
    Prog.w4w = { [k]: { count: W4W_PRACTICE_FOR_POOL - 1, times: [] } }; saveProg();
    const before = shouldOfferHeart(k);
    Prog.w4w[k].count = W4W_PRACTICE_FOR_POOL; saveProg();
    const atSeven = shouldOfferHeart(k);
    Prog.verseStage = { [k]: 'heart' }; saveProg();
    const alreadyThere = shouldOfferHeart(k);
    Prog.verseStage = {}; saveProg();
    noteStageAsk(k, 'heart', W4W_PRACTICE_FOR_POOL);
    return { threshold: W4W_PRACTICE_FOR_POOL, before, atSeven, alreadyThere, afterDecline: shouldOfferHeart(k) };
  });
  is(sevenUp.threshold, 7, 'sevenUp practices, not ten');
  no(sevenUp.before, 'six is not yet the moment to ask');
  ok(sevenUp.atSeven, 'sevenUp is');
  no(sevenUp.alreadyThere, '...and a verse already claimed is never asked again');
  no(sevenUp.afterDecline, 'declining is remembered — it asks once, not every time');

  // The point of the whole change: a verse you already knew before you met the app.
  const earlyClaim = await $(() => {
    const k = '19:23:1';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.w4w = {}; Prog.verseLoc = {}; saveProg();
    const [b, c, v] = k.split(':').map(Number);
    renderLearnedVerse(b, c, v, () => { });
    const invite = el('lvStage') ? el('lvStage').innerText : '';
    el('lvStage').click();
    const m = el('stageModal');
    const rungs = [...m.querySelectorAll('[data-stage]')].map(x => x.dataset.stage).join(',');
    m.querySelector('[data-stage="heart"]').click();
    return { practices: w4wCount(k), invite, rungs, stage: verseStage(k) };
  });
  is(earlyClaim.practices, 0, 'a verse with no practices behind it at all');
  has(earlyClaim.invite, 'already know this by heart', '...still invites you to say you know it');
  is(earlyClaim.rungs, 'loc,heart', '...the picker offers both rungs');
  is(earlyClaim.stage, 'heart', '...and claiming it works with nothing practised first');

  describe('ladder: how you are asked', () => { });
  const chooser = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.verseStage = {}; saveProg();
    show('verse'); openReviewSetup();
    const noneToChoose = !el('rvRows');
    Prog.verseStage = { '43:3:16': 'heart' }; saveProg();
    show('verse'); openReviewSetup();
    const rows = [...document.querySelectorAll('#rvRows [data-rk]')].map(b => b.dataset.rk);
    return { noneToChoose, rows: rows.join(','), pool: w4wPoolSize() };
  });
  ok(chooser.noneToChoose, 'with nothing claimed there is nothing to choose — review starts as it always did');
  is(chooser.pool, 1, 'once a verse is claimed');
  is(chooser.rows, 'loc,w4w', '...the chooser offers both ways of being asked, and nothing else');

  const routed = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.revPrefs = { loc: false, w4w: true }; saveProg();
    askVerseIn(k);
    const byTyping = !!el('ttIn');
    Prog.revPrefs = { loc: true, w4w: false }; saveProg();
    askVerseIn(k);
    const byAddress = !!el('mtFieldB');
    Prog.verseStage = {}; Prog.revPrefs = { loc: false, w4w: true }; saveProg();
    askVerseIn(k);                                            // still only located
    const stage1 = !!el('mtFieldB');
    Prog.revPrefs = { loc: false, w4w: false }; saveProg();
    return { byTyping, byAddress, stage1, guard: revPrefs().loc };
  });
  ok(routed.byTyping, 'choose word for word and the verse is asked by typing');
  ok(routed.byAddress, 'choose location and the same verse is asked by address');
  ok(routed.stage1, 'a verse that is only located is ALWAYS asked by address');
  ok(routed.guard, 'unticking both falls back to location rather than asking nothing');

  describe('ladder: the verse page', () => { });
  const vPage = await $(() => {
    const k = '19:23:1';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.verseLoc = {}; saveProg();
    renderLearnedVerse(19, 23, 1, () => { });
    const out = { pips: document.querySelectorAll('.stagepip').length,
      onNow: (document.querySelector('.stagepip.on') || {}).textContent || '',
      cta: (el('lvStage') || {}).textContent || '',
      inWizard: false };
    el('lvStage').click();
    out.picker = !!el('stageModal') && el('stageModal').style.display === 'flex';
    out.choices = document.querySelectorAll('#stageModal [data-stage]').length;
    document.querySelector('#stageModal [data-stage="heart"]').click();
    out.stage = verseStage(k);
    out.ribbon = /Known by heart/i.test(el('verse').innerText);
    // and it is NOT offered while building a new verse
    openVerseWizard(40, 6, 33, () => { });
    out.inWizard = !!el('lvStage');
    return out;
  });
  is(vPage.pips, 2, 'the verse page shows both rungs');
  has(vPage.onNow, 'Located', '...marking where this verse stands');
  has(vPage.cta, 'already know this by heart', 'the way in is on the verse page, with no practice required');
  ok(vPage.picker, 'tapping it opens the picker');
  is(vPage.choices, 2, '...offering both');
  is(vPage.stage, 'heart', 'choosing Known by heart moves the verse');
  ok(vPage.ribbon, '...and the page says so');
  no(vPage.inWizard, 'it is NOT offered while building a new verse — that would be a shortcut past learning');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); }, ladderSnap);

  // ================= THE FEATURE STORE (v1.14) =================
  describe('feature store', () => { });
  const storeSnap = await $(() => JSON.stringify(Prog));

  const cat = await $(() => ({
    n: FEATURES.length,
    ids: FEATURES.map(f => f.id).join(','),
    named: FEATURES.every(f => f.name && f.name.length > 2),
    described: FEATURES.every(f => f.what && f.what.length > 40),
    iconed: FEATURES.every(f => !!f.icon),
    uniqueIds: new Set(FEATURES.map(f => f.id)).size,
    uniqueNames: new Set(FEATURES.map(f => f.name)).size,
    defaultOff: FEATURES.filter(f => !f.on).map(f => f.id).join(','),
  }));
  is(cat.n, 8, 'eight features can be switched');
  is(cat.uniqueIds, 8, '...each with its own id');
  is(cat.uniqueNames, 8, '...and its own name');
  ok(cat.named, 'every feature has a name');
  ok(cat.described, '...and a real description, not a label');
  ok(cat.iconed, '...and an icon');
  is(cat.defaultOff, 'w4w,dict,ntsetup,reminders', 'a new account starts without the four heaviest');
  hasNot(cat.ids, 'rome', "Caesar's Levy is not a switch at all — it comes with Pro");

  // a brand-new account gets the lean set; one that was already in use keeps everything
  const grand = await $(() => {
    Prog.features = {}; Prog.featuresInit = false;
    const keep = Prog.memorized; Prog.memorized = []; Prog.doneSkills = []; Prog.palaces = [];
    grandfatherFeatures();
    const fresh = { w4w: feat('w4w'), goal: feat('goal'), stamped: Prog.featuresInit };
    Prog.features = {}; Prog.featuresInit = false; Prog.memorized = keep;
    grandfatherFeatures();
    const existing = { w4w: feat('w4w'), dict: feat('dict'), rome: feat('rome') };
    return { fresh, existing };
  });
  no(grand.fresh.w4w, 'a brand-new account does not start with Word for Word');
  ok(grand.fresh.goal, '...but does start with the daily goal');
  ok(grand.fresh.stamped, '...and the decision is stamped so it runs once');
  ok(grand.existing.w4w, 'an account already in use keeps Word for Word');
  ok(grand.existing.dict, '...and Word Meanings');
  ok(grand.existing.rome, '...and everything else it had');

  const toggles = await $(() => {
    setFeat('dict', false);
    const off = { dict: feat('dict'), n: featOffCount() };
    setFeat('dict', true);
    const on = { dict: feat('dict'), stored: Prog.features.dict };
    return { off, on };
  });
  no(toggles.off.dict, 'a feature can be switched off');
  ok(toggles.off.n > 0, '...and is counted as available to try');
  ok(toggles.on.dict, '...and switched back on');
  ok(toggles.on.stored === true, '...with the choice actually stored');

  // the gates
  const gates = await $(() => {
    const out = {};
    setFeat('w4w', false); saveProg();
    show('verse'); vView = 'hub'; renderVerse();
    out.hubOff = !el('vW4W');
    out.poolOff = w4wPoolSize();
    out.offerOff = shouldOfferHeart('43:3:16');
    out.routeOff = (() => { Prog.memorized = ['43:11:35']; Prog.verseStage = { '43:11:35': 'heart' };
      Prog.revPrefs = { loc: false, w4w: true }; saveProg(); askVerseIn('43:11:35'); return !el('ttIn'); })();
    openStagePicker(19, 23, 1, '19:23:1', () => { });
    out.rungsOff = [...document.querySelectorAll('#stageModal [data-stage]')].map(b => b.dataset.stage).join(',');
    el('stageModal').style.display = 'none';
    setFeat('w4w', true); saveProg();
    show('verse'); vView = 'hub'; renderVerse();
    out.hubOn = !!el('vW4W');
    openStagePicker(19, 23, 1, '19:23:1', () => { });
    out.rungsOn = [...document.querySelectorAll('#stageModal [data-stage]')].map(b => b.dataset.stage).join(',');
    el('stageModal').style.display = 'none';

    setFeat('wordpick', false);
    startWordPick(43, 3, 16, () => { });
    out.pickOff = !!el('ttIn') && !document.querySelector('.wpopt');
    setFeat('wordpick', true);
    startWordPick(43, 3, 16, () => { });
    out.pickOn = !!document.querySelector('.wpopt');

    Prog.taxAt = Date.now() - 6 * 86400000; saveProg();   // due in a day = the WARNING window, not yet due
    Billing.revoke();
    out.warnOff = taxWarnHTML() === '';
    Billing.grant();
    out.warnOn = taxWarnHTML() !== '';
    Billing.revoke(); saveProg();

    setFeat('badges', false); show('verse'); renderVerse();
    el('themeBtn').click(); applyFeatureVisibility();
    out.badgesHidden = getComputedStyle(el('badgeWrap')).display === 'none';
    setFeat('badges', true); applyFeatureVisibility();
    out.badgesShown = getComputedStyle(el('badgeWrap')).display !== 'none';
    setFeat('reference', false); applyFeatureVisibility();
    out.refHidden = getComputedStyle(el('refWrap')).display === 'none';
    setFeat('reference', true); applyFeatureVisibility();
    el('themeModal').style.display = 'none';
    return out;
  });
  ok(gates.hubOff, 'with Word for Word off its button is gone from the Library');
  is(gates.poolOff, 0, '...the testing pool is empty');
  no(gates.offerOff, '...and nothing is ever offered a promotion into it');
  is(gates.rungsOff, 'loc', '...the ladder has nothing to claim');
  ok(gates.routeOff, '...and a verse already claimed is asked by address, not typed');
  ok(gates.hubOn, 'switching it on brings it back');
  is(gates.rungsOn, 'loc,heart', '...and Known by heart comes back with it');
  ok(gates.pickOff, 'with the warm-up off, typing starts immediately');
  ok(gates.pickOn, '...and on, the tiles come back');
  ok(gates.warnOff, "Caesar's warning is silent without Pro");
  ok(gates.warnOn, '...and speaks with it');
  ok(gates.badgesHidden, 'Milestones can be hidden from Profile');
  ok(gates.badgesShown, '...and shown again');
  ok(gates.refHidden, 'so can the Reference library');

  // the store screen itself
  const fstore = await $(() => {
    openFeatureStore();
    const cards = [...document.querySelectorAll('#fsList .fcard')];
    const out = {
      cards: cards.length,
      switches: document.querySelectorAll('#fsList [data-feat]').length,
      everyCardDescribed: cards.every(c => (c.querySelector('.fwhat') || {}).textContent && c.querySelector('.fwhat').textContent.length > 40),
      free: /free/i.test(el('featModal').innerText),
      names: cards.map(c => c.querySelector('.fname').textContent.replace(/\s*PRO$/, '').trim()).join(' | '),
    };
    const dictSw = document.querySelector('#fsList [data-feat="dict"]');
    const was = feat('dict');
    dictSw.click();
    out.flipped = feat('dict') !== was;
    out.reflected = document.querySelector('#fsList [data-feat="dict"]').classList.contains('on') === feat('dict');
    el('featModal').style.display = 'none';
    return out;
  });
  is(fstore.cards, 8, 'the store lists every feature');
  is(fstore.switches, 8, '...each with its own switch');
  ok(fstore.everyCardDescribed, '...and every one explains what it does before you turn it on');
  ok(fstore.free, '...and says plainly that they are free');
  has(fstore.names, 'Word Meanings', 'Word Meanings is on the shelf');
  has(fstore.names, 'Practice Your Way', '...and the number & book set-up');
  has(fstore.names, 'Word for Word', '...and word-for-word testing');
  ok(fstore.flipped, 'a switch actually switches');
  ok(fstore.reflected, '...and the screen shows the new state');

  const fmerge = await $(() => {
    const mk = o => migrateProg(Object.assign(JSON.parse(JSON.stringify(Prog)), o));
    const m = mergeProg(mk({ features: { dict: true, rome: false } }), mk({ features: { dict: false, rome: false, w4w: true } }));
    return { dict: m.features.dict, w4w: m.features.w4w, rome: m.features.rome };
  });
  ok(fmerge.dict, 'a feature switched on anywhere stays on after a sync');
  ok(fmerge.w4w, '...including one only the other device turned on');
  no(fmerge.rome, '...while one nobody turned on stays off');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); }, storeSnap);

  // ================= v1.15 =================
  const v15Snap = await $(() => JSON.stringify(Prog));

  describe('no test-out', () => { });
  const noQuiz = await $(() => {
    show('learn'); expandedUnits = new Set([0, 1, 2]); renderPath();
    return {
      buttons: document.querySelectorAll('[data-cq]').length,
      wording: /test out|chapter quiz/i.test(el('learn').innerText),
      fn: typeof startChapterQuiz !== 'undefined',
      pass: typeof passChapter !== 'undefined',
      fail: typeof failChapter !== 'undefined',
    };
  });
  is(noQuiz.buttons, 0, 'the learn page offers no chapter quiz');
  no(noQuiz.wording, '...and never mentions testing out');
  no(noQuiz.fn, '...and it cannot be started from anywhere else');
  no(noQuiz.pass, '...its pass screen is gone too');
  no(noQuiz.fail, '...and its fail screen');

  describe('palace round trip', () => { });
  const trip = await $(() => {
    const k = '43:3:16';
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door', 'Sink'], learnedAt: Date.now(), step: 1 }];
    Prog.memorized = [k]; Prog.verseLoc = { [k]: { p: 0, room: 'Sink' } };
    Prog.customScene = {}; saveProg();
    show('palace'); startPalaceEdit(0);
    document.querySelector('.peLoc[data-si="1"]').value = 'Sink (renamed, not yet saved)';
    syncPE();
    const back = () => { show('palace'); startPalaceEdit(0, 'Sink', true); };
    editVerseScene(43, 3, 16, back, back);
    const out = { onScene: !!el('wScene') };
    el('wScene').value = 'a scene I do not want kept';
    el('wClose').click();                                   // the RED X
    out.sceneAfterX = (Prog.customScene || {})[k] || '';
    out.backOnPalace = !!document.querySelector('.peLoc');
    out.draftKept = (document.querySelector('.peLoc[data-si="1"]') || {}).value;
    return out;
  });
  ok(trip.onScene, "a station's verse opens on its scene screen");
  is(trip.sceneAfterX, '', 'the red X leaves without saving what was typed');
  ok(trip.backOnPalace, '...and lands back on the palace location screen');
  is(trip.draftKept, 'Sink (renamed, not yet saved)', '...with the edits made there still in place');

  const tripSave = await $(() => {
    const k = '43:3:16';
    Prog.customScene = {}; saveProg();
    const back = () => { show('palace'); startPalaceEdit(0, 'Sink', true); };
    editVerseScene(43, 3, 16, back, back);
    el('wScene').value = 'a scene I DO want kept';
    if (el('wPalace')) { el('wPalace').value = '0'; el('wPalace').onchange(); el('wRoom').value = 'Sink'; }
    el('wDoneTop').click();                                 // the GREEN tick
    return { saved: (Prog.customScene || {})[k] || '', backOnPalace: !!document.querySelector('.peLoc') };
  });
  is(tripSave.saved, 'a scene I DO want kept', 'the green tick saves what was typed');
  ok(tripSave.backOnPalace, '...and lands back on the palace location screen too');

  describe('the first look back', () => { });
  const look = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.palaces = [];
    Prog.revPrefs = { loc: true, w4w: false, heart: false };
    Prog.verseSR = { [k]: { learnedAt: Date.now() - 3600000, step: 1, dueAt: Date.now() - 1, r0: 0 } }; saveProg();
    const hour1 = { asked: newVerseDue(k), tested: verseDue(k), deck: deckKeys().includes(k) };
    Prog.verseSR[k].learnedAt = Date.now() - 5 * 3600000; saveProg();
    const hour5 = { asked: newVerseDue(k), tested: verseDue(k), deck: deckKeys().includes(k), counted: reviewDueCount() };
    markFirstReview(k);
    const after = { asked: newVerseDue(k), tested: verseDue(k), deck: deckKeys().includes(k) };
    return { hours: FIRST_REVIEW_MS / 3600000, hour1, hour5, after };
  });
  is(look.hours, 4, 'the first look back comes four hours after a verse is saved');
  no(look.hour1.asked, 'an hour after saving, nothing is asked');
  no(look.hour1.tested, '...and the verse is certainly not tested');
  no(look.hour1.deck, '...nor handed out in free practice');
  ok(look.hour5.asked, 'four hours on, it is asked for');
  no(look.hour5.tested, '...but STILL not tested — day one is a review, not a test');
  ok(look.hour5.counted > 0, '...and it counts as work waiting');
  no(look.after.asked, 'once read back it stops being asked for');
  ok(look.after.tested, '...and only THEN joins the testing rotation');

  const session = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.palaces = []; Prog.customScene = {};
    Prog.verseSR = { [k]: { learnedAt: Date.now() - 5 * 3600000, step: 1, dueAt: Date.now() - 1, r0: 0 } }; saveProg();
    startMemTest();
    const queued = (MS.newQueue || []).slice();
    beginDueReview();
    const out = { queued: queued.join(','), onScene: !!el('wScene'), note: el('verse').innerText };
    el('wScene').value = 'the scene, read back and confirmed';   // a blank scene asks for confirmation first
    el('wDoneTop').click();
    out.r0 = (vsr(k) || {}).r0 > 0;
    out.testableNow = verseDue(k);
    return out;
  });
  is(session.queued, '43:3:16', 'the session opens with the new verse queued first');
  ok(session.onScene, '...shown on its palace, location and scene screen');
  has(session.note, 'First look back', '...told plainly that this is a read-through');
  has(session.note, 'No test yet', '...and that nothing is being tested');
  ok(session.r0, 'Done records the sitting');
  ok(session.testableNow, '...and the verse joins the rotation from then on');

  const legacy = await $(() => {
    const old = migrateProg({ memorized: ['43:3:16'], verseSR: { '43:3:16': { learnedAt: 1000, step: 3 } } });
    return { stamped: old.verseSR['43:3:16'].r0 };
  });
  ok(legacy.stamped > 0, 'a verse that predates this counts as already read back — no rotation empties on update');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); }, v15Snap);

  // ================= v1.16 =================
  const v16Snap = await $(() => JSON.stringify(Prog));

  describe('one reveal', () => { });
  const reveal = await $(() => {
    Prog.talents = 500; Prog.memorized = ['43:3:16'];
    Prog.verseSR = { '43:3:16': { learnedAt: 1, step: 1, r0: 1 } }; saveProg();
    show('verse'); askVerse('43:3:16');
    const out = { cost: HINT_COST, max: HINT_MAX, hintBefore: el('mtHintCost').textContent };
    const before = Prog.talents;
    document.querySelector('[data-peek="b"]').click();
    el('spYes').click();
    out.spent = before - Prog.talents;
    out.bookFilled = mtSel.b > 0;
    out.othersClosed = [...document.querySelectorAll('[data-peek]')].every(x => x.disabled);
    out.hintAfter = el('mtHintCost').textContent;
    const mid = Prog.talents;
    const c = document.querySelector('[data-peek="c"]');
    c.disabled = false;                       // force it back on: the handler itself must refuse
    c.click();
    out.secondSpent = mid - Prog.talents;
    out.chapterStill = mtSel.c;
    return out;
  });
  is(reveal.cost, 50, 'a reveal costs 50 talents');
  is(reveal.max, 1, '...and there is exactly one per verse');
  has(reveal.hintBefore, 'one reveal per verse', 'the screen says so before you spend');
  is(reveal.spent, 50, 'taking it costs 50');
  ok(reveal.bookFilled, '...and fills the box');
  ok(reveal.othersClosed, 'the other two close off');
  has(reveal.hintAfter, 'Review my scene', '...and the line points at the scene instead');
  is(reveal.secondSpent, 0, 'a forced second reveal spends nothing');
  is(reveal.chapterStill, 0, '...and reveals nothing');

  describe('videos', () => { });
  const vids = await $(() => {
    const keys = Object.keys(VIDEOS);
    return {
      keys: keys.join(','), n: keys.length,
      titled: keys.every(k => VIDEOS[k].title && VIDEOS[k].title.length > 5),
      described: keys.every(k => VIDEOS[k].sub && VIDEOS[k].sub.length > 25),
      srcSlot: keys.every(k => VIDEOS[k].src !== undefined),
    };
  });
  is(vids.n, 5, 'five films');
  has(vids.keys, 'recall', '...including one for when a verse will not come');
  ok(vids.titled, 'every film has a name');
  ok(vids.described, '...and a line saying what it is for');
  ok(vids.srcSlot, '...and a slot for the file itself');

  const vscreen = await $(() => {
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => !/^video:/.test(x)); saveProg();
    openVideoScreen('palace');
    const m = el('videoModal');
    const out = { shown: m.style.display === 'flex', txt: m.innerText, player: !!m.querySelector('.vidph, video') };
    el('vsDone').click();
    out.seen = videoSeen('palace');
    out.closed = m.style.display === 'none';
    out.again = maybeVideo('palace');
    return out;
  });
  ok(vscreen.shown, 'a film opens on its own screen');
  has(vscreen.txt, 'Memory Palace', '...named');
  has(vscreen.txt, 'Walk a place you know', '...with a line on what it is for');
  ok(vscreen.player, '...and a player');
  ok(vscreen.seen && vscreen.closed, 'watching it marks it watched');
  no(vscreen.again, '...and it never shows itself again');

  await $(() => {
    // every film but this one counts as seen, so no stray trigger can answer for it
    if (el('videoModal')) el('videoModal').style.display = 'none';
    Object.keys(VIDEOS).forEach(k => { if (k !== 'sr') markVideoSeen(k); });
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== VIDEOS.sr.skill);
    Prog.memorized = []; Prog.verseSR = {}; saveProg();
    addMemorized(verseObj(43, 3, 16));
    return true;
  });
  await page.waitForFunction(() => { const m = el('videoModal'); return m && m.style.display === 'flex'; }, { timeout: 5000 }).catch(() => { });
  const firstVerse = await $(() => {
    const m = el('videoModal');
    const out = { shown: !!m && m.style.display === 'flex', txt: m ? m.innerText : '' };
    if (out.shown) el('vsDone').click();
    return out;
  });
  ok(firstVerse.shown, 'the first verse memorised brings up the spaced-repetition film');
  has(firstVerse.txt, 'spaced repetition', '...that one, before any palace film');

  const recall = await $(() => {
    if (el('videoModal')) el('videoModal').style.display = 'none';
    Object.keys(VIDEOS).forEach(k => { if (k !== 'recall') markVideoSeen(k); });
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== VIDEOS.recall.skill);
    Prog.memorized = ['43:3:16']; Prog.verseSR = { '43:3:16': { learnedAt: 1, step: 1, r0: 1 } }; saveProg();
    show('verse'); askVerse('43:3:16');
    el('mtReview').click();
    const m = el('videoModal');
    const out = { shown: !!m && m.style.display === 'flex', txt: m ? m.innerText : '' };
    if (out.shown) el('vsDone').click();
    return out;
  });
  ok(recall.shown, 'the first walk back through a scene brings up its film');
  has(recall.txt, "won't come", '...the one about a verse that will not come');

  describe('resume', () => { });
  const resume = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.verseSR = { '43:3:16': { learnedAt: 1, step: 1, r0: 1 } }; saveProg();
    show('verse'); askVerse('43:3:16');
    const marked = activeTestKey();
    show('learn');
    const leftIt = activeTestKey();
    setActiveTest('43:3:16');
    const back = resumeActiveTest();
    const out = { marked, leftIt, back, onTest: !!el('mtFieldB'), tab: document.querySelector('.view.active').id };
    setActiveTest('1:1:1');                 // a verse that is not theirs any more
    out.stale = resumeActiveTest();
    out.staleCleared = activeTestKey();
    return out;
  });
  is(resume.marked, '43:3:16', 'being inside a verse test is remembered');
  is(resume.leftIt, '', '...and forgotten the moment you go somewhere else');
  ok(resume.back, 'a remembered test is resumed on the next launch');
  ok(resume.onTest, '...landing straight back on that verse');
  is(resume.tab, 'verse', '...on the verse screen, not the hub');
  no(resume.stale, 'a verse no longer memorised is not resumed');
  is(resume.staleCleared, '', '...and the marker is dropped');

  describe('the run of right answers', () => { });
  const cycle = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.streak = 7; Prog.bestStreak = 9; saveProg();
    startMemTest();
    return { streak: Prog.streak, best: Prog.bestStreak };
  });
  is(cycle.streak, 0, 'a fresh sitting starts the run at nothing');
  is(cycle.best, 9, '...while the best ever reached is kept');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); clearActiveTest(); }, v16Snap);

  // ================= THE LIBRARY (v1.17) =================
  const libSnap = await $(() => JSON.stringify(Prog));

  describe('library', () => { });
  const lib = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.videoOrder = []; saveProg();
    show('verse'); vView = 'hub'; renderVerse();
    const btns = [...document.querySelectorAll('.versehub .vhub')];
    return {
      count: btns.length,
      squares: btns.filter(b => b.classList.contains('sq')).length,
      sameSize: new Set(btns.filter(b => b.classList.contains('sq')).map(b => b.offsetWidth + 'x' + b.offsetHeight)).size,
      wide: btns.filter(b => b.classList.contains('wide')).map(b => b.querySelector('span:nth-child(2)').textContent).join(''),
      srDue: (btns[0].querySelector('small') || {}).textContent || '',
      memIcon: btns[1].querySelector('.vi svg') ? 'drawn' : btns[1].querySelector('.vi').textContent,
      labels: btns.map(b => b.querySelector('span:nth-child(2)').textContent).join(' | '),
      tabLabel: (document.querySelector('.tabbar button[data-tab="verse"] .lbl') || {}).textContent,
      tabIcon: (document.querySelector('.tabbar button[data-tab="verse"] .ic') || {}).textContent,
      ticket: SCRATCH_LADDER.find(x => x.tab === 'verse').name,
    };
  });
  is(lib.count, 7, 'six squares and a wide one');
  is(lib.labels, 'Spaced Repetition | My Verses | Learn Verses | Video Review | Practice Verses | Practice Numbers | Practice Word for Word', '...in that order');
  is(lib.squares, 6, 'six of them are squares');
  is(lib.sameSize, 1, '...and every one measures exactly the same, so none is the odd one out');
  is(lib.wide, 'Practice Word for Word', 'and word for word runs the width underneath');
  is(lib.srDue, 'Due (0)', 'Spaced Repetition says how many are due');
  is(lib.memIcon, 'drawn', 'Memorized carries a drawn heart, not a bare star');
  is(lib.tabLabel, 'Library', 'the tab reads Library, not Verses');
  is(lib.tabIcon, '📚', '...with its own icon');
  is(lib.ticket, 'Library', '...and the scratch-off that wins it says so too');

  const learn = await $(() => {
    openLearnVerses();
    const rows = [...document.querySelectorAll('#lbRows [data-lb]')].map(b => b.dataset.lb);
    const out = { rows: rows.join(','), practice: !!el('lbPractice'), txt: el('libModal').innerText };
    document.querySelector('[data-lb="topics"]').click();
    out.went = vView;
    out.closed = el('libModal').style.display === 'none';
    return out;
  });
  is(learn.rows, 'sugg,topics,saved', 'Learn Verses offers Suggested, Topics and Saved');
  no(learn.practice, '...and nothing else — the three practices are buttons of their own now');
  is(learn.went, 'topics', 'choosing one goes there');
  ok(learn.closed, '...and closes the sheet');


  describe('video review', () => { });
  const vreview = await $(() => {
    Prog.videoOrder = []; Prog.doneSkills = (Prog.doneSkills || []).filter(x => !/^video:/.test(x)); saveProg();
    show('verse'); vView = 'videos'; renderVerse();
    const empty = el('verse').innerText;
    openVideoScreen('sr'); el('vsClose').click();          // dismissed, NOT watched
    openVideoScreen('palace'); el('vsDone').click();
    const order = (Prog.videoOrder || []).slice();
    vView = 'videos'; renderVerse();
    const listed = [...document.querySelectorAll('[data-vid]')].map(b => b.dataset.vid);
    const out = { empty, order: order.join(','), listed: listed.join(','), txt: el('verse').innerText };
    document.querySelector('[data-vid="sr"]').click();
    out.opened = el('videoModal').style.display === 'flex';
    out.openedTitle = el('videoModal').innerText;
    el('vsClose').click();
    out.backOnList = !!document.querySelector('[data-vid]');
    return out;
  });
  has(vreview.empty, 'No films yet', 'the list starts empty and says so');
  is(vreview.order, 'sr,palace', 'a film joins the list the first time it is SHOWN, in that order');
  is(vreview.listed, 'sr,palace', '...and the list is drawn in that order');
  has(vreview.txt, 'Complete more of the Learn track', '...with the rest still to come');
  ok(vreview.opened, 'tapping one opens it');
  has(vreview.openedTitle, 'spaced repetition', '...the one that was tapped');
  ok(vreview.backOnList, '...and closing it lands back on the list');

  const dismissed = await $(() => {
    Prog.videoOrder = []; Prog.doneSkills = (Prog.doneSkills || []).filter(x => !/^video:/.test(x)); saveProg();
    openVideoScreen('recall'); el('vsClose').click();
    return { inList: (Prog.videoOrder || []).includes('recall'), seen: videoSeen('recall') };
  });
  ok(dismissed.inList, 'a film dismissed without watching is still in the list');
  ok(dismissed.seen, '...and does not pop up again by itself');

  const vmerge = await $(() => {
    const mk = o => migrateProg(Object.assign(JSON.parse(JSON.stringify(Prog)), o));
    const m = mergeProg(mk({ videoOrder: ['sr', 'palace'] }), mk({ videoOrder: ['sr', 'verse'] }));
    return { order: (m.videoOrder || []).join(',') };
  });
  is(vmerge.order, 'sr,palace,verse', 'a sync keeps every film either device has seen, in order');

  const storeIcon = await $(() => { openStore(); const t = el('storeModal').innerText; el('storeModal').style.display = 'none'; return t; });
  has(storeIcon, '📖 Talents Store', 'the store carries the old verse icon now');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); }, libSnap);

  describe('no repeats', () => { });
  const norep = await $(() => {
    Prog.ntPrefs = { types: ['q_n2i'], count: 15 }; saveProg();   // ONE form, so the deck is just the numbers
    openNumTestSetup(); el('ntsGo').click();
    const keys = (NT.qs || []).map(q => q.n + '|' + q.type);
    const deck = recentKnownNumbers().slice(0, 10).length;
    const firstPass = keys.slice(0, Math.min(deck, 15));
    return { asked: keys.length, deck, firstPassUnique: new Set(firstPass).size, firstPassLen: firstPass.length,
      distinct: new Set(keys).size };
  });
  is(norep.asked, 15, 'the quota is met');
  ok(norep.deck > 0, 'there are questions to draw from');
  is(norep.firstPassUnique, norep.firstPassLen, 'nothing repeats while an unasked question remains');
  ok(norep.distinct >= Math.min(norep.deck, 15), '...every distinct question is used before any comes round again');

  const wide = await $(() => {
    Prog.ntPrefs = { types: NT_FORMS.map(f => f.id), count: 15 }; saveProg();
    openNumTestSetup(); el('ntsGo').click();
    const keys = (NT.qs || []).map(q => q.n + '|' + q.type);
    return { asked: keys.length, distinct: new Set(keys).size };
  });
  is(wide.asked, 15, 'with every form on, fifteen are still asked');
  is(wide.distinct, 15, '...and not one of them repeats');

  // ================= THE LEARN PATH (v1.18) =================
  const learnSnap = await $(() => JSON.stringify(Prog));

  describe('learn path', () => { });
  const lpath = await $(() => {
    markVideoSeen('major');
    // reveal everything so the catalogue itself can be checked, then put it back
    Prog.phaseMax = 99;
    show('learn'); renderPath(true);
    const L = el('learn');
    const phases = UNITS.filter(U => !U.story);
    return {
      headers: L.querySelectorAll('.grouphead').length,
      dividers: L.querySelectorAll('.phasedivider').length,
      phaseCount: phases.length,
      names: phases.map(U => U.name).join(' | '),
      numbered: phases.map(U => U.name.split(':')[0]).filter(x => x.indexOf('Phase ') === 0).join(','),
      tilesShown: L.querySelectorAll('.tile').length,
      tilesTotal: phases.reduce((n, U) => n + U.skills.length, 0),
      videoTiles: L.querySelectorAll('.tile.video, [data-video]').length,
      videoSkills: UNITS.reduce((n, U) => n + U.skills.filter(sk => sk.kind === 'video').length, 0),
      videoWhere: (UNITS.find(U => U.skills.some(sk => sk.kind === 'video')) || {}).name || '',
      palaceSkills: UNITS.reduce((n, U) => n + U.skills.filter(sk => sk.kind === 'palace').length, 0),
      pathMilestones: MILESTONES.filter(m => !m.stories).length,
      storyMilestones: MILESTONES.filter(m => m.stories).length,
      focused: L.querySelectorAll('.focusnext').length,
      bands: [...new Set([...L.querySelectorAll('.path')].map(p => p.style.getPropertyValue('--band')))].sort().join(','),
      torah: UNITS[1].skills.slice(0, 5).map(sk => sk.label).join(','),
      lastPhaseHasPalace: phases[phases.length - 1].skills.some(sk => sk.kind === 'palace'),
    };
  });
  is(lpath.headers, 0, 'nothing folds — the collapsible headers are gone');
  is(lpath.phaseCount, 13, 'the Code, then Foundations, then eleven numbered phases');
  is(lpath.numbered, 'Phase 2,Phase 3,Phase 4,Phase 5,Phase 6,Phase 7,Phase 8,Phase 9,Phase 10,Phase 11,Phase 12', 'numbered Phase 2 through Phase 12, with Foundations as the first');
  has(lpath.names, 'The Code: Major System Sounds', 'the first is the Code');
  has(lpath.names, 'Foundations', '...then Foundations');
  has(lpath.names, 'Phase 2: Joshua–Ruth + Mark–John', '...then Joshua–Ruth with Mark–John');
  has(lpath.names, 'Phase 12: All the Numbers', '...and the numbers alone at the end');
  hasNot(lpath.names, 'Memory Palace', 'the Memory Palace section is gone from the path');
  is(lpath.palaceSkills, 0, 'and no Add Palace tile is left anywhere on it');
  no(lpath.lastPhaseHasPalace, '...least of all on the last phase');
  is(lpath.dividers, lpath.phaseCount, 'a named rule marks every phase');
  is(lpath.tilesShown, lpath.tilesTotal, '...and with everything revealed, every tile is drawn');
  is(lpath.videoTiles, 1, 'the only film left on the path is the opening one');
  is(lpath.videoSkills, 1, '...kept there because Video Review is out of reach this early');
  is(lpath.videoWhere, 'The Code: Major System Sounds', '...and it sits in the Code section');
  is(lpath.pathMilestones, 0, 'the learn-path milestones are gone');
  is(lpath.storyMilestones, 15, '...while the Bible-story capstones stay');
  is(lpath.focused, 1, 'the next lesson is marked');
  is(lpath.bands, '0,1,2,3', 'the phases band in fours, so two rows read as a group');
  is(lpath.torah, 'Genesis,Exodus,Leviticus,Numbers,Deuteronomy', 'the first five are named as the books they are');

  // only what has been earned is on screen
  const earned = await $(() => {
    const list = phaseIdxs();
    Prog.doneSkills = UNITS[list[0]].skills.map(sk => sk.id);   // the Code, finished
    Prog.phaseMax = list[1];                                    // Foundations open, nothing beyond
    bustCaches(); saveProg(); show('learn'); renderPath(true);
    const L = el('learn');
    const shown = [...L.querySelectorAll('.phasedivider')].map(d => d.textContent.replace(/^\S+\s/, '')).join(' | ');
    return { shown, dividers: L.querySelectorAll('.phasedivider').length,
      hasFoundations: /Foundations/.test(shown), hasPhase2: /Phase 2/.test(shown), hasPhase12: /Phase 12/.test(shown) };
  });
  is(earned.dividers, 2, 'only the phases earned so far are on screen');
  ok(earned.hasFoundations, '...up to and including the one being worked on');
  no(earned.hasPhase2, '...and not the one after it');
  no(earned.hasPhase12, '...certainly not the end of the path');

  // finishing a phase wins the next one, and scratching it opens it
  const won = await $(() => {
    const list = phaseIdxs();
    Prog.doneSkills = [...UNITS[list[0]].skills.map(sk => sk.id), ...UNITS[list[1]].skills.map(sk => sk.id)];
    Prog.phaseMax = list[1]; bustCaches(); saveProg();
    const out = { complete: phaseComplete(list[1]), next: nextPhaseIdx() === list[2] };
    out.offered = maybePhaseScratch();
    out.cardShows = el('scName') ? el('scName').textContent : '';
    // scratching it through to the claim
    el('scov') && el('scov').classList.remove('on');
    openPhase(list[2]);   // what claiming the card does; the foil itself is a canvas gesture
    out.opened = Prog.phaseMax === list[2];
    out.nowShown = el('learn').querySelectorAll('.phasedivider').length;
    return out;
  });
  ok(won.complete, 'a phase can be finished');
  ok(won.next, '...and the one after it is known');
  ok(won.offered, 'finishing it offers a scratch-off');
  has(won.cardShows, 'Phase 2', '...for the next phase by name');
  ok(won.opened, 'claiming it opens that phase');
  is(won.nowShown, 3, '...and it appears on the path');


  const major = await $(() => {
    // mark every OTHER film seen, so a stray trigger from an earlier block cannot answer for this one
    if (el('videoModal')) el('videoModal').style.display = 'none';
    Object.keys(VIDEOS).forEach(k => { if (k !== 'major') markVideoSeen(k); });
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== VIDEOS.major.skill); saveProg();
    const m = el('videoModal'); if (m) m.style.display = 'none';
    return { seen: videoSeen('major') };
  });
  no(major.seen, 'the Major System film starts unwatched');
  await $(() => { show('learn'); return true; });
  await page.waitForFunction(() => { const m = el('videoModal'); return m && m.style.display === 'flex'; }, { timeout: 4000 }).catch(() => { });
  const majorShown = await $(() => {
    const m = el('videoModal');
    const out = { shown: !!m && m.style.display === 'flex', txt: m ? m.innerText : '' };
    if (out.shown) el('vsDone').click();
    return out;
  });
  ok(majorShown.shown, 'opening Learn plays it — it is what the whole track rests on');
  has(majorShown.txt, 'Major System', '...that one');

  describe('a palace for every six lessons', () => { });
  const six = await $(() => {
    Prog.scratchWon = ['verse', 'palace', 'journey', 'stories'];
    Prog.doneSkills = ['snd:0-4', 'snd:5-9', 'num:1', 'num:2', 'num:3'];   // five lessons
    Prog.palaces = []; saveProg();
    const out = { every: LESSONS_PER_PALACE_ASK, wantAtFive: palacesWanted(), atFive: maybeSuggestPalace() };
    Prog.doneSkills.push('num:4');                                          // six
    out.wantAtSix = palacesWanted();
    out.atSix = maybeSuggestPalace();
    const m = el('palaceAskModal');
    out.shown = !!m && m.style.display === 'flex';
    out.txt = m ? m.innerText : '';
    if (out.shown) el('paNo').click();                                      // Skip
    out.askedAgain = maybeSuggestPalace();                                  // skipping does NOT stop it
    if (el('palaceAskModal').style.display === 'flex') el('paNo').click();
    Prog.palaces = [{ place: 'A', stations: ['x'], learnedAt: 1, step: 1 }];  // built one on their own
    out.caughtUp = maybeSuggestPalace();
    Prog.doneSkills.push('num:5', 'num:6', 'num:7', 'num:8', 'num:9', 'num:10');   // twelve
    out.wantAtTwelve = palacesWanted();
    out.behindAgain = maybeSuggestPalace();
    if (el('palaceAskModal').style.display === 'flex') el('paNo').click();
    return out;
  });
  is(six.every, 6, 'the mark is a palace for every six lessons');
  is(six.wantAtFive, 0, 'five lessons calls for none');
  no(six.atFive, '...so nothing is asked');
  is(six.wantAtSix, 1, 'six calls for one');
  ok(six.atSix, '...and it is asked');
  ok(six.shown, '...in a popup');
  has(six.txt, 'Add now', '...offering Add now');
  has(six.txt, 'Skip', '...and Skip');
  ok(six.askedAgain, 'skipping asks again at the very next lesson — it does not go quiet');
  no(six.caughtUp, 'building one unprompted stops the asking');
  is(six.wantAtTwelve, 2, 'twelve lessons calls for two');
  ok(six.behindAgain, '...and being behind again starts it asking once more');

  const accept = await $(() => {
    Prog.doneSkills = ['snd:0-4', 'snd:5-9', 'num:1', 'num:2', 'num:3', 'num:4'];
    Prog.palaces = []; Prog.talents = 5000; saveProg();
    maybeSuggestPalace();
    el('paYes').click();
    return { closed: el('palaceAskModal').style.display === 'none', inBuilder: !!PB };
  });
  ok(accept.closed, 'Add now closes the offer');
  ok(accept.inBuilder, '...and walks straight into building the palace');


  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); bustCaches(); }, learnSnap);

  // ================= BIBLE STORIES, LEARNED LIKE A VERSE (v1.19) =================
  const storySnap = await $(() => JSON.stringify(Prog));

  describe('stories', () => { });
  const bstory = await $(() => {
    const u = UNITS.findIndex(U => U.story), sk = UNITS[u].skills[0], st = sk.story;
    const bn = bookNum(st.b), k = refKey(bn, st.c, st.v);
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== sk.id);
    Prog.memorized = (Prog.memorized || []).filter(x => x !== k);
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.customScene = {}; Prog.verseLoc = {}; saveProg();

    startStoryLesson(sk, 'stories', () => { });
    const out = {
      walkGone: typeof renderStoryStep === 'undefined',
      onScene: !!el('wScene'),
      palacePicker: !!el('wPalace'),
      roomPicker: !!el('wRoom'),
      cells: document.querySelectorAll('.lv-triple .lv-cell').length,
      txt: el('verse').innerText,
    };
    // one screen: write the scene, choose the palace and the room, done
    el('wScene').value = 'the scene for this story';
    el('wPalace').value = '0'; el('wPalace').onchange();
    el('wRoom').value = 'Front door';
    el('wDoneTop').click();
    out.memorized = Prog.memorized.includes(k);
    out.scene = (Prog.customScene || {})[k] || '';
    out.room = ((Prog.verseLoc || {})[k] || {}).room || '';
    out.marked = (Prog.doneSkills || []).includes(sk.id);
    out.celebrated = /Story located/i.test(el('stories').innerText);
    return out;
  });
  ok(bstory.walkGone, 'the five-step walk is gone');
  ok(bstory.onScene, 'a story opens straight on the scene screen');
  ok(bstory.palacePicker, '...with the palace picker');
  ok(bstory.roomPicker, '...and the room picker');
  is(bstory.cells, 3, '...and all three pictures, on the same screen');
  has(bstory.txt, 'begins at', '...naming where the story begins');
  ok(bstory.memorized, 'finishing it memorizes the opening verse');
  is(bstory.scene, 'the scene for this story', '...keeps the scene that was written');
  is(bstory.room, 'Front door', '...and the room it was given');
  ok(bstory.marked, '...records the story as learned');
  ok(bstory.celebrated, '...and says so');

  const storyCancel = await $(() => {
    const u = UNITS.findIndex(U => U.story), sk = UNITS[u].skills[1] || UNITS[u].skills[0], st = sk.story;
    const bn = bookNum(st.b), k = refKey(bn, st.c, st.v);
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== sk.id);
    Prog.memorized = (Prog.memorized || []).filter(x => x !== k);
    Prog.customScene = {}; saveProg();
    startStoryLesson(sk, 'stories', () => { });
    el('wScene').value = 'typed but abandoned';
    el('wClose').click();
    return { marked: (Prog.doneSkills || []).includes(sk.id), memorized: Prog.memorized.includes(k),
      scene: (Prog.customScene || {})[k] || '' };
  });
  no(storyCancel.marked, 'backing out does NOT record the story');
  no(storyCancel.memorized, '...nor memorize the verse');
  is(storyCancel.scene, '', '...nor keep what was typed');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); bustCaches(); }, storySnap);

  describe('admin: finish a phase', () => { });
  const simPhase = await $(() => {
    Prog.scratchWon = ['verse', 'palace', 'journey', 'stories'];
    const list = phaseIdxs();
    Prog.doneSkills = []; Prog.phaseMax = list[0]; Prog.palaces = [];
    Auth.user = { email: ADMIN_EMAILS[0] };
    bustCaches(); saveProg();
    el('themeBtn').click(); applyAdminVisibility();
    const out = { button: !!el('testFinishPhase') };
    Auth.user = { email: 'nobody@example.com' }; applyAdminVisibility();
    out.hiddenFromOthers = getComputedStyle(el('adminWrap')).display === 'none';
    Auth.user = { email: ADMIN_EMAILS[0] }; applyAdminVisibility();
    el('testFinishPhase').click();
    out.phaseDone = phaseComplete(list[0]);
    Auth.user = null;
    return out;
  });
  ok(simPhase.button, 'Admin can finish the current phase outright');
  ok(simPhase.hiddenFromOthers, '...and nobody else sees the Admin block at all');
  ok(simPhase.phaseDone, '...finishing every lesson in it');

  await page.waitForFunction(() => { const o = el('scov'); return o && o.classList.contains('on'); }, { timeout: 5000 }).catch(() => { });
  const simCard = await $(() => {
    const o = el('scov');
    const out = { scratch: !!o && o.classList.contains('on'), name: el('scName') ? el('scName').textContent : '' };
    if (out.scratch) { o.classList.remove('on'); openPhase(phaseIdxs()[1]); }
    return out;
  });
  ok(simCard.scratch, '...then raises the scratch-off for the next phase');
  has(simCard.name, 'Foundations', '...naming it');

  const simPalace = await $(() => {
    // behind the one-per-six mark, so the offer should follow the scratch-off
    Prog.doneSkills = ['snd:0-4', 'snd:5-9', 'num:1', 'num:2', 'num:3', 'num:4'];
    Prog.palaces = []; saveProg();
    return { behind: needsPalace(), offered: maybeSuggestPalace(),
      shown: el('palaceAskModal') && el('palaceAskModal').style.display === 'flex' };
  });
  ok(simPalace.behind, 'and with no palace against six lessons, they are behind');
  ok(simPalace.offered && simPalace.shown, '...so the palace offer follows');
  await $(() => { if (el('palaceAskModal')) el('paNo').click(); return true; });

  // ================= PROFILE, IN THE LIBRARY'S SHAPE (v1.22) =================
  describe('profile grid', () => { });
  const pgrid = await $(() => {
    Object.keys(VIDEOS).forEach(k => markVideoSeen(k));
    setFeat('badges', true); setFeat('reference', true);
    Auth.user = null; saveProg();
    el('themeBtn').click();
    const btns = [...document.querySelectorAll('#profGrid .profbtn')];
    return {
      count: btns.length,
      labels: btns.map(b => b.querySelector('span:nth-child(2)').textContent).join(' | '),
      allIconed: btns.every(b => (b.querySelector('.pi') || {}).textContent),
      allSubbed: btns.every(b => (b.querySelector('small') || {}).textContent),
      panels: document.querySelectorAll('#profPanels .prof-panel').length,
      headsHidden: [...document.querySelectorAll('.prof-panel-head')].every(x => getComputedStyle(x).display === 'none'),
    };
  });
  ok(pgrid.count >= 8, 'Profile is a grid of buttons, one per section');
  is(pgrid.panels, pgrid.count, '...each with its own panel put aside');
  ok(pgrid.allIconed, '...every one carrying an icon');
  ok(pgrid.allSubbed, '...and a line saying what is inside');
  is(pgrid.labels.split(' | ')[0], 'Admin', 'Admin comes first');
  is(pgrid.labels.split(' | ')[1], "Badges", '...then the badges');
  is(pgrid.labels.split(' | ').slice(0,9).join(','), "Admin,Badges,Get the app,Feature store,Bible translation,Theme,Reference library,Back up your progress,What's new", '...then the rest, in the order asked for, with the release notes last');
  has(pgrid.labels, 'Theme', 'Theme is one of them');
  has(pgrid.labels, 'Account', '...and Account');
  has(pgrid.labels, 'Back up', '...and the backup');
  ok(pgrid.headsHidden, 'the old inline headers are folded away');

  const psec = await $(() => {
    openProfSection('theme');
    const m = el('profSecModal');
    const out = { open: m.style.display === 'flex',
      title: (m.querySelector('.lv-topbar div') || {}).textContent || '',
      cancel: !!el('psClose'), confirm: !!el('psDone'),
      contentMoved: !!m.querySelector('[data-th="classic"]'),
      stillWired: false };
    // the real control still works from inside the popup
    const before = document.querySelector('.phone').getAttribute('data-theme');
    m.querySelector('[data-th="quest"]').click();
    const after = document.querySelector('.phone').getAttribute('data-theme');
    out.stillWired = after === 'quest' && after !== before;
    el('psDone').click();
    out.closed = m.style.display === 'none';
    out.putBack = !!document.querySelector('#profPanels #pp-theme');
    applyTheme('classic');
    return out;
  });
  ok(psec.open, 'pressing one opens its own popup');
  has(psec.title, 'Theme', '...titled with the section');
  ok(psec.cancel && psec.confirm, '...with a red cross and a green tick at the top');
  ok(psec.contentMoved, '...and that section\'s controls inside it');
  ok(psec.stillWired, 'the controls still work — they were moved, not rebuilt');
  ok(psec.closed && psec.putBack, 'the tick closes it and puts the section back');

  const pgates = await $(() => {
    Auth.user = { email: ADMIN_EMAILS[0] }; applyAdminVisibility();
    const btn = s => document.querySelector('#profGrid [data-prof="' + s + '"]');
    const vis = s => { const b = btn(s); return !!b && getComputedStyle(b).display !== 'none'; };
    const out = { adminForAdmin: vis('admin') };
    Auth.user = { email: 'nobody@example.com' }; applyAdminVisibility();
    out.adminForOther = vis('admin');
    Auth.user = null; applyAdminVisibility();
    out.adminSignedOut = vis('admin');
    setFeat('badges', false); setFeat('reference', false); applyFeatureVisibility();
    out.badgesOff = vis('badges'); out.refOff = vis('reference-library');
    setFeat('badges', true); setFeat('reference', true); applyFeatureVisibility();
    out.badgesOn = vis('badges');
    el('themeModal').style.display = 'none';
    return out;
  });
  ok(pgates.adminForAdmin, 'an admin sees the Admin button');
  no(pgates.adminForOther, '...another signed-in account does not');
  no(pgates.adminSignedOut, '...nor a signed-out visitor');
  no(pgates.badgesOff, 'switching Milestones off takes its button away');
  no(pgates.refOff, '...and the Reference library too');
  ok(pgates.badgesOn, '...and switching it back brings it back');

  describe('profile screen', () => { });
  const pscreen = await $(() => {
    Auth.user = { email: ADMIN_EMAILS[0] };
    setFeat('badges', true); setFeat('reference', true); saveProg();
    el('themeBtn').click();
    const m = el('themeModal');
    return { screen: m.classList.contains('profscreen'), cross: !!el('profX'),
      fills: m.querySelector('.modal-card').offsetHeight >= m.offsetHeight - 2 };
  });
  ok(pscreen.screen, 'Profile opens as a screen, not a card on a scrim');
  ok(pscreen.cross, '...with a red cross at the top');
  ok(pscreen.fills, '...filling the phone');

  // The reported bug: a section opens but its options are not there. Check EVERY section.
  const pcontent = await $(() => {
    const rows = [];
    PROF_PANELS.forEach(p => {
      openProfSection(p.slug);
      const m = el('profSecModal'), body = m.querySelector('#psBody');
      const visible = body.innerText.replace(/\s+/g, ' ').trim();
      const controls = body.querySelectorAll('button, select, input, .theme-opt, .badge, [data-th]').length;
      const onTop = (() => {
        const b = m.querySelector('.modal-card').getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + 40);
        return !!hit && !!hit.closest('#profSecModal');
      })();
      rows.push({ slug: p.slug, chars: visible.length, controls, onTop });
      el('psDone').click();
    });
    return { rows, empty: rows.filter(r => r.chars < 10 || r.controls === 0).map(r => r.slug).join(','),
      behind: rows.filter(r => !r.onTop).map(r => r.slug).join(','), n: rows.length };
  });
  ok(pcontent.n >= 8, 'every section can be opened');
  is(pcontent.empty, '', 'and not one of them opens empty — each has its options inside');
  is(pcontent.behind, '', '...and each is drawn in front of the Profile screen, not behind it');

  const pclose = await $(() => {
    const m = el('themeModal');
    el('profX').click();
    const out = { closed: m.style.display === 'none', unscreened: !m.classList.contains('profscreen') };
    Auth.user = null;
    return out;
  });
  ok(pclose.closed, 'the red cross closes Profile');
  ok(pclose.unscreened, '...and puts it back to an ordinary modal for anything else that uses it');

  describe('admin simulation is undoable', () => { });
  const undo = await $(() => {
    Store.remove('vv_simbak');
    Auth.user = { email: ADMIN_EMAILS[0] };
    const list = phaseIdxs();
    Prog.doneSkills = []; Prog.phaseMax = list[0]; Prog.scratchWon = ['verse','palace','journey','stories'];
    Prog.memorized = ['43:3:16']; Prog.talents = 700;
    bustCaches(); saveProg();
    const before = { skills: Prog.doneSkills.length, snap: !!Store.get('vv_simbak') };
    el('themeBtn').click(); applyAdminVisibility();
    el('testFinishPhase').click();
    const after = { skills: Prog.doneSkills.length, snap: !!Store.get('vv_simbak') };
    // ...and Restore puts it back exactly
    const o = el('scov'); if (o) o.classList.remove('on');
    el('themeBtn').click();
    el('testRestore').click();
    const restored = { skills: (Prog.doneSkills || []).length, snap: !!Store.get('vv_simbak'),
      verses: (Prog.memorized || []).length, talents: Prog.talents };
    Auth.user = null;
    return { before, after, restored };
  });
  no(undo.before.snap, 'no snapshot is held before a simulation');
  ok(undo.after.skills > undo.before.skills, 'finishing a phase adds the ticks');
  ok(undo.after.snap, '...and takes a snapshot first, so it can be undone');
  is(undo.restored.skills, undo.before.skills, 'Restore puts the ticks back exactly as they were');
  no(undo.restored.snap, '...and lets the snapshot go');
  is(undo.restored.verses, 1, '...leaving verses alone');
  is(undo.restored.talents, 700, '...and talents');

  describe('repairing a path with no snapshot', () => { });
  const repair = await $(() => {
    Store.remove('vv_simbak');                       // the state the damaged account is in
    const list = phaseIdxs();
    Prog.doneSkills = [];
    for (let i = 0; i <= 4; i++) UNITS[list[i]].skills.forEach(sk => Prog.doneSkills.push(sk.id));
    Prog.phaseMax = list[6]; Prog.memorized = ['43:3:16']; Prog.talents = 700;
    Prog.palaces = [{ place: 'A', stations: ['x'], learnedAt: 1, step: 1 }];
    bustCaches(); saveProg();
    const before = { ticks: Prog.doneSkills.length, phaseMax: Prog.phaseMax };
    const cleared = repairLearnProgress();
    show('learn'); renderPath(true);
    return { before, cleared,
      ticks: (Prog.doneSkills || []).filter(id => /^(num|book|snd|peg|palace):/.test(id)).length,
      phaseMax: Prog.phaseMax,
      dividers: el('learn').querySelectorAll('.phasedivider').length,
      verses: (Prog.memorized || []).length, talents: Prog.talents, palaces: palaceCount() };
  });
  ok(repair.before.ticks > 0, 'a path can be left full of ticks with no snapshot to undo them');
  ok(repair.cleared > 0, 'the repair clears them');
  is(repair.ticks, 0, '...every one');
  is(repair.phaseMax, 0, '...and drops the reveal back to where the work really is');
  is(repair.dividers, 1, '...so only the phase actually reached is on screen');
  is(repair.verses, 1, 'verses are untouched');
  is(repair.talents, 700, '...and talents');
  is(repair.palaces, 1, '...and palaces');

  describe('choosing an option closes the popup', () => { });
  const layers = await $(() => {
    Auth.user = { email: ADMIN_EMAILS[0] };
    el('themeBtn').click();
    openProfSection('admin');
    const sec = el('profSecModal'), prof = el('themeModal');
    const out = { bothOpen: sec.style.display === 'flex' && prof.style.display === 'flex' };
    el('testPaywall').click();                        // an option that navigates somewhere
    out.secClosed = sec.style.display === 'none';
    out.profClosed = prof.style.display === 'none';
    out.panelPutBack = !!document.querySelector('#profPanels #adminWrap');
    if (el('payModal')) el('payModal').style.display = 'none';
    Auth.user = null;
    return out;
  });
  ok(layers.bothOpen, 'a section opens on top of the Profile screen');
  ok(layers.secClosed, 'choosing an option closes the popup');
  ok(layers.profClosed, '...and the Profile screen behind it');
  ok(layers.panelPutBack, '...putting the section back where it lives');

  describe('profile goes straight there', () => { });
  const direct = await $(() => {
    const out = {};
    const tap = slug => { el('themeBtn').click(); document.querySelector('#profGrid [data-prof="' + slug + '"]').click(); };
    const shut = () => document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));

    tap('feature-store');
    out.featureStore = !!el('featModal') && el('featModal').style.display === 'flex';
    out.noSectionPopup = !el('profSecModal') || el('profSecModal').style.display !== 'flex';
    shut();

    tap('what-s-new');
    out.whatsNew = !!el('whatsNewModal') && el('whatsNewModal').style.display === 'flex';
    out.notesHaveVersions = /Version history|v1\./i.test(el('whatsNewModal').innerText);
    out.profileStillBehind = el('themeModal').style.display === 'flex';
    el('wnClose').click();
    out.backOnProfile = el('themeModal').style.display === 'flex' && el('whatsNewModal').style.display === 'none';
    shut();

    tap('get-the-app');
    out.install = !!el('installModal') && el('installModal').style.display === 'flex';
    shut();

    tap('reference-library');
    out.foundations = document.querySelector('.view.active').id === 'foundations';
    out.profileClosed = el('themeModal').style.display === 'none';
    el('foundBack').click();
    out.backToProfile = el('themeModal').style.display === 'flex';
    shut();
    return out;
  });
  ok(direct.featureStore, 'Feature store opens the switches themselves');
  ok(direct.noSectionPopup, '...with no section popup in between');
  ok(direct.whatsNew, "What's new opens the release notes");
  ok(direct.notesHaveVersions, '...the actual notes');
  ok(direct.profileStillBehind, '...leaving Profile standing behind it');
  ok(direct.backOnProfile, '...so its cross returns to Profile');
  ok(direct.install, 'Get the app opens the install steps');
  ok(direct.foundations, 'Reference library opens Foundations');
  ok(direct.profileClosed, '...as a screen of its own');
  ok(direct.backToProfile, '...and Back returns to Profile');

  const chrome = await $(() => {
    el('themeBtn').click();
    openProfSection('theme');
    const m = el('profSecModal');
    const done = el('psDone');
    const out = { cross: !!el('psClose'), noTick: !!done && done.textContent.trim() === 'Done',
      doneAtBottom: !!done && !done.closest('.lv-topbar'),
      ticksAnywhere: m.querySelectorAll('.lsave').length };
    done.click();
    out.closedByDone = m.style.display === 'none';
    out.profileStill = el('themeModal').style.display === 'flex';
    openProfSection('theme');
    el('psClose').click();
    out.closedByCross = m.style.display === 'none';
    document.querySelectorAll('.modal').forEach(x => (x.style.display = 'none'));
    return out;
  });
  ok(chrome.cross, 'a section popup keeps its red cross');
  is(chrome.ticksAnywhere, 0, '...and has no green tick at all');
  ok(chrome.noTick && chrome.doneAtBottom, '...with a Done button at the foot instead');
  ok(chrome.closedByDone, 'Done closes it');
  ok(chrome.profileStill, '...back onto Profile');
  ok(chrome.closedByCross, '...and the cross does the same — two ways back');

  describe('the Bible scratch card', () => { });
  const card = await $(() => {
    const rung = SCRATCH_LADDER.findIndex(r => r.tab === 'journey');
    Scratch.open(rung);
    const ic = el('scIcon'), svg = ic.querySelector('svg');
    const r = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
    const out = { drawn: !!svg, w: Math.round(r.width), h: Math.round(r.height), name: el('scName').textContent };
    el('scov').classList.remove('on');
    return out;
  });
  ok(card.drawn, 'the Bible prize is the drawn Bible, not an emoji');
  ok(card.w > 20 && card.h > 20, '...and it is actually sized, so it can be seen');
  is(card.name, 'Bible', '...on the Bible card');

  describe('profile panels are lent, not lost', () => { });
  const lent = await $(() => {
    el('themeBtn').click();
    openProfSection('theme');
    const before = document.querySelectorAll('[data-th]').length;
    openProfSection('bible-translation');          // rebuilds the popup while Theme is on loan
    const after = document.querySelectorAll('[data-th]').length;
    openProfSection('theme');
    const backAgain = document.querySelectorAll('#profSecModal [data-th]').length;
    const stowed = document.querySelectorAll('#profPanels .prof-panel').length;
    const inPopup = document.querySelectorAll('#profSecModal .prof-panel').length;
    el('psDone').click();
    const afterClose = document.querySelectorAll('#profPanels .prof-panel').length;
    document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
    return { before, after, backAgain, stowed, inPopup, afterClose, total: PROF_PANELS.length };
  });
  is(lent.before, 5, 'the Theme popup holds all five themes');
  is(lent.after, 5, 'opening another section does NOT destroy them');
  is(lent.backAgain, 5, '...and Theme still has them when reopened');
  is(lent.inPopup, 1, 'exactly one panel is on loan at a time');
  is(lent.stowed, lent.total - 1, '...and the rest are stowed');
  is(lent.afterClose, lent.total, 'closing returns every panel home');

  // ================= ONE TEMPLATE FOR ALL SIXTY-SIX BOOKS (v1.31) =================
  describe('every book is a book', () => { });
  const books = await $(() => {
    const byBook = {};
    UNITS.forEach(U => U.skills.forEach(sk => {
      (sk.items || []).forEach(n => {
        if (n >= 1 && n <= 66 && (sk.kind === 'book' || /^book:/.test(sk.id))) byBook[n] = sk;
      });
    }));
    const missing = [], wrongKind = [], wrongId = [];
    for (let n = 1; n <= 66; n++) {
      const sk = byBook[n];
      if (!sk) { missing.push(n); continue; }
      if (sk.kind !== 'book') wrongKind.push(n + ':' + sk.kind);
      if (sk.id !== 'book:' + n) wrongId.push(n + ':' + sk.id);
    }
    // and no book may ALSO be taught by a number lesson — that is how the first five drifted
    const alsoNum = [];
    UNITS.forEach(U => U.skills.forEach(sk => {
      if (sk.kind === 'num') (sk.items || []).forEach(n => { if (n >= 1 && n <= 66 && byBook[n]) alsoNum.push(n); });
    }));
    return { missing: missing.join(','), wrongKind: wrongKind.join(','), wrongId: wrongId.join(','),
      alsoNum: [...new Set(alsoNum)].join(','), count: Object.keys(byBook).length };
  });
  is(books.count, 66, 'all sixty-six books are lessons');
  is(books.missing, '', '...none missing');
  is(books.wrongKind, '', "...every one is kind:'book', so one template drives them all");
  is(books.wrongId, '', "...and every id is book:N");
  is(books.alsoNum, '', 'no book is ALSO taught as a number lesson — that is how the first five drifted');

  const freeTorah = await $(() => {
    Billing.revoke(); Prog.lessonUnlocks = []; bustCaches();
    const find = n => { for (const U of UNITS) { const sk = U.skills.find(x => x.id === 'book:' + n); if (sk) return sk; } return null; };
    const paid = [1, 2, 3, 4, 5, 40].filter(n => { const sk = find(n); return sk && skillPaywalled(sk); });
    const paidLater = [46, 66].filter(n => { const sk = find(n); return sk && skillPaywalled(sk); });
    return { paid: paid.join(','), paidLater: paidLater.join(',') };
  });
  is(freeTorah.paid, '', 'Genesis to Deuteronomy and Matthew are free — converting them to book lessons must not sell them');
  is(freeTorah.paidLater, '46,66', '...while the books beyond the Foundation still are not');

  // the rendered teach card must be the same shape for the first book and a late one
  const tmpl = await $(() => {
    const shape = n => {
      const d = document.createElement('div');
      d.innerHTML = teachCardBody('book', n);
      return ['.tline img,.tline .imgph', '.tname', '#tcBookImg', '.tnum', '.tword', '.sounds', '#tcEdit']
        .map(sel => (d.querySelector(sel) ? 1 : 0)).join('');
    };
    return { genesis: shape(1), leviticus: shape(3), matthew: shape(40), corinthians: shape(46), revelation: shape(66) };
  });
  is(tmpl.genesis, tmpl.corinthians, 'Genesis renders exactly the card 1 Corinthians does');
  is(tmpl.leviticus, tmpl.corinthians, '...and Leviticus');
  is(tmpl.matthew, tmpl.corinthians, '...and Matthew');
  is(tmpl.revelation, tmpl.corinthians, '...and Revelation');
  is(tmpl.genesis, '1111111', '...all seven parts present: image, name, write my own image, number, image name, sounds, write my own scene');

  const carried = await $(() => {
    // someone who finished Genesis when it was still a number lesson must not be asked again
    const p = migrateProg({ doneSkills: ['num:1', 'num:2', 'num:3', 'num:4', 'num:5', 'num:9'] });
    return { books: [1, 2, 3, 4, 5].every(d => p.doneSkills.includes('book:' + d)),
      untouched: p.doneSkills.includes('num:9'),
      noSix: !p.doneSkills.includes('book:6') };
  });
  ok(carried.books, 'old num:1..5 completions carry over to book:1..5');
  ok(carried.untouched, '...leaving other number lessons alone');
  ok(carried.noSix, '...and inventing nothing');

  // ================= A PICTURE FOR EVERY BOOK (v1.32) =================
  describe('book images', () => { });
  const imgs = await $(() => {
    const keys = Object.keys(BOOK_IMAGES).map(Number).sort((a, b) => a - b);
    const missing = [], short = [], dupInBook = [];
    const all = {};
    const repeated = [];
    for (let n = 1; n <= 66; n++) {
      const o = BOOK_IMAGES[n];
      if (!o) { missing.push(n); continue; }
      if (o.length < 3) short.push(n + ':' + o.length);
      if (new Set(o).size !== o.length) dupInBook.push(n);
      o.forEach(x => { if (all[x]) repeated.push(x); else all[x] = n; });
    }
    const tooLong = [];
    Object.keys(all).forEach(x => { if (x.split(/\s+/).length > 5) tooLong.push(x); });
    return { books: keys.length, missing: missing.join(','), short: short.join(','),
      dupInBook: dupInBook.join(','), repeated: [...new Set(repeated)].join(','),
      total: Object.keys(all).length, tooLong: tooLong.join(' | ') };
  });
  is(imgs.books, 66, 'every book has a set of pictures');
  is(imgs.missing, '', '...none missing');
  is(imgs.short, '', '...each offering at least three');
  is(imgs.dupInBook, '', '...with no book repeating itself');
  is(imgs.repeated, '', '...and no picture used for two different books');
  is(imgs.total, 264, 'two hundred and sixty-four distinct pictures in all');
  is(imgs.tooLong, '', '...every one short enough to hold in the mind');

  const pick = await $(() => {
    const n = 1;
    delete Prog.customBookImg[n]; saveProg();
    openBookImagePicker(n, () => { });
    const m = el('bookImgModal');
    const rows = [...m.querySelectorAll('[data-bimg]')];
    const out = { open: m.style.display === 'flex', rows: rows.length,
      pictures: m.querySelectorAll('.bimgopt .bimg').length,
      hasDefault: rows.some(r => r.dataset.bimg === ''),
      named: /Genesis/.test(m.innerText), done: !!el('biDone'), cross: !!el('biClose') };
    rows.find(r => r.dataset.bimg === BOOK_IMAGES[n][2]).click();
    out.chose = Prog.customBookImg[n];
    out.closed = m.style.display === 'none';
    // and the lesson shows the choice
    const d = document.createElement('div'); d.innerHTML = teachCardBody('book', n);
    out.onCard = /A serpent in Eden/.test(d.textContent);
    out.stillHasButton = !!d.querySelector('#tcBookImg');
    out.buttonSays = d.querySelector('#tcBookImg').textContent.trim();
    // choosing the drawn icon again clears it
    openBookImagePicker(n, () => { });
    el('bookImgModal').querySelector('[data-bimg=""]').click();
    out.cleared = Prog.customBookImg[n] === undefined;
    document.querySelectorAll('.modal').forEach(x => (x.style.display = 'none'));
    return out;
  });
  ok(pick.open, 'the picker opens');
  is(pick.rows, 5, '...offering the four pictures and the drawn icon');
  is(pick.pictures, 5, '...every one of them shown as a picture, the way number images are chosen');
  ok(pick.hasDefault, '...including the way back to the default');
  ok(pick.named, '...named for the book');
  ok(pick.cross && pick.done, '...with a cross and a Done, like everything else');
  is(pick.chose, 'A serpent in Eden', 'choosing one records it');
  ok(pick.closed, '...and closes the picker');
  ok(pick.onCard, '...and the lesson shows it');
  ok(pick.stillHasButton, 'the button stays available');
  is(pick.buttonSays, '🖼️ Change my book image', '...and reads Change my book image, not Write my own');
  ok(pick.cleared, 'picking the drawn icon puts it back to the default');

  // the whole point: this works the same for the first five as for any other book
  const everyBook = await $(() => {
    const bad = [];
    for (let n = 1; n <= 66; n++) {
      const d = document.createElement('div'); d.innerHTML = teachCardBody('book', n);
      const b = d.querySelector('#tcBookImg');
      if (!b) { bad.push(n + ':no button'); continue; }
      if (b.textContent.trim() !== '🖼️ Change my book image') bad.push(n + ':' + b.textContent.trim());
      if (!bookImageOptions(n).length) bad.push(n + ':no options');
    }
    return bad.join(' | ');
  });
  is(everyBook, '', 'all sixty-six books offer the same Change my book image control — Genesis included');

  const bad = T.report('behaviour');
  const consoleErrs = page.__errors.filter(e => !/favicon/i.test(e));
  if (consoleErrs.length) { console.error(`  ✗ ${consoleErrs.length} console error(s):`); consoleErrs.slice(0, 5).forEach(e => console.error('      ' + e)); }
  await browser.close(); stopServer();
  process.exit(bad + consoleErrs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
