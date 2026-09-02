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
  is(data.storiesTagged, 150, 'a hundred and fifty Bible stories');

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
    Prog.goalMode = 'same'; Prog.dailyGoal = 20; saveProg(); const atMax = goalToday();
    Prog.dailyGoal = 99; saveProg(); const clamped = goalToday();
    // the picker offers every number up to the ceiling, so raising it raises both
    const offered = Array.from({length: GOAL_MAX}, (_, i) => i + 1);
    return { max: GOAL_MAX, atMax, clamped, offers: offered.length, top: offered[offered.length - 1] };
  });
  is(goalMax.max, 20, 'a daily goal may be as high as twenty');
  is(goalMax.atMax, 20, '…and twenty is honoured');
  is(goalMax.clamped, 20, '…and nothing above it is');
  is(goalMax.offers, 20, 'the picker offers twenty choices');
  is(goalMax.top, 20, '…the last of them twenty');

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
    el('wPalaceBtn').click(); document.querySelector('#psGrid [data-p="0"]').click();
    el('wDone').click(); const blockedNoRoom = !Prog.memorized.includes('40:6:33');
    el('wRoomBtn').click(); document.querySelector('#psGrid [data-room="Sink"]').click();
    el('wDone').click();
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
  is(order.sections, 30, 'thirty sections');
  is(order.total, 150, '...holding 150 stories');
  is(order.parablesRun.join(','), '14,15,16,17,18,19,20', 'the seven parable sections run consecutively');
  is(order.wp1, 21, '...then the word pictures');
  is(order.wp2, 22, '...both of them');
  is(order.tail, "Paul & the End | Paul's Journeys | The Revelation", '...and the list ends after the resurrection, not at it');

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
      savedRibbon: /SAVED/.test(top),
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
  ok(bib.savedRibbon, '...and the corner now carries the way to your saved verses');
  ok(bib.inBook, 'a book shows your verses in it, under the chapters');
  ok(bib.inBookCount, '...counted');
  ok(bib.inBookHearts, '...saying how many you know by heart');
  is(bib.inBookRows, 2, '...and listing them');
  is(bib.backLabel, '← All books', 'the way back does not repeat the word Bible either');
  ok(bib.emptyBookQuiet, 'a book you have no verses in says nothing at all');

  describe('my verses: the scoreboard', () => { });
  const board = await $(() => {
    Prog.memorized = ['43:11:35', '19:23:1', '43:3:16'];      // "Jesus wept." is two words
    Prog.verseStage = { '43:3:16': 'heart', '19:23:1': 'heart' };
    Prog.verseSR = {
      '43:11:35': { learnedAt: 1, step: 6, dueAt: null, r0: 1 },              // visible trail done
      '19:23:1':  { learnedAt: 1, step: 7, dueAt: null, r0: 1, lt: 60 },      // and past two months
      '43:3:16':  { learnedAt: 1, step: 9, dueAt: null, r0: 1, lt: 730 },     // ...and past two years
    };
    Prog.w4wSR = { '43:3:16': { cr: 5, n: 9, ok: 7, at: 0 }, '19:23:1': { cr: 2, n: 3, ok: 2, at: 0 } };
    Prog.dayStreak = 12; Prog.bestDayStreak = 19; Prog.badges = []; saveProg();
    const s = verseScore();
    show('verse'); vView = 'mem'; renderVerse();
    const q = x => document.querySelector('#verse ' + x);
    const words = (kjvText(43, 11, 35) + ' ' + kjvText(19, 23, 1) + ' ' + kjvText(43, 3, 16)).split(/\s+/).filter(Boolean).length;
    return {
      score: s, realWords: words,
      ringN: q('.sb-n').textContent,
      ringLabel: q('.sb-u').textContent,
      arcSet: q('.sb-arc').getAttribute('stroke-dashoffset') !== null,
      cells: [...document.querySelectorAll('#verse .statcell')].map(c => c.querySelector('.st-n').textContent).join(','),
      labels: [...document.querySelectorAll('#verse .statcell .st-l')].map(c => c.textContent).join(','),
      medals: [...document.querySelectorAll('#verse .medal')].map(m => m.textContent.replace(/\s+/g, ' ').trim()).join(' | '),
      greyed: [...document.querySelectorAll('#verse .medal.off')].length,
      stagesumGone: !q('.stagesum'),
      booksHeading: !!/YOUR BOOKS/.test(el('verse').innerText),
      dueIsHot: [...document.querySelectorAll('#verse .statcell')].pop().classList.contains('hot'),
    };
  });
  is(board.score.n, 3, 'the scoreboard counts your verses');
  is(board.score.heart, 2, '...how many you know by heart');
  is(board.score.sealed, 3, '...how many have finished the visible trail');
  is(board.score.books, 2, '...how many books they come from');
  is(board.score.words, board.realWords, '...and how many words you are carrying, counted from the text itself');
  is(board.score.cleanRuns, 9, 'clean runs are totalled across every verse');
  is(board.score.bestRun, 5, '...and the best run is the longest of them');
  is(board.ringN, '3', 'the ring shows the count');
  is(board.ringLabel, 'VERSES', '...and says what it counts');
  ok(board.arcSet, '...with its arc drawn to a real fraction rather than a fixed picture');
  is(board.cells, '2,3,2', 'three counts: by heart, sealed, due today');
  ok(board.dueIsHot, '...and anything due today is picked out rather than blending in');
  is(board.labels, 'By heart,Sealed,Due today', '...each labelled, and each one a way in');
  // the long-service clubs are cumulative: two years is also past six months and two months
  is(board.score.longs[60], 2, 'a verse past two months counts in the two month club');
  is(board.score.longs[180], 1, '...and a two year verse counts in the six month club too');
  is(board.score.longs[730], 1, '...and in its own');
  has(board.medals, '5 best clean run', 'records are shown');
  has(board.medals, '19 best streak', '...including the best day streak');
  is(board.greyed, 0, 'a club you have reached is not greyed out');
  ok(board.stagesumGone, 'the old two-in-a-three-column-grid counters are gone');
  ok(board.booksHeading, 'the book grid keeps its place underneath');

  const emptyBoard = await $(() => {
    Prog.memorized = []; Prog.verseStage = {}; Prog.verseSR = {}; saveProg();
    show('verse'); vView = 'mem'; renderVerse();
    const t = el('verse').innerText;
    return { invites: /scoreboard starts here/i.test(t), noRing: !document.querySelector('#verse .sb-ring'),
             says: /how many you know by heart/i.test(t) };
  });
  ok(emptyBoard.invites, 'with no verses yet the page invites rather than sitting blank');
  ok(emptyBoard.noRing, '...showing no ring of zeroes');
  ok(emptyBoard.says, '...but saying what will be counted');

  describe('bible stories: the second reorder', () => { });
  const afterEaster = await $(() => {
    const titles = STORY_GROUPS.map(g => g.t);
    const at = t => titles.indexOf(t);
    const byId = {}; let i = 0;
    STORY_GROUPS.forEach(g => g.s.forEach(st => { byId[i] = st[0]; i++; }));

    // Rebuild v1.36-v1.39's order and take finished stories from every band it had.
    const V2 = titles.filter(t => !['After the Resurrection','The Church Spreads',"Paul's Journeys",'The Revelation'].includes(t));
    const oldName = {}; let j = 0;
    V2.forEach(t => { const g = STORY_GROUPS.find(x => x.t === t); g.s.forEach(st => { oldName[j] = st[0]; j++; }); });
    const oldIds = [0, 84, 114, 119, 120, 124, 125, 129];
    const wanted = oldIds.map(n => oldName[n]);
    const p = { doneSkills: oldIds.map(n => 'story:' + n), storyOrderV2: true };
    migrateProg(p);
    const got = p.doneSkills.map(s => byId[+s.split(':')[1]]);
    const twice = (() => { migrateProg(p); return p.doneSkills.map(s => byId[+s.split(':')[1]]).join(' | '); })();

    return {
      order: [at('The Cross & Resurrection'), at('After the Resurrection'), at('The Early Church'),
              at('The Church Spreads'), at('Paul & the End'), at("Paul's Journeys"), at('The Revelation')].join(','),
      icons: STORY_GROUPS.length, wanted: wanted.join(' | '), got: got.join(' | '), twice, flag: !!p.storyOrderV3,
    };
  });
  is(afterEaster.order, '23,24,25,26,27,28,29', 'the new sections sit in their chronological place, not on the end');
  is(afterEaster.got, afterEaster.wanted, 'every finished story survives the second reorder as the same story');
  is(afterEaster.twice, afterEaster.wanted, '...and running the migration again moves nothing');
  ok(afterEaster.flag, '...with its own flag, so it is separate from the first reorder');

  // A person who never saw v1.36 runs BOTH migrations in one go — the pair must compose.
  const bothAtOnce = await $(() => {
    const byId = {}; let i = 0;
    STORY_GROUPS.forEach(g => g.s.forEach(st => { byId[i] = st[0]; i++; }));
    // v1.35 order: the cross, church and Paul sat at ids 85-99.
    const p = { doneSkills: ['story:85', 'story:94', 'story:99', 'story:3'] };
    migrateProg(p);
    return p.doneSkills.map(s => byId[+s.split(':')[1]]).join(' | ');
  });
  is(bothAtOnce, 'The Triumphal Entry | Stephen the First Martyr | The New Heaven & New Earth | Cain & Abel',
     'someone arriving from v1.35 runs both reorders in sequence and lands on the right stories');

  describe('suggested: the same shape, the other key', () => { });
  const sugg = await $(() => {
    Prog.memorized = ['43:3:16', '19:23:1']; Prog.verseStage = { '43:3:16': 'heart' }; saveProg();
    show('verse'); vView = 'sugg'; renderVerse();
    const q = s => document.querySelector('#verse ' + s);
    const memHas = s => { vView = 'mem'; renderVerse(); const r = !!document.querySelector('#verse ' + s); vView = 'sugg'; renderVerse(); return r; };
    return {
      eyebrow: (q('.rb-k') || {}).textContent,
      hasBar: !!q('.reachboard .lbar'),
      hasRing: !!q('.sb-ring'),                       // the ring belongs to My Verses alone
      cells: document.querySelectorAll('#verse .reachcell').length,
      grid: !!q('.bookgrid.reach'),
      accordionGone: !q('.bookhead'),
      seedling: /🌱/.test(el('verse').innerText),
      noHeart: !q('.heart-etch'),                     // the heart belongs to My Verses alone
      memRingExists: memHas('.sb-ring'),
      memHasNoReachboard: !memHas('.reachboard'),
    };
  });
  is(sugg.eyebrow, 'WITHIN REACH', 'Suggested leads with what is open to you');
  ok(sugg.hasBar, '...measured on a bar');
  no(sugg.hasRing, '...and never the ring, which is My Verses\' alone');
  is(sugg.cells, 2, 'two wide counts here, against six small ones there');
  ok(sugg.grid, 'the books are a grid, the same shape as My Verses');
  ok(sugg.accordionGone, '...and the old accordion is gone from here too');
  ok(sugg.seedling, 'it is marked with a seedling');
  ok(sugg.noHeart, '...and never the gold heart');
  ok(sugg.memRingExists, 'My Verses still has its ring');
  ok(sugg.memHasNoReachboard, '...and never the reach panel — the two pages share no furniture');

  const dim = await $(() => {
    // a book unlocked but with nothing in reach must still be shown, dimmed
    const groups = { 43: [[43, 3, 16]] };
    const html = suggBookGrid([43, 40], groups);
    const d = document.createElement('div'); d.innerHTML = html;
    const btns = [...d.querySelectorAll('.bookbtn')];
    return { n: btns.length, dimmed: btns.filter(b => b.classList.contains('empty')).length,
             counts: btns.map(b => b.querySelector('.bg-c').textContent.trim()).join(' | ') };
  });
  is(dim.n, 2, 'every unlocked book gets a button');
  is(dim.dimmed, 1, '...one of them with nothing in reach yet');
  is(dim.counts, '🌱 1 | —', '...shown as a dash rather than a zero, and dimmed rather than hidden');

  describe('every screen wears its own icon', () => { });
  const heads = await $(() => {
    const grab = (view, fn) => { fn(); const hd = document.querySelector('#' + view + ' .pagehead');
      if (!hd) return null;
      const ic = hd.querySelector('.ph-i');
      return { icon: ic.querySelector('svg') ? 'svg' : ic.textContent.trim(), title: hd.querySelector('h2').textContent.trim() }; };
    return {
      learn: grab('learn', () => { show('learn'); renderPath(); }),
      library: grab('verse', () => { show('verse'); vView = 'hub'; renderVerse(); }),
      palace: grab('palace', () => { show('palace'); renderPalace(); }),
      bible: grab('journey', () => { show('journey'); renderJourney(); }),
      stories: grab('stories', () => { show('stories'); renderStories(); }),
    };
  });
  is(heads.learn.icon + ' ' + heads.learn.title, '🎓 Learn', 'Learn wears the Learn tab icon');
  is(heads.library.icon + ' ' + heads.library.title, '📚 Library', '...Library its own');
  is(heads.palace.icon + ' ' + heads.palace.title, '🏛️ Memory Palace', '...Palaces its own');
  is(heads.bible.icon + ' ' + heads.bible.title, 'svg Bible', '...and Bible the drawn book, not an emoji');
  is(heads.stories.icon + ' ' + heads.stories.title, '📖 Bible Stories', '...Stories its own');

  const book = await $(() => {
    show('journey'); renderJourney();
    const bb = document.querySelector('#journey .pagehead svg path').getBBox();
    const tb = document.querySelector('.tabbar [data-tab="journey"] svg path').getBBox();
    return { w: +bb.width.toFixed(1), h: +bb.height.toFixed(1), tabW: +tb.width.toFixed(1), same: Math.abs(bb.width - tb.width) < 0.01 };
  });
  ok(book.w > 17, 'the Bible book is wider than it was — 14.9 of 24 read as narrow beside the other icons');
  ok(book.w < book.h + 2, '...without becoming wider than it is tall');
  ok(book.same, 'and the tab bar draws exactly the same book as the page head');

  describe('four shelves, one shape, four identities', () => { });
  const shelves = await $(() => {
    Prog.memorized = ['43:3:16', '19:23:1'];
    Prog.verseStage = { '43:3:16': 'heart' };
    Prog.saved = ['40:5:9', '40:6:33', '45:8:28']; saveProg();
    const look = view => {
      vView = view; show('verse'); renderVerse();
      const q = s => document.querySelector('#verse ' + s);
      return {
        ring: !!q('.sb-ring'), bar: !!q('.reachboard'), shelf: !!q('.shelfboard:not(.topic)'),
        topic: !!q('.shelfboard.topic'), heart: !!q('.heart-etch'),
        grid3: !!q('.bookgrid'), grid2: !!q('.topicgrid'),
        accordion: !!q('.bookhead'),
      };
    };
    return { mem: look('mem'), sugg: look('sugg'), saved: look('saved'), topics: look('topics') };
  });
  // each page has exactly one hero, and it is its own
  ok(shelves.mem.ring && !shelves.mem.bar && !shelves.mem.shelf && !shelves.mem.topic, 'My Verses wears the ring alone');
  ok(shelves.sugg.bar && !shelves.sugg.ring && !shelves.sugg.shelf && !shelves.sugg.topic, 'Suggested wears the bar alone');
  ok(shelves.saved.shelf && !shelves.saved.ring && !shelves.saved.bar && !shelves.saved.topic, 'Saved wears the count alone');
  ok(shelves.topics.topic && !shelves.topics.ring && !shelves.topics.bar, 'Topics wears the purple panel alone');
  // the gold heart belongs to one page only
  ok(shelves.mem.heart, 'the gold heart marks My Verses');
  ok(!shelves.sugg.heart && !shelves.saved.heart && !shelves.topics.heart, '...and appears on none of the others');
  // grid widths differ where the content differs
  ok(shelves.mem.grid3 && shelves.sugg.grid3 && shelves.saved.grid3, 'three shelves list books in the same grid');
  ok(shelves.topics.grid2 && !shelves.topics.grid3, '...and Topics uses its own two-across grid instead');
  ok(!shelves.mem.accordion && !shelves.sugg.accordion && !shelves.saved.accordion && !shelves.topics.accordion,
     'no drop-down lists remain anywhere');

  const savedShelf = await $(() => {
    Prog.saved = ['40:5:9', '40:6:33', '45:8:28']; saveProg();
    vView = 'saved'; show('verse'); renderVerse();
    const q = s => document.querySelector('#verse ' + s);
    const out = {
      count: q('.sh-n').textContent, key: q('.sh-k').textContent,
      noMeter: !q('.shelfboard .lbar'),
      books: [...document.querySelectorAll('#verse .bookbtn')].map(b => b.querySelector('.bg-c').textContent.trim()).join(' | '),
      tinted: !!q('.bookgrid.saved'),
    };
    document.querySelector('#verse [data-bookgrid$=":40"]').click();
    const m = document.getElementById('bkVerseModal');
    out.popupTitle = m.querySelector('.lv-topbar div').textContent.trim();
    out.rows = m.querySelectorAll('[data-vb]').length;
    out.saysSetAside = /set aside in Matthew/.test(m.innerText);
    m.style.display = 'none';
    return out;
  });
  is(savedShelf.count, '3', 'Saved counts what is on the shelf');
  is(savedShelf.key, 'SAVED FOR LATER', '...and says what the shelf is');
  ok(savedShelf.noMeter, '...with no progress bar, because a shelf is not progress');
  is(savedShelf.books, '🔖 2 | 🔖 1', 'each book counts what you set aside in it');
  ok(savedShelf.tinted, '...in its own colour');
  is(savedShelf.popupTitle, '🔖 Matthew', 'a book opens its own saved verses');
  is(savedShelf.rows, 2, '...listing only those');
  ok(savedShelf.saysSetAside, '...and describing them as set aside, not memorized');

  const topics = await $(() => {
    vView = 'topics'; show('verse'); renderVerse();
    const btns = [...document.querySelectorAll('#verse [data-topicopen]')];
    const out = {
      n: btns.length, total: TOPICS.length,
      hasIcons: btns.every(b => (b.querySelector('.tp-i').textContent || '').trim().length > 0),
      dimmed: btns.filter(b => b.classList.contains('empty')).length,
      says: (document.querySelector('#verse .sh-t') || {}).textContent || '',
    };
    const live = btns.find(b => !b.classList.contains('empty'));
    out.tapped = live ? live.querySelector('.tp-n').textContent : '';
    if (live) live.click();
    const m = document.getElementById('topicModal');
    out.popup = !!m && m.style.display === 'flex';
    out.popupTitle = m ? m.querySelector('.lv-topbar div').textContent.trim() : '';
    if (m) m.style.display = 'none';
    return out;
  });
  is(topics.n, topics.total, 'every topic gets a button');
  ok(topics.hasIcons, '...each carrying its own icon, which no book grid has');
  has(topics.says, 'topics have something you can build', 'the panel says how many are live');
  ok(topics.popup, 'tapping a topic opens its verses in a popup');
  has(topics.popupTitle, topics.tapped, '...titled with the topic');

  const rebuild = await $(() => {
    // "Build a new verse" after a lesson must land on THAT book's suggestions
    ['bkVerseModal', 'suggBookModal', 'topicModal'].forEach(id => { const m = el(id); if (m) m.style.display = 'none'; });
    openSuggestedForBook(19);
    const m = el('suggBookModal');
    return { open: !!m && m.style.display === 'flex',
             title: m ? m.querySelector('.lv-topbar div').textContent.trim() : '',
             onSuggested: vView === 'sugg' };
  });
  ok(rebuild.open, 'Build a new verse opens that book directly');
  is(rebuild.title, '🌱 Psalms', '...the book the lesson was in');
  ok(rebuild.onSuggested, '...with Suggested behind it, so closing lands somewhere sensible');

  describe('finish a lesson, build a verse in that book', () => { });
  const afterLesson = await $(() => {
    ['bkVerseModal', 'suggBookModal', 'topicModal'].forEach(id => { const m = el(id); if (m) m.style.display = 'none'; });
    // The seeded profile knows everything, so nothing can become NEWLY reachable on its own. A number
    // is known from a done skill OR from extraKnown, so both have to give up 19 for Psalms to close.
    const keepSkills = (Prog.doneSkills || []).slice();
    const keepExtra = (Prog.extraKnown || []).slice();
    const sk = UNITS.flatMap(u => u.skills).find(s => (s.kind === 'book' || s.kind === 'num') && (s.items || []).includes(19));
    const out = { skipped: !sk, err: null };
    if (!sk) return out;
    try {
      Prog.doneSkills = keepSkills.filter(id => id !== sk.id);
      Prog.extraKnown = keepExtra.filter(n => n !== 19);
      bustCaches();
      out.lockedFirst = !reachable(19, 23, 1);

      show('learn'); LZ = { sk, ok: 5, miss: 0 };
      finishLesson();
      out.hasButton = !!el('lBuild');
      if (out.hasButton) {
        el('lBuild').click();
        const m = el('suggBookModal');
        out.opened = !!m && m.style.display === 'flex';
        out.title = m ? m.querySelector('.lv-topbar div').textContent.trim() : '';
        out.behind = vView;
        out.rows = m ? m.querySelectorAll('[data-vb]').length : 0;
        if (m) m.style.display = 'none';
      }
    } catch (e) { out.err = e.message; }
    Prog.doneSkills = keepSkills; Prog.extraKnown = keepExtra; bustCaches(); saveProg();
    out.restored = reachable(19, 23, 1);
    return out;
  });
  is(afterLesson.err, null, 'the journey runs without throwing');
  ok(!afterLesson.skipped, 'there is a lesson that teaches the number Psalms needs');
  ok(afterLesson.lockedFirst, '...and with it unlearned, Psalms 23:1 is out of reach');
  ok(afterLesson.hasButton, 'finishing that lesson offers Build a new verse');
  ok(afterLesson.opened, '...and tapping it opens a book straight away, with no hunting');
  is(afterLesson.title, '🌱 Psalms', '...the book whose verses just came within reach');
  is(afterLesson.behind, 'sugg', '...with Suggested behind it, so closing lands somewhere sensible');
  ok(afterLesson.rows > 0, '...and it is not an empty list');
  ok(afterLesson.restored, 'and the fixture is left exactly as it was found');

  describe('the review count matches the work', () => { });
  const srCount = await $(() => {
    const FOUR_H = 4 * 3600000;
    // Two verses waiting for their first look, one genuinely due on its trail.
    const fresh1 = '43:11:35', fresh2 = '45:8:28', due1 = '19:23:1';
    Prog.memorized = [fresh1, fresh2, due1];
    Prog.verseStage = {};
    Prog.verseSR = {
      [fresh1]: { learnedAt: Date.now() - FOUR_H - 60000, step: 1, dueAt: Date.now() + DAY, r0: 0 },
      [fresh2]: { learnedAt: Date.now() - FOUR_H - 60000, step: 1, dueAt: Date.now() + DAY, r0: 0 },
      [due1]:   { learnedAt: Date.now() - 3 * DAY, step: 1, dueAt: Date.now() - 60000, r0: 1 },
    };
    saveProg();

    const out = {
      freshN: newVersesDueCount(),
      dueN: versesDueCount(),
      libraryTotal: reviewDueCount(),
    };
    show('verse'); startMemTest();
    const t = el('verse').innerText;
    out.banner = +(document.querySelector('#verse .srcount') || {}).textContent;
    out.namesNew = /new verse/.test(t);
    out.saysFirst = /the new ones first/.test(t);
    // and the thing that actually comes next must be one of the new verses. There is no phase flag
    // for that leg — it is observable only on screen, which is the honest thing to assert anyway.
    el('srGo').click();
    out.afterBegin = el('verse').innerText;
    out.queueLeft = (MS.newQueue || []).length;
    return out;
  });
  is(srCount.freshN, 2, 'two verses are waiting for their first look');
  is(srCount.dueN, 1, '...and one is due on its trail');
  is(srCount.banner, srCount.libraryTotal,
     'the number on the review screen equals the Due figure on the Library button');
  is(srCount.banner, 3, '...which is all three pieces of work, not two');
  ok(srCount.namesNew, '...and the new verses are named in the list');
  ok(srCount.saysFirst, '...and it says they come first');
  has(srCount.afterBegin, 'First look back', 'and the first thing after Begin really is a new verse');
  is(srCount.queueLeft, 1, '...one of the two, with the other still queued behind it');

  describe('review carries the goal three times, then stops', () => { });
  const cap = await $(() => {
    const K = ['43:11:35', '45:8:28', '19:23:1', '40:5:9', '40:6:33'];
    Prog.memorized = K.slice();
    Prog.verseStage = {}; Prog.goalDay = null; Prog.srGoalDay = null;
    Prog.verseSR = {};
    K.forEach(k => { Prog.verseSR[k] = { learnedAt: Date.now() - 2 * DAY, step: 1, dueAt: Date.now() - 60000, r0: 1 }; });
    saveProg();

    const out = { max: SR_GOAL_MAX, steps: [], leftAsWeGo: [] };
    K.forEach(k => { reviewVerseSR(k); out.steps.push(goalCount()); out.leftAsWeGo.push(srGoalLeft()); });
    out.trailAdvanced = K.filter(k => (Prog.verseSR[k].step || 1) === 2).length;
    out.srUsed = srGoalState().count;

    // New work must still count after the cap — the cap is on review, not on the goal.
    const before = goalCount();
    bumpGoal();
    out.newWorkCounts = goalCount() === before + 1;

    // ...and tomorrow the allowance is fresh
    Prog.srGoalDay = { date: 'not-today', count: SR_GOAL_MAX };
    out.freshTomorrow = srGoalLeft();
    return out;
  });
  is(cap.max, 3, 'review carries the goal three times a day');
  is(cap.steps.join(','), '1,2,3,3,3', '...the fourth and fifth reviews leave the goal where it is');
  is(cap.leftAsWeGo.join(','), '2,1,0,0,0', '...and the allowance counts down to nothing');
  is(cap.trailAdvanced, 5, 'but every verse still moved along its trail — the cap is on the goal, not the review');
  is(cap.srUsed, 3, '...with exactly three of the allowance spent');
  ok(cap.newWorkCounts, 'new work still counts toward the goal after the cap is reached');
  is(cap.freshTomorrow, 3, 'and the allowance is whole again the next day');

  const capSaid = await $(() => {
    openGoalSettings();
    const m = el('goalSetModal');
    const t = m ? m.innerText : '';
    if (m) m.style.display = 'none';
    return { says: /up to\s*3\s*a day/i.test(t.replace(/\s+/g, ' ')), mentions: /Spaced repetition counts toward it/i.test(t) };
  });
  ok(capSaid.mentions, 'the Daily goal screen says review counts toward the goal');
  ok(capSaid.says, '...and that it does so up to three a day');

  describe('claiming a verse from the practice screen', () => { });
  const claim = await $(() => {
    const k = '43:11:35', b = 43, c = 11, v = 35;
    setFeat('w4w', true);
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.stageAsk = {}; Prog.w4wSR = {};
    Prog.w4w = { [k]: { count: 3, times: [Date.now() - 5 * 3600000] } };   // three practices behind them
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } }; Prog.locPast = {};
    saveProg();

    const out = {};
    startWordForWord(b, c, v, () => { show('verse'); });
    out.onEntry = !!el('tfHeart');
    out.label = out.onEntry ? el('tfHeart').textContent.trim() : '';
    // DOCUMENT_POSITION_FOLLOWING === 4: the verse comes after the button
    out.aboveTheVerse = out.onEntry &&
      !!(el('tfHeart').compareDocumentPosition(document.querySelector('.fadeverse')) & 4);

    // ...and it is gone once you are mid-practice
    el('tfNext').click();
    out.midPractice = !!el('tfHeart');
    TF.stage = 0; renderTextFade();

    // decline first — practice must carry on, and the offer at seven must survive
    el('tfHeart').click();
    el('hcNo').click();
    out.afterDecline = { stillPractising: !!el('tfNext'), stage: verseStage(k) };
    Prog.w4w[k].count = W4W_PRACTICE_FOR_POOL; saveProg();
    out.offerSurvives = shouldOfferHeart(k);
    Prog.w4w[k].count = 3; Prog.stageAsk = {}; saveProg();

    // now claim it
    renderTextFade();
    el('tfHeart').click();
    const m = el('heartModal');
    out.modalText = m.innerText.replace(/\s+/g, ' ');
    out.choices = [...m.querySelectorAll('[data-part]')].map(x => x.dataset.part).join(',');
    out.armedBeforePicking = !el('hcGo').disabled;
    document.querySelector('[data-part="w4w"]').click();     // the words only: the station is not being claimed
    out.armedAfterPicking = !el('hcGo').disabled;
    el('hcGo').click();
    out.stage = verseStage(k);
    out.practicesKept = w4wCount(k);
    out.leftPractice = !window.TF;

    // miss the strict test — it must come back with those practices intact
    startW4WTest(b, c, v, () => { });
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    // One wrong word is no longer a failed run: it takes three goes at the SAME word. So this
    // deliberately burns all three, which ends the run there and then.
    put('elephant'); put('zzzzzzzzz'); put('qqqqqqqqq');
    el('wtDone').click();
    out.asked = !!el('demoteModal') && el('demoteModal').style.display === 'flex';
    out.demoteText = out.asked ? el('demoteModal').innerText.replace(/\s+/g, ' ') : '';
    el('dmYes').click();
    out.backTo = verseStage(k);
    out.countAfterFall = w4wCount(k);
    out.stationBack = !!(Prog.verseLoc || {})[k];
    return out;
  });
  ok(claim.onEntry, 'the practice screen offers "I Know By Heart" the moment you open it');
  ok(claim.aboveTheVerse, '...above the verse, not under the button you tap over and over');
  has(claim.label, 'I Know By Heart', '...saying so plainly');
  no(claim.midPractice, '...and stops offering once you are mid-practice, where it would only be noise');
  ok(claim.afterDecline.stillPractising, 'declining leaves you in the practice you came for');
  is(claim.afterDecline.stage, 'loc', '...with the verse where it was');
  ok(claim.offerSurvives, '...and the offer that seven practices earns still arrives later');
  is(claim.choices, 'loc,w4w,both', 'the claim asks which of the two things you already know');
  has(claim.modalText, 'What do you already know', '...rather than only whether you are sure');
  no(claim.armedBeforePicking, '...and will not register anything until one is chosen');
  ok(claim.armedAfterPicking, '...which arms it');
  is(claim.stage, 'heart', 'claiming moves the verse to the strict test');
  is(claim.practicesKept, 3, '...keeping every practice already done');
  ok(claim.leftPractice, '...and leaves the practice screen, because it is tested from here');
  ok(claim.asked, 'missing a word on it asks whether to hand the claim back');
  is(claim.backTo, 'loc', '...and it returns to practice');
  is(claim.countAfterFall, 3, '...with exactly the practices it had before the claim');
  ok(claim.stationBack, '...and its place in the palace returned');

  describe('a typo is not a miss', () => { });
  const typoRule = await $(() => {
    const W = ['shepherd', 'meditate', 'strength'];
    return {
      oneWrong:   isTypo('shepherb', 'shepherd', W),
      swapped:    isTypo('shepehrd', 'shepherd', W),
      extra:      isTypo('shepheerd', 'shepherd', W),
      missing:    isTypo('shepherd'.replace('p', ''), 'shepherd', W),
      exact:      isTypo('shepherd', 'shepherd', W),
      punctuated: isTypo('shepherd,', 'shepherd', W),
      twoWrong:   isTypo('shepharb', 'shepherd', W),
      shortWord:  isTypo('thy', 'the', ['the', 'thy']),
      otherWordOfVerse: isTypo('meditate', 'shepherd', W),
      whollyOther: isTypo('elephant', 'shepherd', W),
      limit: TYPO_LIMIT,
    };
  });
  ok(typoRule.oneWrong, 'one wrong letter is a typo');
  ok(typoRule.swapped, '...so are two letters swapped');
  ok(typoRule.extra, '...an extra letter');
  ok(typoRule.missing, '...and a missing one');
  no(typoRule.exact, 'the right word is not a typo');
  no(typoRule.punctuated, '...nor is the right word with punctuation, which already matches');
  no(typoRule.twoWrong, 'two wrong letters is not a slip of the fingers');
  no(typoRule.shortWord, 'short words are never typos — "thy" and "the" are different words');
  no(typoRule.otherWordOfVerse, 'typing another word OF THIS VERSE is recall, not fingers');
  no(typoRule.whollyOther, '...and a wholly different word is simply wrong');
  is(typoRule.limit, 3, 'three crosses to a word');

  const run = await $(() => {
    const k = '19:23:1', b = 19, c = 23, v = 1;     // "The LORD is my shepherd; I shall not want."
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' }; Prog.w4wSR = {}; saveProg();
    startW4WTest(b, c, v, () => { });
    const put = s => { const i = el('ttIn'); i.value = s; i.dispatchEvent(new Event('input')); };
    const words = TT.words.slice();
    const idxOf = w => words.findIndex(x => normWord(x) === normWord(w));
    const out = { total: words.length };

    // walk up to "shepherd"
    const target = idxOf('shepherd');
    for (let i = 0; i < target; i++) put(words[i]);
    out.atWord = TT.idx === target;

    put('shepherb');                                  // one letter wrong
    out.afterOne = { typos: TT.typos, misses: TT.misses, crosses: (el('ttDisplay').innerHTML.match(/✗/g) || []).length, note: (document.querySelector('.tt-tryagain') || {}).textContent };
    put('shepehrd');                                  // two letters swapped
    out.afterTwo = { typos: TT.typos, misses: TT.misses, crosses: (el('ttDisplay').innerHTML.match(/✗/g) || []).length, note: (document.querySelector('.tt-tryagain') || {}).textContent };
    put('shepherd');                                  // got it — slate wipes
    out.afterRight = { typos: TT.typos, misses: TT.misses, idxMoved: TT.idx === target + 1 };

    // finish clean: two typos must NOT have spoiled the run
    for (let i = TT.idx; i < words.length; i++) put(words[i]);
    const r = w4wsr(k) || {};
    out.cleanDespiteTypos = { cr: r.cr, ok: r.ok };
    out.resultText = el('verse').innerText;
    return out;
  });
  ok(run.atWord, 'the test walks to the long word');
  is(run.afterOne.typos, 1, 'a slip counts a cross');
  is(run.afterOne.misses, 0, '...and no miss');
  is(run.afterOne.crosses, 1, '...one cross on screen');
  has(run.afterOne.note, 'does not count against you', '...saying it does not count');
  is(run.afterTwo.typos, 2, 'a second slip counts a second cross');
  is(run.afterTwo.misses, 0, '...still no miss');
  is(run.afterTwo.crosses, 2, '...two crosses on screen');
  has(run.afterTwo.note, 'One more and we will call this one for more practice', '...and warns what the third does');
  is(run.afterRight.typos, 0, 'getting the word right wipes the crosses — they are per word');
  ok(run.afterRight.idxMoved, '...and moves on');
  is(run.cleanDespiteTypos.cr, 1, 'the run still counts as clean despite two typos');
  is(run.cleanDespiteTypos.ok, 1, '...recorded as a pass');
  has(run.resultText, 'Word for word', '...and says so');

  const three = await $(() => {
    const k = '19:23:1', b = 19, c = 23, v = 1;
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.w4wSR = { [k]: { cr: 4, n: 4, ok: 4, at: 0 } };
    Prog.w4w = { [k]: { count: 2, times: [] } };
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } }; Prog.locPast = {}; saveProg();
    startW4WTest(b, c, v, () => { });
    const put = s => { const i = el('ttIn'); i.value = s; i.dispatchEvent(new Event('input')); };
    const words = TT.words.slice();
    const target = words.findIndex(x => normWord(x) === 'shepherd');
    for (let i = 0; i < target; i++) put(words[i]);
    put('shepherb'); put('shepehrd'); put('shepherc');       // three slips on the one word
    const out = { ended: !document.getElementById('ttIn'), text: el('verse').innerText };
    const r = w4wsr(k) || {};
    out.streakBroken = r.cr === 0;
    out.countedAsTest = r.n === 5;
    out.hasDone = !!el('wtDone');
    out.idxAtEnd = window.TT ? TT.idx : 'TT cleared';
    if (out.hasDone) {
      el('wtDone').click();
      out.offersDemote = !!el('demoteModal') && el('demoteModal').style.display === 'flex';
      if (out.offersDemote) el('dmNo').click();
    }
    return out;
  });
  ok(three.ended, 'a third slip on the same word ends the run there');
  has(three.text, 'more practice', '...saying the verse wants more practice, not that you failed');
  ok(three.streakBroken, '...it counts as a loss, so the clean run resets');
  ok(three.countedAsTest, '...and the attempt is still recorded as a test');
  ok(three.offersDemote, '...and it asks whether to put the verse back in practice');

  describe('three misses: the answer gets the screen', () => { });
  const answer = await $(() => {
    const k = '19:23:1', b = 19, c = 23, v = 1;
    Prog.memorized = [k, '43:11:35']; Prog.verseStage = {}; saveProg();
    const m0 = el('answerModal'); if (m0) m0.style.display = 'none';
    show('verse'); askVerse(k);

    // three wrong answers in a row — a different book each time so it is genuinely wrong
    const wrongGuess = () => { mtSel = { b: 40, c: 5, v: 9 }; el('mtCheck').disabled = false; el('mtCheck').click(); };
    const out = {};
    wrongGuess();
    out.afterOne = { popup: !!(el('answerModal') && el('answerModal').style.display === 'flex'),
                     bar: (el('mtFb') || {}).innerHTML ? true : false };
    wrongGuess();
    out.afterTwo = { popup: !!(el('answerModal') && el('answerModal').style.display === 'flex') };
    wrongGuess();
    const m = el('answerModal');
    out.afterThree = {
      popup: !!m && m.style.display === 'flex',
      barEmpty: !(el('mtFb') || {}).innerHTML,
      text: m ? m.innerText : '',
      ref: m ? (m.querySelector('.ansref') || {}).textContent : '',
      hasVerseText: m ? !!m.querySelector('.anstext') : false,
      verseScrolls: m && m.querySelector('.anstext') ? getComputedStyle(m.querySelector('.anstext')).overflowY : '',
      btn: m ? (m.querySelector('#ansNext') || {}).textContent : '',
    };
    // the button moves the session on and closes the popup
    let moved = false;
    const realNext = window.nextMemVerse;
    el('ansNext').click();
    out.closed = m.style.display === 'none';
    return out;
  });
  no(answer.afterOne.popup, 'one miss does not give the answer away');
  no(answer.afterTwo.popup, '...nor does a second');
  ok(answer.afterThree.popup, 'the third opens the answer on its own screen');
  ok(answer.afterThree.barEmpty, '...and the bottom feedback bar is left empty, not duplicated');
  is(answer.afterThree.ref, 'Psalms 23:1', '...naming the reference');
  ok(answer.afterThree.hasVerseText, '...and showing the verse itself, not only its address');
  has(answer.afterThree.text, 'The LORD is my shepherd', '...the actual words');
  is(answer.afterThree.verseScrolls, 'auto', '...scrolling on its own so a long verse cannot push the button away');
  is(answer.afterThree.btn, 'Next verse →', 'the button that moves you on is right there');
  ok(answer.closed, '...and it closes when you take it');

  describe('every named verse is a door', () => { });
  const reflink = await $(() => {
    const host = document.createElement('div');
    host.innerHTML = 'Stand on John 3:16 today. Also 1 Samuel 17:45 and Song of Solomon 2:1 ' +
                     'and Psalm 23:1, but not John 3:999 or Hobbits 2:3. ' +
                     '<button>Genesis 1:1 in a button</button> ' +
                     '<span data-vb="43:3:16">Romans 8:28 already a row</span>';
    document.querySelector('.phone').appendChild(host);
    linkifyRefs(host);
    const links = [...host.querySelectorAll('[data-ref]')];
    const out = {
      refs: links.map(x => x.dataset.ref).join(' | '),
      labels: links.map(x => x.textContent).join(' | '),
      // things that must NOT be touched
      badChapterLeft: /John 3:999/.test(host.innerText),
      madeUpBookLeft: /Hobbits 2:3/.test(host.innerText),
      insideButton: !host.querySelector('button [data-ref]'),
      insideRow: !host.querySelector('[data-vb] [data-ref]'),
      keyboardable: links.every(x => x.tabIndex === 0 && x.getAttribute('role') === 'button'),
    };
    // running it twice must not double-wrap
    linkifyRefs(host);
    out.stillOne = host.querySelectorAll('[data-ref]').length === links.length;
    out.noNesting = !host.querySelector('[data-ref] [data-ref]');
    host.remove();
    return out;
  });
  is(reflink.refs, '43:3:16 | 9:17:45 | 22:2:1 | 19:23:1', 'plain, numbered and multi-word book names all resolve');
  is(reflink.labels, 'John 3:16 | 1 Samuel 17:45 | Song of Solomon 2:1 | Psalm 23:1',
     '...and the words on screen are left exactly as written, including "Psalm" for Psalms');
  ok(reflink.badChapterLeft, 'a verse that does not exist is left as plain words');
  ok(reflink.madeUpBookLeft, '...and so is something that is not a book at all');
  ok(reflink.insideButton, 'references inside a button are left alone — the button already does something');
  ok(reflink.insideRow, '...as are the ones inside a verse row, for the same reason');
  ok(reflink.keyboardable, 'a linked reference can be reached and fired from a keyboard');
  ok(reflink.stillOne, 'linkifying twice does not wrap anything twice');
  ok(reflink.noNesting, '...and never nests a link inside a link');

  const tapped = await $(async () => {
    const out = {};
    const k = '19:23:1';
    // 1. a verse NOT yet memorized → the wizard, where it can be built or saved
    Prog.memorized = []; Prog.saved = []; saveProg();
    show('verse'); vView = 'hub'; renderVerse();
    const probe = document.createElement('p');
    probe.innerHTML = 'Consider Psalms 23:1 today.';
    el('verse').appendChild(probe);
    linkifyRefs(el('verse'));
    const link = el('verse').querySelector('[data-ref="19:23:1"]');
    out.linkFound = !!link;
    if (link) link.click();
    await new Promise(r => setTimeout(r, 30));
    out.unlearned = { onVerseView: (document.querySelector('.view.active') || {}).id,
                      screen: el('verse').innerText };

    // 2. the same verse once memorized → its own page, to practise
    Prog.memorized = [k]; Prog.verseStage = {}; saveProg();
    show('verse'); vView = 'hub'; renderVerse();
    const probe2 = document.createElement('p');
    probe2.innerHTML = 'Consider Psalms 23:1 today.';
    el('verse').appendChild(probe2);
    linkifyRefs(el('verse'));
    el('verse').querySelector('[data-ref="19:23:1"]').click();
    await new Promise(r => setTimeout(r, 30));
    const t = el('verse').innerText;
    out.learned = { practice: /Learn Word for Word/.test(t), trail: /SPACED REPETITION/i.test(t), ref: /Psalms\s*23:1/.test(t) };
    return out;
  });
  ok(tapped.linkFound, 'a reference written into a rendered screen becomes a link');
  is(tapped.unlearned.onVerseView, 'verse', 'tapping one you have not built opens the verse area');
  has(tapped.unlearned.screen, 'Now picture it', '...in the wizard, where it can be learned or saved');
  ok(tapped.learned.practice, 'tapping one you already know opens its own page instead');
  ok(tapped.learned.trail, '...with its review trail on it');
  ok(tapped.learned.ref, '...for that very verse');

  describe('a chosen picture follows the book everywhere', () => { });
  const chosen = await $(() => {
    const n = 19;                                   // Psalms
    const opts = bookImageOptions(n).filter(w => BOOK_IMG_DRAWN.has(pegWordSlug(w)));
    if (!opts.length) return { skipped: true };
    const pick = opts[0];
    Prog.customBookImg = { [n]: pick };
    Prog.memorized = ['19:23:1']; Prog.verseStage = {}; saveProg();
    const want = bookImgSrc(pick);
    const has = html => html.indexOf(want) >= 0;

    return {
      skipped: false, pick, want,
      // every renderer that draws a book icon
      viaPegImg:        has(pegImg('book', n, bookName(n), false)),
      viaPegImgBig:     has(pegImg('book', n, bookName(n), true)),
      viaBookIcon:      has(bookImageIcon(n, true)),
      onTheLesson:      has(teachCardBody('book', n)),
      onTheBookTable:   (buildBookTable(), has(((el('booksBody')||{}).innerHTML)||'')),
      // and a book with NO choice still gets its drawn icon
      untouched:        pegImg('book', 40, bookName(40), false).indexOf('images/books/40.svg') >= 0,
    };
  });
  ok(!chosen.skipped, 'Psalms has a drawn picture to choose');
  ok(chosen.viaPegImg, 'the chosen picture is what pegImg draws for that book');
  ok(chosen.viaPegImgBig, '...at either size');
  ok(chosen.viaBookIcon, '...and through bookImageIcon, which now shares the one renderer');
  ok(chosen.onTheLesson, '...it is on the lesson');
  ok(chosen.onTheBookTable, '...and in the reference table, which used to show the original');
  ok(chosen.untouched, 'a book you have not chosen a picture for still shows its drawn icon');

  const inTests = await $(async () => {
    const n = 19, k = '19:23:1';
    const opts = bookImageOptions(n).filter(w => BOOK_IMG_DRAWN.has(pegWordSlug(w)));
    Prog.customBookImg = { [n]: opts[0] };
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.verseSR = {}; saveProg();
    const want = bookImgSrc(opts[0]);
    const out = {};
    // the Bible strip in book-image mode
    try { Store.set('vv_bibleview', 'bookimg'); } catch (e) {}
    show('journey'); renderJourney();
    out.bibleStrip = el('journey').innerHTML.indexOf(want) >= 0;
    try { Store.set('vv_bibleview', 'num'); } catch (e) {}
    // the book screen header
    renderBookScreen(n);
    out.bookScreen = el('journey').innerHTML.indexOf(want) >= 0;
    return out;
  });
  ok(inTests.bibleStrip, 'the Bible screen shows it when the strip is set to book images');
  ok(inTests.bookScreen, '...and so does the book\'s own screen');

  describe('hold to speak is out', () => { });
  const mic = await $(() => {
    const [b, c, v] = [19, 23, 1];
    Prog.memorized = []; saveProg();
    openVerseWizard(b, c, v, () => {});
    // walk to the scene-writing step if the wizard exposes it directly
    const anywhere = document.querySelector('.phone').innerHTML;
    return { button: !!document.getElementById('wMic'),
             cssStillThere: anywhere.indexOf('mic-btn') >= 0 ? 'markup' : 'none',
             gone: typeof wireSceneMic === 'undefined' };
  });
  no(mic.button, 'the hold-to-speak button is gone from the scene screen');
  ok(mic.gone, '...and its wiring taken out with it, rather than left pointing at a button that is not there');

  describe('badges: located and by heart are two different achievements', () => { });
  const badges = await $(() => {
    // twelve verses built, three of them claimed and under the strict word-for-word test
    Prog.memorized = ['43:3:16','43:11:35','19:23:1','19:119:11','40:5:9','45:8:28','50:4:13',
                     '20:3:5','23:41:10','58:11:1','19:1:1','62:1:9'];
    Prog.verseStage = { '43:3:16':'heart', '19:23:1':'heart', '50:4:13':'heart' };
    Prog.palaces = []; Prog.badges = []; saveProg();
    const cats = [...new Set(BADGES.map(b => b.cat))];
    const heart = BADGES.filter(b => b.cat === 'Verses by Heart');
    const located = BADGES.filter(b => b.cat === 'Verses Located');
    const palaceNums = BADGES.filter(b => b.cat === 'Memory Palaces').map(b => +(String(b.sub).match(/[0-9]+/) || [0])[0]);
    return {
      firstCat: cats[0],
      oldName: cats.includes('Verses Memorized'),
      rungs: heart.length,
      first: heart[0].n, last: heart[heart.length - 1].n,
      heartEarned: heart.filter(b => b.have()).length,
      locatedEarned: located.filter(b => b.have()).length,
      counts: heartCount() + '/' + Prog.memorized.length,
      nextHeart: (nextHeartBadge() || {}).n,
      nextLocated: (nextBadge() || {}).n,
      palaceTop: Math.max.apply(null, palaceNums),
      stories: BADGES.filter(b => b.cat === 'Bible Stories').length,
      idsUnique: new Set(BADGES.map(b => b.id)).size === BADGES.length,
    };
  });
  is(badges.firstCat, 'Verses by Heart', 'by heart leads the badge list');
  no(badges.oldName, '"Verses Memorized" is gone as a category name');
  is(badges.rungs, 11, 'eleven rungs on the by-heart ladder');
  is(badges.first, 1, '…from the first verse you hold');
  is(badges.last, 250, '…to two hundred and fifty');
  is(badges.counts, '3/12', 'the fixture holds three by heart out of twelve located');
  is(badges.heartEarned, 2, '…earning two by-heart badges');
  is(badges.locatedEarned, 6, '…and six located ones: one profile, two separate counts');
  is(badges.nextHeart, 5, 'the next by-heart rung is named');
  is(badges.nextLocated, 15, '…alongside the next located one');
  ok(badges.palaceTop >= 50, 'palace badges run to fifty');
  ok(badges.stories >= 11, 'the story ladder has rungs along the way to a hundred and fifty');
  ok(badges.idsUnique, 'every badge id is unique, so none quietly overwrites another');

  const parable = await $(() => {
    const b = BADGES.find(x => x.name === 'Every Parable');
    Prog.doneSkills = []; saveProg();
    const before = b.have();
    PARABLE_SECTIONS.forEach(t => { const r = sectionRange(t); for (let i = r[0]; i <= r[1]; i++) Prog.doneSkills.push('story:' + i); });
    saveProg();
    const after = b.have(), n = storiesLearned();
    // the same number of stories, taken from the front of the collection instead
    Prog.doneSkills = []; for (let i = 0; i < n; i++) Prog.doneSkills.push('story:' + i);
    saveProg();
    return { before, after, n, byCount: b.have(), sameCount: storiesLearned() === n };
  });
  no(parable.before, 'Every Parable is unearned with no stories done');
  ok(parable.after, '…and earned by finishing the seven parable sections');
  ok(parable.sameCount, 'the same number of stories done elsewhere in the collection');
  no(parable.byCount, '…does NOT earn it: the badge counts the sections, not the total');

  describe('the peg tiles carry their picture', () => { });
  const thumbs = await $(() => {
    delete Prog.customPeg[7]; saveProg(); buildNumGrid();
    const t = document.querySelector('#numGrid .cellcard[data-n="7"] .pegthumb');
    const dflt = t && t.getAttribute('src');
    Prog.customPeg[7] = pegAlts(7)[0]; saveProg(); buildNumGrid();
    const t2 = document.querySelector('#numGrid .cellcard[data-n="7"] .pegthumb');
    return {
      count: document.querySelectorAll('#numGrid .pegthumb').length,
      dflt,
      chosen: t2 && t2.getAttribute('src'),
      word: Prog.customPeg[7],
    };
  });
  is(thumbs.count, 176, 'every peg tile shows its number image without being opened');
  ok((thumbs.dflt || '').endsWith('pegs/7.svg'), '…the drawn icon for that number by default');
  ok((thumbs.chosen || '').includes('pegs/words/'), '…and a chosen word’s own picture once one is picked');
  await $(() => { delete Prog.customPeg[7]; saveProg(); buildNumGrid(); });

  describe('Build the Book: three pictures, one scene', () => { });
  const devotion = await $(() => {
    const d = BADGES.filter(b => b.cat === 'Daily Devotion');
    Prog.bestDayStreak = 365; saveProg();
    return { n: d.length, top: Math.max.apply(null, d.map(b => +(String(b.sub).match(/[0-9]+/) || [0])[0])),
             allEarned: d.every(b => b.have()) };
  });
  is(devotion.n, 5, 'five Daily Devotion badges');
  is(devotion.top, 365, '...the last of them a full year of days');
  ok(devotion.allEarned, '...and a 365 day streak earns every one of them');

  const bbData = await $(() => {
    const gaps = [], thin = [], dupes = [], shape = [];
    for (let n = 1; n <= 66; n++) {
      const w = bookWordOptions(n), r = numRefOptions(n);
      if (!w.length || !r.length) gaps.push(n);
      if (w.length < 4 || r.length < 3) thin.push(n);
      const wn = w.map(optName), rn = r.map(optName);
      if (new Set(wn).size !== wn.length || new Set(rn).size !== rn.length) dupes.push(n);
      // every option must be a [picture, why] pair, and the picture must be one or two words
      if (w.concat(r).some(o => !optName(o) || !optWhy(o) || optName(o).split(/\s+/).length > 2)) shape.push(n);
    }
    return {
      gaps: gaps.length, thin: thin.length, dupes: dupes.length, shape: shape.length,
      words: Object.keys(BOOK_WORDS).length, refs: Object.keys(NUM_REFS).length,
      // the two examples the lesson itself promises
      nehemiah: bookWordOptions(16).some(o => /knee.high/i.test(optName(o))),
      exodus: bookWordOptions(2).some(o => /exit sign/i.test(optName(o))),
      sixteen: numRefOptions(16).some(o => /licence|license/i.test(optName(o))),
      twelve: numRefOptions(12).some(o => /dozen/i.test(optName(o))),
      fiftyThree: numRefOptions(53).some(o => /NFL/i.test(optName(o))),
      fiftySix: numRefOptions(56).some(o => /signer|declaration/i.test(optName(o) + ' ' + optWhy(o))),
    };
  });
  is(bbData.words, 66, 'a list of name pictures for every book');
  is(bbData.refs, 66, '…and a list of number pictures for every book number');
  is(bbData.gaps, 0, 'no book is left with an empty dropdown');
  is(bbData.thin, 0, '…and none of them is a token list of one or two');
  is(bbData.dupes, 0, 'no option is offered twice in the same list');
  is(bbData.shape, 0, 'every option is one or two words with a line saying how it relates');
  ok(bbData.nehemiah && bbData.exodus, 'the two examples the lesson names are actually offered');
  ok(bbData.sixteen && bbData.twelve, '…as are the number examples, 16 and 12');
  ok(bbData.fiftyThree && bbData.fiftySix, '…and the ones that belong to that number alone: 53 and 56');

  const bbCard = await $(() => {
    delete Prog.bookWord[16]; delete Prog.numRef[16]; saveProg();
    show('verse'); startAdhocLearn(16, true, () => { });
    const rows = [...document.querySelectorAll('#verse [data-rel]')];
    const empty = { sent: el('bbSent').style.display, rows: rows.map(r => r.dataset.rel),
                    ask: rows[0].textContent.replace(/\s+/g, ' ').trim() };
    Prog.bookWord[16] = 'knee-high socks'; Prog.numRef[16] = "a driver's licence"; saveProg();
    renderAdhoc();
    const s = el('bbSent'), txt = el('verse').textContent;
    return {
      empty,
      labels: [...document.querySelectorAll('#verse .bbrow label')].map(l => l.textContent.trim()),
      walkthroughGone: !el('bbScript') && !el('bbMore'),
      // the scene box sits under the sentence it was just asked for, above the way on
      sceneAfterSentence: (() => {
        const box = el('bbSent'), edit = el('tcEdit'), next = el('abNext') || el('lNext');
        if (!box || !edit || !next) return false;
        return (box.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING) > 0
            && (edit.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
      })(),
      doneLabel: (el('abNext') || el('lNext') || {}).textContent,
      decodeGone: !/Use the Major System/i.test(txt),
      shown: s.style.display,
      text: s.textContent.replace(/\s+/g, ' ').trim(),
      coded: !!document.querySelector('#verse [data-rel="peg"]') && !document.querySelector('.bbfixed'),
      chosen: [...document.querySelectorAll('#verse [data-rel]')].map(r => r.classList.contains('set')),
    };
  });
  is(bbCard.empty.sent, 'none', 'no sentence until both pictures are chosen');
  is(bbCard.empty.rows.join(','), 'word,num,peg', 'three relationship rows, each opening its own sheet');
  ok(/Choose a picture for Nehemiah/.test(bbCard.empty.ask), '…and an unchosen one says what it wants');
  is(bbCard.labels.join(' | '), 'Book / Image Relationship | Number / Image Relationship | Major System Image',
     'the rows are named for the relationship they hold');
  ok(bbCard.walkthroughGone, 'the written walkthrough is gone; the film carries it now');
  ok(bbCard.sceneAfterSentence, 'the scene box sits between the scene it asked for and the way on');
  is(bbCard.doneLabel, 'Done', 'a book card says Done, because by then you have built something');
  ok(bbCard.decodeGone, '…and the Major System decode line');
  is(bbCard.shown, 'block', 'choosing both raises the sentence');
  ok(/knee-high socks/.test(bbCard.text), '…naming the picture for the book');
  ok(/driver/.test(bbCard.text), '…the picture for the number');
  ok(/Tissue/.test(bbCard.text), '…and the coded image, all three');
  ok(/far too big to be real\.$/.test(bbCard.text), '…and it ends once the scene is built');
  no(/scene box/i.test(bbCard.text), '…without sending them anywhere else');
  ok(bbCard.coded, 'the third picture is stated as the code\u2019s, chosen the same way as the other two');
  is(bbCard.chosen.join(','), 'true,true,true', 'every row shows what was chosen');

  const bbSheet = await $(() => {
    openRelationPicker(16, 'word', () => { });
    const m = el('relModal');
    const tiles = [...m.querySelectorAll('[data-pick]')].map(t => t.dataset.pick);
    const cols = getComputedStyle(m.querySelector('.pickgrid')).gridTemplateColumns.split(' ').length;
    const open = m.style.display, hasOwn = !!el('relOwn');
    m.querySelector('[data-pick="Royal Cup"]').click();
    return { open, tiles, cols, hasOwn, picked: bookWordOf(16), closed: el('relModal').style.display };
  });
  is(bbSheet.open, 'flex', 'the relationship row opens a sheet, like picking a palace does');
  ok(bbSheet.tiles.includes('Knee Socks'), '…holding the same options');
  is(bbSheet.cols, 2, '…two to a row');
  ok(bbSheet.hasOwn, '…with a way to write your own');
  is(bbSheet.picked, 'Royal Cup', 'tapping one records it');
  is(bbSheet.closed, 'none', '…and closes the sheet');

  const bbOwn = await $(() => {
    Prog.bookWord[16] = 'a kneecap the size of a house'; saveProg();
    renderAdhoc();
    openRelationPicker(16, 'word', () => { });
    const tile = el('relModal').querySelector('[data-pick="a kneecap the size of a house"]');
    const out = { kept: !!tile, on: !!tile && tile.classList.contains('on') };
    el('relClose').click();
    return out;
  });
  ok(bbOwn.kept, 'a word of your own keeps a tile of its own');
  ok(bbOwn.on, '…and shows as the one chosen');

  const tidy = await $(() => ({
    cap: capAfterPunct('a sock stomps the wall. it shatters! then a licence floats down.'),
    capNl: capAfterPunct('one line here\ntwo starts lower'),
    keys: markKeyWords('A knee-high socs waves a drivers licance at the tisue box.',
      ['knee-high socks', "a driver's licence", 'tissue']),
    short: markKeyWords('The sea was calm and the pen was dry.', ['a green pea']),
    none: markKeyWords('Nothing here matches at all.', []),
    stop: markKeyWords('The wall and the box.', ['the wall of a box']),
  }));
  is(tidy.cap, 'A sock stomps the wall. It shatters! Then a licence floats down.', 'capitals land after every full stop');
  is(tidy.capNl, 'One line here\nTwo starts lower', '…and at the start of a new line');
  ok(/KNEE-HIGH/.test(tidy.keys), 'a key image is set in capitals');
  ok(/SOCKS/.test(tidy.keys), '…with a one letter slip corrected on the way');
  ok(/LICENCE/.test(tidy.keys) && /DRIVER/.test(tidy.keys), '…across a phrase of several words');
  ok(/TISSUE/.test(tidy.keys), '…including the coded image');
  is(tidy.short, 'The sea was calm and the pen was dry.', 'a three letter key never rewrites a word that merely rhymes');
  is(tidy.none, 'Nothing here matches at all.', 'no keys means no changes');
  is(tidy.stop, 'The WALL and the BOX.', 'the little words of a phrase are left alone');

  const bbSave = await $(() => {
    const p = migrateProg({ bookWord: { 16: 'knee-high socks' } });
    const m = mergeProg({ bookWord: { 1: 'a genie' }, numRef: {} }, { bookWord: { 2: 'an exit sign' }, numRef: { 2: 'a bicycle' } });
    return {
      migrated: typeof p.bookWord === 'object' && typeof p.numRef === 'object',
      kept: p.bookWord[16],
      merged: (m.bookWord[1] || '') + '|' + (m.bookWord[2] || '') + '|' + (m.numRef[2] || ''),
    };
  });
  ok(bbSave.migrated, 'an older profile gains both stores rather than crashing');
  is(bbSave.kept, 'knee-high socks', '…without losing a choice already made');
  is(bbSave.merged, 'a genie|an exit sign|a bicycle', 'two devices merge their choices instead of one winning');

  const popup = await $(() => {
    openVideoScreen('verse', () => { });
    const m = document.getElementById('videoModal');
    const bar = m.querySelector('.lv-topbar');
    const first = bar.firstElementChild;
    return {
      recorded: Object.keys(VIDEOS).filter(k => VIDEOS[k].src).join(','),
      src: VIDEOS.verse.src,
      closeIsFirst: first.id === 'vsClose',
      closeIsRed: first.className.indexOf('lclose-red') > -1,
      button: document.getElementById('vsDone').textContent,
      noDoneField: Object.keys(VIDEOS).every(k => VIDEOS[k].done === undefined),
      player: !!m.querySelector('video'),
    };
  });
  is(popup.recorded, 'intro,major,major2,verse,palace,book,sr', 'seven films are recorded; only the recall film is still waiting');
  is(popup.src, 'videos/scenes.mp4', 'Building Scenes points at its own file');
  ok(popup.player, '...so its screen draws a player, not the placeholder card');
  ok(popup.closeIsFirst, 'the close button is the first thing in the bar, so it sits top left');
  ok(popup.closeIsRed, '...and it is the red one used on every other screen');
  is(popup.button, 'Got It!', 'one button, one wording, on every film');
  ok(popup.noDoneField, '...and the per-film wording is gone rather than left as dead data');
  await $(() => { document.getElementById('videoModal').style.display = 'none'; });

  describe('the intro film', () => { });
  const film = await $(() => {
    Prog.doneSkills = (Prog.doneSkills || []).filter(s => !/^video:/.test(s));
    Prog.videoOrder = []; saveProg();
    const unit0 = UNITS[0].skills.filter(s => s.kind === 'video').map(s => s.vkey);
    show('learn'); renderPath();
    const introButton = !!document.getElementById('introFilm');
    const majorTile = (document.querySelector('.tile.video small') || {}).textContent;
    const before = videoSeen('intro');
    openVideoScreen('intro', () => { });
    const vd = document.querySelector('#videoModal video');
    const out = {
      unit0First: unit0[0], introButton, majorTile,
      before,
      declared: VIDEOS.intro.src,
      rev: VIDEOS.intro.rev,
      // a film that is recorded but carries no rev keeps its old URL, so the CDN goes on serving the
      // previous cut after a re-export — the exact failure this guards
      revless: Object.entries(VIDEOS).filter(([, v]) => v.src && !v.rev).map(([k]) => k).join(', '),
      element: !!vd,
      // the runtime copies data-vsrc onto src, which is the only place the path is ever real
      wired: vd ? vd.getAttribute('src') : null,
      controls: vd ? vd.hasAttribute('controls') : false,
      inReview: videoReviewList()[0],
      seenYet: videoSeen('intro'),
    };
    document.getElementById('vsDone').click();
    out.afterWatching = videoSeen('intro');
    out.stillListed = videoReviewList().includes('intro');
    return out;
  });
  no(film.unit0First, 'no film sits inside the first unit any more — part one opens with the lesson');
  ok(film.introButton, '…because the intro stands on its own above the first unit');
  no(film.majorTile, '…and no film waits on the path as a tile at all');
  no(film.before, 'a new profile has not watched it');
  is(film.declared, 'videos/intro.mp4', 'the film has a real source, not an empty placeholder');
  ok(film.element, '…so the screen draws a player rather than the "add your video here" card');
  is(film.wired, 'videos/intro.mp4?v=' + film.rev, '…and the source reaches the element, stamped with the cut it wants');
  is(film.revless, '', 'every recorded film names its revision, so a re-cut is never masked by a stale cache');
  ok(film.controls, '…with controls, because a training film has to be scrubbable');
  is(film.inReview, 'intro', 'showing it puts it at the head of Video Review');
  no(film.seenYet, '…before it has been watched');
  ok(film.afterWatching, 'finishing it marks it watched');
  ok(film.stillListed, '…and it stays in Video Review afterwards');

  const placeholders = await $(() => Object.keys(VIDEOS).filter(k => !VIDEOS[k].src));
  is(placeholders.join(','), 'recall', 'the recall film is the last one still waiting on a recording');

  describe('tapping the verse reference in a palace also comes back to that palace', () => { });
  const refBack = await $(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    Prog.palaces = [{ place: 'Grandmother\u2019s House', stations: ['Front door', 'Hallway', 'Kitchen'], sr: {} },
                    { place: 'The Office', stations: ['Desk', 'Window'], sr: {} }];
    Prog.memorized = ['1:1:1'];
    Prog.verseLoc = { '1:1:1': { p: 0, room: 'Hallway' } };
    markVideoSeen('palace'); markVideoSeen('verse');
    saveProg();

    show('palace'); renderMyPalace(0);
    // the reference inside the station is linkified into its own tappable span, and the global
    // handler for those stops the event before the station's own handler can see it
    linkifyRefs(document.getElementById('palace'));
    const ref = document.querySelector('[data-govr] [data-ref]');
    const out = { refFound: !!ref, refText: ref ? ref.textContent : null };
    if (!ref) return out;

    ref.click();
    await wait(60);
    out.wentToVerse = (document.querySelector('.view.active') || {}).id;

    const close = document.querySelector('.view.active .lclose');
    out.closeId = close ? close.id : null;
    if (close) close.click();
    await wait(60);
    out.backView = (document.querySelector('.view.active') || {}).id;
    out.backIsList = !!document.getElementById('palAdd');
    out.backHeading = (document.querySelector('#palace h2') || {}).textContent;
    return out;
  });
  ok(refBack.refFound, 'the verse reference inside a station is its own link');
  is(refBack.refText, 'Genesis 1:1', '...pointing at the verse stored there');
  is(refBack.wentToVerse, 'verse', 'following it opens the verse');
  is(refBack.backView, 'palace', '...and the way out returns to the palace tab');
  no(refBack.backIsList, '...not to the list of every palace');
  is(refBack.backHeading, '\u{1F3DB}\uFE0F Grandmother\u2019s House', '...but to the palace that brought them in');

  describe('signing in on a new device brings everything, not most of it', () => { });
  const carryAll = await $(() => {
    // an account with a value in every field that is plainly not a default
    const cloud = migrateProg(null);
    Object.assign(cloud, {
      memorized: ['1:1:1', '2:2:2'], doneSkills: ['book:1'], talents: 4242,
      dailyGoal: 7, reminders: [{ h: 7, m: 30, on: true }], theme: 'quest', trActive: 'ASV',
      verseStage: { '1:1:1': 'heart' }, w4w: { '1:1:1': { count: 3 } },
      w4wSR: { '1:1:1': { streak: 2 } }, stageAsk: { '1:1:1': 123 },
      weekKey: '2026-W35', weekDays: 4, weekGoalHit: true, hints: 9, phaseMax: 6,
      revPrefs: { ask: 'both' }, ntPrefs: { count: 20 }, freezes: 3, palaceSlots: 2,
    });

    // a device with nothing on it, which is what a new phone and a signed-out one both are
    const fresh = mergeProg(migrateProg(null), cloud);
    const missing = Object.keys(cloud).filter(k =>
      JSON.stringify(cloud[k]) !== JSON.stringify(fresh[k]));

    // and a device that DOES have its own work: the union must still hold
    const mine = migrateProg(null);
    mine.memorized = ['40:6:33']; mine.talents = 10; mine.doneSkills = ['book:9'];
    const both = mergeProg(mine, cloud);

    return { missing, total: Object.keys(cloud).length,
             goal: fresh.dailyGoal, stage: JSON.stringify(fresh.verseStage), trans: fresh.trActive,
             union: (both.memorized || []).slice().sort().join(','),
             unionSkills: (both.doneSkills || []).slice().sort().join(','),
             unionTalents: both.talents };
  });
  is(carryAll.missing.join(', '), '', 'a new device loses nothing at all from the account');
  is(carryAll.goal, 7, '...the daily goal comes with it');
  is(carryAll.stage, '{"1:1:1":"heart"}', '...so does which verses are known by heart');
  is(carryAll.trans, 'ASV', '...and the translation being read');
  is(carryAll.union, '1:1:1,2:2:2,40:6:33', 'a device with its own work still merges rather than replaces');
  is(carryAll.unionSkills, 'book:1,book:9', '...lessons from both sides');
  is(carryAll.unionTalents, 4242, '...and the higher talent count');

  describe('a saved copy that names another account is refused', () => { });
  const tied = await $(async () => {
    const surrounding = JSON.parse(JSON.stringify(Prog));
    const ownerBefore = progOwner();   // this block sets an owner; the blocks after it must not inherit it
    const realReq = Auth._req, realPush = Auth.push;
    const out = {};
    let ROW = null;                       // what the server would hand back

    // stand in for the server: GET returns ROW, PUT records what was sent
    Auth._req = async (path, method) => {
      if (path === '/sync' && method === 'GET') return { progJson: ROW ? JSON.stringify(ROW) : null, srsJson: '{}' };
      return { ok: true };
    };
    Auth.push = async () => { out.pushedOwner = Prog.owner; };

    // signed in as one person, with a row that belongs to somebody else
    Auth._token = 'tok'; Auth.user = { email: 'world@example.com', provider: 'email', verified: true };
    setProgOwner('world@example.com');
    Prog = migrateProg(null); saveProg();
    ROW = { memorized: ['1:1:1', '2:2:2', '43:3:16'], talents: 1500, doneSkills: ['book:1'],
            palaces: [{ place: 'Not Yours', stations: ['Door'], sr: {} }], owner: 'elijah@example.com' };
    await Auth.pull();
    out.refused = { verses: (Prog.memorized || []).length, talents: Prog.talents || 0 };

    // the same row, but it names THIS account: taken
    Prog = migrateProg(null); saveProg();
    ROW = Object.assign({}, ROW, { owner: 'world@example.com' });
    await Auth.pull();
    out.mine = { verses: (Prog.memorized || []).length, talents: Prog.talents || 0 };

    // a row from before ownership was recorded: taken, so nobody loses what they already had
    Prog = migrateProg(null); saveProg();
    ROW = Object.assign({}, ROW); delete ROW.owner;
    await Auth.pull();
    out.legacy = { verses: (Prog.memorized || []).length };

    Auth._req = realReq; Auth.push = realPush;
    Auth._token = null; Auth.user = null;
    setProgOwner(ownerBefore);
    Prog = surrounding; saveProg(); bustCaches(); updateTabLocks();
    return out;
  });
  is(tied.refused.verses, 0, 'a saved copy naming another account hands over no verses');
  is(tied.refused.talents, 0, '...and no talents');
  is(tied.mine.verses, 3, 'the same copy naming this account is taken');
  is(tied.mine.talents, 1500, '...talents and all');
  is(tied.legacy.verses, 3, 'a copy from before ownership was recorded is still taken');

  describe('a search that finds nothing shows the closest verses', () => { });
  const nearMiss = await $(() => {
    const ask = q => {
      const exact = searchVerses(q);
      const r = exact.total ? exact : searchVersesLoose(q);
      return { exact: exact.total, loose: !!r.loose,
               top: (r.hits || []).slice(0, 1).map(h => bookName(h.b) + ' ' + h.c + ':' + h.v)[0] || null,
               fixed: (r.fixed || []).map(f => f[0] + '>' + f[1]).join(','),
               marks: (r.hits || []).length ? verseHitHTML(r.hits[0]) : '' };
    };
    return {
      // the modern wording of a verse the King James phrases differently
      modern: ask('I can do all things through Christ who strengthens me'),
      // a plain misspelling
      typo:   ask('the Lord is my shepard I shall not want'),
      // and one that is simply not in there
      absent: ask('zzzqqq wibblefrap'),
      // an exact hit must never be pushed aside by the loose search
      exact:  ask('lovingkindness'),
    };
  });
  is(nearMiss.modern.exact, 0, 'the modern wording of Philippians 4:13 is in no verse verbatim');
  ok(nearMiss.modern.loose, '...so the closest verses are looked for instead');
  is(nearMiss.modern.top, 'Philippians 4:13', '...and it is the first of them');
  is(nearMiss.typo.top, 'Psalms 23:1', 'a misspelling still finds the verse');
  has(nearMiss.typo.fixed, 'shepard>shepherd', '...and says which word it read differently');
  is(nearMiss.absent.top, null, 'words in no verse and near no word find nothing');
  is(nearMiss.exact.exact, 29, 'a search that works is never handed to the loose one');
  no(nearMiss.exact.loose, '...it stays an exact search');
  // the telling words are marked; the little ones would bury them
  has(nearMiss.typo.marks, '<mark>shepherd</mark>', 'the word that mattered is marked in the result');
  no(/<mark>(the|shall|not)<\/mark>/i.test(nearMiss.typo.marks), '...and the common words are not');

  describe('leaving a flow during its pause does not crash it', () => { });
  const midPause = await $(async () => {
    // The word picker waits 320ms after a right answer so the green can land. Closing or skipping
    // inside that pause clears WP, and the timer used to wake up and read it anyway.
    const out = {};
    Prog.memorized = ['43:3:16']; saveProg();
    const hit = () => { const c = WP.words[WP.idx];
      return [...document.querySelectorAll('[data-w]')].find(x => normWord(x.dataset.w) === normWord(c)); };
    let threw = null;
    try {
      startWordPick(43, 3, 16, () => {});
      await new Promise(r => setTimeout(r, 60));
      out.opened = !!WP;
      if (WP) { const b = hit(); if (b) { b.click(); el('wpClose').click(); } }
      await new Promise(r => setTimeout(r, 420));
      out.closedClean = WP === null;

      startWordPick(43, 3, 16, () => {});
      await new Promise(r => setTimeout(r, 60));
      if (WP) { const b = hit(); if (b) { b.click(); el('wpSkip').click(); } }
      await new Promise(r => setTimeout(r, 420));
      out.skippedClean = true;
    } catch (e) { threw = String(e.message).slice(0, 90); }
    out.threw = threw;
    return out;
  });
  ok(midPause.opened, 'the word picker opens on a verse with words to pick');
  is(midPause.threw, null, 'answering and then leaving inside the pause throws nothing');
  ok(midPause.closedClean, '...the X closes it cleanly');
  ok(midPause.skippedClean, '...and so does Skip');

  describe('nothing a reader can reach throws a blank screen', () => { });
  const hardened = await $(() => {
    const keep = JSON.parse(JSON.stringify(Prog));
    const out = { threw: [] };
    const attempt = (label, fn) => { try { fn(); } catch (e) { out.threw.push(label); } };

    // a palace that is not there any more: a stale reference, a sync that removed one, a restored
    // backup from a device that had fewer
    Prog.palaces = []; Prog.verseLoc = { '1:1:1': { p: 0, room: 'Door' } }; saveProg(); bustCaches();
    attempt('renderMyPalace(0)',       () => renderMyPalace(0));
    attempt('renderMyPalace(99)',      () => renderMyPalace(99));
    attempt('renderPalaceWalk(bad)',   () => renderPalaceWalk('no-such-palace'));
    attempt('startPalaceEdit(0)',      () => startPalaceEdit(0));
    attempt('startLesson(undefined)',  () => startLesson(undefined));
    attempt('startLesson({})',         () => startLesson({}));
    out.landedOnList = !!el('palAdd');           // the list, not a blank screen

    // a location pointing at a building that is gone names no station, and is pruned
    out.nameOfGone = stationName({ p: 0, room: 'Door' });
    renderPalace();
    out.pruned = !(Prog.verseLoc || {})['1:1:1'];
    // one the reader chose themselves is not a building at all, and survives
    Prog.verseLoc = { '2:2:2': { heart: true } }; saveProg();
    renderPalace();
    out.heartKept = !!(Prog.verseLoc || {})['2:2:2'];

    Prog = keep; saveProg(); bustCaches();
    return out;
  });
  is(hardened.threw.join(', '), '', 'a palace or lesson that is not there opens nothing rather than throwing');
  ok(hardened.landedOnList, '...it falls back to the list of palaces');
  is(hardened.nameOfGone, '', 'a room in a building that is gone names no station');
  ok(hardened.pruned, '...and the claim on it is dropped');
  ok(hardened.heartKept, '...while a verse known by heart keeps its location, which is not a building');

  describe('a film never lands on the welcome screen', () => { });
  const filmGuard = await $(async () => {
    const ov = el('obov');
    const out = {};
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== 'video:palace'); saveProg();
    const shut = () => { const m = el('videoModal'); if (m) m.style.display = 'none'; };
    shut();

    // the intro is up: a film queued before it must stand aside
    ov.classList.add('on');
    maybeVideo('palace');
    out.whileIntro = !!(el('videoModal') && el('videoModal').style.display === 'flex');
    out.stillUnseen = !videoSeen('palace');

    // and once it is away, the film is offered as normal
    ov.classList.remove('on');
    maybeVideo('palace');
    out.afterIntro = !!(el('videoModal') && el('videoModal').style.display === 'flex');
    shut();

    // Onboard.active() reads the DOM rather than a reference captured at startup
    out.activeMatchesDom = Onboard.active() === ov.classList.contains('on');
    return out;
  });
  no(filmGuard.whileIntro, 'a film queued before sign out does not open over the welcome screen');
  ok(filmGuard.stillUnseen, '...and is not marked watched by being suppressed');
  ok(filmGuard.afterIntro, '...it plays as normal once the welcome screen is away');
  ok(filmGuard.activeMatchesDom, 'whether the intro is open is read from the screen, not remembered');

  describe('one name, one definition', () => { });
  const dupes = await $(() => {
    // A function defined twice in one scope keeps the last and silently discards the first, so
    // hardening the one somebody happens to find can achieve nothing at all.
    const src = document.documentElement.innerHTML;
    const names = {};
    // TOP-LEVEL only: a helper nested inside one module's closure may share a name with another
    // module's helper quite safely. What cannot stand is two definitions in the one shared scope.
    const re = /(?:^|\n)function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let m; while ((m = re.exec(src))) names[m[1]] = (names[m[1]] || 0) + 1;
    return Object.keys(names).filter(n => names[n] > 1).sort();
  });
  is(dupes.join(', '), '', 'no function is defined twice in the one scope the whole app shares');

  describe('progress belongs to the account that made it', () => { });
  const own = await $(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const surrounding = JSON.parse(JSON.stringify(Prog));
    const out = {};
    // ownership is decided before pull() is reached, so the network is stubbed out entirely rather
    // than left to 401 against the real API and dirty the console
    const realPull = Auth.pull, realPush = Auth.push;
    Auth.pull = async () => {}; Auth.push = async () => {};

    // somebody is signed in, with progress
    Prog.memorized = ['1:1:1', '2:2:2', '43:3:16']; Prog.talents = 900;
    Prog.palaces = [{ place: 'Their House', stations: ['Door'], sr: {} }];
    Prog.onboarded = true; saveProg();
    await Auth._onAuth({ token: 'tok-a', email: 'alice@example.com' });
    out.owner = progOwner();
    out.aliceKept = Prog.memorized.length;

    // signing out leaves nothing of theirs on the device
    await Auth.signOut();
    out.afterOut = { verses: (Prog.memorized || []).length, talents: Prog.talents || 0,
                     palaces: (Prog.palaces || []).filter(Boolean).length,
                     owner: progOwner(), token: !!Store.get('vv_token', null),
                     acct: !!Store.getJSON('vv_acct', null), onboarded: !!Prog.onboarded,
                     intro: Onboard.active() };

    // and somebody else signing in on it inherits none of it
    Prog.memorized = ['1:1:1', '2:2:2']; saveProg();
    setProgOwner('alice@example.com');
    await Auth._onAuth({ token: 'tok-b', email: 'bob@example.com' });
    out.bob = { verses: (Prog.memorized || []).length, owner: progOwner() };

    // work done before ever having an account is the person's own and travels with them
    await Auth.signOut();
    Prog.memorized = ['5:5:5']; Prog.talents = 42; saveProg();
    await Auth._onAuth({ token: 'tok-c', email: 'carol@example.com' });
    out.anon = { verses: (Prog.memorized || []).length, talents: Prog.talents || 0, owner: progOwner() };

    await Auth.signOut();
    Auth.pull = realPull; Auth.push = realPush;
    // signing out raises the welcome overlay by design; put it away so the blocks after this one
    // are not running behind an intro that is nominally open
    { const ov = el('obov'); if (ov) { ov.classList.remove('on'); ov.setAttribute('aria-hidden', 'true'); } }
    Prog = surrounding; saveProg(); bustCaches(); updateTabLocks();
    return out;
  });
  is(own.owner, 'alice@example.com', 'signing in records whose progress the device is holding');
  is(own.aliceKept, 3, '...and does not disturb it');
  is(own.afterOut.verses, 0, 'signing out takes the verses off the device');
  is(own.afterOut.talents, 0, '...and the talents');
  is(own.afterOut.palaces, 0, '...and the palaces');
  is(own.afterOut.owner, '', '...and forgets whose it was');
  no(own.afterOut.token, '...and the token');
  no(own.afterOut.acct, '...and the account record');
  no(own.afterOut.onboarded, '...leaving a profile that has not been onboarded');
  ok(own.afterOut.intro, '...looking at the welcome screen a new arrival gets');
  is(own.bob.verses, 0, 'somebody else signing in on that device inherits nothing');
  is(own.bob.owner, 'bob@example.com', '...and the device now holds theirs');
  is(own.anon.verses, 1, 'work done before having an account travels into the account');
  is(own.anon.talents, 42, '...talents and all');

  describe('the Bible page searches verse text, not just book names', () => { });
  const vsearch = await $(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const keep = curTrans();
    Prog.onboarded = true; saveProg();
    show('journey'); renderJourney();
    el('bibleSearchIn').focus();   // the search box lives on the title line now; there is no magnifier to press
    const inp = el('bibleSearchIn');
    const typed = async text => {
      inp.removeAttribute('readonly'); inp.value = text;
      inp.dispatchEvent(new Event('input'));
      await wait(300);
      const rows = [...document.querySelectorAll('[data-hit]')];
      return { n: rows.length,
               head: (document.querySelector('.bible-hits-head') || {}).textContent || '',
               first: rows[0] ? rows[0].querySelector('b').textContent : null,
               mark: rows[0] ? (rows[0].querySelector('mark') || {}).textContent : null,
               books: [...document.querySelectorAll('.bible-drop-item')].filter(i => i.style.display !== 'none').length };
    };

    const rare = await typed('lovingkindness');
    const short = await typed('lo');
    const nothing = await typed('zzzqqq');
    const capped = await typed('the lord');
    // a query that looks like markup must not be able to spell any
    await typed('god <b>');
    const escaped = !document.getElementById('bibleHits').innerHTML.includes('<b><b>');

    // the search reads whatever translation is being read; a live text has no local copy
    setTranslation('NLT');
    const live = searchVerses('lovingkindness');
    setTranslation(keep);
    return { rare, short, nothing, capped, escaped, live };
  });
  is(vsearch.rare.n, 29, 'a rare word finds every verse that carries it');
  is(vsearch.rare.first, 'Psalms 17:7', '...in Bible order, starting at the first');
  is(vsearch.rare.mark, 'lovingkindness', '...with the words typed marked in place');
  is(vsearch.short.n, 0, 'two letters is not a verse search');
  ok(vsearch.short.books > 0 && vsearch.short.books < 66, '...it is still a book search, though');
  has(vsearch.nothing.head, 'Nothing close to that', 'a word in no verse, and nothing near it, says so');
  is(vsearch.capped.n, 200, 'a common phrase is capped at 200 results');
  has(vsearch.capped.head, 'first 200', '...and says the list is only the first of them');
  ok(vsearch.escaped, 'a query that looks like markup cannot spell any');
  ok(vsearch.live.usedKJV, 'searching while a live text is selected falls back to the KJV');
  is(vsearch.live.total, 29, '...and finds what the KJV holds');

  describe('the onboarding walkthrough seeds each stage and gives progress back', () => { });
  const walkTool = await $(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // this block hands a fake account to the walkthrough and gets that same fake account back, so
    // the state the blocks after this one inherit has to be put back by hand
    const surrounding = JSON.parse(JSON.stringify(Prog));
    // a real account, so the restore has something to prove
    Prog.memorized = ['43:3:16']; Prog.talents = 4242;
    Prog.palaces = [{ place: 'My Real Palace', stations: ['A', 'B'], sr: {} }];
    saveProg();
    const real = { mem: Prog.memorized.length, tal: Prog.talents, pal: Prog.palaces[0].place };

    OnboardWalk.begin();
    const s1 = { knows15: [1, 2, 3, 4, 5].every(n => knownNum(n)), knows40: knownNum(40),
                 tickets: (Prog.scratchWon || []).length, stashed: !!Store.getJSON('vv_walk_backup', null) };

    // skipping lands on the same seed the tester reaches by playing the step
    OnboardWalk.skip();
    OnboardWalk.skip();          // the Bible stage: one verse wins it, so step past to the fifth-verse stage
    const s2 = { memorized: Prog.memorized.length, library: tabWon('verse'),
                 palace: tabWon('palace'), streak: Prog.bestStreak };
    editVerseScene(1, 1, 1, () => {}, () => {});
    s2.pickersCovered = !!document.querySelector('#wPalLock .slock');

    OnboardWalk.skip();
    const s3 = { palace: tabWon('palace'), memorized: Prog.memorized.length,
                 srCovered: (show('verse'), renderVerse(), !!document.querySelector('.versehub .slock')) };

    OnboardWalk.end();
    await wait(80);
    const back = { mem: Prog.memorized.length, tal: Prog.talents,
                   pal: (Prog.palaces[0] || {}).place, stash: !!Store.getJSON('vv_walk_backup', null),
                   active: OnboardWalk.active() };
    Prog = surrounding; saveProg(); bustCaches(); updateTabLocks();
    return { real, s1, s2, s3, back };
  });
  ok(walkTool.s1.knows15, 'stage one starts you knowing books 1 to 5');
  no(walkTool.s1.knows40, '...and not Matthew, which is the one thing left to do');
  is(walkTool.s1.tickets, 0, '...with no ticket won yet');
  ok(walkTool.s1.stashed, '...and your real progress stashed before anything is seeded');
  is(walkTool.s2.memorized, 4, 'the fifth-verse stage hands you four verses');
  ok(walkTool.s2.library, '...with the Library ticket already won');
  no(walkTool.s2.palace, '...and the palace ticket still to earn');
  is(walkTool.s2.streak, 5, '...and the answer streak, so the fifth verse is the only thing left');
  ok(walkTool.s2.pickersCovered, '...and the palace pickers covered on the save screen');
  ok(walkTool.s3.palace, 'the palace stage has the palace ticket won');
  is(walkTool.s3.memorized, 5, '...five verses in, the palace the only thing left');
  ok(walkTool.s3.srCovered, '...and Spaced Repetition still under its foil');
  no(walkTool.back.active, 'ending it stops the walkthrough');
  is(walkTool.back.mem, walkTool.real.mem, '...and hands back your real verses');
  is(walkTool.back.tal, walkTool.real.tal, '...your real talents');
  is(walkTool.back.pal, walkTool.real.pal, '...and your real palaces');
  no(walkTool.back.stash, '...clearing the stash once it has');

  describe('a verse opened from a palace comes back to that palace', () => { });
  const palBack = await $(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    Prog.palaces = [{ place: 'Grandmother\u2019s House', stations: ['Front door', 'Hallway', 'Kitchen'], sr: {} },
                    { place: 'The Office', stations: ['Desk', 'Window'], sr: {} }];
    Prog.memorized = ['1:1:1'];
    Prog.verseLoc = { '1:1:1': { p: 0, room: 'Hallway' } };
    markVideoSeen('palace'); markVideoSeen('verse');
    saveProg();

    show('palace'); renderMyPalace(0);
    const out = { openedOn: (document.querySelector('#palace h2') || {}).textContent };

    document.querySelector('[data-govr]').click();
    await wait(50);
    out.wentToVerse = (document.querySelector('.view.active') || {}).id;
    out.sceneOpen = !!document.getElementById('wClose');

    document.getElementById('wClose').click();
    await wait(50);
    out.backView = (document.querySelector('.view.active') || {}).id;
    out.backIsList = !!document.getElementById('palAdd');
    out.backHeading = (document.querySelector('#palace h2') || {}).textContent;
    return out;
  });
  is(palBack.openedOn, '\u{1F3DB}\uFE0F Grandmother\u2019s House', 'the reader is on one particular palace');
  is(palBack.wentToVerse, 'verse', 'tapping a location that holds a verse opens that verse');
  ok(palBack.sceneOpen, '...on its scene screen');
  is(palBack.backView, 'palace', 'the red X actually leaves the verse');
  no(palBack.backIsList, '...and does not dump the reader on the list of every palace');
  is(palBack.backHeading, '\u{1F3DB}\uFE0F Grandmother\u2019s House', '...it returns to the palace that brought them in');

  describe('the Building the Books film plays before the first book lesson', () => { });
  const bookFilm = await $(() => {
    const foundations = UNITS.find(u => u.name === 'Foundations');
    const first = foundations.skills.filter(s => s.kind === 'book')[0];
    const second = foundations.skills.filter(s => s.kind === 'book')[1];
    Prog.doneSkills = (Prog.doneSkills || []).filter(s => s !== 'video:book');
    Prog.videoOrder = []; saveProg();

    const out = { first: first.label, seenBefore: videoSeen('book') };
    startLesson(first);
    const m = document.getElementById('videoModal');
    out.raised = !!m && m.style.display === 'flex';
    out.title = m ? m.querySelector('.lv-topbar div').textContent : null;
    out.placeholder = !!(m && m.textContent.includes('Add your video here'));
    out.lessonHeldBack = !(LZ && LZ.sk && LZ.sk.id === first.id);

    // finishing it must hand control to the lesson, and must not re-enter the film
    document.getElementById('vsDone').click();
    out.seenAfter = videoSeen('book');
    out.lessonRuns = !!(LZ && LZ.sk && LZ.sk.id === first.id);

    // the next book lesson gets on with it — the callback that re-enters startLesson once
    // recursed forever here, because maybeVideo fires its callback even on an already-seen film
    m.style.display = 'none';
    startLesson(second);
    out.raisedAgain = document.getElementById('videoModal').style.display === 'flex';
    out.secondRuns = !!(LZ && LZ.sk && LZ.sk.id === second.id);
    return out;
  });
  is(bookFilm.first, 'Genesis', 'the first book lesson is Genesis');
  no(bookFilm.seenBefore, '...and a new learner has not seen the film');
  ok(bookFilm.raised, 'opening that lesson raises the film first');
  is(bookFilm.title, 'Building the Books', '...the right one');
  no(bookFilm.placeholder, '...with a real recording behind it, not the "add your video here" card');
  ok(bookFilm.lessonHeldBack, '...and the lesson waits until the film is done');
  ok(bookFilm.seenAfter, 'finishing it marks it watched');
  ok(bookFilm.lessonRuns, '...and hands straight over to the lesson');
  no(bookFilm.raisedAgain, 'the next book lesson does not raise it again');
  ok(bookFilm.secondRuns, '...it simply starts, without recursing through the film');

  describe('translations: located is shared, word for word is not', () => { });
  const trList = await $(() => ({
    ids: TRANSLATIONS.map(t => t.id),
    // what the page actually carries: neither a file to fetch nor a live feed
    withPage: TRANSLATIONS.filter(t => !t.file && !t.api).map(t => t.id),
    onDemand: TRANSLATIONS.filter(t => t.file).map(t => t.id),
    live: TRANSLATIONS.filter(t => t.api).map(t => t.id),
    ready: TRANSLATIONS.filter(t => transReady(t.id)).map(t => t.id),
    everyOneNamed: TRANSLATIONS.every(t => t.name && t.note),
  }));
  is(trList.ids.join(','), 'KJV,ASV,NLT', 'three translations, and no placeholders');
  is(trList.withPage.join(','), 'KJV', 'only the King James loads with the page');
  is(trList.onDemand.join(','), 'ASV', 'the American Standard downloads once, when it is picked');
  is(trList.live.join(','), 'NLT', 'the New Living is read live, so it bundles nothing at all');
  is(trList.ready.join(','), 'KJV,NLT', '…and a live text needs no download to be usable');
  ok(trList.everyOneNamed, 'each one says what it is and when it is from');

  const tile = await $(() => {
    Prog.bibleFam = 'deep'; saveProg();          // the onboarding answer this tile used to show
    Store.set('vv_trans', 'BSB');
    const label = PROF_SUBS['Bible translation']();
    Store.set('vv_trans', 'KJV');
    return { label, back: PROF_SUBS['Bible translation']() };
  });
  is(tile.label, 'BSB', 'the Profile tile names the translation being read');
  is(tile.back, 'KJV', '...and follows it when it changes');

  const split = await $(() => {
    // a profile part way up the KJV ladder
    Prog.memorized = ['43:3:16', '19:23:1', '45:8:28', '50:4:13'];
    applyBuckets(Prog, { KJV: { verseStage: { '43:3:16': 'heart', '19:23:1': 'heart' },
                                w4w: { '45:8:28': { count: 5, times: [] } },
                                w4wSR: { '43:3:16': { cr: 2, n: 4, ok: 3, at: 0 } }, stageAsk: {} } }, 'KJV');
    Store.set('vv_trans', 'KJV'); saveProg();
    const kjv = { located: Prog.memorized.length, hearts: heartCount(), practice: w4wCount('45:8:28'), streak: w4wTestStreak('43:3:16') };

    setTranslation('ASV');
    const asv = { trans: curTrans(), located: Prog.memorized.length, hearts: heartCount(),
                  practice: w4wCount('45:8:28'), streak: w4wTestStreak('43:3:16'), stage: verseStage('43:3:16') };

    // build something up in the ASV
    setVerseStage('43:3:16', 'heart'); w4wRecord('50:4:13'); w4wRecord('50:4:13');
    const asvBuilt = { hearts: heartCount(), practice: w4wCount('50:4:13') };

    setTranslation('KJV');
    const back = { hearts: heartCount(), practice: w4wCount('45:8:28'), streak: w4wTestStreak('43:3:16'),
                   asvPractice: w4wCount('50:4:13') };
    const seenFromHere = { kjv: transHeartCount('KJV'), asv: transHeartCount('ASV'), bsb: transHeartCount('BSB') };
    return { kjv, asv, asvBuilt, back, seenFromHere, stash: Object.keys(Prog.trStash || {}) };
  });
  is(split.kjv.hearts, 2, 'the KJV starts with two verses by heart');
  is(split.asv.trans, 'ASV', 'switching text changes the reader');
  is(split.asv.located, 4, '…and every located verse comes along, because where a verse lives does not change');
  is(split.asv.hearts, 0, '…while by heart starts again at zero');
  is(split.asv.stage, 'loc', '…so a verse held by heart in the KJV is merely located in the ASV');
  is(split.asv.practice, 0, '…and the practice count starts again at zero, not at five');
  is(split.asv.streak, 0, '…as does the strict test record');
  is(split.asvBuilt.hearts, 1, 'the ASV builds its own ladder');
  is(split.asvBuilt.practice, 2, '…and its own practice counts');
  is(split.back.hearts, 2, 'coming back to the KJV finds its two by heart untouched');
  is(split.back.practice, 5, '…its practice count still at five');
  is(split.back.streak, 2, '…and its test record intact');
  is(split.back.asvPractice, 0, '…with nothing of the ASV bleeding into it');
  is(split.seenFromHere.kjv + '/' + split.seenFromHere.asv + '/' + split.seenFromHere.bsb, '2/1/0',
     'the picker can count each ladder without switching to it');
  is(split.stash.join(','), 'ASV', 'only the inactive translations are stashed');

  const trMerge = await $(() => {
    // phone on the KJV, laptop on the ASV: neither ladder may leak into the other
    const phone = migrateProg({ memorized: ['43:3:16'], trActive: 'KJV',
      verseStage: { '43:3:16': 'heart' }, w4w: { '43:3:16': { count: 7, times: [] } } });
    const laptop = migrateProg({ memorized: ['43:3:16'], trActive: 'ASV',
      verseStage: { '43:3:16': 'heart' }, w4w: { '43:3:16': { count: 3, times: [] } } });
    const m = mergeProg(phone, laptop);
    const b = trBuckets(m);
    return { active: m.trActive,
             kjvStage: (b.KJV.verseStage || {})['43:3:16'], asvStage: (b.ASV.verseStage || {})['43:3:16'],
             kjvCount: ((b.KJV.w4w || {})['43:3:16'] || {}).count,
             asvCount: ((b.ASV.w4w || {})['43:3:16'] || {}).count };
  });
  is(trMerge.active, 'KJV', 'a merge keeps this device on the text it was reading');
  is(trMerge.kjvStage, 'heart', 'the KJV ladder survives the merge');
  is(trMerge.asvStage, 'heart', '…and so does the ASV one, separately');
  is(trMerge.kjvCount, 7, 'each translation keeps its own practice count');
  is(trMerge.asvCount, 3, '…rather than one overwriting the other');

  const oldProfile = await $(() => {
    const p = migrateProg({ verseStage: { '43:3:16': 'w4w' }, w4w: { '43:3:16': { count: 4, times: [] } } });
    return { active: p.trActive, stash: JSON.stringify(p.trStash), stage: p.verseStage['43:3:16'] };
  });
  is(oldProfile.active, 'KJV', 'a profile from before the split belongs to the text it was read in');
  is(oldProfile.stash, '{}', '…with nothing stashed under any other name');
  is(oldProfile.stage, 'heart', '…and the old middle rung still promotes rather than resetting');

  describe('every lesson keeps its film one tap away', () => { });
  const revBtn = await $(() => {
    const seen = s => { Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== 'video:' + s); };
    const btnIn = view => { const b = document.querySelector('#' + view + ' [data-revlesson]'); return b ? b.dataset.revlesson : null; };
    const out = {};

    show('palace'); renderPalace();
    out.palace = btnIn('palace');

    // a sound lesson and a book lesson, straight through startLesson
    // Part one opens the first sound lesson and Building the Books opens the first book lesson.
    // Neither is what this block is testing, and an unseen one would take the screen first.
    ['major', 'major2', 'book'].forEach(markVideoSeen);
    const sound = UNITS[0].skills.find(s => s.kind === 'sound');
    startLesson(sound);
    out.sound = btnIn('learn');
    const book = UNITS.flatMap(U => U.skills).find(s => s.kind === 'book');
    startLesson(book);
    out.book = btnIn('learn');

    // the verse screen, on a verse already memorised so the wizard is not in the way
    markVideoSeen('verse');
    Prog.memorized = ['43:3:16']; saveProg();
    openVerseWizard(43, 3, 16, () => { });
    out.verse = btnIn('verse');
    // the four navigation buttons are stacked, which is what frees the corner
    const cluster = document.querySelector('#verse .lv-navcluster');
    out.pairs = cluster ? cluster.querySelectorAll('.lv-navpair').length : 0;
    out.stacked = cluster ? getComputedStyle(cluster).flexDirection : '';
    out.navButtons = cluster ? cluster.querySelectorAll('.lv-navbtn').length : 0;

    seen('sr');
    return out;
  });
  is(revBtn.palace, 'palace', 'the Memory Palace screen offers its own film');
  is(revBtn.sound, 'major', 'a Major System lesson offers the Major System film');
  is(revBtn.book, 'book', 'a book lesson offers Build the Book');
  is(revBtn.verse, 'verse', 'the verse screen offers Building the Scene');
  is(revBtn.pairs, 1, 'the verse bar carries one pair of navigation buttons');
  is(revBtn.navButtons, 2, '…previous verse and next verse, with swiping doing the same job');
  is(revBtn.stacked, 'column', '…stacked rather than strung across, which frees the corner');

  const firstTime = await $(() => {
    const clear = () => { Prog.doneSkills = (Prog.doneSkills || []).filter(x => !/^video:/.test(x)); saveProg(); };
    const open = () => { const m = document.getElementById('videoModal'); return m && m.style.display === 'flex' ? m.innerText : ''; };
    const shut = () => { const m = document.getElementById('videoModal'); if (m) m.style.display = 'none'; };
    const out = {};

    clear(); show('palace');

    clear(); Prog.memorized = []; saveProg();
    openVerseWizard(40, 6, 33, () => { });
    out.verseFirst = /Building Scenes/i.test(open()); shut();

    // second time round, straight through
    markVideoSeen('verse');
    openVerseWizard(40, 6, 33, () => { });
    out.verseSecond = open() === '';
    return out;
  });
  // The palace film is scheduled on a timer when the tab paints. Waited for rather than slept
  // through: a fixed pause races the timer and fails on a slow machine for no reason.
  await page.waitForFunction(() => { const m = document.getElementById("videoModal"); return m && m.style.display === "flex"; }, null, { timeout: 4000 }).catch(() => {});
  const palaceFilm = await $(() => {
    const m = document.getElementById('videoModal');
    const shown = m && m.style.display === 'flex' ? m.innerText : '';
    const seen = videoSeen('palace');
    if (m) m.style.display = 'none';
    return { shown, seen };
  });
  ok(/Memory Palace/i.test(palaceFilm.shown), 'walking into the Memory Palace plays its film the first time');
  no(palaceFilm.seen, '…and it is only marked watched once it is closed');
  ok(firstTime.verseFirst, 'sitting down to a verse plays Building the Scene the first time');
  ok(firstTime.verseSecond, '…and never interrupts again');

  const gold = await $(() => {
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => !/^video:/.test(x)); saveProg();
    show('learn'); renderPath();
    const intro = () => document.getElementById('introFilm');
    const tiles = () => document.querySelectorAll('#learn .tile.video').length;
    const before = { intro: intro().className, tiles: tiles() };
    markVideoSeen('intro'); markVideoSeen('major'); renderPath();
    return { before, after: { intro: intro().className, tiles: tiles() } };
  });
  has(gold.before.intro, 'blue', 'Start here is blue until it has been watched');
  no(/\bblue\b/.test(gold.after.intro), 'watching it drops the blue, which leaves it gold');
  is(gold.before.tiles, 0, 'no film sits on the path waiting to be chosen');
  is(gold.after.tiles, 0, '…and watching one does not put a tile there either');

  describe('the New Living Translation is read live', () => { });
  const live = await $(() => {
    const t = TRANSLATIONS.find(x => x.id === 'NLT');
    setTranslation('NLT');
    const before = kjvText(43, 3, 16);
    // pretend the server answered
    _apiCh['NLT:43:3'] = []; _apiCh['NLT:43:3'][15] = 'For this is how God loved the world.';
    const after = kjvText(43, 3, 16);
    const missing = kjvText(19, 23, 1);            // a chapter we have not been given
    setTranslation('KJV');
    return { api: t.api, bundled: !t.file, before, after, missing, kjvBack: kjvText(43, 3, 16) };
  });
  is(live.api, 'nlt', 'the NLT is marked as a live text');
  ok(live.bundled, '…and ships no file with the app');
  has(live.before, 'whosoever believeth', 'a chapter not yet fetched reads King James rather than blank');
  is(live.after, 'For this is how God loved the world.', '…and the fetched chapter takes over once it lands');
  has(live.missing, 'my shepherd', 'a chapter still on its way falls back the same way');
  has(live.kjvBack, 'whosoever believeth', 'switching back leaves the King James untouched');

  describe('picking a palace and a spot', () => { });
  const picker = await $(() => {
    // a palace with twelve spots, the first four already holding verses
    const spots = ['Front door','Hall','Kitchen','Sink','Fridge','Table','Sofa','TV','Stairs','Bed','Desk','Window'];
    Prog.palaces = [{ place: 'My House', stations: spots }];
    Prog.memorized = ['19:23:1','19:23:2','19:23:3','19:23:4'];
    Prog.verseLoc = { '19:23:1':{p:0,room:'Front door'}, '19:23:2':{p:0,room:'Hall'},
                      '19:23:3':{p:0,room:'Kitchen'}, '19:23:4':{p:0,room:'Sink'} };
    Prog.customScene = {}; delete Prog.verseLoc['40:6:33'];
    markVideoSeen('verse');            // otherwise the film opens instead of the wizard
    saveProg();
    openVerseWizard(40, 6, 33, () => { });
    el('wToScene').click();
    const onScreen = { boxes: !!el('wPalaceBtn') && !!el('wRoomBtn'),
                       gridsInline: !!document.querySelector('#verse #psGrid'),
                       asks: el('wPalaceBtn').textContent.replace(/\s+/g, ' ').trim() };
    el('wPalaceBtn').click();
    const palaceTiles = document.querySelectorAll('#psGrid [data-p]').length;
    // the sheet opens with "Known by heart", which is not a palace and has no spots to report
    const palaceSub = document.querySelector('#psGrid [data-p]:not([data-p="heart"]) .pks').textContent;
    document.querySelector('#psGrid [data-p="0"]').click();
    el('wRoomBtn').click();
    const grid = el('psGrid'), box = el('psScroll');
    const tiles = [...grid.querySelectorAll('.pickbtn')];
    return {
      onScreen, palaceTiles, palaceSub,
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      spots: tiles.length,
      taken: tiles.filter(t => t.dataset.free === '0').map(t => t.dataset.room),
    };
  });
  ok(picker.onScreen.boxes, 'the palace and the spot are boxes on the screen');
  no(picker.onScreen.gridsInline, '…with no grid sitting open on the screen itself');
  ok(/My House/.test(picker.onScreen.asks), '…and a lone palace is already chosen, since there is no choice to make');
  is(picker.palaceTiles, 2, 'the sheet holds a tile for every palace, after the one for a known address');
  is(picker.palaceSub, '🔴 8 free of 12', '…saying how much room is left in it, and colouring it red because it is half filled');
  is(picker.cols, 2, 'the spots are laid out two to a row');
  is(picker.spots, 12, '…all twelve of them');
  is(picker.taken.join(','), 'Front door,Hall,Kitchen,Sink', 'the spots already holding a verse are marked');


  await page.waitForTimeout(250);   // the scroll and the marker land on the next frame
  const scrolled = await $(() => {
    const box = el('psScroll'), next = el('psGrid').querySelector('.pickbtn.next');
    return { scrollable: box.scrollHeight > box.clientHeight,
             room: next && next.dataset.room, top: box.scrollTop,
             scrollable: box.scrollHeight > box.clientHeight,
             // measured for real, not with the same offsetTop on both sides: that is exactly how a
             // list that scrolled to the wrong end still looked correct
             inView: !!next && (() => { const t = next.getBoundingClientRect(), r = box.getBoundingClientRect();
               return t.top >= r.top - 1 && t.bottom <= r.bottom + 1; })() };
  });
  ok(scrolled.scrollable, 'twelve spots do need scrolling, which is why any of this matters');
  is(scrolled.room, 'Fridge', 'the first free spot is the one pointed at');
  ok(scrolled.top > 0, 'an established palace does not open back at the front door');
  ok(scrolled.inView, '…it opens on the next free spot');

  const spotPicked = await $(() => {
    document.querySelector('#psGrid [data-room="Fridge"]').click();
    return { value: el('wRoom').value, sheetClosed: el('pickSheet').style.display === 'none',
             onBox: el('wRoomBtn').textContent.replace(/\s+/g, ' ').trim() };
  });
  is(spotPicked.value, 'Fridge', 'tapping a spot records it');
  ok(spotPicked.sheetClosed, '…and closes the sheet, because the choice is made');
  ok(/Fridge/.test(spotPicked.onBox), '…with the box now showing it');

  const pulse = await $(() => {
    show('palace'); renderPalace();
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const rule = (css.match(/\.revlesson\{[^}]*\}/) || [''])[0];
    return {
      present: !!document.querySelector('#palace .revlesson'),
      beats: /animation:\s*revbeat[^;}]*infinite/.test(rule),
      keyframes: /@keyframes revbeat\{/.test(css),
      // it is a heart now, not a slab: no box of its own, gold ink, and a heart drawn inside it
      stands: /background:none/.test(rule) && /color:var\(--gold-ink\)/.test(rule),
      heart: !!document.querySelector('#palace .revlesson svg path[fill="var(--gold)"]'),
      calm: /prefers-reduced-motion[^{]*\{\s*\.revlesson\{animation:none\}/.test(css),
    };
  });
  ok(pulse.present, 'the Memory Palace carries a Review Lesson button');
  ok(pulse.beats, '…which beats rather than sitting there, and keeps beating');
  ok(pulse.keyframes, '…with a double thump and a rest, not a throb');
  ok(pulse.stands, '…and carries no slab of its own, because the heart is the shape');
  ok(pulse.heart, '…which is a golden heart, the thing the beat was always doing');
  ok(pulse.calm, '…unless the reader has asked for less motion');

  const filmDuringTest = await $(() => {
    // this block is about the Review Lesson corner, not the first-run film, so it starts from a
    // learner who has already watched it — otherwise startLesson raises the film instead
    markVideoSeen('book');
    const book = UNITS.flatMap(U => U.skills).find(s => s.kind === 'book');
    startLesson(book);
    const onTeach = !!document.querySelector('#learn [data-revlesson]');
    // walk to the first question
    let guard = 0;
    while (LZ.steps[LZ.i] && LZ.steps[LZ.i].type === 'teach' && guard++ < 20) { LZ.i++; renderStep(); }
    const onTest = !!document.querySelector('#learn [data-revlesson]');
    const type = LZ.steps[LZ.i] && LZ.steps[LZ.i].type;
    const sound = UNITS[0].skills.find(s => s.kind === 'sound');
    startLesson(sound);
    const soundTeach = !!document.querySelector('#learn [data-revlesson]');
    guard = 0;
    while (LZ.steps[LZ.i] && LZ.steps[LZ.i].type === 'teach' && guard++ < 20) { LZ.i++; renderStep(); }
    const soundTest = !!document.querySelector('#learn [data-revlesson]');
    return { onTeach, onTest, type, soundTeach, soundTest };
  });
  ok(filmDuringTest.onTeach, 'a book card being taught offers its film');
  no(filmDuringTest.onTest, '…and the questions that follow do not');
  no(filmDuringTest.type === 'teach', '…which is checked on a real question, not another teach step');
  ok(filmDuringTest.soundTeach, 'the same holds for a Major System lesson');
  no(filmDuringTest.soundTest, '…film while teaching, nothing while testing');

  describe('the scoreboard counts open', () => { });
  const counts = await $(() => {
    Prog.memorized = ['43:3:16', '19:23:1', '45:8:28'];
    Prog.verseStage = { '43:3:16': 'heart', '19:23:1': 'heart' };
    Prog.verseSR = { '45:8:28': { step: SR_TRAIL.length, learnedAt: 0, dueAt: 0, r0: 1 } };
    saveProg();
    show('verse'); vView = 'mem'; renderVerse();
    const cells = [...document.querySelectorAll('#verse .statcell')];
    const out = {
      n: cells.length,
      keys: cells.map(c => c.dataset.score),
      labels: cells.map(c => c.querySelector('.st-l').textContent),
      areButtons: cells.every(c => c.tagName === 'BUTTON'),
      gone: !/Day streak|Books|Clean runs/.test(
        [...document.querySelectorAll('#verse .statgrid')].map(g => g.textContent).join(' ')),
      medalsKept: /of the 66 books/.test(document.querySelector('#verse .medals').textContent),
    };
    cells.find(c => c.dataset.score === 'heart').click();
    const m = el('scoreListModal');
    out.opened = m.style.display;
    out.rows = m.querySelectorAll('[data-vb]').length;
    out.title = m.querySelector('.lv-topbar div').textContent.trim();
    el('slDone').click();
    return out;
  });
  is(counts.n, 3, 'three counts, not six');
  is(counts.keys.join(','), 'heart,sealed,due', '…by heart, sealed and due today');
  is(counts.labels.join(','), 'By heart,Sealed,Due today', '…labelled plainly');
  ok(counts.areButtons, '…and every one of them is a button');
  ok(counts.gone, 'day streak, books and clean runs are off the grid');
  ok(counts.medalsKept, '…but kept below, where a number with no list belongs');
  is(counts.opened, 'flex', 'tapping a count opens the verses behind it');
  is(counts.rows, 2, '…all of them, and only them');
  ok(/Known by heart/.test(counts.title), '…under the name of the count that was tapped');

  const streakLabel = await $(() => {
    Prog.dayStreak = 4; saveProg();
    const on = libStatusHTML();
    Prog.dayStreak = 0; saveProg();
    return { on, off: libStatusHTML() };
  });
  ok(/day streak/i.test(streakLabel.on), 'the goal button says the flame is a day streak');
  ok(/4/.test(streakLabel.on), '…alongside the number');
  ok(/day streak/i.test(streakLabel.off), '…and says it at zero too, so it can be started');

  const palColours = await $(() => {
    Prog.palaces = [
      { place: 'Full House', stations: ['a', 'b'] },        // every spot taken
      { place: 'Untouched',  stations: ['x', 'y', 'z'] },   // nothing in it
      { place: 'Half Done',  stations: ['p', 'q'] },        // one of two
    ];
    Prog.memorized = ['19:23:1', '19:23:2', '19:23:3'];
    Prog.verseLoc = { '19:23:1': { p: 0, room: 'a' }, '19:23:2': { p: 0, room: 'b' },
                      '19:23:3': { p: 2, room: 'p' } };
    Prog.customScene = {}; delete Prog.verseLoc['40:6:33'];
    markVideoSeen('verse'); saveProg();
    openVerseWizard(40, 6, 33, () => { });
    el('wToScene').click();
    el('wPalaceBtn').click();
    const all = [...document.querySelectorAll('#psGrid [data-p]')];
    const tiles = all.filter(t => t.dataset.p !== 'heart');   // a known address is not a building
    const out = {
      firstIsHeart: all[0] && all[0].dataset.p === 'heart',
      heartSays: all[0] ? all[0].querySelector('.pkt').textContent : '',
      order: tiles.map(t => t.querySelector('.pkt').textContent),
      fills: tiles.map(t => t.dataset.fill),
      classes: tiles.map(t => /pal-(full|partial|empty)/.exec(t.className)[0]),
      says: tiles.map(t => t.querySelector('.pks').textContent),
    };
    el('psClose').click();
    // and the Memory Palace page paints the same three states
    show('palace'); renderPalace();
    out.pageClasses = [...document.querySelectorAll('#palace [data-mine]')]
      .map(c => /pal-(full|partial|empty)/.exec(c.className)[0]);
    return out;
  });
  ok(palColours.firstIsHeart, 'the picker offers "Known by heart" first — a verse whose address you hold needs no building');
  has(palColours.heartSays, 'Location Known By Heart', '…by that name');
  is(palColours.order.join(' → '), 'Half Done → Untouched → Full House',
     'the picker sorts the palaces themselves by where a verse can actually go');
  is(palColours.fills.join(','), 'partial,empty,full', '…half filled, then untouched, then full');
  is(palColours.classes.join(','), 'pal-partial,pal-empty,pal-full',
     'red, blue and green, the Memory Palace colours');
  ok(/🔴/.test(palColours.says[0]) && /🔵/.test(palColours.says[1]) && /🟢/.test(palColours.says[2]),
     '…and each one says which it is, not only shows it');
  is([...palColours.pageClasses].sort().join(','), 'pal-empty,pal-full,pal-partial',
     'the Memory Palace page paints the same three states, empty included');


  const phase2 = await $(() => {
    const u = UNITS.find(x => /^Phase 2:/.test(x.name));
    return { name: u.name, order: u.skills.filter(s => s.kind === 'book').map(s => s.items[0]) };
  });
  is(phase2.order.join(','), '41,42,43,6,7,8',
     'Phase 2 finishes the Gospels first, then turns to Joshua, Judges and Ruth');
  ok(/Mark–John \+ Joshua–Ruth/.test(phase2.name), '…and its name says so');

  const cascade = await $(() => {
    Prog.scratchWon = ['verse', 'palace']; saveProg();
    updateTabLocks(); syncTabOrder(false);
    const bar = document.querySelector('.tabbar');
    const order = () => [...bar.children].map(b => b.dataset.tab);
    const out = { before: order(), fn: typeof bibleTakesItsPlace === 'function' };
    // the cascade moves these three, right to left, each into the slot the one before it left
    bibleTakesItsPlace('📕', () => { });
    out.dom = order();                       // the DOM is reordered up front…
    const bible = bar.querySelector('[data-tab="journey"]');
    out.hidden = bible.style.visibility;     // …but the Bible is not shown until the end
    const held = ['palace', 'verse', 'learn'].map(t => bar.querySelector('[data-tab="' + t + '"]').style.transform);
    out.held = held.every(t => /translateX/.test(t));
    out.delays = ['palace', 'verse', 'learn'].map(t => bar.querySelector('[data-tab="' + t + '"]').style.transition);
    return out;
  });
  is(cascade.before.join(','), 'learn,verse,palace,journey,stories', 'the Bible starts in the fourth slot');
  ok(cascade.fn, 'winning it runs a cascade of its own');
  is(cascade.dom.join(','), 'journey,learn,verse,palace,stories', '…which puts it at the front');
  is(cascade.hidden, 'hidden', '…while keeping it out of sight until the others have moved');
  ok(cascade.held, 'the three to its left are pinned where they were, so nothing jumps');

  await page.waitForTimeout(60);
  const staggered = await $(() => {
    const bar = document.querySelector('.tabbar');
    return ['palace', 'verse', 'learn'].map(t => {
      const d = bar.querySelector('[data-tab="' + t + '"]').style.transition;
      // the browser normalises the shorthand, and the cubic-bezier has commas in it, so take the
      // LAST duration in the string: that is the delay
      const m = d.match(/(\d+)ms/g);
      // a zero delay is dropped by the browser, so one duration means the delay is 0
      return m ? (m.length > 1 ? +m[m.length - 1].replace('ms', '') : 0) : -1;
    });
  });
  is(staggered.join(','), '0,240,480', 'palace goes first, then verse, then learn, one at a time');

  describe('two small edges', () => { });
  const noChip = await $(() => {
    const sound = UNITS[0].skills.find(x => x.kind === 'sound');
    startLesson(sound);
    // walk to a step marked as a revisit, if the lesson has one
    let guard = 0, sawReview = false;
    while (guard++ < 40) {
      if (LZ.steps[LZ.i] && LZ.steps[LZ.i].review) { sawReview = true; break; }
      if (LZ.i >= LZ.steps.length - 1) break;
      LZ.i++; renderStep();
    }
    renderStep();
    const txt = el('learn').innerText;
    return { chip: /quick review/i.test(txt), sawReview, anyInSource: false };
  });
  no(noChip.chip, 'no quick review chip at the top of a test');

  const ownWord = await $(() => {
    delete Prog.bookWord[16]; saveProg();
    markVideoSeen('verse');
    show('verse'); startAdhocLearn(16, true, () => { });
    openRelationPicker(16, 'word', () => { });
    el('relOwn').click();
    const m = el('editModal');
    const out = {
      sheetClosed: el('relModal').style.display === 'none',
      editorOpen: !!m && m.style.display === 'flex',
      isTextarea: !!(m && m.querySelector('textarea.ed-ta')),
      title: m ? (m.querySelector('.ed-head h2') || {}).textContent : '',
      hint: m ? (m.querySelector('.hint') || {}).textContent : '',
      hasTrash: !!(m && el('edTrash')),
    };
    el('edTa').value = 'a kneecap';
    el('edSave').click();
    out.saved = bookWordOf(16);
    return out;
  });
  ok(ownWord.sheetClosed, 'writing your own closes the sheet behind it');
  ok(ownWord.editorOpen, '…and opens the app\u2019s own editor, not the browser\u2019s prompt');
  ok(ownWord.isTextarea, '…the same box the scene is written in');
  ok(/My picture for Nehemiah/.test(ownWord.title), '…titled for what it is asking');
  ok(/sound like the name/.test(ownWord.hint), '…with a line on what makes a good one');
  ok(ownWord.hasTrash, '…and the same way to clear it');
  is(ownWord.saved, 'A kneecap', 'what is typed is kept, with its capital fixed on the way');

  const ownNumber = await $(() => {
    delete Prog.numRef[16]; saveProg();
    openRelationPicker(16, 'num', () => { });
    el('relOwn').click();
    const hint = (el('editModal').querySelector('.hint') || {}).textContent;
    el('edCancel').click();
    return { hint, untouched: numRefOf(16) };
  });
  ok(/driver/.test(ownNumber.hint), 'the number side asks for a number picture, and gives an example');
  is(ownNumber.untouched, '', '…and cancelling leaves it unset');

  describe('read it back before you go', () => { });
  const kept = await $(() => {
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Sink', 'Fridge', 'Table'], learnedAt: Date.now(), step: 1 }];
    Prog.memorized = []; Prog.customScene = {}; Prog.verseLoc = {}; Prog.badges = [];
    // an earlier block left extraKnown holding other books, and an unreachable verse renders the
    // 'learn these numbers first' state instead of the wizard
    Prog.extraKnown = [40, 6, 33]; Prog.dailyGoal = 1; markVideoSeen('verse'); saveProg(); bustCaches();
    let left = false;
    // stale flashes from earlier blocks linger, so clear the field before measuring this one
    document.querySelectorAll('.goalflash').forEach(x => x.remove());
    openVerseWizard(40, 6, 33, () => { left = true; vView = 'hub'; show('verse'); renderVerse(); });
    el('wToScene').click();
    el('wScene').value = 'A giant ROSE crashes onto a plate of SUSHI.';
    el('wRoomBtn').click(); document.querySelector('#psGrid [data-room="Fridge"]').click();
    el('wDone').click();
    const txt = el('verse').innerText;
    return {
      leftAtOnce: left,
      phase: wPhase,
      memorized: Prog.memorized.includes('40:6:33'),
      ref: /Matthew/.test(txt) && /6:33/.test(txt),
      words: /But seek ye first the kingdom of God/.test(txt),
      pictures: document.querySelectorAll('#verse .lv-triple .lv-cell').length,
      place: /My Kitchen/.test(txt) && /Fridge/.test(txt),
      scene: /crashes onto a plate/.test(txt),
      trail: /D0 today/.test(txt),
      leaveBtn: (el('wKeptDone') || {}).textContent,
      editBtn: !!el('wKeptEdit'),
      // and nothing is covering it
      goalFlash: !!document.querySelector('.goalflash'),
      badgeUp: !!(el('badgeModal') && el('badgeModal').style.display === 'flex'),
      cheerHeld: typeof wKeptCheer === 'function',
    };
  });
  no(kept.leftAtOnce, 'saving a new verse does not throw you back to the list');
  is(kept.phase, 'kept', '…it stops on the verse you just built');
  ok(kept.memorized, '…which is kept all the same');
  ok(kept.ref, 'the address is there');
  ok(kept.words, '…the words');
  is(kept.pictures, 3, '…all three pictures');
  ok(kept.place, '…where it lives');
  ok(kept.scene, '…and the scene that was written');
  ok(kept.trail, '…with what happens to it next');
  ok(/Done/.test(kept.leaveBtn), 'there is a button at the foot to leave by');
  ok(kept.editBtn, '…and one to go back and change something');
  no(kept.goalFlash, 'the goal flash is not covering it');
  no(kept.badgeUp, '…nor a badge card');
  ok(kept.cheerHeld, '…because both are being held');

  const letOff = await $(() => {
    document.querySelectorAll('.goalflash').forEach(x => x.remove());
    el('wKeptDone').click();
    return { held: wKeptCheer, onList: !!document.querySelector('#verse .versehub') };
  });
  is(letOff.held, null, 'leaving lets the applause go');
  ok(letOff.onList, '…and lands back on the Library');
  // whether a flash is due depends on today's goal, which other blocks have already moved. What is
  // worth pinning is the contract: held back when asked, and nothing shown until it is let go.
  const contract = await $(() => {
    Prog.memorized = []; Prog.dailyGoal = 5; goalState().count = 0; goalState().celebrated = false; saveProg();
    document.querySelectorAll('.goalflash').forEach(x => x.remove());
    const held = addMemorized({ b: 'Matthew', c: 6, v: 33 }, true);
    const quiet = !document.querySelector('.goalflash');
    held();
    const loud = !!document.querySelector('.goalflash');
    document.querySelectorAll('.goalflash').forEach(x => x.remove());
    return { isFn: typeof held === 'function', quiet, loud };
  });
  ok(contract.isFn, 'adding a verse with the applause deferred hands the applause back');
  ok(contract.quiet, '…and shows nothing while it is held');
  ok(contract.loud, '…until it is let go');

  const backfill = await $(() => {
    Prog.customScene = {}; saveProg();
    let back = false;
    editVerseScene(43, 3, 16, () => { back = true; }, () => { back = true; });
    el('wScene').value = 'a scene written from somewhere else';
    if (el('wPalaceBtn')) { el('wPalaceBtn').click(); const p = document.querySelector('#psGrid [data-p="0"]'); if (p) p.click(); }
    if (el('wRoomBtn')) { el('wRoomBtn').click(); const r = document.querySelector('#psGrid [data-room="Sink"]'); if (r) r.click(); }
    el('wDoneTop').click();
    return { back, phase: wPhase };
  });
  ok(backfill.back, 'a scene edited from elsewhere still goes straight back where it came from');
  no(backfill.phase === 'kept', '…without stopping on the read-it-back screen');

  describe('the numbers teach some history', () => { });
  const history = await $(() => {
    const filler = /five foot|six foot|shy of|one past|almost (thirty|forty|fifty|eighteen)|^route d+$|^d+ seconds$/i;
    const bad = [], noYear = [];
    for (let n = 1; n <= 66; n++) numRefOptions(n).forEach(o => {
      if (filler.test(optName(o)) || filler.test(optWhy(o))) bad.push(n + ': ' + optName(o));
      // every year named must end in the two digits of the number it belongs to, unless the number
      // is in the name itself (Apollo 13, the 62nd homer)
      const inName = new RegExp('\b' + n + '\b').test(optName(o));
      (optWhy(o).match(/d{3,4}/g) || []).forEach(y => {
        if (+String(y).slice(-2) !== n && !inName) noYear.push(n + ': ' + y + ' ' + optName(o));
      });
    });
    const has = (n, name) => numRefOptions(n).some(o => optName(o) === name);
    return {
      filler: bad, mismatched: noYear,
      fiftyEight: numRefOptions(58).map(optName),
      keptDonuts: has(12, 'Dozen Donuts'),
      keptCat: has(13, 'Black Cat'),
      sixtySix: numRefOptions(66).map(optName),
      thin: (() => { let c = 0; for (let n = 1; n <= 66; n++) if (numRefOptions(n).length < 4) c++; return c; })(),
    };
  });
  is(history.filler.join(' | '), '', 'no reference is left that only restates the number');
  is(history.mismatched.join(' | '), '', 'every year named ends in the two digits of its number');
  ok(history.fiftyEight.includes('Jersey 58'), '58 keeps its jersey');
  ok(history.fiftyEight.includes('NASA'), '…and gains the year NASA was founded');
  ok(history.fiftyEight.length >= 5, '…where it had nothing usable at all before');
  ok(history.keptDonuts, 'the merge kept the dozen donuts');
  ok(history.keptCat, '…and the black cat');
  ok(history.sixtySix.includes('Route 66'), 'Route 66 was never filler and stays');
  ok(history.sixtySix.includes('Hastings'), '…now beside 1066');
  is(history.thin, 0, 'and no number is left with fewer than four pictures');

  describe('the spaced repetition count', () => { });
  const srDueFlash = await $(() => {
    const now = Date.now(), D = 86400000;
    const keys = ['43:3:16', '19:23:1'];
    Prog.memorized = keys.slice(); Prog.palaces = []; Prog.verseSR = {};
    keys.forEach(k => Prog.verseSR[k] = { learnedAt: now - 40 * D, step: 2, dueAt: now - D, r0: 1, r1: 1 });
    Prog.extraKnown = [43, 3, 16, 19, 23, 1]; saveProg(); bustCaches();
    MS = { phase: 'sr', srQueue: keys.slice() };
    const out = { due: versesDueCount(), before: srRemaining(), flashes: [] };
    const read = () => { const n = document.querySelector('.srcount-big'); return n ? n.textContent : '(none)'; };
    nextMemVerse(); out.flashes.push(read());        // the flash before the FIRST question
    return out;
  });
  is(srDueFlash.due, 2, 'two verses are due');
  is(srDueFlash.before, 2, '…and the count knows it before anything is asked');
  is(srDueFlash.flashes[0], '2', 'the flash before the first question says two, not one');

  await page.waitForTimeout(850);
  const srSecond = await $(() => {
    const out = { mid: srRemaining(), queue: MS.srQueue.length };
    nextMemVerse();
    const n = document.querySelector('.srcount-big');
    out.flash = n ? n.textContent : '(none)';
    return out;
  });
  is(srSecond.queue, 1, 'one verse is still queued after the first is taken');
  is(srSecond.mid, 1, '…and the count agrees');
  is(srSecond.flash, '1', 'the flash before the last question says one');

  describe('the number picture says its number', () => { });
  const tag = await $(() => ({
    plain: tagNumberWord('NASA ship crashes into the wall.', 'NASA', 58),
    idempotent: tagNumberWord(tagNumberWord('NASA ship', 'NASA', 58), 'NASA', 58),
    phrase: tagNumberWord('A DOZEN DONUTS roll past.', 'Dozen Donuts', 12),
    fragment: tagNumberWord('NASAL spray is not NASA.', 'NASA', 58),
    absent: tagNumberWord('nothing here', 'NASA', 58),
    noWord: tagNumberWord('NASA ship', '', 58),
  }));
  is(tag.plain, 'NASA (58) ship crashes into the wall.', 'the number picture is followed by its number');
  is(tag.idempotent, 'NASA (58) ship', 'saving twice does not tag it twice');
  is(tag.phrase, 'A DOZEN DONUTS (12) roll past.', 'a two word picture is tagged as one thing');
  is(tag.fragment, 'NASAL spray is not NASA (58).', 'a word that merely starts the same is left alone');
  is(tag.absent, 'nothing here', 'a picture that is not in the scene changes nothing');
  is(tag.noWord, 'NASA ship', '…and neither does having no picture chosen');

  const bookScene = await $(() => {
    Prog.bookWord[58] = 'Hairbrush'; Prog.numRef[58] = 'NASA'; delete Prog.customBook[58];
    markVideoSeen('verse'); saveProg();
    show('verse'); startAdhocLearn(58, true, () => { });
    el('tcEdit').click();
    el('edTa').value = 'a nasa ship lands on a hairbrush beside the lava.';
    el('edSave').click();
    return { kept: Prog.customBook[58] };
  });
  has(bookScene.kept, 'NASA (58)', 'saving a book scene tags the number picture with its number');
  has(bookScene.kept, 'HAIRBRUSH', '…while the other key images are still set in capitals');
  ok(/^A nasa/.test(bookScene.kept) === false, '…and the capital at the front is fixed');

  describe('the goal button, at twenty', () => { });
  const goalRow = await $(() => {
    Prog.goalMode = 'same'; Prog.dailyGoal = 20;
    const st = goalState(); st.count = 16; st.celebrated = false;
    Prog.memorized = []; Prog.verseSR = {}; Prog.palaces = []; saveProg();
    show('verse'); vView = 'hub'; renderVerse();
    const bar = document.querySelector('#verse .goalbar');
    const dots = bar.querySelectorAll('.gb-dot');
    const cols = getComputedStyle(bar.querySelector('.gb-dots')).gridTemplateColumns.split(' ').length;
    return {
      dots: dots.length,
      cols,
      lit: [...dots].filter(d => d.classList.contains('on')).length,
      line: bar.querySelector('.gb-title').textContent,
    };
  });
  is(goalRow.dots, 20, 'a goal of twenty draws twenty dots');
  is(goalRow.cols, 10, '…ten to a line, so twenty is two clean rows');
  is(goalRow.lit, 16, '…with the ones already done lit');
  is(goalRow.line, '4 Remaining', 'and it says what is left, plainly');

  const goalDone = await $(() => {
    const st = goalState(); st.count = 20; saveProg();
    renderVerse();
    return document.querySelector('#verse .gb-title').textContent;
  });
  is(goalDone, 'Caught Up Today', 'once the goal is met it says so instead of counting');

  describe('book questions: three pictures, no drawings, never mixed', () => { });
  const bq = await $(() => {
    delete Prog.bookWord[16]; delete Prog.numRef[16]; saveProg();
    const none = pairTypesFor(16).slice();
    Prog.bookWord[16] = 'knee-high socks'; saveProg();
    const nameOnly = pairTypesFor(16).slice();
    Prog.numRef[16] = "a driver's licence"; saveProg();
    const both = pairTypesFor(16).slice();

    const shot = t => {
      LZ = { sk: { kind: 'book' }, steps: [{ type: t, kind: 'book', n: 16 }], i: 0, total: 1, ok: 0 };
      renderStep();
      const L = document.getElementById('learn');
      return { prompt: (L.querySelector('.prompt') || {}).textContent || '',
               opts: [...L.querySelectorAll('.opt')].map(o => o.textContent),
               imgs: L.querySelectorAll('img').length };
    };
    const types = ['q_n2i','q_i2n','q_n2b','q_b2n','q_i2b','q_b2i','q_n2w','q_w2n','q_n2r','q_r2n'];
    const shots = {}; types.forEach(t => shots[t] = shot(t));
    // every picture each pool can legitimately offer, so an option can be traced to its source
    const first = o => (Array.isArray(o) ? o[0] : o);
    const pool = (own, opts) => {
      const s = new Set();
      for (let x = 1; x <= 66; x++) {
        const mine = own(x); if (mine) s.add(String(mine).toLowerCase());
        (opts(x) || []).map(first).forEach(o => { if (o) s.add(String(o).toLowerCase()); });
      }
      return s;
    };
    const namePool = pool(bookWordOf, bookWordOptions);
    const numPool  = pool(numRefOf, numRefOptions);
    const strays = (opts, p) => opts.filter(o => !p.has(String(o).trim().toLowerCase())).join(' | ');
    return {
      none, nameOnly, both, shots,
      // no book question anywhere may draw a picture
      anyImage: types.reduce((a, t) => a + shots[t].imgs, 0),
      // the Major System question must not offer the number picture, and the reverse
      majorHasNumRef: shots.q_n2i.opts.includes("a driver's licence") || shots.q_b2i.opts.includes("a driver's licence"),
      // a wrong answer must be another book's picture OF THE SAME KIND — not a Major System peg,
      // which is what leaks in when the question is built from pegFor() by mistake
      numRefStrays: strays(shots.q_n2r.opts, numPool),
      nameStrays: strays(shots.q_n2w.opts, namePool),
      numRefHasMine: shots.q_n2r.opts.includes("a driver's licence"),
      nameHasMine: shots.q_n2w.opts.includes('knee-high socks'),
      // a fallback distractor is a plain label, not a [label, why] pair
      commas: shots.q_n2w.opts.concat(shots.q_n2r.opts).some(o => /,/.test(o) && o.length > 40),
    };
  });
  is(bq.none.join(','), 'q_n2i,q_i2n,q_n2b,q_b2n,q_i2b,q_b2i', 'a book with no chosen pictures is asked the six original ways');
  ok(bq.nameOnly.includes('q_n2w') && bq.nameOnly.includes('q_w2n'), 'choosing a name picture adds its two questions');
  no(bq.nameOnly.includes('q_n2r'), '…and does not add the number picture questions, which are still blank');
  ok(bq.both.includes('q_n2r') && bq.both.includes('q_r2n'), 'choosing a number picture adds its two as well');
  is(bq.both.length, 10, 'ten ways to be asked once all three pictures exist');

  is(bq.anyImage, 0, 'no book question draws a picture: books are examined in words');
  no(bq.majorHasNumRef, 'the Major System question never offers the number picture as an answer');
  is(bq.numRefStrays, '', '…and every wrong answer in the number picture question is another number picture');
  is(bq.nameStrays, '', '…and every wrong answer in the name picture question is another name picture');
  ok(bq.numRefHasMine && bq.nameHasMine, 'each question does offer the reader\u2019s own answer');
  no(bq.commas, 'a stand-in answer is a plain label, not a label and its explanation');

  const bqWords = await $(() => {
    LZ = { sk: { kind: 'book' }, steps: [{ type: 'q_n2i', kind: 'book', n: 16 }], i: 0, total: 1, ok: 0 };
    renderStep();
    const a = (document.querySelector('#learn .prompt') || {}).textContent || '';
    LZ = { sk: { kind: 'book' }, steps: [{ type: 'q_n2r', kind: 'book', n: 16 }], i: 0, total: 1, ok: 0 };
    renderStep();
    const b = (document.querySelector('#learn .prompt') || {}).textContent || '';
    return { major: a, num: b };
  });
  ok(/Major System/.test(bqWords.major), 'the Major System question says which of the three it means');
  no(/Major System/.test(bqWords.num), '…and the number picture question says it is asking for that one');
  no(bqWords.major === bqWords.num, 'the two never read as the same question');

  describe('practice word for word: three orders, and only word for word', () => { });
  const prac = await $(() => {
    setFeat('w4w', true);
    Prog.memorized = ['43:3:16','19:23:1','45:8:28','50:4:13'];
    Prog.verseStage = {}; Prog.w4w = {}; Prog.w4wToday = null;
    Prog.w4w['45:8:28'] = { count:6, times:[] };      // closest to seven
    Prog.w4w['19:23:1'] = { count:1, times:[] };
    Prog.palaces = [{ place:'My house', stations:['Front door','Kitchen','Sofa'], learnedAt:1, step:1 }];
    Prog.verseLoc = { '50:4:13':{p:0,room:'Sofa'}, '43:3:16':{p:0,room:'Front door'} };
    saveProg();
    const key = a => a.join(':');
    const shortest = w4wOrder('shortest').map(key);
    const closest  = w4wOrder('closest').map(key);
    const palace   = w4wOrder('palace', 0).map(key);
    openPracticeSetup();
    const rows = [...document.querySelectorAll('[data-pk]')].map(x => x.dataset.pk);
    const words = a => (kjvText(a[0],a[1],a[2])||'').split(/[ ]+/).filter(Boolean).length;
    return {
      shortest, closest, palace, rows,
      gone: typeof openReviewSetup === 'undefined',
      prefs: JSON.stringify(revPrefs()),
      ascending: w4wOrder('shortest').every((a,i,arr) => i===0 || words(arr[i-1]) <= words(a)),
      title: (document.querySelector('#verse .lv-topbar>div')||{}).textContent,
      closeFirst: (document.querySelector('#verse .lv-topbar').firstElementChild||{}).id,
    };
  });
  is(prac.rows.join(','), 'shortest,closest,palace,heart', 'four ways to practise, and no location option');
  is(prac.title, 'Practice Word for Word', '...on a screen that says what it is');
  is(prac.closeFirst, 'pcClose', '...with its close button top left');
  ok(prac.gone, 'the old location-or-word-for-word chooser is gone entirely');
  is(prac.prefs, '{"loc":true,"w4w":true}', 'review asks both ways, because they are not alternatives');
  ok(prac.ascending, 'shortest first really is shortest first');
  is(prac.closest[0], '45:8:28', 'closest to seven leads with the verse on six practices');
  is(prac.palace.join(','), '43:3:16,50:4:13', 'a palace walks its stations in the order they were built');

  const palPicker = await $(() => {
    Prog.palaces = [{ place:'My house', stations:['Front door','Kitchen','Sofa'], learnedAt:1, step:1 },
                    { place:'The church', stations:['Porch','Pew','Pulpit'], learnedAt:1, step:1 }];
    Prog.verseLoc = { '43:3:16':{p:0,room:'Kitchen'}, '50:4:13':{p:0,room:'Sofa'}, '19:23:1':{p:1,room:'Pew'} };
    saveProg(); openPracticeSetup();
    document.querySelector('[data-pk="palace"]').click();
    const btn = el('pcPalBtn');
    const isBox = /bbchoose/.test(btn.className) && btn.tagName === 'BUTTON';
    const noSelect = !document.querySelector('#verse select');
    btn.click();
    const sheetUp = getComputedStyle(el('pickSheet')).display !== 'none';
    const tiles = [...document.querySelectorAll('#psGrid [data-p]')].map(t => t.dataset.p);
    document.querySelectorAll('#psGrid [data-p]')[1].click();
    return { isBox, noSelect, sheetUp, tiles,
             shut: el('pickSheet').style.display,
             face: el('pcPalBtn').textContent,
             slot: w4wPick.slot,
             shared: typeof pkSheet === 'function' && typeof pkBoxIn === 'function' };
  });
  ok(palPicker.isBox, 'the palace control is the same box the verse screen uses, not a dropdown');
  ok(palPicker.noSelect, '...and no bare select is left on the screen');
  ok(palPicker.shared, '...drawn by the one shared chooser, so the two cannot drift apart');
  ok(palPicker.sheetUp, 'tapping it opens the bottom sheet');
  is(palPicker.tiles.join(','), '0,1', '...listing every palace that has a verse due');
  is(palPicker.slot, 1, 'choosing a tile selects that palace');
  is(palPicker.shut, 'none', '...and closes the sheet behind it');
  has(palPicker.face, 'The church', '...with the box now showing what was chosen');
  has(palPicker.face, 'due of', '...and how much is waiting there');
  ok(prac.palace.every(k => k !== '19:23:1'), '...and never includes a verse kept somewhere else');

  describe('by heart: three strikes, and a test queue of its own', () => { });
  const strikes = await $(() => {
    startW4WTest(43, 3, 16, () => { });
    const inp = document.querySelector('#verse input');
    const type = t => { inp.value = t; inp.dispatchEvent(new Event('input')); };
    const first = TT.words[0];                       // 'For' — three letters
    const out = { word: first, len: first.length };
    type('Fro'); out.one = { typos: TT.typos, misses: TT.misses };
    type('Fpr'); out.two = { typos: TT.typos, misses: TT.misses };
    type(first);  out.recovered = { typos: TT.typos, misses: TT.misses, idx: TT.idx };
    return out;
  });
  ok(strikes.len < 4, 'the first word is shorter than four letters, which isTypo never forgave');
  is(strikes.one.misses, 0, 'one wrong go at it does not count against the run');
  is(strikes.two.misses, 0, '...nor does a second');
  is(strikes.one.typos + ',' + strikes.two.typos, '1,2', '...they show as crosses instead');
  is(strikes.recovered.typos, 0, 'getting the word right wipes the crosses');
  is(strikes.recovered.misses, 0, '...and the run is still clean');
  is(strikes.recovered.idx, 1, '...and it moves on');

  const heartQ = await $(() => {
    setFeat('w4w', true);
    Prog.memorized = ['43:3:16','19:23:1','45:8:28','50:4:13'];
    Prog.w4w = {}; Prog.w4wToday = null; Prog.palaces = []; Prog.verseLoc = {};
    Prog.verseStage = { '43:3:16':'heart', '19:23:1':'heart' };
    Prog.w4wSR = { '43:3:16': { cr:1, n:3, ok:3, at: Date.now() - 3*86400000 },
                   '19:23:1': { cr:2, n:4, ok:4, at: Date.now() } };
    saveProg();
    const ready = w4wOrder('heart').map(x => x.join(':'));
    openPracticeSetup();
    const rows = [...document.querySelectorAll('[data-pk]')].map(x => x.dataset.pk);
    document.querySelector('[data-pk="heart"]').click();
    return { ready, rows, count: el('pcCount').textContent, go: el('pcGo').textContent,
             resting: w4wTestLocked('19:23:1'),
             notInPractice: !w4wOrder('shortest').some(x => x.join(':') === '43:3:16') };
  });
  is(heartQ.rows.join(','), 'shortest,closest,palace,heart', 'a fourth way to be asked: the by-heart test');
  is(heartQ.ready.join(','), '43:3:16', 'only by-heart verses whose day of rest is up');
  ok(heartQ.resting, '...the one still resting is held back');
  ok(heartQ.notInPractice, '...and a by-heart verse is never in the practice queue');
  has(heartQ.count, 'one at a time', 'the screen says they come one at a time');
  is(heartQ.go, 'Begin the test', '...and the button knows it is a test, not practice');

  describe('scene tidy: a plural is the same picture', () => { });
  const plur = await $(() => {
    const tidy = (txt, bb, cc, vv) => {
      let x = capAfterPunct(txt);
      x = markKeyWords(x, [pegFor(bb).word, pegFor(cc).word, pegFor(vv).word]);
      x = tagNumberWord(x, pegFor(bb).word, dispNum('num', bb));
      x = tagNumberWord(x, pegFor(cc).word, dispNum('num', cc));
      x = tagNumberWord(x, pegFor(vv).word, dispNum('num', vv));
      return x;
    };
    return {
      pegs: [13, 8, 1].map(n => pegFor(n).word).join(','),
      one:    tidy('a dime lands on the sofa.', 13, 8, 1),
      many:   tidy('two dimes land on the sofas.', 13, 8, 1),
      seeds:  tidy('a handful of seeds.', 13, 8, 1),
      twice:  tidy('Two DIMES (13) roll away.', 13, 8, 1),
      spare:  tidy('the times were good and the dimension held.', 13, 8, 1),
    };
  });
  is(plur.pegs, 'Dime,Sofa,Seed', 'the fixture is Dime, Sofa and Seed');
  is(plur.one, 'A DIME (13) lands on the SOFA (08).', 'the singular is shouted and numbered');
  is(plur.many, 'Two DIMES (13) land on the SOFAS (08).', 'and so is the plural, keeping its S');
  is(plur.seeds, 'A handful of SEEDS (01).', 'a plural on its own is still the picture');
  is(plur.twice, 'Two DIMES (13) roll away.', 'saving again never doubles the number');
  is(plur.spare, 'The times were good and the dimension held.', 'a word that merely looks similar is left alone');

  describe('walking a palace: in order, with a way past a station', () => { });
  const palWalk = await $(() => {
    setFeat('w4w', true);
    Prog.memorized = ['43:3:16','19:23:1','45:8:28','50:4:13'];
    Prog.verseStage = {}; Prog.w4w = {}; Prog.w4wToday = null;
    Prog.palaces = [{ place:'My house', stations:['Front door','Kitchen','Sofa','Porch'], learnedAt:1, step:1 }];
    Prog.verseLoc = { '43:3:16':{p:0,room:'Front door'}, '19:23:1':{p:0,room:'Kitchen'},
                      '45:8:28':{p:0,room:'Sofa'}, '50:4:13':{p:0,room:'Porch'} };
    saveProg();
    const order = w4wOrder('palace', 0).map(x => x.join(':'));
    runW4WQueue(w4wOrder('palace', 0), 'palace');
    const here = () => TF ? refKey(TF.b, TF.c, TF.v) : (TT ? refKey(TT.b, TT.c, TT.v) : null);
    const btn = () => document.getElementById('w4wSkip');
    const visited = [here()], labels = [btn() ? btn().textContent.trim() : null];
    btn().click(); visited.push(here()); labels.push(btn() ? btn().textContent.trim() : null);
    btn().click(); visited.push(here()); labels.push(btn() ? btn().textContent.trim() : null);
    btn().click(); visited.push(here()); labels.push(btn() ? btn().textContent.trim() : null);
    return { order, visited, labels };
  });
  is(palWalk.order.join(','), '43:3:16,19:23:1,45:8:28,50:4:13', 'a palace is walked in station order');
  is(palWalk.visited.join(','), palWalk.order.join(','), '...and skipping keeps that order, never reshuffling it');
  has(palWalk.labels[0], 'Skip Location', 'a walk offers a way past the station you are standing at');
  has(palWalk.labels[0], '3 more to go', '...and says how much of the walk is left');
  has(palWalk.labels[2], '1 more to go', '...counting down as you go');
  is(palWalk.labels[3], null, '...and the offer is gone at the last one, where there is nothing to skip to');

  const solo = await $(() => {
    runW4WQueue(w4wOrder('shortest').slice(0, 1), 'shortest');
    const one = !document.getElementById('w4wSkip');
    runW4WQueue(w4wOrder('shortest'), 'shortest');
    const many = document.getElementById('w4wSkip');
    return { one, label: many ? many.textContent.trim() : null };
  });
  ok(solo.one, 'a run of one verse offers no skip at all');
  has(solo.label, 'Skip this verse', 'outside a palace the same control says what it really does');

  describe('the coded image is a row like the other two', () => { });
  const coded = await $(() => {
    const n = 16;
    delete Prog.customPeg[n]; saveProg();
    show('verse'); startAdhocLearn(n, true, () => { });
    const row = () => document.querySelector('[data-rel="peg"]');
    const rows = [...document.querySelectorAll('[data-rel]')].map(x => x.dataset.rel);
    const out = { rows, def: pegFor(n).word, choices: pegChoices(n), hadRow: !!row(),
                  noFixed: !document.querySelector('.bbfixed') };
    row().click();
    out.tiles = [...document.querySelectorAll('#pgGrid [data-peg]')].map(t => t.getAttribute('data-peg'));
    document.querySelectorAll('#pgGrid [data-peg]')[1].click();
    out.fromSheet = { peg: pegFor(n).word, custom: Prog.customPeg[n],
                      chipOn: [...document.querySelectorAll('.pegchip.on')].map(c => c.textContent.trim()) };
    // and back the other way: the chips above write the same setting
    const other = out.tiles[2];
    const chip = [...document.querySelectorAll('.pegchip')].find(c => c.getAttribute('data-peg') === other);
    chip.click();
    out.fromChip = { peg: pegFor(n).word, rowSays: row().textContent.replace(/s+/g, ' ').trim() };
    // choosing the code's own word again clears the override rather than storing it
    row().click();
    document.querySelectorAll('#pgGrid [data-peg]')[0].click();
    out.reset = { peg: pegFor(n).word, custom: Prog.customPeg[n] };
    return out;
  });
  is(coded.rows.join(','), 'word,num,peg', 'three rows, chosen the same way');
  ok(coded.noFixed, '...and the old read-only note is gone');
  is(coded.def, 'Tissue', 'book 16 starts on the code’s own word');
  is(coded.tiles.join(','), coded.choices.join(','), 'the sheet offers exactly the words that decode to that number');
  is(coded.fromSheet.peg, 'Dish', 'choosing from the row changes the image');
  is(coded.fromSheet.chipOn.join(','), 'Dish', '...and the picker above shows the same choice');
  is(coded.fromChip.peg, coded.tiles[2], 'choosing from the picker above changes it too');
  has(coded.fromChip.rowSays, coded.tiles[2], '...and the row follows: one setting, seen twice');
  is(coded.reset.peg, 'Tissue', 'picking the code’s own word puts it back');
  is(coded.reset.custom, undefined, '...by clearing the override rather than storing it');

  const stay = await $(async () => {
    const n = 16;
    show('verse'); startAdhocLearn(n, true, () => { });
    const sc = document.querySelector('.content');
    sc.scrollTop = sc.scrollHeight;
    const before = sc.scrollTop;
    document.querySelector('[data-rel="peg"]').click();
    document.querySelectorAll('#pgGrid [data-peg]')[1].click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const afterPeg = document.querySelector('.content').scrollTop;
    document.querySelector('.content').scrollTop = before;
    document.querySelector('[data-rel="word"]').click();
    document.querySelectorAll('#relGrid [data-pick]')[0].click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { before, afterPeg, afterWord: document.querySelector('.content').scrollTop };
  });
  ok(stay.before > 0, 'the lesson card is long enough to scroll');
  is(stay.afterPeg, stay.before, 'choosing an image leaves you where you were, not back at the top');
  is(stay.afterWord, stay.before, '...and so does choosing a book picture');

  describe('write it now, and the warm up buttons', () => { });
  const wnow = await $(() => {
    setFeat('w4w', true);
    Prog.memorized = ['43:3:16','19:23:1','45:8:28','50:4:13'];
    Prog.verseStage = {}; Prog.w4w = {}; Prog.w4wToday = null;
    Prog.palaces = [{ place:'My house', stations:['Front door','Kitchen','Sofa','Porch'], learnedAt:1, step:1 }];
    Prog.verseLoc = { '43:3:16':{p:0,room:'Front door'}, '19:23:1':{p:0,room:'Kitchen'},
                      '45:8:28':{p:0,room:'Sofa'}, '50:4:13':{p:0,room:'Porch'} };
    saveProg();
    runW4WQueue(w4wOrder('palace', 0), 'palace');
    const out = {};
    out.fadeSkip = (document.getElementById('w4wSkip') || {}).textContent || '';
    document.getElementById('tfWrite').click();
    out.typing = !!document.getElementById('ttIn');
    out.warmUp = !!document.getElementById('wpDisplay');
    startWordPick(43, 3, 16, () => { });
    const row = document.querySelector('#verse .btnrow');
    out.inWalk = row ? [...row.children].map(x => x.textContent.trim()) : [];
    out.sideBySide = row ? row.children.length : 0;
    W4WQ = null; W4WQMODE = null;
    startWordPick(43, 3, 16, () => { });
    const row2 = document.querySelector('#verse .btnrow');
    out.alone = row2 ? [...row2.children].map(x => x.textContent.trim()) : [];
    return out;
  });
  ok(wnow.typing, '"Write it now" goes straight to typing');
  no(wnow.warmUp, '...it does not hand you the warm up, which is still recognition');
  is(wnow.sideBySide, 2, 'the warm up carries two buttons side by side, like the fade screen');
  has(wnow.inWalk[0], 'Write it Now', 'the first says Write it Now');
  has(wnow.inWalk[1], 'Skip this Verse', '...and inside a walk the second names the verse, not the station');
  has(wnow.fadeSkip, 'Skip Location', '...while the fade screen, where the verse has not begun, still names the station');
  is(wnow.alone.length, 1, 'with no walk running there is only the one button');
  has(wnow.alone[0], 'Write it Now', '...and it is Write it Now');

  describe('swipe between verses, and a way to your saved ones', () => { });
  const swipeNav = await $(() => {
    Prog.memorized = ['43:3:16','43:3:17','43:3:15'];
    Prog.doneSkills = (Prog.doneSkills||[]).concat(Object.values(VIDEOS).map(x => x.skill));
    saveProg();
    const ref = () => (document.querySelector('#verse .lv-ref') || {}).textContent.replace(/s+/g,' ').trim();
    renderLearnedVerse(43, 3, 16, () => { });
    const host = document.getElementById('verse');
    const target = document.querySelector('.lv-versetext') || host;
    const mk = (x,y) => new Touch({ identifier:1, target, clientX:x, clientY:y });
    const swipe = (x1,y1,x2,y2) => {
      host.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[mk(x1,y1)],changedTouches:[mk(x1,y1)]}));
      host.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[mk(x2,y2)]}));
    };
    const r = { navs: [...document.querySelectorAll('#verse [data-nav]')].map(x => x.dataset.nav),
                star: /★/.test(document.querySelector('#verse .lv-topbar').textContent),
                start: ref() };
    swipe(300,400,100,405); r.left = ref();
    swipe(100,400,320,398); r.right = ref();
    swipe(200,200,150,500); r.vertical = ref();
    swipe(300,400,280,400); r.tiny = ref();
    return r;
  });
  is(swipeNav.navs.join(','), 'vprev,vnext', 'the verse bar keeps only the verse pair');
  no(swipeNav.star, '...the jump to the next memorized verse is gone');
  is(swipeNav.start, 'John 3:16', 'starting at John 3:16');
  is(swipeNav.left, 'John 3:17', 'dragging left goes on to the next verse');
  is(swipeNav.right, 'John 3:16', '...and dragging right comes back');
  is(swipeNav.vertical, 'John 3:16', 'a mostly vertical drag belongs to the scroller');
  is(swipeNav.tiny, 'John 3:16', '...and a short drag is not a swipe at all');

  const bibleTop = await $(() => {
    show('journey'); renderJourney();
    const r = { buttons: [...document.querySelectorAll('.bible-viewtoggle button')].map(x => x.dataset.vmode),
                hash: !!document.querySelector('[data-vmode="num"]'),
                countGone: !/of 66 books open/.test(document.querySelector('.biblecard').textContent),
                ribbon: (document.querySelector('.savedrib text') || {}).textContent,
                tall: Math.round(document.querySelector('.savedrib svg').getBoundingClientRect().height) };
    document.getElementById('bibleSaved').click();
    r.view = vView;
    r.heading = (document.querySelector('#verse h2') || {}).textContent;
    return r;
  });
  is(bibleTop.buttons.join(','), 'num,numimg,bookimg,name', 'all four view toggles are back where they were');
  ok(bibleTop.hash, '...including the book-number one');
  ok(bibleTop.countGone, 'the "of 66 books open" line has given up the corner');
  is(bibleTop.ribbon, 'SAVED', '...to a bookmark turned on its side that says what it is');
  ok(bibleTop.tall >= 28, '...drawn a little larger than the line it replaced');
  is(bibleTop.view, 'saved', 'and it goes straight to your saved verses');
  has(bibleTop.heading, 'Saved', '...landing on that screen, not somewhere near it');

  describe('back goes where you came from', () => { });
  const backWhence = await $(() => {
    const back = () => (document.getElementById('vBack') || {}).textContent.trim();
    const where = () => (document.querySelector('.view.active') || {}).id;
    const r = {};
    show('journey'); renderJourney();
    document.getElementById('bibleSaved').click();
    r.bibleLabel = back(); r.bibleFrom = vFrom; r.bibleView = vView;
    document.getElementById('vBack').click();
    r.bibleLands = where(); r.bibleCard = !!document.querySelector('.biblecard');
    r.spent = vFrom;
    show('verse'); vView = 'saved'; vFrom = 'library'; renderVerse();
    r.libLabel = back();
    document.getElementById('vBack').click();
    r.libLands = where(); r.libView = vView;
    show('journey'); renderJourney();
    document.getElementById('bibleSaved').click();
    const tab = document.querySelector('.tabbar [data-tab="verse"]');
    if (tab) tab.click();
    r.afterTabFrom = vFrom; r.afterTabView = vView;
    return r;
  });
  is(backWhence.bibleView, 'saved', 'the Bible opens the saved list');
  is(backWhence.bibleFrom, 'bible', '...and remembers that is where you came from');
  is(backWhence.bibleLabel, '← Bible', '...so the way back says Bible');
  is(backWhence.bibleLands, 'journey', '...and lands on the Bible');
  ok(backWhence.bibleCard, '...on the screen itself, not near it');
  is(backWhence.spent, 'library', 'the memory is spent on the way out, so the next visit decides afresh');
  is(backWhence.libLabel, '← Library', 'entered from the Library, the way back says Library');
  is(backWhence.libLands, 'verse', '...and lands there');
  is(backWhence.libView, 'hub', '...back at the hub');
  is(backWhence.afterTabFrom, 'library', 'leaving by the tab bar forgets the Bible');
  is(backWhence.afterTabView, 'hub', '...and drops you at the hub');

  describe('a verse is never shown short', () => { });
  const whole = await $(() => {
    const norm = s => String(s || '').replace(/s+/g, ' ').trim();
    const lists = [GEMS, TORAH_VERSES, TORAH5_VERSES, NT_VERSES, SCENES];
    const bad = []; let n = 0, carried = 0;
    lists.forEach(arr => (arr || []).forEach(v => {
      const bn = bookNum(v.b); if (!bn) return;
      const real = norm(kjvText(bn, v.c, v.v)); if (!real) return;
      n++;
      if (v.text && norm(v.text) !== real) carried++;      // the hand-written teaser still differs
      if (norm(verseObj(bn, v.c, v.v).text) !== real) bad.push(bookName(bn) + ' ' + v.c + ':' + v.v);
    }));
    return { n, carried, bad };
  });
  ok(whole.n > 500, 'every curated verse is checked, not a handful');
  is(whole.bad.length, 0, 'not one of them is shown in anything but the Bible’s own words');
  ok(whole.carried > 30, '...even though most still carry a shortened teaser of their own');

  const john = await $(() => {
    const k = refKey(43, 10, 10);
    Prog.memorized = []; Prog.doneSkills = (Prog.doneSkills||[]).concat(Object.values(VIDEOS).map(x => x.skill));
    saveProg();
    const listed = verseAt(k);
    openVerseWizard(43, 10, 10, () => { });
    const onScreen = (document.querySelector('#verse .lv-versetext') || {}).textContent || '';
    return {
      real: kjvText(43, 10, 10),
      teaser: listed ? listed.text : null,
      shown: verseObj(43, 10, 10).text,
      onScreen: onScreen.replace(/[“”‘’"]/g, '').replace(/s+/g, ' ').trim(),
    };
  });
  ok(/^The thief cometh not/.test(john.shown), 'John 10:10 starts where the verse starts');
  ok(/abundantly.$/.test(john.shown), '...and ends where it ends');
  is(john.shown, john.real, '...matching the Bible exactly');
  no(john.teaser === john.real, 'the list still holds a half-verse teaser for it');
  is(john.onScreen, john.real.replace(/s+/g, ' ').trim(), '...and the memorize screen puts the whole verse on screen');

  describe('typing: the words you have written stay on screen', () => { });
  const typedTop = await $(() => {
    setFeat('w4w', true);
    Prog.memorized = ['43:3:16']; Prog.verseStage = { '43:3:16': 'heart' }; Prog.w4wSR = {}; saveProg();
    show('verse'); startW4WTest(43, 3, 16, () => { });
    const inp = document.getElementById('ttIn');
    const put = w => { inp.value = w; inp.dispatchEvent(new Event('input')); };
    TT.words.slice(0, 18).forEach(put);
    const sc = document.querySelector('.content');
    sc.scrollTop = sc.scrollHeight;                       // pushed as far down as it will go
    const d = document.getElementById('ttDisplay').getBoundingClientRect();
    const i = document.getElementById('ttIn').getBoundingClientRect();
    const s = sc.getBoundingClientRect();
    const band = document.querySelector('.ttstick');
    return {
      order: [...document.querySelectorAll('#verse .card > *')].map(x => x.id || (x.className||'').split(' ')[0]),
      rowOrder: (()=>{ const r=document.querySelector('.ttrow'); return r ? [...r.children].map(n=>n.id).join(',') : '(no row)'; })(),
      pinned: band ? getComputedStyle(band).position : null,
      holds: !!(band && band.contains(document.getElementById('ttDisplay')) && band.querySelector('.ttcount')),
      wordsOnScreen: d.top >= s.top - 1 && d.bottom <= s.bottom + 1,
      inputOnScreen: i.top >= s.top - 1 && i.bottom <= s.bottom + 1,
      overlap: Math.max(0, Math.round(d.bottom - i.top)),
      typed: TT.idx,
      showing: (document.querySelector('.ttdone') || {}).textContent,
      roomForInput: parseInt(getComputedStyle(inp).scrollMarginTop, 10) || 0,
    };
  });
  is(typedTop.pinned, 'sticky', 'the reference and the typed words are pinned to the top');
  ok(typedTop.holds, '...and the counter rides with them, so progress is never off screen either');
  is(typedTop.order[0], 'ttstick', 'that band is the first thing in the card');
  is(typedTop.order[1], 'ttrow', '...and the line you type on comes straight after it');
  is(typedTop.rowOrder, 'ttIn,ttHint', '...the box first on that line, Reveal to its right');
  is(typedTop.typed, 18, 'eighteen words in');
  ok(/whosoever believeth in him$/.test(typedTop.showing.trim()), '...and the newest words are the ones shown');
  ok(typedTop.wordsOnScreen, 'scrolled to the bottom, the words are still on screen');
  ok(typedTop.inputOnScreen, '...and so is the box you type in');
  is(typedTop.overlap, 0, '...with the band not sitting on top of it');
  ok(typedTop.roomForInput > 100, 'the input reserves room above itself, for when the browser scrolls it into view');

  describe('an async load never takes your place away', () => { });
  const notKicked = await $(() => {
    Prog.doneSkills = (Prog.doneSkills||[]).concat(Object.values(VIDEOS).map(x => x.skill));
    Prog.memorized = ['43:3:16']; Prog.verseStage = {}; saveProg();
    const at = () => {
      const v = document.querySelector('.view.active'); if (!v) return 'nothing';
      if (v.id === 'journey') return v.querySelector('.biblecard') ? 'strip' : (v.querySelector('[data-v]') ? 'chapter' : 'book');
      if (v.id === 'verse') {
        if (v.querySelector('.vhub')) return 'hub';
        if (v.querySelector('#ttIn')) return 'typing';
        if (v.querySelector('#vBack')) return 'sublist';
        if (v.querySelector('[data-nav]')) return 'verse';
        return 'other';
      }
      if (v.id === 'learn') return v.querySelector('.path') ? 'path' : 'lesson';
      return v.id;
    };
    const probe = setup => { setup(); const was = at(); refreshCurrentView(); return was + '>' + at(); };
    return {
      verse:   probe(() => { show('journey'); renderChapterScreen(43,3);
                             openVerseWizard(43,3,16, () => { show('journey'); renderChapterScreen(43,3); }); }),
      chapter: probe(() => { show('journey'); renderChapterScreen(43,3); }),
      book:    probe(() => { show('journey'); renderBookScreen(43); }),
      typing:  probe(() => { show('verse'); Prog.verseStage={'43:3:16':'heart'}; saveProg(); startW4WTest(43,3,16,()=>{}); }),
      lesson:  probe(() => { show('learn'); LZ={sk:{kind:'book'},steps:[{type:'q_n2i',kind:'book',n:16}],i:0,total:1,ok:0}; renderStep(); }),
      strip:   probe(() => { show('journey'); renderJourney(); }),
      hub:     probe(() => { show('verse'); vView='hub'; renderVerse(); }),
      path:    probe(() => { show('learn'); renderPath(); }),
    };
  });
  is(notKicked.verse, 'verse>verse', 'a verse opened from the Bible survives an async load landing');
  is(notKicked.chapter, 'chapter>chapter', '...so does a chapter screen');
  is(notKicked.book, 'book>book', '...and a book screen');
  is(notKicked.typing, 'typing>typing', '...and a verse being typed out');
  is(notKicked.lesson, 'lesson>lesson', '...and a lesson half finished');
  is(notKicked.strip, 'strip>strip', 'the Bible itself still refreshes, since that is the point of it');
  is(notKicked.hub, 'hub>hub', '...as does the Library hub');
  is(notKicked.path, 'path>path', '...and the learn path');

  describe('moving between verses keeps your place', () => { });
  const keptPlace = await $(async () => {
    Prog.memorized = ['43:3:15','43:3:16','43:3:17'];
    Prog.doneSkills = (Prog.doneSkills||[]).concat(Object.values(VIDEOS).map(x => x.skill));
    saveProg();
    show('verse'); renderLearnedVerse(43, 3, 16, () => { });
    const sc = () => document.querySelector('.content');
    const settle = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    sc().scrollTop = 60; const before = sc().scrollTop;   // small enough that a shorter verse can still hold it
    document.querySelector('[data-nav="vnext"]').click(); await settle();
    const afterBtn = { y: sc().scrollTop, ref: ((document.querySelector('.lv-ref')||{}).textContent||'').trim() };
    const host = document.getElementById('verse');
    const target = document.querySelector('.lv-versetext') || host;
    const mk = (x,y) => new Touch({ identifier:1, target, clientX:x, clientY:y });
    host.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[mk(300,400)],changedTouches:[mk(300,400)]}));
    host.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[mk(100,405)]}));
    await settle();
    return { before, afterBtn, afterSwipe: sc().scrollTop, room: sc().scrollHeight - sc().clientHeight };
  });
  ok(keptPlace.before > 0, 'the verse screen was scrolled down before moving');
  is(keptPlace.afterBtn.y, keptPlace.before, 'the next-verse arrow leaves the eye where it was');
  ok(/3:17/.test(keptPlace.afterBtn.ref), '...having actually moved on a verse');
  is(keptPlace.afterSwipe, keptPlace.before, '...and so does a swipe');

  describe('Scripture Quest: no cast, and a bar that works', () => { });
  const quest = await $(() => {
    // The quest theme uppercases button text, and Pro changes what later blocks see, so both are
    // put back before this block hands over.
    const phone = document.querySelector('.phone');
    const wasTheme = phone.getAttribute('data-theme'), wasPro = Billing.isPro();
    phone.setAttribute('data-theme','quest');
    const r = {};
    show('journey'); renderJourney(); paintTheme();
    r.onBible = document.querySelectorAll('#journey .theme-decor').length;
    show('learn'); renderPath(); paintTheme();
    r.parts = [...document.querySelectorAll('#learn .theme-decor')].map(x => x.className.replace('theme-decor ',''));
    const bar = document.querySelector('.decor-ctabar');
    r.art = bar.querySelectorAll('svg').length;
    r.wizard = /🧙/u.test(document.getElementById('learn').textContent);
    LZ = null;
    bar.querySelector('button').click();
    const pay = document.getElementById('payModal');
    // Either it opens the lesson or it offers the way to unlock it. What it must never do is nothing.
    r.doesSomething = !!LZ || (!!pay && pay.style.display === 'flex');
    if (pay) pay.style.display = 'none';
    Billing.grant(); LZ = null;
    show('learn'); renderPath(); paintTheme();
    r.label = document.querySelector('.decor-ctabar button').textContent;
    document.querySelector('.decor-ctabar button').click();
    r.started = !!LZ; r.showing = !!document.querySelector('#learn .stage, #learn .prompt');
    LZ = null;
    if (!wasPro) Billing.revoke();
    if (wasTheme) phone.setAttribute('data-theme', wasTheme); else phone.removeAttribute('data-theme');
    show('learn'); renderPath(); paintTheme();
    return r;
  });
  is(quest.onBible, 0, 'no character stands on the Bible screen');
  is(quest.art, 0, '...nor in the bar at the foot of the path');
  no(quest.wizard, '...nor on the tile you are up to');
  ok(quest.parts.includes('decor-flag'), 'the flag marking where you are stays');
  ok(quest.parts.includes('decor-ctabar'), '...and so does the bar');
  has(quest.label, '⚔', 'the bar still speaks like a quest');
  ok(quest.doesSomething, 'pressing it always does something: the lesson, or the way to unlock it');
  ok(quest.started, '...and on an open one it starts the lesson');
  ok(quest.showing, '...putting it on the screen');

  describe('books come back before they are forgotten', () => { });
  const bookSR = await $(() => {
    const r = {};
    const wasDone = (Prog.doneSkills || []).slice(), wasMem = (Prog.memorized || []).slice();
    // Earlier blocks leave palaces dated to the epoch, which are due forever. This one measures
    // the day's total, so it clears them and puts them back.
    const wasPalaces = Prog.palaces; Prog.palaces = [];
    const bookSkills = []; UNITS.forEach(U => U.skills.forEach(sk => { if (sk.kind === 'book') bookSkills.push(sk); }));
    const first = bookSkills.slice(0, 5);
    Prog.doneSkills = first.map(s => s.id);
    Prog.memorized = []; Prog.bookWord = {}; Prog.numRef = {};
    first.forEach(s => s.items.forEach(n => gradeKey('sk:book:' + n, 'good')));
    saveProg();
    r.known = knownBooks();
    r.freshlyLearned = booksDueList().length;
    r.known.forEach(n => { SRS['sk:book:' + n].due = Date.now() - 86400000; });
    r.aged = booksDueList();
    r.inDayTotal = reviewDueCount();
    show('verse'); startMemTest();
    r.queue = (MS.bookQueue || []).length;
    r.banner = (document.getElementById('verse').textContent || '').split(/\s+/).join(' ');
    document.getElementById('srGo').click();
    r.kind = NT ? NT.kind : null;
    const n = NT.qs[0].n, before = SRS['sk:book:' + n].due;
    document.querySelector('#verse [data-ok="1"]').click();
    r.advanced = SRS['sk:book:' + n].due > before;
    // hand back a clean world: these cards would otherwise show as due for every later block
    r.known.forEach(x => { delete SRS['sk:book:' + x]; delete SRS['sk:num:' + x]; });
    Prog.doneSkills = wasDone; Prog.memorized = wasMem; Prog.palaces = wasPalaces;
    saveProg(); bustCaches();
    return r;
  });
  is(bookSR.known.join(','), '1,2,3,4,5', 'five book lessons behind us');
  is(bookSR.freshlyLearned, 0, 'a book just learned is not due yet');
  is(bookSR.aged.join(','), '1,2,3,4,5', '...but once its checkpoint passes it is');
  ok(bookSR.inDayTotal >= 5, '...and they count toward what is due today');
  is(bookSR.queue, 5, 'the session carries a phase of its own for them');
  has(bookSR.banner, '5 books', '...and the banner says so');
  has(bookSR.banner, 'numbers, then books, then verses', '...and where they come in the order');
  is(bookSR.kind, 'book', 'beginning the review reaches the book phase');
  ok(bookSR.advanced, '...and answering one pushes its next checkpoint out');

  const bookQ = await $(() => {
    const r = { plain: bookReviewTypes(16) };
    Prog.bookWord[16] = 'Knee Socks'; saveProg(); r.withName = bookReviewTypes(16);
    Prog.numRef[16] = "Driver's Licence"; saveProg(); r.withBoth = bookReviewTypes(16);
    const shot = t => { NT = { qs: [{ n: 16, type: t }], i:0, ok:0, wrong:0, ret:null, kind:'book' }; renderNumTest();
      return { q: (document.querySelector('#verse .prompt')||{}).textContent || '',
               opts: [...document.querySelectorAll('#verse .opt')].map(o => o.textContent),
               imgs: document.querySelectorAll('#verse img').length }; };
    r.name = shot('q_n2w'); r.num = shot('q_n2r');
    // a miss in a book phase marks the book's card and leaves the number's alone
    SRS['sk:book:16'] = { box:3, due:Date.now()+99999 }; SRS['sk:num:16'] = { box:3, due:Date.now()+99999 };
    NT = { qs:[{n:16,type:'q_b2n'}], i:0, ok:0, wrong:0, ret:null, kind:'book' }; renderNumTest();
    document.querySelector('#verse [data-ok="0"]').click();
    r.miss = { book: SRS['sk:book:16'].box, num: SRS['sk:num:16'].box };
    return r;
  });
  is(bookQ.plain.join(','), 'q_n2b,q_b2n,q_i2b,q_b2i', 'a book with no chosen pictures is asked the four it has');
  ok(bookQ.withName.includes('q_n2w'), 'choosing a name picture adds it to the review');
  no(bookQ.plain.includes('q_n2r'), '...and an unchosen number picture is never asked about');
  is(bookQ.withBoth.length, 8, 'with all three pictures there are eight ways to be asked');
  is(bookQ.name.imgs + bookQ.num.imgs, 0, 'a book is reviewed in words, the way it is taught');
  ok(bookQ.name.opts.includes('Knee Socks'), 'the name question offers what was chosen');
  ok(bookQ.num.opts.includes("Driver's Licence"), '...and so does the number one');
  is(bookQ.miss.book, 1, 'a miss on a book sends its own card back to the start');
  is(bookQ.miss.num, 3, '...and leaves the number card where it was');

  describe('typing fits a phone with the keyboard up', () => { });
  const fits = await $(() => {
    setFeat('w4w', true);
    Prog.memorized = ['43:3:16']; Prog.verseStage = {}; Prog.w4w = {}; saveProg();
    show('verse'); startTypeTest(43, 3, 16, () => { }, false);
    const inp = document.getElementById('ttIn');
    TT.words.slice(0, 8).forEach(w => { inp.value = w; inp.dispatchEvent(new Event('input')); });
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
    const card = document.querySelector('#verse .card');
    return {
      named: card.classList.contains('ttcard'),
      order: [...card.children].map(x => x.id || (x.className||'').split(' ')[0]),
      rowOrder: (()=>{ const r=document.querySelector('.ttrow'); return r ? [...r.children].map(n=>n.id).join(',') : '(no row)'; })(),
      // the four things that have to share the screen while typing
      band: !!card.querySelector('.ttstick .ttcount'),
      words: !!card.querySelector('.ttstick #ttDisplay'),
      box: !!card.querySelector('#ttIn'),
      reveal: !!card.querySelector('#ttHint'),
      typed: (card.querySelector('.ttdone') || {}).textContent.trim(),
      tierOne: /max-height:700px/.test(css),
      tierTwo: /max-height:560px/.test(css),
      helpHides: /.ttcard .tthelp{display:none}/.test(css),
      scoped: !/{s*.card{padding:12px}/.test(css),
    };
  });
  ok(fits.named, 'the typing card is named, so the short-screen rules cannot reach any other screen');
  is(fits.order.join(','), 'ttstick,ttrow,hint', 'words, then the line you type on, then the help: in that order down the card');
  is(fits.rowOrder, 'ttIn,ttHint', '...with the box and Reveal sharing that line, box first');
  ok(fits.band && fits.words, 'the reference, the counter and the words are one pinned band');
  ok(fits.box, '...with the box you type in right under it');
  ok(fits.reveal, '...and Reveal a letter under that');
  ok(/^For God so loved/.test(fits.typed), 'the words typed so far are the ones shown');
  ok(fits.tierOne && fits.tierTwo, 'two tiers of trimming: short, and shorter still');
  ok(fits.helpHides, 'on the shortest screens the sentence about colours is what gives way');

  describe('updating happens when you ask, or when you change tab', () => { });
  // Pulling the page down used to reload the app. It went off on any hard fling, which could take
  // somebody out of a half-written scene, so it is gone. What replaced it is a button, and a quiet
  // look on a tab tap — the one moment the reader has already left the screen they were on.
  const upd = await $(async () => {
    const out = {};
    out.gestureGone = !document.getElementById('ptr');
    out.notWired = !(document.querySelector('.content').dataset || {}).ptr;
    out.hasModule = typeof Update === 'object' && typeof Update.now === 'function';

    // the button, and the version beside it
    el('themeBtn').click();
    out.button = !!el('updBtn');
    out.saysVersion = ((el('updNow') || {}).textContent || '') === 'v' + APP_VERSION;
    const close = el('themeClose'); if (close) close.click();

    // Counted at the module rather than at the network: the check refuses to run from a file:// page
    // (there is nothing to update from a local file), and the harness serves one.
    const seen = [];
    const realTap = Update.onTabTap;
    Update.onTabTap = () => { seen.push(1); };

    // nothing looks on its own: scrolling, drawing, moving between views
    document.querySelector('.content').dispatchEvent(new Event('scroll'));
    show('verse'); show('learn'); renderPath();
    await new Promise(r => setTimeout(r, 250));
    out.quiet = seen.length;

    // a tab tap does
    document.querySelector('.tabbar button[data-tab="learn"]').click();
    await new Promise(r => setTimeout(r, 300));
    out.onTabTap = seen.length;
    Update.onTabTap = realTap;
    return out;
  });
  ok(upd.gestureGone, 'the pull-to-refresh indicator is gone');
  ok(upd.notWired, '...and the scroller carries none of its handlers');
  ok(upd.hasModule, 'updating is a thing the reader asks for');
  ok(upd.button, 'Profile carries a Check for an update button');
  ok(upd.saysVersion, '...with the version they are on beside it');
  is(upd.quiet, 0, 'scrolling and moving between screens never looks for a new version');
  ok(upd.onTabTap >= 1, '...tapping a tab along the bottom is the one thing that does');

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
  has(clean.result, 'Review trail:', 'the result says how far along the trail the verse is');

  const dirty = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.w4wSR = { [k]: { cr: 3, n: 3, ok: 3, at: 0 } }; saveProg();
    startW4WTest(43, 11, 35, () => { });
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    put('elephant');                                         // strike one, on any wrong word at all
    const afterOne = { misses: TT.misses, typos: TT.typos };
    put('zzzzzzzzz'); put('qqqqqqqqq');                      // strikes two and three end the run
    const misses = TT.misses;
    const r = w4wsr(k) || {};
    const out = { misses, cr: r.cr, n: r.n, ok: r.ok, afterOne };
    el('wtDone').click();                                     // a miss on a CLAIMED verse asks about it
    const m = el('demoteModal');
    out.asked = !!m && m.style.display === 'flex';
    out.txt = m ? m.innerText : '';
    return out;
  });
  is(dirty.afterOne.misses, 0, 'one wrong word does not count against the run');
  is(dirty.afterOne.typos, 1, '...it shows as a single cross instead');
  is(dirty.misses, 1, 'the third go at the same word is what counts');
  is(dirty.n, 4, '...the attempt still counts as a test');
  is(dirty.ok, 3, '...but not as a pass');
  is(dirty.cr, 0, '...and it breaks the run of five');
  ok(dirty.asked, 'missing a word on a claimed verse ASKS whether to put it back in practice');
  has(dirty.txt, 'No. I know this one', '...and the claim is never taken back without an answer');

  describe('ladder: the heartStation is earned back', () => { });
  const heartStation = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } };
    Prog.locPast = {}; Prog.w4wSR = {};
    // part-way along the trail: three checkpoints behind it, three still to come
    Prog.verseSR = { [k]: { learnedAt: Date.now(), step: 3, dueAt: Date.now() + 864e5, r0: 1 } };
    saveProg();
    const held = !heartMaybeFreeStation(k);
    // and now the whole visible trail is walked
    Prog.verseSR[k].step = SR_TRAIL.length; saveProg();
    const freed = heartMaybeFreeStation(k);
    return { held, freed: freed ? stationName(freed) : '',
             // the slot is what is given back; the verse keeps a location, and it is this one
             gone: versesAtLoc(0, 'Front door').length === 0,
             nowShows: stationName((Prog.verseLoc || {})[k]),
             remembered: JSON.stringify((Prog.locPast || {})[k] || null) };
  });
  ok(heartStation.held, 'half the trail is not enough to give up the heartStation');

  describe('claiming a verse by heart starts its review trail', () => { });
  const heartTrail = await $(() => {
    const k = '45:8:28';
    if (!Prog.memorized.includes(k)) Prog.memorized.push(k);
    Prog.verseStage = {};
    // a verse already part-way down its trail, learned long ago
    Prog.verseSR = Prog.verseSR || {};
    Prog.verseSR[k] = { learnedAt: Date.now() - 40 * 864e5, step: 4, dueAt: Date.now() + 864e5, r0: 1 };
    saveProg();
    setVerseStage(k, 'heart');
    const o = Prog.verseSR[k];
    const out = { step: o.step, keptLearnedAt: o.learnedAt < Date.now() - 30 * 864e5, sealed: heartTrailDone(k) };
    // walking the six visible checkpoints seals it, and the long tail is still to come
    const days = [];
    for (let i = 0; i < SR_TRAIL.length && !heartTrailDone(k); i++) days.push(srAdvanceClean(Prog.verseSR[k]));
    saveProg();
    out.walked = days.filter(d => d != null);
    out.sealedAfter = heartTrailDone(k);
    out.longTailLeft = SR_ALL.length - Prog.verseSR[k].step;
    out.longTailDays = SR_ALL.slice(Prog.verseSR[k].step).join(',');
    // claiming a SEALED verse again must not send it back to the start
    setVerseStage(k, 'loc'); setVerseStage(k, 'heart');
    out.stillSealed = heartTrailDone(k);
    return out;
  });
  is(heartTrail.step, 1, 'claiming a verse puts it back at the top of the trail');
  ok(heartTrail.keptLearnedAt, '...without forgetting when it was first memorised');
  no(heartTrail.sealed, '...and it is not sealed on the strength of the claim');
  is(heartTrail.walked.join(','), '1,3,7,16,30', 'the trail asks for it at a day, three, a week, a fortnight and a month');
  ok(heartTrail.sealedAfter, '...and walking it is what seals the verse');
  is(heartTrail.longTailLeft, 3, 'three reviews still wait beyond sealing');
  is(heartTrail.longTailDays, '60,180,730', '...two months, six months and two years');
  ok(heartTrail.stillSealed, 'a verse already sealed is not sent back to the start by claiming it again');


  is(heartStation.freed, 'My Kitchen · Front door', 'walking the whole trail frees it, and names it');
  ok(heartStation.gone, '...the place in the palace is released, free for another verse');
  is(heartStation.nowShows, 'Known by heart', '...and the verse is left holding the only location it still needs');
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
  has(earlyClaim.invite, 'I Know By Heart', '...still invites you to say you know it');
  is(earlyClaim.rungs, 'loc,heart', '...the picker offers both rungs');
  is(earlyClaim.stage, 'heart', '...and claiming it works with nothing practised first');

  describe('ladder: how you are asked', () => { });
  // The chooser is gone. Review is no longer a question with two answers: a verse still being
  // located is asked by address, and one held by heart gets its strict word-for-word test, and the
  // engine decides that per verse rather than asking up front.
  const chooser = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.verseStage = {}; saveProg();
    const emptyPool = w4wPoolSize();
    Prog.verseStage = { '43:3:16': 'heart' }; saveProg();
    return { emptyPool, pool: w4wPoolSize(), prefs: JSON.stringify(revPrefs()) };
  });
  is(chooser.emptyPool, 0, 'with nothing claimed there is nothing to test word for word');
  is(chooser.pool, 1, 'once a verse is claimed');
  is(chooser.prefs, '{"loc":true,"w4w":true}', '...and review asks both ways without asking you first');

  const routed = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' }; Prog.w4wSR = {}; saveProg();
    // A claimed verse is asked one way or the other on a coin toss, so the toss is held still here.
    // Leaving it to the seeded generator made this test depend on how many shuffles ran before it.
    const rig = v => { const real = Math.random; Math.random = () => v; try { askVerseIn(k); } finally { Math.random = real; } };
    rig(0);                                                   // heads: word for word
    const byTyping = !!el('ttIn');
    rig(0.99);                                                // tails: by address
    const byAddress = !!el('mtFieldB');
    Prog.verseStage = {}; saveProg();
    rig(0);                                                   // still only located, so no toss applies
    const stage1 = !!el('mtFieldB');
    return { byTyping, byAddress, stage1, both: revPrefs().loc && revPrefs().w4w };
  });
  ok(routed.byTyping, 'a verse held by heart is asked by typing it');
  ok(routed.byAddress, '...or by address, whichever the toss gives');
  ok(routed.stage1, 'a verse that is only located is ALWAYS asked by address');
  ok(routed.both, 'review asks both ways, and that is no longer a setting anyone can switch off');

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
    // and it is NOT offered while building a new verse. The Building the Scene film plays before
    // the first one, so mark it seen: this assertion is about the second verse onwards.
    markVideoSeen('verse');
    openVerseWizard(40, 6, 33, () => { });
    out.inWizard = !!el('lvStage');
    return out;
  });
  is(vPage.pips, 2, 'the verse page shows both rungs');
  has(vPage.onNow, 'Located', '...marking where this verse stands');
  has(vPage.cta, 'I Know By Heart', 'the way in is on the verse page, with no practice required');
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
    el('wScene').value = 'A scene I DO want kept';
    // the palace and spot each open a sheet now, so choose them the way a finger would
    if (el('wPalaceBtn')) { el('wPalaceBtn').click(); const p = document.querySelector('#psGrid [data-p="0"]'); if (p) p.click(); }
    if (el('wRoomBtn')) { el('wRoomBtn').click(); const r = document.querySelector('#psGrid [data-room="Sink"]'); if (r) r.click(); }
    el('wDoneTop').click();                                 // the GREEN tick
    return { saved: (Prog.customScene || {})[k] || '', backOnPalace: !!document.querySelector('.peLoc') };
  });
  is(tripSave.saved, 'A scene I DO want kept', 'the green tick saves what was typed');
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
  has(reveal.hintBefore, 'One reveal per verse', 'the screen says so before you spend');
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
  is(vids.n, 8, 'eight films, the Major System counting as two');
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
  // The film used to play here. It now waits for the first finished palace, because until there is
  // a palace to walk and something due, a rhythm of reviews is advice the reader cannot act on.
  no(firstVerse.shown, 'the first verse memorised does NOT bring up the spaced-repetition film');

  const srAfterPalace = await $(async () => {
    if (el('videoModal')) el('videoModal').style.display = 'none';
    Prog.doneSkills = (Prog.doneSkills || []).filter(x => x !== VIDEOS.sr.skill);
    Prog.palaces = []; saveProg();
    const before = { covered: (show('verse'), renderVerse(), !!document.querySelector('.versehub .slock')) };
    // finishing the first palace is what plays it
    Prog.palaces = [{ place: 'Home', stations: ['Door', 'Hall'], sr: {} }];
    saveProg();
    unlockAfterFirstPalace(() => {});
    await new Promise(r => setTimeout(r, 2600));
    const m = el('videoModal');
    before.filmShown = !!m && m.style.display === 'flex';
    before.filmTitle = m ? (m.querySelector('.lv-topbar div') || {}).textContent : null;
    if (before.filmShown) el('vsDone').click();
    await new Promise(r => setTimeout(r, 1800));
    before.uncovered = !document.querySelector('.versehub .slock');
    return before;
  });
  ok(srAfterPalace.covered, 'until then Spaced Repetition sits on the Library under a foil');
  ok(srAfterPalace.filmShown, 'finishing the first palace plays the spaced-repetition film');
  is(srAfterPalace.filmTitle, 'Spaced Repetition', '...that one');
  ok(srAfterPalace.uncovered, '...and the foil comes off the Library button afterwards');

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
  has(recall.txt, "Will Not Come", '...the one about a verse that will not come');

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
    // This block asserts what is due, so it sets what is due. Earlier blocks leave palaces dated to
    // the epoch, which are due forever, and inheriting those made the assertion depend on run order.
    // This block asserts what is due, so it decides what is due. Books count toward that total now,
    // and earlier blocks finish book lessons whose cards then fall due for good.
    Prog.memorized = ['43:3:16']; Prog.videoOrder = []; Prog.palaces = []; Prog.verseSR = {};
    Object.keys(SRS).forEach(k => { if (/^sk:(num|book):/.test(k)) delete SRS[k]; });
    saveProg(); bustCaches();
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
  has(vreview.openedTitle, 'Spaced Repetition', '...the one that was tapped');
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
  has(lpath.names, 'Phase 2: Mark–John + Joshua–Ruth', '...then Mark–John first, which finishes the four Gospels, and Joshua–Ruth after');
  has(lpath.names, 'Phase 12: All the Numbers', '...and the numbers alone at the end');
  hasNot(lpath.names, 'Memory Palace', 'the Memory Palace section is gone from the path');
  is(lpath.palaceSkills, 0, 'and no Add Palace tile is left anywhere on it');
  no(lpath.lastPhaseHasPalace, '...least of all on the last phase');
  is(lpath.dividers, lpath.phaseCount, 'a named rule marks every phase');
  is(lpath.tilesShown, lpath.tilesTotal, '...and with everything revealed, every tile is drawn');
  is(lpath.videoTiles, 0, 'no film keeps a tile on the path: each arrives when it explains something');
  is(lpath.videoSkills, 0, '...so no unit carries one as a skill either');
  is(lpath.videoWhere, '', '...not even the Code section, where both Major System films used to sit');
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
  // Opening Learn used to play it. It does not any more: straight after the welcome that made part
  // one of the Major System the first thing a new person saw, rather than the track itself.
  const majorShown = await $(async () => {
    const m0 = el('videoModal'); if (m0) m0.style.display = 'none';
    show('learn');
    await new Promise(r => setTimeout(r, 900));
    const m = el('videoModal');
    const out = { shown: !!m && m.style.display === 'flex', txt: m ? m.innerText : '' };
    if (out.shown) el('vsDone').click();
    // both films are still on the page: Intro at the top, the Major System on its own tile
    out.introButton = !!el('introFilm');
    out.majorTile = [...document.querySelectorAll('.tile.video small')].map(s => s.textContent).join(',');
    return out;
  });
  no(majorShown.shown, 'opening Learn does NOT play a film — Learn just opens');
  ok(majorShown.introButton, '...the Intro film sits at the top of it');
  is(majorShown.majorTile, '', '...and the Major System no longer waits as a tile — it opens with the first sound lesson');

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
      palacePicker: !!el('wPalaceBtn'),
      roomPicker: !!el('wRoomBtn'),
      cells: document.querySelectorAll('.lv-triple .lv-cell').length,
      txt: el('verse').innerText,
    };
    // one screen: write the scene, choose the palace and the room, done
    el('wScene').value = 'The scene for this story';
    el('wPalaceBtn').click(); document.querySelector('#psGrid [data-p="0"]').click();
    el('wRoomBtn').click(); document.querySelector('#psGrid [data-room="Front door"]').click();
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
  is(bstory.scene, 'The scene for this story', '...keeps the scene that was written');
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
      return ['.tline img,.tline .imgph', '.tname', '#tcBookImg', '.tnum', '.tword', '.sounds']
        .map(sel => (d.querySelector(sel) ? 1 : 0)).join('');
    };
    return { genesis: shape(1), leviticus: shape(3), matthew: shape(40), corinthians: shape(46), revelation: shape(66) };
  });
  is(tmpl.genesis, tmpl.corinthians, 'Genesis renders exactly the card 1 Corinthians does');
  is(tmpl.leviticus, tmpl.corinthians, '...and Leviticus');
  is(tmpl.matthew, tmpl.corinthians, '...and Matthew');
  is(tmpl.revelation, tmpl.corinthians, '...and Revelation');
  is(tmpl.genesis, '111111', '...all six parts present: image, name, write my own image, number, image name, sounds');

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

  // ─────────────────────── swiping from lesson to lesson ───────────────────────
  describe('lesson swipe', () => { });
  // A horizontal drag on the lesson screen moves one lesson along the path, and arriving by swipe is
  // arriving by tile: the same paywall, the same refusal when it is out of sequence. The gesture is
  // built out of real Touch objects because the handler reads clientX off them.
  const lswipe = await $(() => {
    const snap = { done: Prog.doneSkills.slice(), pro: Billing.isPro() };
    // This block asserts what a swipe reaches and what it does there, so it sets what has been
    // learned rather than inheriting whatever the blocks above left behind.
    // Including the films, which would otherwise open in front of the first sound lesson.
    ['major', 'major2', 'book', 'verse'].forEach(markVideoSeen);
    Billing.revoke();
    const host = el('learn');
    const drag = dx => {
      const r = host.getBoundingClientRect(), y = r.top + r.height * 0.6, x0 = r.left + r.width * 0.5;
      const fire = (type, x) => {
        const t = new Touch({ identifier: 1, target: host, clientX: x, clientY: y });
        host.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [t], changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t] }));
      };
      fire('touchstart', x0); fire('touchend', x0 + dx);
    };
    // doneSkills is reset more than once below, and a reset un-sees the films; they are put
    // back here so opening a lesson never lands on one instead.
    const openById = id => { ['major', 'major2', 'book', 'verse'].forEach(markVideoSeen);
      const f = flatSkills().find(x => x.id === id); startLesson(UNITS[f.ui].skills[f.si]); };
    const at = () => (LZ && LZ.sk ? LZ.sk.id : null);
    const payShut = () => { const m = el('payModal'); if (m) m.style.display = 'none'; };
    const paidUp = () => { const m = el('payModal'); return !!m && m.style.display !== 'none'; };
    const flat = flatSkills();

    // Everything up to the first lesson that costs money is behind us, so that one is unlocked AND
    // paywalled — the state where a swipe has to show the paywall rather than step over it.
    const order = swipeableLessons().map(s => s.id);
    const firstPaid = order.find(id => { const f = flat.find(x => x.id === id); return isPaidSkill(UNITS[f.ui].skills[f.si]); });
    const paidAt = flat.findIndex(x => x.id === firstPaid);
    Prog.doneSkills = flat.slice(0, paidAt).map(f => f.id);
    markVideoSeen('book');   // swiping onto a book lesson must not be interrupted by its first-run film
    bustCaches();

    const strayKinds = [...new Set(swipeableLessons().map(s => s.kind))].filter(k => ['num', 'book', 'sound'].indexOf(k) < 0).join(',');
    const onPathTotal = UNITS.reduce((n, U) => n + U.skills.filter(sk => ['num', 'book', 'sound'].indexOf(sk.kind) >= 0).length, 0);
    const pathOrder = flat.map(f => f.id);
    const inPathOrder = order.every((id, i) => i === 0 || pathOrder.indexOf(id) > pathOrder.indexOf(order[i - 1]));
    const skipsNothing = order.length === onPathTotal;

    // walking between lessons that are open
    openById(order[1]);
    const opened = at();
    drag(-140); const fwd = at();          // drag left: the lesson ahead
    drag(-140); const fwd2 = at();
    drag(140); const back = at();          // drag right: the lesson behind

    // a vertical drag belongs to the scroller
    const beforeV = at();
    (() => { const r = host.getBoundingClientRect();
      const fire = (type, y) => { const t = new Touch({ identifier: 1, target: host, clientX: r.left + 180, clientY: y });
        host.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [t], changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t] })); };
      fire('touchstart', r.top + 420); fire('touchend', r.top + 120); })();
    const afterV = at();

    // swiping onto a lesson that costs money: the paywall, exactly as the tile would
    payShut();
    openById(order[order.indexOf(firstPaid) - 1]);
    const beforePay = at();
    drag(-140);
    const payOpened = paidUp(), stayedPut = at() === beforePay;
    payShut();

    // swiping onto one that is out of sequence: the tile is disabled, so the swipe refuses too.
    // Nothing learned yet, so the second lesson is locked on sequence alone, with no money in it.
    Prog.doneSkills = []; bustCaches();
    const lockedId = order[1];
    const lockedIsFree = !skillPaywalled(UNITS[flat.find(x => x.id === lockedId).ui].skills[flat.find(x => x.id === lockedId).si]);
    const lockedIsShut = !(() => { const f = flat.find(x => x.id === lockedId); return skillUnlocked(f.ui, f.si); })();
    openById(order[0]);
    const wasLocked = at(); drag(-140);
    const lockedHeld = at() === wasLocked, lockedSaid = (el('vvToast') || {}).textContent || '';
    Prog.doneSkills = flat.slice(0, paidAt).map(f => f.id); markVideoSeen('book'); bustCaches();

    // the ends of the path hold. Pro so the last one opens at all.
    Billing.grant();
    openById(order[0]); drag(140); const atFirst = at();
    openById(order[order.length - 1]); drag(-140); const atLast = at();
    const endSaid = (el('vvToast') || {}).textContent || '';
    Billing.revoke();

    // the path screen is drawn into this same view and must not swipe
    renderPath(); drag(-140);
    const onPath = !!document.querySelector('#learn .lesson');

    Prog.doneSkills = snap.done; if (snap.pro) Billing.grant(); else Billing.revoke();
    bustCaches(); payShut();
    return { strayKinds, skipsNothing, orderLen: order.length, onPathTotal, inPathOrder,
      opened, expectOpened: order[1], fwd, expectFwd: order[2], fwd2, expectFwd2: order[3], back,
      moveOnVertical: beforeV !== afterV, payOpened, stayedPut, lockedId, lockedIsFree, lockedIsShut, lockedHeld, lockedSaid,
      atFirst, first: order[0], atLast, last: order[order.length - 1], endSaid, onPath };
  });
  is(lswipe.strayKinds, '', 'a swipe walks the lessons that look like the one you are on — no stories, no palaces');
  ok(lswipe.inPathOrder, 'and walks them in path order');
  ok(lswipe.skipsNothing, 'it steps over nothing: every lesson on the path is on the run, open or not');
  is(lswipe.orderLen, lswipe.onPathTotal, '...all of them');
  is(lswipe.opened, lswipe.expectOpened, 'a lesson is open to start with');
  is(lswipe.fwd, lswipe.expectFwd, 'dragging left opens the lesson ahead');
  is(lswipe.fwd2, lswipe.expectFwd2, 'and again, one at a time');
  is(lswipe.back, lswipe.expectFwd, 'dragging right goes back');
  no(lswipe.moveOnVertical, 'a vertical drag is the scroller, not a page turn');
  ok(lswipe.payOpened, 'swiping onto a lesson that costs money opens the paywall, exactly as pressing its tile does');
  ok(lswipe.stayedPut, 'and leaves you on the lesson you were reading');
  ok(lswipe.lockedIsFree && lswipe.lockedIsShut, 'with nothing learned, the second lesson is shut on sequence alone — no money in it');
  ok(lswipe.lockedHeld, 'swiping onto a lesson that is out of sequence does not open it — its tile is disabled too');
  has(lswipe.lockedSaid, 'Finish the lesson before this one', 'and says why, where a disabled tile just sits there');
  is(lswipe.atFirst, lswipe.first, 'the first lesson stays put when you drag back from it');
  is(lswipe.atLast, lswipe.last, 'and the last stays put when you drag on from it');
  has(lswipe.endSaid, 'last lesson on the path', 'saying so rather than doing nothing');
  no(lswipe.onPath, 'the path itself does not swipe, though it is drawn into the same view');

  // ─────────────── I Know By Heart, and the address that needs no palace ───────────────
  describe('I Know By Heart', () => { });
  // Two different things can already be known about a verse — where it lives, and how it reads.
  // They are not learned together and not lost together, so the claim asks which, and acts on the
  // answer: a known address gives up its room and is never asked by address again.
  const heartClaim = await $(() => {
    const snapM = Prog.memorized.slice(), snapS = JSON.stringify(Prog.verseStage || {});
    const snapL = JSON.stringify(Prog.verseLoc || {}), snapP = JSON.stringify(Prog.palaces || []);
    markVideoSeen('verse');
    const k = '43:10:10';
    const reset = () => { Prog.memorized = Prog.memorized.filter(x => x !== k);
      ['verseStage', 'verseLoc', 'verseSR', 'locPast', 'w4wSR'].forEach(f => { if (Prog[f]) delete Prog[f][k]; });
      saveProg();
      openVerseWizard(43, 10, 10, () => { }); };
    const pick = p => { el('wHeart').click(); document.querySelector('[data-part="' + p + '"]').click(); el('hcGo').click(); };

    reset();
    const card = document.querySelector('#verse .card');
    const kids = [...card.children].map(n => n.id || String(n.className).split(' ')[0]);
    const btn = kids.indexOf('wHeart'), ref = kids.indexOf('lv-ref'), pics = kids.indexOf('lv-triple');
    const label = el('wHeart').textContent.trim();

    // it asks which, and will not act until it is told
    el('wHeart').click();
    const m = el('heartModal');
    const asked = !!m && m.style.display === 'flex';
    const choices = [...m.querySelectorAll('[data-part]')].map(x => x.dataset.part).join(',');
    const armedBefore = !el('hcGo').disabled;
    document.querySelector('[data-part="both"]').click();
    const armedAfter = !el('hcGo').disabled;
    const askedNothingDone = !isHeart(k) && !locIsHeart(k) && !Prog.memorized.includes(k);

    el('hcNo').click();
    const notYet = { heart: isHeart(k), locHeart: locIsHeart(k), memorized: Prog.memorized.includes(k), back: !!el('wHeart') };

    // each answer does its own half, and lands where the work now is
    reset(); pick('loc');
    const asLoc = { stage: verseStage(k), locHeart: locIsHeart(k), memorized: Prog.memorized.includes(k),
      station: stationName((Prog.verseLoc || {})[k]), strict: !!(TT && TT.test), practising: !!el('tfClose') };
    if (TF) { TF = null; }

    reset(); pick('w4w');
    const asW4W = { stage: verseStage(k), locHeart: locIsHeart(k), strict: !!(TT && TT.test) };
    if (TT) TT = null;

    reset(); pick('both');
    const asBoth = { stage: verseStage(k), locHeart: locIsHeart(k), station: stationName((Prog.verseLoc || {})[k]), strict: !!(TT && TT.test) };
    if (TT) TT = null;

    // a known address is never asked by address again
    let where = null;
    const realFade = window.startWordForWord, realTest = window.startW4WTest, realAsk = window.askVerse;
    startWordForWord = () => { where = 'practice'; }; startW4WTest = () => { where = 'strict'; }; askVerse = () => { where = 'address'; };
    reset(); setLocHeart(k); delete Prog.verseStage[k];
    askVerseIn(k); const revLoc = where;
    Prog.verseStage[k] = 'heart'; where = null; askVerseIn(k); const revHeart = where;
    startWordForWord = realFade; startW4WTest = realTest; askVerse = realAsk;

    // walking the review trail hands the room back and leaves the verse holding the only location it needs
    reset();
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    if (!Prog.memorized.includes(k)) Prog.memorized.push(k);   // versesAtLoc counts memorized verses
    Prog.verseLoc[k] = { p: 0, room: 'Front door' }; Prog.verseStage[k] = 'heart';
    Prog.verseSR = Prog.verseSR || {};
    const heldBefore = versesAtLoc(0, 'Front door').length;
    // one checkpoint short of the end: the station is still the verse's
    Prog.verseSR[k] = { learnedAt: Date.now(), step: SR_TRAIL.length - 1, dueAt: Date.now() + 864e5, r0: 1 };
    const earlyFree = heartMaybeFreeStation(k);
    Prog.verseSR[k].step = SR_TRAIL.length;
    const freed = heartMaybeFreeStation(k);
    const seal = { heldBefore, earlyFree: !!earlyFree, freed: freed ? stationName(freed) : null,
      nowShows: stationName((Prog.verseLoc || {})[k]), heldAfter: versesAtLoc(0, 'Front door').length,
      remembered: !!(Prog.locPast || {})[k] };
    // and a demotion takes back only what the app freed
    setVerseStage(k, 'loc');
    seal.stationReturned = stationName((Prog.verseLoc || {})[k]);
    // a location the reader chose is theirs to keep
    setLocHeart(k); Prog.locPast[k] = { p: 0, room: 'Front door' };
    setVerseStage(k, 'heart'); setVerseStage(k, 'loc');
    seal.chosenKept = stationName((Prog.verseLoc || {})[k]);

    Prog.memorized = snapM; Prog.verseStage = JSON.parse(snapS);
    Prog.verseLoc = JSON.parse(snapL); Prog.palaces = JSON.parse(snapP);
    if (Prog.locPast) delete Prog.locPast[k];
    if (Prog.w4wSR) delete Prog.w4wSR[k];
    saveProg(); updateMetrics();
    return { btn, ref, pics, label, asked, choices, armedBefore, armedAfter, askedNothingDone,
      notYet, asLoc, asW4W, asBoth, revLoc, revHeart, seal };
  });
  has(heartClaim.label, 'I Know By Heart', 'the verse page offers I Know By Heart');
  ok(heartClaim.btn > heartClaim.ref && heartClaim.btn < heartClaim.pics, '…between the reference and the pictures, at the top of the verse');
  ok(heartClaim.asked, 'pressing it asks first');
  is(heartClaim.choices, 'loc,w4w,both', '…which of the two things you already know, or both');
  no(heartClaim.armedBefore, '…and will not register anything until one is chosen');
  ok(heartClaim.armedAfter, '…which arms it');
  ok(heartClaim.askedNothingDone, '…nothing having changed in the meantime');
  no(heartClaim.notYet.heart, '"Not yet" leaves the verse where it was');
  no(heartClaim.notYet.locHeart, '…in both halves');
  ok(heartClaim.notYet.back, '…and puts you back on the verse');

  is(heartClaim.asLoc.stage, 'loc', 'claiming the LOCATION leaves the words still to learn');
  ok(heartClaim.asLoc.locHeart, '…and retires the address');
  is(heartClaim.asLoc.station, 'Known by heart', '…which is what the verse now reads as living at');
  ok(heartClaim.asLoc.memorized, '…the verse counting as memorized, with no palace ever asked for');
  ok(heartClaim.asLoc.practising, '…and it goes into word for word, which is all that is left of it');

  is(heartClaim.asW4W.stage, 'heart', 'claiming the WORDS moves the verse to the strict test');
  no(heartClaim.asW4W.locHeart, '…and leaves the address alone, station and all');
  ok(heartClaim.asW4W.strict, '…starting that test now');

  is(heartClaim.asBoth.stage, 'heart', 'claiming BOTH does both');
  ok(heartClaim.asBoth.locHeart, '…the address');
  is(heartClaim.asBoth.station, 'Known by heart', '…reading as known by heart');
  ok(heartClaim.asBoth.strict, '…and the strict test with it');

  is(heartClaim.revLoc, 'practice', 'a verse whose address is known is never asked by address — only the words are left');
  is(heartClaim.revHeart, 'strict', '…the strict test once those words are claimed too');

  is(heartClaim.seal.heldBefore, 1, 'a verse being tested still holds its room');
  no(heartClaim.seal.earlyFree, '…and keeps it at four clean runs');
  is(heartClaim.seal.freed, 'My Kitchen · Front door', 'five clean runs hands the room back');
  is(heartClaim.seal.heldAfter, 0, '…the slot standing free for another verse');
  is(heartClaim.seal.nowShows, 'Known by heart', '…and the verse holding the only location it still needs');
  ok(heartClaim.seal.remembered, '…the old room remembered');
  is(heartClaim.seal.stationReturned, 'My Kitchen · Front door', '…and given back if the verse is ever demoted');
  is(heartClaim.seal.chosenKept, 'Known by heart', 'but an address the reader claimed themselves survives a demotion');

  // ─────────────────────────── unlock codes ───────────────────────────
  describe('unlock codes', () => { });
  // Written against Billing.codes rather than any particular code, so taking the code out before
  // launch — which is the plan — leaves this passing rather than failing for the wrong reason.
  const redeem = await $(() => {
    const snap = Billing.isPro();
    const code = (Billing.codes || [])[0] || null;
    const out = { has: !!code, wrong: null, blank: null, right: null, pro: null, plan: null,
                  loose: null, shutFree: null, shutPro: null, button: null };
    Billing.revoke();
    out.wrong = Billing.redeem('definitely-not-a-code');
    out.blank = Billing.redeem('');
    out.afterBad = Billing.isPro();
    if (code) {
      out.shutFree = flatSkills().filter(x => skillPaywalled(UNITS[x.ui].skills[x.si])).length;
      Billing.revoke();
      out.right = Billing.redeem(code);
      out.pro = Billing.isPro();
      out.plan = (Store.getJSON('vv_pro') || {}).plan;
      bustCaches();
      out.shutPro = flatSkills().filter(x => skillPaywalled(UNITS[x.ui].skills[x.si])).length;
      // typed the way a person types: capitals, spaces either side
      Billing.revoke();
      out.loose = Billing.redeem('  ' + code.toUpperCase().split('').join(' ') + '  ');
    }
    // the way in is on the paywall itself
    Billing.revoke();
    const f = flatSkills().find(x => skillPaywalled(UNITS[x.ui].skills[x.si]));
    if (f) { openPaywall(UNITS[f.ui].skills[f.si]);
      out.button = (el('payCode') || {}).textContent || null;
      const m = el('payModal'); if (m) m.style.display = 'none'; }
    if (snap) Billing.grant(); else Billing.revoke();
    bustCaches();
    return out;
  });
  no(redeem.wrong, 'a code that is not on the list is refused');
  no(redeem.blank, '...and so is an empty one');
  no(redeem.afterBad, '...neither of which grants anything');
  has(redeem.button || '', 'code', 'the paywall offers a way to enter one');
  if (redeem.has) {
    ok(redeem.right, 'a code that is on the list is accepted');
    ok(redeem.pro, '...and grants the full app');
    is(redeem.plan, 'code', '...recorded as a code rather than a purchase, so it is never mistaken for one');
    ok(redeem.shutFree > 0, '...where a free account has lessons it cannot open');
    is(redeem.shutPro, 0, '...and a redeemed one has none');
    ok(redeem.loose, 'case and spacing do not matter, because nobody types a code carefully');
  }

  // ───────────────── the phase ticket puts back what it covered ─────────────────
  describe('the phase ticket', () => { });
  // Finishing the sixth lesson of a phase ends the lesson AND wins the next phase. The ticket goes up
  // over the screen the lesson ended on — the one naming the verses it opened, with the way straight
  // into building one — so claiming it has to put that screen back, not the path.
  //
  // Driven directly rather than through finishLesson, which schedules the ticket on a 700ms timer:
  // waiting on that from a shared page means a second ticket can open mid-assertion and rebind the
  // claim button. What is being pinned is the contract — the claim runs the caller's callback and
  // the lesson screen can be drawn again — not the timer.
  const ticket = await $(() => {
    const snapDone = Prog.doneSkills.slice(), snapMax = Prog.phaseMax, snapLD = LESSON_DONE;
    const p = 4;
    Prog.phaseMax = p; Prog.doneSkills = [];
    phaseIdxs().filter(i => i <= p).forEach(i => UNITS[i].skills.forEach(sk => Prog.doneSkills.push(sk.id)));
    bustCaches(); saveProg();
    show('learn');

    // the screen a lesson ends on
    LESSON_DONE = { ok: 8, msg: '', unlocked: '<div class="callout">x</div>', hasNew: true, buildBook: 19 };
    const drew = renderLessonDone();
    const card = () => { const btn = el('lBuild') || el('lNextNum');
      return { on: !!el('lPath2'), btn: btn ? btn.id : null, path: !!document.querySelector('#learn .path') }; };
    const ended = card();

    // it survives being drawn over and drawn again — which is what makes it restorable at all
    renderPath(true);
    const covered = card();
    const redrew = renderLessonDone();
    const restored = card();

    // the claim runs the callback the caller gave it, and opens the phase either way
    window.__tkRan = 0;
    const won = maybePhaseScratch(() => { window.__tkRan++; renderLessonDone(); });
    const phaseBefore = Prog.phaseMax;
    const ticketUp = !!document.querySelector('#scov.on');
    const underneath = card();

    window.__tkSnap = { done: snapDone, max: snapMax, ld: snapLD };   // put back after the claim
    return { drew, ended, covered, redrew, restored, won, ticketUp, underneath, phaseBefore };
  });
  ok(ticket.drew, 'the screen a lesson ends on can be drawn on demand');
  ok(ticket.ended.on, '...showing its buttons');
  is(ticket.ended.btn, 'lBuild', '...the way into one of the verses the lesson opened');
  no(ticket.ended.path, '...and not the path');
  ok(ticket.covered.path, 'something else can be drawn over it');
  ok(ticket.redrew, '...and it can be drawn again afterwards');
  ok(ticket.restored.on, '...restoring the screen');
  is(ticket.restored.btn, ticket.ended.btn, '...with the same way forward it had');
  no(ticket.restored.path, '...the path gone again');
  ok(ticket.won, 'completing a phase wins the ticket for the next one');
  ok(ticket.ticketUp, '...which comes up over that screen');
  ok(ticket.underneath.on, '...leaving it underneath, where it was');

  // The claim is the part that changed: it used to render the path itself, so the screen the lesson
  // ended on was thrown away by the reward. Where it lands is the caller's to decide now.
  //
  // Driven through a stubbed ticket rather than a scratched one. The foil is a canvas that has to be
  // painted before a stroke registers, which means waiting a frame, which means a second ticket can
  // open on finishLesson's timer and rebind the claim in between. What matters here is the wiring.
  const claimWiring = await $(() => {
    const snapMax = Prog.phaseMax, snapLD = LESSON_DONE, realOpen = Scratch.open;
    Prog.phaseMax = 4;
    LESSON_DONE = { ok: 8, msg: '', unlocked: '<div class="callout">x</div>', hasNew: true, buildBook: 19 };
    const out = {};
    Scratch.open = (rung, opts) => opts.onClaim();          // as if it had been scratched and claimed

    // given a callback, the caller decides where it lands
    show('learn'); renderPath(true);
    let ran = 0;
    openPhaseScratch(5, () => { ran++; renderLessonDone(); });
    out.ran = ran;
    out.opened = Prog.phaseMax;
    out.onLesson = el('learn').innerHTML.indexOf('Skill complete') >= 0;
    out.notPath = !document.querySelector('#learn .path');

    // given none, it falls back to the path, which is what the admin tool wants
    Prog.phaseMax = 4; show('learn');
    openPhaseScratch(5, null);
    out.fallbackPath = !!document.querySelector('#learn .path');
    out.fallbackOpened = Prog.phaseMax;

    Scratch.open = realOpen; Prog.phaseMax = snapMax; LESSON_DONE = snapLD; saveProg();
    return out;
  });
  is(claimWiring.ran, 1, 'claiming the ticket runs the callback the caller gave it, exactly once');
  is(claimWiring.opened, 5, '...and opens the phase it was won for');
  ok(claimWiring.onLesson, '...landing back on the screen the lesson ended on');
  ok(claimWiring.notPath, '...rather than on the path, which is what it used to do');
  ok(claimWiring.fallbackPath, 'a caller that names no destination still gets the path');
  is(claimWiring.fallbackOpened, 5, '...and the phase opens either way');

  // ─────────────── the films come to you, at the moment they explain something ───────────────
  describe('films on the track', () => { });
  // A film is not a lesson. It is what explains the lesson you are about to do, so it belongs at the
  // moment you do it rather than as a tile on the path you have to notice and choose.
  const films = await $(() => {
    const snapDone = Prog.doneSkills.slice(), snapOrder = (Prog.videoOrder || []).slice();
    const snapMem = Prog.memorized.slice(), snapMax = Prog.phaseMax;
    const shut = () => { const m = el('videoModal'); if (m) m.style.display = 'none'; };
    const reset = () => { Prog.doneSkills = []; Prog.videoOrder = []; Prog.memorized = [];
      Prog.extraKnown = []; Prog.phaseMax = 99; bustCaches(); saveProg(); shut(); };
    // which film is up, asked of the app: opening one records it
    const showing = () => { const m = el('videoModal');
      if (!m || m.style.display !== 'flex') return null;
      const o = Prog.videoOrder || []; return o[o.length - 1] || null; };
    const enter = id => { const f = flatSkills().find(x => x.id === id); startLesson(UNITS[f.ui].skills[f.si]); };
    const review = host => (document.querySelector(host + ' [data-revlesson]') || {}).dataset?.revlesson || null;
    const out = {};

    out.tiles = UNITS.reduce((n, U) => n + U.skills.filter(s => s.kind === 'video').length, 0);
    out.unit0 = UNITS[0].skills.map(s => s.id).join(',');

    reset(); enter('snd:0-4');
    out.firstSound = showing();
    shut(); markVideoSeen('major'); enter('snd:0-4');
    out.againSound = showing();
    out.reviewFirst = review('#learn');

    reset(); markVideoSeen('major'); markVideoSeen('major2'); enter('snd:5-9');
    out.reviewSecond = review('#learn');

    reset(); enter('book:1');
    out.firstBook = showing();
    shut(); markVideoSeen('book'); enter('book:2');
    out.reviewBook = review('#learn');

    reset(); openVerseWizard(43, 3, 16, () => { });
    out.firstVerse = showing();
    shut(); markVideoSeen('verse'); openVerseWizard(43, 3, 16, () => { });
    out.reviewVerse = review('#verse');
    out.keep = (el('wSave') || {}).className || '';
    out.pass = (el('wSkip') || {}).className || '';

    out.library = VIDEO_ORDER.filter(k => VIDEOS[k] && VIDEOS[k].src);

    shut();
    Prog.doneSkills = snapDone; Prog.videoOrder = snapOrder;
    Prog.memorized = snapMem; Prog.phaseMax = snapMax;
    bustCaches(); saveProg();
    return out;
  });
  is(films.tiles, 0, 'no film is a tile on the learn track any more');
  is(films.unit0, 'snd:0-4,snd:5-9', '...the Code is the two sound lessons and nothing else');
  is(films.firstSound, 'major', 'part one plays as the first sound lesson opens');
  is(films.againSound, null, '...once, and never again on the way in');
  is(films.reviewFirst, 'major', '...and Review Lesson in that lesson is part one');
  is(films.reviewSecond, 'major2', 'the second sound lesson reviews part two, not part one');
  is(films.firstBook, 'book', 'Building the Books plays as the first book lesson opens');
  is(films.reviewBook, 'book', '...and stays behind Review Lesson for every book lesson after it');
  is(films.firstVerse, 'verse', 'Building Scenes plays the first time a verse is opened to build');
  is(films.reviewVerse, 'verse', '...and Review Lesson on that screen plays it again');
  has(films.keep, 'wkeep', 'Save for later is marked as the one that keeps the verse');
  has(films.pass, 'wpass', '...and Skip as the one that passes over it');
  ok(films.library.indexOf('major') >= 0 && films.library.indexOf('major2') >= 0,
     'both Major System films are still in Video Review, off the track but not gone');

  // Part two waits for the sounds to actually be learned, which is the end of the second lesson.
  const partTwo = await $(() => {
    const snapDone = Prog.doneSkills.slice(), snapMax = Prog.phaseMax;
    const m0 = el('videoModal'); if (m0) m0.style.display = 'none';
    Prog.doneSkills = []; Prog.videoOrder = []; Prog.phaseMax = 99;
    markVideoSeen('major'); Prog.doneSkills.push('snd:0-4'); bustCaches(); saveProg();
    const f = flatSkills().find(x => x.id === 'snd:5-9');
    LZ = { sk: UNITS[f.ui].skills[f.si], steps: [], i: 0, total: 1, ok: 10 };
    finishLesson();
    window.__ptDone = snapDone; window.__ptMax = snapMax;
    return { onLessonScreen: !!el('lPath2'), notYet: !videoSeen('major2') };
  });
  await page.waitForTimeout(1100);            // the film is on the same timer as the phase ticket
  const partTwoAfter = await $(() => {
    const m = el('videoModal');
    const o = Prog.videoOrder || [];
    const out = { playing: (m && m.style.display === 'flex') ? o[o.length - 1] : null,
                  behindIt: !!el('lPath2') };
    if (m) m.style.display = 'none';
    LZ = null; LESSON_DONE = null;
    Prog.doneSkills = window.__ptDone; Prog.phaseMax = window.__ptMax; bustCaches(); saveProg();
    return out;
  });
  ok(partTwo.onLessonScreen, 'finishing the second sound lesson ends on the lesson screen');
  ok(partTwo.notYet, '...with part two not yet played');
  is(partTwoAfter.playing, 'major2', '...and then part two plays, once the sounds are actually in');
  ok(partTwoAfter.behindIt, '...with the lesson screen still behind it to come back to');

  const bad = T.report('behaviour');
  const consoleErrs = page.__errors.filter(e => !/favicon/i.test(e));
  if (consoleErrs.length) { console.error(`  ✗ ${consoleErrs.length} console error(s):`); consoleErrs.slice(0, 5).forEach(e => console.error('      ' + e)); }
  await browser.close(); stopServer();
  process.exit(bad + consoleErrs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
