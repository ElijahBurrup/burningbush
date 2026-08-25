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
  is(data.storiesTagged, 100, 'a hundred Bible stories');

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
    Prog.doneSkills = ['video:major', 'snd:0-4', 'snd:5-9', 'num:1', 'num:2', 'num:3', 'num:4', 'num:5', 'book:40', 'video:verse', 'video:palace', 'palace:0', 'video:sr'];
    Prog.lessonUnlocks = []; Prog.talents = 1200; bustCaches(); saveProg();
    show('learn'); expandedUnits = new Set(UNITS.map((_, i) => i)); renderPath();
    const tiles = [...document.querySelectorAll('#learn .tile:not(.tickettile):not(.video)')];
    const free = { total: tiles.length, buyable: tiles.filter(t => t.classList.contains('pro') && !t.disabled).length,
      skippable: tiles.filter(t => t.classList.contains('pro') && t.classList.contains('locked') && !t.disabled).length };
    Billing.grant(); bustCaches(); show('learn'); expandedUnits = new Set(UNITS.map((_, i) => i)); renderPath();
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
    Prog.verseSR = { '43:3:16': { learnedAt: Date.now() - 86400000 - 1000, step: 1 } }; saveProg();
    const a = goalCount(); reviewVerseSR('43:3:16'); const afterD1 = goalCount() - a;
    Prog.verseSR = { '43:3:16': { learnedAt: Date.now() - 9 * 86400000, step: 3 } }; saveProg();
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
    show('stories'); storyExpanded = new Set([ui]); renderStories();
    const locked = el('stories').innerText;
    const out = { header: /Creation/.test(locked), hidden: !/Noah/.test(locked), buy: !!document.querySelector('[data-buysec]') };
    const before = Prog.talents;
    buyStorySection(ui, () => { }); el('spYes').click();
    out.spent = before - Prog.talents; out.owned = storySectionOwned(ui);
    renderStories(); out.shownAfter = /Noah/.test(el('stories').innerText);
    Billing.grant(); Prog.storySections = []; saveProg(); renderStories();
    out.proSeesAll = /Noah/.test(el('stories').innerText);
    Billing.revoke();
    return out;
  });
  ok(story.header, 'a locked section still shows its name');
  ok(story.hidden, '…but not the stories inside');
  ok(story.buy, '…and offers to open it');
  is(story.spent, 500, 'opening a section costs 500');
  ok(story.owned && story.shownAfter, '…after which the stories are there');
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

  describe('ladder: stages', () => { });
  const st = await $(() => {
    const k = '43:3:16';
    if (!Prog.memorized.includes(k)) Prog.memorized.push(k);
    Prog.verseStage = {}; Prog.locPast = {};
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } }; saveProg();
    const out = { stages: V_STAGES.join(','), fresh: verseStage(k), memBefore: Prog.memorized.length };
    const up = setVerseStage(k, 'heart');
    out.now = verseStage(k);
    out.heldAfter = !!(Prog.verseLoc || {})[k];
    out.remembered = JSON.stringify((Prog.locPast || {})[k] || null);
    out.freed = up && up.freed ? stationName(up.freed) : '';
    out.memAfter = Prog.memorized.length;
    setVerseStage(k, 'loc');                       // ...and back down again
    out.back = verseStage(k);
    out.restored = JSON.stringify((Prog.verseLoc || {})[k] || null);
    out.pastCleared = !((Prog.locPast || {})[k]);
    return out;
  });
  is(st.stages, 'loc,w4w,heart', 'three rungs, in order');
  is(st.fresh, 'loc', 'a verse starts at Locating with nothing stored');
  is(st.now, 'heart', 'it can be moved to Known by heart');
  no(st.heldAfter, '...which releases its palace station');
  is(st.remembered, '{"p":0,"room":"Front door"}', '...but remembers where it was');
  is(st.freed, 'My Kitchen · Front door', '...and can name what it freed');
  is(st.memAfter, st.memBefore, 'and it STILL counts as a memorized verse');
  is(st.back, 'loc', 'the move is reversible');
  is(st.restored, '{"p":0,"room":"Front door"}', '...putting the verse back where it was');
  ok(st.pastCleared, '...and clearing the remembered station');

  describe('ladder: at rest', () => { });
  const rest = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.revPrefs = { loc: true, w4w: true, heart: false };
    Prog.customScene = {}; Prog.verseLoc = {}; Prog.w4w = {}; Prog.w4wToday = null;
    Prog.verseSR = { [k]: Object.assign(newSR(), { step: 1, dueAt: Date.now() - 86400000 }) }; saveProg();
    const before = { deck: deckKeys().includes(k), due: verseDue(k), dueN: versesDueCount(), pick: !!pickW4WVerse() };
    show('verse'); vView = 'mem'; vBook.mem = new Set([43]);   // open the book so verse rows are actually drawn
    renderVerse();
    before.nudged = /missing a scene|missing a sc/i.test(el('verse').innerText);
    setVerseStage(k, 'heart');
    renderVerse();
    const after = { deck: deckKeys().includes(k), due: verseDue(k), dueN: versesDueCount(), pick: !!pickW4WVerse(),
      nudged: /missing a scene|missing a sc/i.test(el('verse').innerText),
      listed: /John 3:16/.test(el('verse').innerText), counts: stageCounts() };
    return { before, after };
  });
  ok(rest.before.deck, 'while it is being located the verse is in the practice deck');
  ok(rest.before.due, '...and can fall due');
  is(rest.before.dueN, 1, '...and is counted as due');
  ok(rest.before.pick, '...and is offered for word-for-word practice');
  ok(rest.before.nudged, '...and is nagged for a scene and a station');
  no(rest.after.deck, 'at rest it leaves the practice deck');
  no(rest.after.due, '...never falls due');
  is(rest.after.dueN, 0, '...is not counted as due');
  no(rest.after.pick, '...is not handed out for practice');
  no(rest.after.nudged, '...and is NEVER asked for a scene or a station again');
  ok(rest.after.listed, 'yet it is still there in the memorized list');
  is(rest.after.counts.heart, 1, '...counted under Known by heart');

  describe('ladder: the word-for-word test', () => { });
  const clean = await $(() => {
    const k = '43:11:35';                                    // "Jesus wept." - two words
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'w4w' }; Prog.w4wSR = {}; saveProg();
    startW4WTest(43, 11, 35, () => { });
    const out = { isTest: !!TT.test, hintHidden: el('ttHint').style.display === 'none', misses0: TT.misses };
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    TT.words.slice().forEach(put);
    const r = w4wsr(k) || {};
    out.n = r.n; out.ok = r.ok; out.cr = r.cr;
    out.result = el('verse').innerText;
    return out;
  });
  ok(clean.isTest, 'a test knows it is a test');
  ok(clean.hintHidden, '...and offers no reveal-a-letter');
  is(clean.misses0, 0, '...starting with a clean sheet');
  is(clean.n, 1, 'finishing it records a test');
  is(clean.ok, 1, '...a passed one');
  is(clean.cr, 1, '...and starts the streak');
  has(clean.result, 'Clean runs in a row: 1 of 5', 'the result says how far along the streak is');

  const dirty = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'w4w' };
    Prog.w4wSR = { [k]: { cr: 3, n: 3, ok: 3, at: 0 } }; saveProg();
    startW4WTest(43, 11, 35, () => { });
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    put('Jesux');                                            // same length, wrong word
    const misses = TT.misses;
    TT.words.slice().forEach(put);
    const r = w4wsr(k) || {};
    return { misses, cr: r.cr, n: r.n, ok: r.ok };
  });
  is(dirty.misses, 1, 'a wrong word is counted');
  is(dirty.n, 4, '...the attempt still counts as a test');
  is(dirty.ok, 3, '...but not as a pass');
  is(dirty.cr, 0, '...and a single slip breaks the run of five');

  describe('ladder: promotions', () => { });
  const ten = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.verseStage = {}; Prog.stageAsk = {};
    Prog.w4w = { [k]: { count: 9, times: [] } }; saveProg();
    const at9 = shouldOfferW4W(k);
    Prog.w4w[k].count = 10; saveProg();
    const at10 = shouldOfferW4W(k);
    Prog.verseStage = { [k]: 'w4w' }; saveProg();
    const alreadyThere = shouldOfferW4W(k);
    Prog.verseStage = {}; saveProg();
    noteStageAsk(k, 'w4w', 10);
    return { at9, at10, alreadyThere, afterDecline: shouldOfferW4W(k) };
  });
  no(ten.at9, 'nine practices is not yet the moment to ask');
  ok(ten.at10, 'ten is');
  no(ten.alreadyThere, '...and a verse already in the pool is never asked again');
  no(ten.afterDecline, 'declining is remembered — it asks once, not every time');

  const five = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'w4w' }; Prog.stageAsk = {};
    Prog.palaces = [{ place: 'My Kitchen', stations: ['Front door'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { [k]: { p: 0, room: 'Front door' } };
    Prog.w4wSR = { [k]: { cr: 4, n: 4, ok: 4, at: 0 } }; saveProg();
    const at4 = shouldOfferHeart(k);
    startW4WTest(43, 11, 35, () => { });
    const put = w => { const i = el('ttIn'); i.value = w; i.dispatchEvent(new Event('input')); };
    TT.words.slice().forEach(put);
    const out = { at4, streak: w4wTestStreak(k), at5: shouldOfferHeart(k) };
    el('wtDone').click();
    const m = el('promoteModal');
    out.asked = !!m && m.style.display === 'flex';
    out.txt = m ? m.innerText : '';
    if (out.asked) {
      el('prYes').click();
      out.stage = verseStage(k);
      out.freed = !((Prog.verseLoc || {})[k]);
      out.stillMemorized = Prog.memorized.includes(k);
    }
    return out;
  });
  no(five.at4, 'four in a row is not enough to retire a verse');
  is(five.streak, 5, 'a fifth clean run completes it');
  ok(five.at5, '...and that is the moment to ask');
  ok(five.asked, 'the offer arrives as a popup');
  has(five.txt, 'Known by Heart', '...naming where it would go');
  has(five.txt, 'My Kitchen', '...and naming the station it would free');
  is(five.stage, 'heart', 'accepting moves it');
  ok(five.freed, '...releasing the station');
  ok(five.stillMemorized, '...and it is still a memorized verse');

  describe('ladder: how you are asked', () => { });
  const chooser = await $(() => {
    Prog.memorized = ['43:3:16']; Prog.verseStage = {}; saveProg();
    show('verse'); openReviewSetup();
    const noneToChoose = !el('rvRows');
    Prog.verseStage = { '43:3:16': 'w4w' }; saveProg();
    show('verse'); openReviewSetup();
    const rows = [...document.querySelectorAll('#rvRows [data-rk]')].map(b => b.dataset.rk);
    return { noneToChoose, rows: rows.join(','), pool: w4wPoolSize() };
  });
  ok(chooser.noneToChoose, 'with nothing in the pool there is nothing to choose — review starts as it always did');
  is(chooser.pool, 1, 'once a verse is in the pool');
  is(chooser.rows, 'loc,w4w', '...the chooser offers both ways of being asked');

  const routed = await $(() => {
    const k = '43:11:35';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'w4w' };
    Prog.revPrefs = { loc: false, w4w: true, heart: false }; saveProg();
    askVerseIn(k);
    const byTyping = !!el('ttIn');
    Prog.revPrefs = { loc: true, w4w: false, heart: false }; saveProg();
    askVerseIn(k);
    const byAddress = !!el('mtFieldB');
    Prog.verseStage = {}; Prog.revPrefs = { loc: false, w4w: true, heart: false }; saveProg();
    askVerseIn(k);                                            // still being located
    const stage1 = !!el('mtFieldB');
    Prog.revPrefs = { loc: false, w4w: false, heart: false }; saveProg();
    return { byTyping, byAddress, stage1, guard: revPrefs().loc };
  });
  ok(routed.byTyping, 'choose word for word and the verse is asked by typing');
  ok(routed.byAddress, 'choose location and the same verse is asked by address');
  ok(routed.stage1, 'a verse still being located is ALWAYS asked by address');
  ok(routed.guard, 'unticking both falls back to location rather than asking nothing');

  const hearts = await $(() => {
    const k = '43:3:16';
    Prog.memorized = [k]; Prog.verseStage = { [k]: 'heart' };
    Prog.verseSR = { [k]: newSR() };
    Prog.revPrefs = { loc: true, w4w: true, heart: false }; saveProg();
    const out = { off: deckKeys().includes(k) };
    Prog.revPrefs = { loc: true, w4w: true, heart: true }; saveProg();
    out.on = deckKeys().includes(k);
    out.stillNotDue = verseDue(k);
    return out;
  });
  no(hearts.off, 'a resting verse is left out of practice by default');
  ok(hearts.on, '...and included when you ask for it');
  no(hearts.stillNotDue, '...but never becomes DUE either way — resting means resting');

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
  is(vPage.pips, 3, 'the verse page shows all three rungs');
  has(vPage.onNow, 'Locating', '...marking where this verse stands');
  has(vPage.cta, 'know this one by heart', 'the way in is on the verse page');
  ok(vPage.picker, 'tapping it opens the picker');
  is(vPage.choices, 3, '...offering all three');
  is(vPage.stage, 'heart', 'choosing Known by heart moves the verse');
  ok(vPage.ribbon, '...and the page says so');
  no(vPage.inWizard, 'it is NOT offered while building a new verse — that would be a shortcut past learning');

  await page.evaluate(snap => { Object.assign(Prog, JSON.parse(snap)); saveProg(); }, ladderSnap);

  const bad = T.report('behaviour');
  const consoleErrs = page.__errors.filter(e => !/favicon/i.test(e));
  if (consoleErrs.length) { console.error(`  ✗ ${consoleErrs.length} console error(s):`); consoleErrs.slice(0, 5).forEach(e => console.error('      ' + e)); }
  await browser.close(); stopServer();
  process.exit(bad + consoleErrs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
