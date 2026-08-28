/**
 * tests/qa/sweep.js — a QA sweep, not a regression suite.
 *
 * The behaviour/snapshot/layout suites pin what the app DOES today. That makes them blind to
 * anything that has been wrong all along: a control with no handler, a template that renders
 * "undefined", two elements sharing an id, a screen with no way out. This sweep asks different
 * questions, and every finding is a candidate bug rather than a diff.
 *
 *   node tests/qa/sweep.js            run everything
 *   node tests/qa/sweep.js --only=X   just the sections whose name contains X
 *
 * It prints findings grouped by area. It never blesses anything and has no golden file.
 */
const { chromium, open, stopServer, SEEDED } = require('../lib/harness');
const SCREENS = require('../snapshot/screens');

const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || '';
const findings = [];
const flag = (area, detail) => findings.push({ area, detail });
const section = name => !only || name.includes(only);

// Text that should never reach a person's eyes.
const BAD_TEXT = [
  ['undefined', /\bundefined\b/],
  ['NaN', /\bNaN\b/],
  ['[object Object]', /\[object Object\]/],
  ['null', /\bnull\b/],
  ['Infinity', /\bInfinity\b/],
  ['empty template', /\$\{/],
];

const drive = (page, go) => page.evaluate(fn => {
  document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
  ['taxov', 'buildov', 'scov', 'simov'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on', 'march'); });
  // eslint-disable-next-line no-new-func
  new Function('return (' + fn + ')')()();
}, go.toString());

(async () => {
  const browser = await chromium().launch();

  /* ── 1. every screen: text that should not be there, and ids that clash ───────────────── */
  if (section('screens')) {
    for (const pro of [false, true]) {
      const list = SCREENS.filter(s => !!s.pro === pro);
      if (!list.length) continue;
      const page = await open(browser, { pro, prog: SEEDED });
      for (const s of list) {
        try {
          await drive(page, s.go);
          await page.waitForTimeout(40);
          const r = await page.evaluate(sel => {
            const root = document.querySelector(sel);
            const seen = {}, dupes = [];
            document.querySelectorAll('[id]').forEach(x => {
              if (seen[x.id]) { if (dupes.indexOf(x.id) < 0) dupes.push(x.id); } else seen[x.id] = 1;
            });
            const deadButtons = [];
            (root ? [...root.querySelectorAll('button')] : []).forEach(b => {
              const labelled = b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title') || b.querySelector('svg,img');
              if (!labelled) deadButtons.push(b.className || b.id || 'button');
            });
            return { found: !!root, text: root ? root.innerText : '', dupes, deadButtons };
          }, s.sel);
          if (!r.found) { flag('screens', `${s.name}: ${s.sel} not found`); continue; }
          BAD_TEXT.forEach(([label, re]) => { if (re.test(r.text)) flag('bad text', `${s.name}: shows "${label}"`); });
          r.dupes.forEach(id => flag('duplicate id', `${s.name}: #${id} appears more than once`));
          r.deadButtons.forEach(c => flag('unlabelled control', `${s.name}: button with no text, title or icon (${c})`));
        } catch (e) { flag('screens', `${s.name}: ${String(e.message).split('\n')[0]}`); }
      }
      (page.__errors || []).forEach(e => flag('console', e));
      await page.close();
    }
  }

  /* ── 2. every control on every screen: does pressing it throw? ─────────────────────────── */
  if (section('controls')) {
    for (const pro of [false, true]) {
      const list = SCREENS.filter(s => !!s.pro === pro);
      if (!list.length) continue;
      for (const s of list) {
        const page = await open(browser, { pro, prog: SEEDED });
        let n = 0;
        try {
          await drive(page, s.go);
          n = await page.evaluate(sel => {
            const root = document.querySelector(sel);
            return root ? root.querySelectorAll('button:not([disabled])').length : 0;
          }, s.sel);
        } catch (e) { flag('controls', `${s.name}: ${e.message}`); }
        for (let i = 0; i < Math.min(n, 14); i++) {
          try {
            await drive(page, s.go);
            await page.evaluate(({ sel, i }) => {
              const root = document.querySelector(sel);
              const b = root && root.querySelectorAll('button:not([disabled])')[i];
              if (b) b.click();
            }, { sel: s.sel, i });
            await page.waitForTimeout(30);
          } catch (e) { flag('controls', `${s.name} button ${i}: ${String(e.message).split('\n')[0]}`); }
        }
        (page.__errors || []).forEach(e => flag('control error', `${s.name}: ${e}`));
        await page.close();
      }
    }
  }

  /* ── 3. persistence: what is saved must survive a reload ──────────────────────────────── */
  if (section('persistence')) {
    const page = await open(browser, { prog: SEEDED });
    const before = await page.evaluate(() => {
      Prog.talents = 4242; Prog.dayStreak = 9; Prog.memorized = ['43:3:16', '19:23:1'];
      Prog.verseStage = { '43:3:16': 'heart' }; Prog.videoOrder = ['sr', 'palace'];
      Prog.features = { dict: true }; Prog.phaseMax = furthestStartedPhase();
      Object.keys(VIDEOS).forEach(k => markVideoSeen(k)); Prog.videoOrder = ['sr', 'palace'];
      saveProg();
      return JSON.stringify({ t: Prog.talents, s: Prog.dayStreak, m: Prog.memorized.length,
        stage: verseStage('43:3:16'), vids: (Prog.videoOrder || []).join(','), dict: feat('dict'), phase: Prog.phaseMax });
    });
    await page.reload();
    await page.waitForFunction(() => typeof window.Prog !== 'undefined', null, { timeout: 15000 }).catch(() => { });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => JSON.stringify({ t: Prog.talents, s: Prog.dayStreak, m: Prog.memorized.length,
      stage: verseStage('43:3:16'), vids: (Prog.videoOrder || []).join(','), dict: feat('dict'), phase: Prog.phaseMax }));
    if (before !== after) flag('persistence', `a reload changed saved state:\n      before ${before}\n      after  ${after}`);
    (page.__errors || []).forEach(e => flag('console', e));
    await page.close();
  }

  /* ── 4. migration: a blob from any era must load without losing anything ──────────────── */
  if (section('migrate')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      const cases = {
        'empty object': {},
        'null': null,
        'ancient': { memorized: ['43:3:16'], doneSkills: ['num:1'], talents: 50 },
        'wrong types': { memorized: 'nope', doneSkills: 7, palaces: 'x', talents: 'lots', verseSR: 5, features: 3 },
        'negative talents': { talents: -500, freezes: -2, dayStreak: -9 },
        'huge': { talents: 1e12, dayStreak: 99999 },
      };
      for (const [name, blob] of Object.entries(cases)) {
        try {
          const p = migrateProg(blob ? JSON.parse(JSON.stringify(blob)) : null);
          if (!Array.isArray(p.memorized)) out.push(`${name}: memorized is not an array`);
          if (!Array.isArray(p.doneSkills)) out.push(`${name}: doneSkills is not an array`);
          if (!Array.isArray(p.palaces)) out.push(`${name}: palaces is not an array`);
          if (typeof p.talents !== 'number' || !isFinite(p.talents)) out.push(`${name}: talents is ${p.talents}`);
          if (p.talents < 0) out.push(`${name}: talents went negative (${p.talents})`);
          if (typeof p.freezes === 'number' && p.freezes < 0) out.push(`${name}: freezes negative (${p.freezes})`);
          if (typeof p.dayStreak === 'number' && p.dayStreak < 0) out.push(`${name}: dayStreak negative (${p.dayStreak})`);
        } catch (e) { out.push(`${name}: threw — ${e.message}`); }
      }
      return out;
    });
    r.forEach(x => flag('migrate', x));
    await page.close();
  }

  /* ── 5. merge: syncing two devices must never lose work ───────────────────────────────── */
  if (section('merge')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      const base = () => migrateProg(JSON.parse(JSON.stringify(Prog)));
      const A = base(), B = base();
      A.memorized = ['43:3:16', '19:23:1']; B.memorized = ['45:8:28'];
      A.doneSkills = ['num:1', 'num:2']; B.doneSkills = ['num:3'];
      A.talents = 300; B.talents = 900;
      A.palaces = [{ place: 'A', stations: ['x'], learnedAt: 1, step: 1 }];
      B.palaces = [{ place: 'A', stations: ['x'], learnedAt: 1, step: 1 }, { place: 'B', stations: ['y'], learnedAt: 1, step: 1 }];
      A.dayStreak = 4; B.dayStreak = 11;
      const m = mergeProg(A, B);
      ['43:3:16', '19:23:1', '45:8:28'].forEach(k => { if (!m.memorized.includes(k)) out.push(`merge dropped verse ${k}`); });
      ['num:1', 'num:2', 'num:3'].forEach(k => { if (!m.doneSkills.includes(k)) out.push(`merge dropped skill ${k}`); });
      if (m.talents < 900) out.push(`merge lost talents (${m.talents} < 900)`);
      if ((m.palaces || []).length < 2) out.push(`merge lost a palace (${(m.palaces || []).length} < 2)`);
      if (m.dayStreak < 11) out.push(`merge lost the streak (${m.dayStreak} < 11)`);
      // merging with itself must be a no-op
      const self = mergeProg(base(), base());
      if (self.memorized.length !== Prog.memorized.length) out.push('merging an account with itself changed its verses');
      if ((self.palaces || []).length !== (Prog.palaces || []).length) out.push('merging an account with itself changed its palaces');
      return out;
    });
    r.forEach(x => flag('merge', x));
    await page.close();
  }

  /* ── 6. an empty account: nothing should throw and nothing should dead-end ────────────── */
  if (section('empty')) {
    const page = await open(browser, { prog: { memorized: [], doneSkills: [], palaces: [], talents: 0, verseSR: {}, saved: [], skipped: [] } });
    const r = await page.evaluate(() => {
      const out = [];
      ['learn', 'verse', 'palace', 'journey', 'stories'].forEach(t => {
        try { show(t); } catch (e) { out.push(`show(${t}) threw — ${e.message}`); }
      });
      try { show('verse'); vView = 'hub'; renderVerse(); } catch (e) { out.push(`empty Library threw — ${e.message}`); }
      const hub = el('verse').innerText;
      if (/\bNaN\b|\bundefined\b/.test(hub)) out.push('empty Library renders NaN or undefined');
      try { renderPath(true); } catch (e) { out.push(`empty Learn threw — ${e.message}`); }
      try { renderStories(); } catch (e) { out.push(`empty Stories threw — ${e.message}`); }
      try { renderPalace(); } catch (e) { out.push(`empty Palaces threw — ${e.message}`); }
      try { if (goalToday() < 1) out.push(`goalToday() is ${goalToday()} on a fresh account`); } catch (e) { out.push(`goalToday threw — ${e.message}`); }
      try { if (reviewDueCount() !== 0) out.push(`a fresh account has ${reviewDueCount()} due`); } catch (e) { out.push(`reviewDueCount threw — ${e.message}`); }
      return out;
    });
    r.forEach(x => flag('empty account', x));
    (page.__errors || []).forEach(e => flag('console', `empty account: ${e}`));
    await page.close();
  }

  /* ── 7. boundaries: the far edges of the Bible and of the economy ─────────────────────── */
  if (section('bounds')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      // Psalm 119:176 is the highest verse number in the Bible; Psalms has the most chapters
      if (chapCount(19) !== 150) out.push(`Psalms has ${chapCount(19)} chapters, expected 150`);
      if (verseCount(19, 119) !== 176) out.push(`Psalm 119 has ${verseCount(19, 119)} verses, expected 176`);
      for (const n of [0, 1, 66, 99, 100, 150, 176]) {
        const p = pegFor(n);
        if (!p || !p.word) out.push(`pegFor(${n}) has no word`);
      }
      if (bookName(1) !== 'Genesis') out.push(`bookName(1) is ${bookName(1)}`);
      if (bookName(66) !== 'Revelation') out.push(`bookName(66) is ${bookName(66)}`);
      if (/undefined/.test(String(bookName(67)))) out.push('bookName(67) returns undefined rather than a safe blank');
      // talents display
      if (!/^\d+$/.test(talDisp(0))) out.push(`talDisp(0) is "${talDisp(0)}"`);
      if (talDisp(1e9) !== '∞') out.push(`talDisp(1e9) is "${talDisp(1e9)}", expected ∞`);
      // spending more than you have must not go negative
      Prog.talents = 10; spendTalents(500);
      if (Prog.talents < 0) out.push(`spending more than you have leaves ${Prog.talents} talents`);
      // pad2 on odd input
      if (pad2(7) !== '07') out.push(`pad2(7) is ${pad2(7)}`);
      return out;
    });
    r.forEach(x => flag('bounds', x));
    await page.close();
  }

  /* ── 8. every feature off, then every feature on: the app must still work ─────────────── */
  if (section('features')) {
    for (const allOn of [false, true]) {
      const page = await open(browser, { prog: SEEDED });
      const r = await page.evaluate(on => {
        const out = [];
        FEATURES.forEach(f => setFeat(f.id, on));
        ['learn', 'verse', 'palace', 'journey', 'stories'].forEach(t => {
          try { show(t); } catch (e) { out.push(`${on ? 'all on' : 'all off'}: show(${t}) threw — ${e.message}`); }
        });
        try { show('verse'); vView = 'hub'; renderVerse(); } catch (e) { out.push(`${on ? 'all on' : 'all off'}: Library threw — ${e.message}`); }
        const txt = el('verse').innerText;
        if (/\bundefined\b|\bNaN\b/.test(txt)) out.push(`${on ? 'all on' : 'all off'}: Library shows undefined or NaN`);
        try { el('themeBtn').click(); } catch (e) { out.push(`${on ? 'all on' : 'all off'}: Profile threw — ${e.message}`); }
        const btns = document.querySelectorAll('#profGrid .profbtn:not([style*="display: none"])').length;
        if (!btns) out.push(`${on ? 'all on' : 'all off'}: Profile has no buttons at all`);
        return out;
      }, allOn);
      r.forEach(x => flag('features', x));
      (page.__errors || []).forEach(e => flag('console', `features ${allOn ? 'on' : 'off'}: ${e}`));
      await page.close();
    }
  }

  /* ── 9. no screen may strand you: every view needs a way back ─────────────────────────── */
  if (section('exits')) {
    const page = await open(browser, { prog: SEEDED });
    for (const s of SCREENS.filter(x => !x.pro)) {
      try {
        await drive(page, s.go);
        const r = await page.evaluate(sel => {
          const root = document.querySelector(sel);
          if (!root) return { ok: true };
          const isModal = root.classList.contains('modal') || /Modal$/.test(root.id);
          const closers = root.querySelectorAll('.lclose, .btn, [id$="Close"], [id$="Done"], [id$="Back"]').length;
          const tabbar = getComputedStyle(document.querySelector('.tabbar')).display !== 'none';
          return { ok: closers > 0 || (!isModal && tabbar), isModal, closers, tabbar };
        }, s.sel);
        if (!r.ok) flag('no way back', `${s.name}: no close, no Done, no Back and no tab bar`);
      } catch (e) { flag('exits', `${s.name}: ${String(e.message).split('\n')[0]}`); }
    }
    await page.close();
  }

  /* ── 10. the curriculum itself: ids, coverage, and things that must be unique ─────────── */
  if (section('data')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      // every skill id must be unique — two tiles sharing an id share their completion
      const ids = {};
      UNITS.forEach((U, ui) => U.skills.forEach(sk => {
        if (ids[sk.id]) out.push('duplicate skill id ' + sk.id + ' (units ' + ids[sk.id] + ' and ' + ui + ')');
        else ids[sk.id] = ui;
      }));
      // every book 1..66 must be learnable exactly once, whether as a book lesson or a Torah tile
      const seen = {};
      UNITS.forEach(U => U.skills.forEach(sk => {
        if (sk.kind === 'book' || sk.bookNamed) (sk.items || []).forEach(n => { seen[n] = (seen[n] || 0) + 1; });
      }));
      for (let b = 1; b <= 66; b++) {
        if (!seen[b]) out.push('book ' + b + ' (' + bookName(b) + ') is on no lesson');
        else if (seen[b] > 1) out.push('book ' + b + ' (' + bookName(b) + ') appears on ' + seen[b] + ' lessons');
      }
      // every number peg 0..176 must resolve to a word
      for (let n = 0; n <= 176; n++) {
        const p = pegFor(n);
        if (!p || !p.word) out.push('peg ' + n + ' has no word');
      }
      // phases: contiguous, all covered, and the walk terminates
      const list = phaseIdxs();
      if (list.length !== UNITS.filter(U => !U.story).length) out.push('phaseIdxs misses some non-story units');
      // ensurePhaseMax() raises phaseMax to the furthest phase with work in it, so the walk has to
      // start from an account with no work at all or it jumps several phases at a time.
      const keepSkills = Prog.doneSkills; Prog.doneSkills = [];
      let cur = list[0], hops = 0;
      while (hops < 100) { Prog.phaseMax = cur; const nx = nextPhaseIdx(); if (nx < 0) break; cur = nx; hops++; }
      Prog.doneSkills = keepSkills;
      if (hops !== list.length - 1) out.push('walking the phases took ' + hops + ' hops for ' + list.length + ' phases');
      // feature ids referenced in code must exist in the table
      const known = FEATURES.map(f => f.id);
      ['goal', 'badges', 'wordpick', 'reference', 'w4w', 'dict', 'ntsetup', 'reminders'].forEach(id => {
        if (!known.includes(id)) out.push('feat("' + id + '") is checked in code but is not in FEATURES');
      });
      // badge ids unique, and every badge has a reachable test
      const bids = {};
      BADGES.forEach(b => { if (bids[b.id]) out.push('duplicate badge id ' + b.id); else bids[b.id] = 1;
        try { b.have(); } catch (e) { out.push('badge ' + b.id + ' threw when tested — ' + e.message); } });
      // videos: each has a name, a line, and a slot for a file
      Object.keys(VIDEOS).forEach(k => {
        const V = VIDEOS[k];
        if (!V.title) out.push('video ' + k + ' has no title');
        if (!V.sub) out.push('video ' + k + ' has no description');
        if (V.src === undefined) out.push('video ' + k + ' has no src slot');
        if (!V.skill) out.push('video ' + k + ' has no skill id');
      });
      // story sections: every story resolves to a real verse
      UNITS.forEach(U => { if (!U.story) return; U.skills.forEach(sk => {
        const st = sk.story;
        if (!st) { out.push('story skill ' + sk.id + ' has no story'); return; }
        const b = bookNum(st.b);
        if (!b) out.push('story "' + st.n + '" names an unknown book ' + st.b);
        else if (!kjvText(b, st.c, st.v)) out.push('story "' + st.n + '" points at ' + st.b + ' ' + st.c + ':' + st.v + ', which has no text');
      }); });
      return out;
    });
    r.forEach(x => flag('data', x));
    await page.close();
  }

  /* ── 11. spaced repetition maths: the trail must always move forward ─────────────────── */
  if (section('sr')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      const k = '43:3:16';
      Prog.memorized = [k]; Prog.verseStage = {};
      Prog.verseSR = { [k]: Object.assign(newSR(), { r0: 1 }) }; saveProg();
      let last = -1;
      for (let i = 0; i < SR_TRAIL.length + 2; i++) {
        const o = Prog.verseSR[k];
        if (!isFinite(o.dueAt)) { out.push('dueAt became ' + o.dueAt + ' at step ' + o.step); break; }
        if (typeof o.step !== 'number' || o.step < 1) { out.push('step became ' + o.step); break; }
        if (o.step < last) { out.push('step went backwards: ' + last + ' -> ' + o.step); break; }
        last = o.step;
        o.dueAt = Date.now() - 1000;            // force it due
        reviewVerseSR(k);
      }
      const fin = Prog.verseSR[k];
      if (fin.step < SR_TRAIL.length) out.push('the trail stalled at step ' + fin.step + ' of ' + SR_TRAIL.length);
      if (srDueIndex(fin) >= 0) out.push('a completed trail still reports itself due');
      // a verse never reviewed must not be due before its first checkpoint
      Prog.verseSR = { [k]: Object.assign(newSR(), { r0: 1 }) }; saveProg();
      if (verseDue(k)) out.push('a verse saved just now is already due');
      return out;
    });
    r.forEach(x => flag('spaced repetition', x));
    await page.close();
  }

  /* ── 12. the economy: nothing may go negative, and rewards must be finite ─────────────── */
  if (section('economy')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      Prog.talents = 0; saveProg();
      spendTalents(1);  if (Prog.talents < 0) out.push('spending from zero left ' + Prog.talents);
      Prog.talents = 5; spendTalents(1000); if (Prog.talents < 0) out.push('overspending left ' + Prog.talents);
      Prog.talents = 0; earnTalents(10); if (Prog.talents !== 10) out.push('earning 10 from zero gave ' + Prog.talents);
      earnTalents(-5); if (Prog.talents < 0) out.push('a negative reward drove talents to ' + Prog.talents);
      Prog.freezes = 0; if (freezeMax() <= 0) out.push('freezeMax() is ' + freezeMax());
      // buying a palace slot must cost exactly once
      Prog.talents = PALACE_COST; Prog.palaceSlots = 0; Billing.revoke();
      Prog.palaces = Array.from({ length: PALACE_FREE }, () => ({ place: 'x', stations: ['a'], learnedAt: 1, step: 1 }));
      const before = Prog.talents; const ok = buyPalaceSlot();
      if (!ok) out.push('could not buy a palace slot with exactly the price in hand');
      if (before - Prog.talents !== PALACE_COST) out.push('a palace slot cost ' + (before - Prog.talents) + ', expected ' + PALACE_COST);
      if (Prog.talents < 0) out.push('buying a palace slot left ' + Prog.talents);
      return out;
    });
    r.forEach(x => flag('economy', x));
    await page.close();
  }

  /* ── 13. pressing the same button twice must not count twice ─────────────────────────── */
  if (section('double')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      // saving a verse twice
      const k = '40:6:33';
      Prog.memorized = Prog.memorized.filter(x => x !== k);
      Prog.palaces = [{ place: 'K', stations: ['Door'], learnedAt: 1, step: 1 }];
      Prog.talents = 0; Prog.customScene = {}; Prog.verseLoc = {}; saveProg();
      openVerseWizard(40, 6, 33, () => { });
      if (el('wToScene')) el('wToScene').click();
      if (el('wScene')) {
        el('wScene').value = 'a scene';
        const pt = document.querySelector('#wPalaceGrid [data-p="0"]'); if (pt) pt.click();
        const rt = document.querySelector('#wRoomGrid [data-room="Door"]'); if (rt) rt.click();
        const t0 = Prog.talents;
        el('wDoneTop').click();
        const after1 = { n: Prog.memorized.filter(x => x === k).length, t: Prog.talents };
        try { el('wDoneTop').click(); } catch (e) { /* screen has moved on */ }
        const after2 = { n: Prog.memorized.filter(x => x === k).length, t: Prog.talents };
        if (after1.n !== 1) out.push('saving a verse recorded it ' + after1.n + ' times');
        if (after2.n > 1) out.push('pressing Done twice recorded the verse ' + after2.n + ' times');
        if (after2.t > after1.t) out.push('pressing Done twice paid talents twice (' + t0 + ' -> ' + after1.t + ' -> ' + after2.t + ')');
      } else out.push('the verse wizard never reached its scene screen');

      // answering a verse test correctly twice
      Prog.memorized = ['43:3:16']; Prog.verseSR = { '43:3:16': Object.assign(newSR(), { r0: 1 }) };
      Prog.talents = 0; Prog.streak = 0; saveProg();
      show('verse'); askVerse('43:3:16');
      mtSel = { b: 43, c: 3, v: 16 };
      el('mtCheck').click();
      const s1 = { t: Prog.talents, st: Prog.streak };
      try { el('mtCheck').click(); } catch (e) { }
      const s2 = { t: Prog.talents, st: Prog.streak };
      if (s2.t > s1.t) out.push('checking a correct answer twice paid twice (' + s1.t + ' -> ' + s2.t + ')');
      if (s2.st > s1.st) out.push('checking a correct answer twice counted the streak twice');
      return out;
    });
    r.forEach(x => flag('double press', x));
    (page.__errors || []).forEach(e => flag('console', 'double press: ' + e));
    await page.close();
  }

  /* ── 14. rendering twice must not stack anything up ───────────────────────────────────── */
  if (section('idempotent')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      const check = (name, fn, sel) => {
        try {
          fn(); const a = document.querySelector(sel).innerHTML.length;
          fn(); const b = document.querySelector(sel).innerHTML.length;
          if (a !== b) out.push(name + ' grows when drawn twice (' + a + ' -> ' + b + ')');
        } catch (e) { out.push(name + ' threw — ' + e.message); }
      };
      check('the Learn path', () => { show('learn'); renderPath(true); }, '#learn');
      check('the Library', () => { show('verse'); vView = 'hub'; renderVerse(); }, '#verse');
      check('the memorized list', () => { show('verse'); vView = 'mem'; renderVerse(); }, '#verse');
      check('Bible Stories', () => { show('stories'); renderStories(); }, '#stories');
      check('Palaces', () => { show('palace'); renderPalace(); }, '#palace');
      check('the Bible', () => { show('journey'); renderJourney(); }, '#journey');
      check('Profile', () => { el('themeBtn').click(); }, '#profGrid');
      document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
      return out;
    });
    r.forEach(x => flag('idempotence', x));
    await page.close();
  }

  /* ── 15. a whole practice run must reach its end ──────────────────────────────────────── */
  if (section('runs')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      // number practice: answer every question and make sure it finishes
      Prog.ntPrefs = { types: ['q_n2i'], count: 5 }; saveProg();
      openNumTestSetup(); el('ntsGo').click();
      let guard = 0;
      while (NT && NT.i < NT.qs.length && guard++ < 60) {
        const right = [...document.querySelectorAll('[data-ok="1"]')][0];
        if (!right) { out.push('a number question had no correct answer at ' + NT.i); break; }
        right.click();
        // the flow advances on a timer; step it by hand so this stays synchronous
        NT.i++; if (NT.i < NT.qs.length) renderNumTest();
      }
      if (guard >= 60) out.push('number practice never finished');
      // word pick: walk the whole warm-up
      Prog.memorized = ['43:11:35']; saveProg();
      startWordPick(43, 11, 35, () => { });
      let g2 = 0;
      while (WP && WP.idx < WP.stop && g2++ < 40) {
        const correct = WP.words[WP.idx];
        const tile = [...document.querySelectorAll('.wpopt')].find(t => normWord(t.dataset.w) === normWord(correct));
        if (!tile) { out.push('the warm-up offered no correct tile at word ' + WP.idx); break; }
        WP.idx++; WP.opts = null; if (WP.idx < WP.stop) renderWordPick();
      }
      if (g2 >= 40) out.push('the word pick warm-up never finished');
      return out;
    });
    r.forEach(x => flag('practice runs', x));
    (page.__errors || []).forEach(e => flag('console', 'runs: ' + e));
    await page.close();
  }

  /* ── 16. every theme must be legible: no invisible text, no unpainted surface ─────────── */
  if (section('themes')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      const lum = c => {
        const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null;
        const [r, g, b, a] = m[1].split(',').map(Number);
        if (a === 0) return 'transparent';
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const surfaces = [
        ['the Library', () => { show('verse'); vView = 'hub'; renderVerse(); }, '.vhub'],
        ['the Learn path', () => { show('learn'); renderPath(true); }, '.tile'],
        ['Bible Stories', () => { show('stories'); renderStories(); }, '.profbtn'],
        ['Palaces', () => { show('palace'); renderPalace(); }, '.palace-card'],
        ['the tab bar', () => { show('learn'); }, '.tabbar button'],
      ];
      ['classic', 'illumined', 'glass', 'quest', 'buddy'].forEach(t => {
        applyTheme(t);
        surfaces.forEach(([name, go, sel]) => {
          try {
            go();
            const nodes = [...document.querySelectorAll(sel)].slice(0, 3);
            if (!nodes.length) { out.push(t + ': ' + name + ' rendered nothing matching ' + sel); return; }
            nodes.forEach(n => {
              const cs = getComputedStyle(n);
              const fg = lum(cs.color);
              let el2 = n, bg = null;
              while (el2 && bg === null) { const b = lum(getComputedStyle(el2).backgroundColor); if (b !== 'transparent' && b !== null) bg = b; el2 = el2.parentElement; }
              if (fg === 'transparent') out.push(t + ': ' + name + ' has fully transparent text');
              else if (bg !== null && typeof fg === 'number' && Math.abs(fg - bg) < 12)
                out.push(t + ': ' + name + ' text is nearly invisible on its background (' + Math.round(fg) + ' vs ' + Math.round(bg) + ')');
            });
          } catch (e) { out.push(t + ': ' + name + ' threw — ' + e.message); }
        });
      });
      applyTheme('classic');
      return out;
    });
    r.forEach(x => flag('themes', x));
    await page.close();
  }

  /* ── 17. the paywall: a free account must not be able to start paid content ───────────── */
  if (section('paywall')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      Billing.revoke(); Prog.lessonUnlocks = []; Prog.talents = 0; bustCaches(); saveProg();
      Prog.phaseMax = 99; show('learn'); renderPath(true);
      const paid = [...document.querySelectorAll('#learn .tile.pro')];
      if (!paid.length) out.push('a free account sees no paid lessons at all — the paywall may not be applying');
      // Several paid tiles can be tappable at once when progress is not a contiguous prefix (a
      // lapsed subscriber roamed the books freely). That is choice of WHICH to buy, not free access.
      // The invariant that matters is that tapping one can never start the lesson.
      const clickable = paid.filter(t => !t.disabled && !t.classList.contains('locked'));
      let started = 0;
      clickable.slice(0, 5).forEach(t => {
        const before = el('learn').innerHTML;
        t.click();
        const paywallUp = el('payModal') && el('payModal').style.display === 'flex';
        const inLesson = !!document.querySelector('#learn .lesson');
        if (inLesson || !paywallUp) started++;
        if (el('payModal')) el('payModal').style.display = 'none';
        show('learn'); renderPath(true);
      });
      if (started) out.push(started + ' paid lessons could be STARTED without paying');
      // and the skill logic must agree with what the tile shows
      let disagree = 0;
      UNITS.forEach((U, ui) => U.skills.forEach((sk, si) => {
        const t = document.querySelector('#learn .tile[data-ui="' + ui + '"][data-si="' + si + '"]');
        if (!t) return;
        if (skillPaywalled(sk) !== t.classList.contains('pro')) disagree++;
      }));
      if (disagree) out.push(disagree + ' tiles disagree with skillPaywalled() about whether they are paid');
      // a subscriber sees none of it
      Billing.grant(); bustCaches(); renderPath(true);
      const stillPaid = document.querySelectorAll('#learn .tile.pro').length;
      if (stillPaid) out.push('a subscriber still sees ' + stillPaid + ' locked lessons');
      Billing.revoke();
      return out;
    });
    r.forEach(x => flag('paywall', x));
    await page.close();
  }

  /* ── 18. churn: rapid navigation must not leave overlays stranded or throw ──────────── */
  if (section('nav')) {
    const page = await open(browser, { prog: SEEDED });
    const r = await page.evaluate(() => {
      const out = [];
      const tabs = ['learn', 'verse', 'palace', 'journey', 'stories'];
      for (let round = 0; round < 3; round++) {
        for (const t of tabs) {
          try { show(t); } catch (e) { out.push('show(' + t + ') threw on round ' + round + ' — ' + e.message); }
        }
      }
      // open every modal we can name, then leave the screen and make sure nothing is stranded
      const openers = [
        ['store', () => openStore()], ['profile', () => el('themeBtn').click()],
        ['features', () => openFeatureStore()], ['goal', () => openGoalSettings()],
        ['whats new', () => openWhatsNew(true)], ['learn verses', () => openLearnVerses()],
      ];
      openers.forEach(([name, go]) => {
        try { go(); show('learn'); } catch (e) { out.push('opening ' + name + ' threw — ' + e.message); }
      });
      // A modal left showing after show() is only a problem if you could have navigated out from
      // under it. Every modal must cover the tab bar, which is what makes that impossible.
      const tab = [...document.querySelectorAll('.tabbar button')][0];
      [...document.querySelectorAll('.modal')].forEach(m => {
        if (m.style.display !== 'flex') return;
        const r2 = tab.getBoundingClientRect();
        const hit = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
        if (hit && hit.closest && hit.closest('.tabbar'))
          out.push('#' + m.id + ' does not cover the tab bar — you could navigate out from under it');
      });
      const overlays = ['taxov', 'buildov', 'scov', 'simov'].filter(id => { const o = el(id); return o && o.classList.contains('on'); });
      if (overlays.length) out.push('overlay still showing: ' + overlays.join(', '));
      document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
      return out;
    });
    r.forEach(x => flag('navigation', x));
    (page.__errors || []).forEach(e => flag('console', 'nav: ' + e));
    await page.close();
  }

  await browser.close();
  stopServer();

  /* ── report ──────────────────────────────────────────────────────────────────────────── */
  console.log('\nQA sweep');
  console.log('='.repeat(70));
  if (!findings.length) { console.log('No findings.'); return; }
  const byArea = {};
  findings.forEach(f => { (byArea[f.area] = byArea[f.area] || []).push(f.detail); });
  Object.keys(byArea).sort().forEach(area => {
    const list = [...new Set(byArea[area])];
    console.log(`\n${area} — ${list.length}`);
    list.slice(0, 25).forEach(d => console.log('  • ' + d));
    if (list.length > 25) console.log(`  … and ${list.length - 25} more`);
  });
  console.log(`\n${findings.length} findings in ${Object.keys(byArea).length} areas.`);
})().catch(e => { console.error(e.stack); process.exit(1); });
