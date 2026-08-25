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

  const bad = T.report('behaviour');
  const consoleErrs = page.__errors.filter(e => !/favicon/i.test(e));
  if (consoleErrs.length) { console.error(`  ✗ ${consoleErrs.length} console error(s):`); consoleErrs.slice(0, 5).forEach(e => console.error('      ' + e)); }
  await browser.close(); stopServer();
  process.exit(bad + consoleErrs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
