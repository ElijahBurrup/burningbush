/**
 * QA probe 2 — TRYING TO BREAK IT.
 *
 * Deliberately hostile sequences: leave things half done, pull the ground out from under a flow,
 * hand the app states it should never see. Everything here is a candidate bug.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Projects/BurningBush/tests/lib/harness');

const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
            '.webmanifest': 'application/manifest+json', '.json': 'application/json',
            '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => {
  const f = path.join('C:/Projects/BurningBush', decodeURIComponent(q.url.split('?')[0]));
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { r.writeHead(404).end(); return; }
    r.writeHead(200, { 'Content-Type': T[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  });
});

const findings = [];
const flag = (area, detail) => findings.push({ area, detail });

(async () => {
  await new Promise(r => server.listen(8841, '127.0.0.1', r));
  const b = await chromium().launch();
  const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8841/burningbush/index.html', { waitUntil: 'load' });

  const seed = () => p.evaluate(() => {
    // each scenario starts on a clear screen; residue from the last one is not this one's finding
    try { closeEveryOverlay(); } catch (e) {
      document.querySelectorAll('.modal').forEach(m => { m.style.display = 'none'; });
    }
    Prog = migrateProg(null);
    Prog.onboarded = true;
    Prog.doneSkills = ['snd:0-4','snd:5-9'].concat([1,2,3,4,5,40].map(n=>'book:'+n))
      .concat(Object.values(VIDEOS).filter(v=>v.src).map(v=>v.skill));
    Prog.memorized = ['1:1:1','2:2:2','43:3:16'];
    Prog.verseSR = {}; Prog.memorized.forEach(k => Prog.verseSR[k] = { learnedAt: Date.now()-5*864e5, step: 2, dueAt: Date.now()-864e5, r0: 1 });
    Prog.palaces = [{ place: 'Home', stations: ['Door','Hall'], learnedAt: Date.now(), step: 1 }];
    Prog.verseLoc = { '1:1:1': { p:0, room:'Door' }, '2:2:2': { p:0, room:'Hall' } };
    Prog.talents = 500; Prog.scratchWon = ['verse','palace']; Prog.dailyGoal = 3;
    saveProg(); bustCaches(); updateTabLocks(); syncTabOrder(false);
    if (typeof Onboard !== 'undefined' && Onboard.active()) el('obov').classList.remove('on');
  });

  const take = () => p.evaluate(() => ({
    view: (document.querySelector('.view.active')||{}).id,
    verses: (Prog.memorized||[]).length, talents: Prog.talents||0,
    palaces: (Prog.palaces||[]).filter(Boolean).length,
    locs: Object.keys(Prog.verseLoc||{}).length,
    stage: JSON.stringify(Prog.verseStage||{}),
    modals: [...document.querySelectorAll('.modal')].filter(m=>(m.style.display||'')==='flex').map(m=>m.id||'(anon)'),
  }));

  const scenario = async (name, fn) => {
    await seed();
    errs.length = 0;
    const before = await take();
    let threw = null;
    try { await p.evaluate(fn); } catch (e) { threw = e.message.split('\n')[0]; }
    await p.waitForTimeout(250);
    const after = await take();
    if (threw) flag('crash', `${name}: ${threw}`);
    if (errs.length) flag('error', `${name}: ${[...new Set(errs)].join(' | ')}`);
    return { before, after };
  };

  /* --- 1. abandoning a verse test halfway --- */
  {
    const r = await scenario('leaving a verse test halfway', async () => {
      startTypeTest(1, 1, 1, () => {}, true);
      await new Promise(r2 => setTimeout(r2, 100));
      show('learn');                       // walk away mid-test
      await new Promise(r2 => setTimeout(r2, 100));
      show('verse'); renderVerse();
    });
    if (r.after.verses !== r.before.verses) flag('data', `abandoning a test changed the verse count`);
    if (r.after.modals.length) flag('nav', `abandoning a test left a modal open: ${r.after.modals.join(',')}`);
  }

  /* --- 2. a palace deleted while it still holds verses --- */
  {
    const r = await scenario('deleting a palace holding verses', async () => {
      Prog.palaces = []; saveProg(); bustCaches();
      show('verse'); renderVerse();
      show('palace'); renderPalace();
      // and the verse screen for a verse whose palace no longer exists
      editVerseScene(1, 1, 1, () => {}, () => {});
    });
    const orphan = await p.evaluate(() => {
      const loc = (Prog.verseLoc || {})['1:1:1'];
      const txt = (document.querySelector('.view.active')||{}).innerText||'';
      return { stillPointsAtPalace: !!(loc && loc.p != null && !loc.heart),
               palaceMissing: !(Prog.palaces||[])[0],
               showsUndefined: /undefined|NaN|\[object/.test(txt) };
    });
    if (orphan.stillPointsAtPalace && orphan.palaceMissing)
      flag('data', 'a verse still points at palace slot 0 after every palace was removed');
    if (orphan.showsUndefined) flag('render', 'the verse screen shows undefined/NaN when its palace is gone');
  }

  /* --- 3. a room renamed out from under a verse --- */
  {
    await scenario('renaming the room a verse lives in', async () => {
      Prog.palaces[0].stations = ['Front porch','Hall'];   // "Door" is gone
      saveProg(); bustCaches();
      show('palace'); renderMyPalace(0);
      show('verse'); renderVerse();
      editVerseScene(1, 1, 1, () => {}, () => {});
    });
    const r = await p.evaluate(() => {
      const txt = (document.querySelector('.view.active')||{}).innerText||'';
      return { showsBad: /undefined|NaN|\[object/.test(txt),
               loc: JSON.stringify((Prog.verseLoc||{})['1:1:1']) };
    });
    if (r.showsBad) flag('render', `a verse whose room was renamed renders badly (loc ${r.loc})`);
  }

  /* --- 4. demoting a sealed verse --- */
  {
    await scenario('demoting a sealed verse', async () => {
      const k = '1:1:1';
      Prog.verseStage[k] = 'heart';
      Prog.verseSR[k] = { learnedAt: Date.now(), step: SR_ALL.length, dueAt: null, r0: 1 };
      saveProg();
      demoteFromHeart(k);
    });
    const r = await p.evaluate(() => ({
      stage: verseStage('1:1:1'),
      step: (Prog.verseSR['1:1:1']||{}).step,
      loc: JSON.stringify((Prog.verseLoc||{})['1:1:1']),
    }));
    if (r.stage !== 'loc') flag('ladder', `demoting a sealed verse left it at stage "${r.stage}"`);
    if (r.loc === 'undefined' || r.loc === 'null') flag('data', 'demoting a sealed verse left it with no location at all');
  }

  /* --- 5. extreme and malformed state --- */
  {
    const r = await scenario('a hostile progress blob', async () => {
      Prog.talents = -50;
      Prog.memorized = ['1:1:1','','99:99:99','not-a-key', null].filter(x => x !== null);
      Prog.verseLoc = { 'not-a-key': { p: 99, room: 'Nowhere' } };
      Prog.palaces = [null, { place: '', stations: [] }];
      Prog.dailyGoal = 999;
      saveProg(); bustCaches();
      show('verse'); renderVerse();
      show('palace'); renderPalace();
      show('learn'); renderPath();
    });
    const t = await p.evaluate(() => ({
      txt: (document.querySelector('.view.active')||{}).innerText || '',
      talents: Prog.talents,
    }));
    if (/undefined|NaN|\[object Object\]/.test(t.txt))
      flag('render', 'a malformed progress blob renders undefined/NaN on screen');
    // (a negative balance is only reachable by assigning one directly; spendTalents and
    //  migrateProg both floor at zero, so this is not a path a reader can take)
  }

  /* --- 6. no verses, no palaces, nothing at all --- */
  {
    await scenario('a completely empty account', async () => {
      Prog.memorized = []; Prog.palaces = []; Prog.verseLoc = {}; Prog.verseSR = {};
      Prog.talents = 0; Prog.doneSkills = []; saveProg(); bustCaches(); updateTabLocks();
      for (const t of ['learn','verse','palace','journey','stories']) { show(t); await new Promise(r2=>setTimeout(r2,60)); }
    });
    const empt = await p.evaluate(() => {
      const out = {};
      ['learn','verse','palace'].forEach(t => {
        show(t);
        const v = document.getElementById(t);
        out[t] = { len: (v.innerText||'').trim().length, bad: /undefined|NaN|\[object/.test(v.innerText||'') };
      });
      return out;
    });
    Object.entries(empt).forEach(([k, v]) => {
      if (v.len < 20) flag('empty', `${k} is blank for a brand-new account (${v.len} chars)`);
      if (v.bad) flag('render', `${k} shows undefined/NaN for a brand-new account`);
    });
  }

  /* --- 7. signing out mid-flow --- */
  {
    const r = await scenario('signing out with a test open', async () => {
      startTypeTest(1, 1, 1, () => {}, true);
      await new Promise(r2 => setTimeout(r2, 100));
      Auth._token = null; Auth.user = null;
      await Auth.signOut();
      await new Promise(r2 => setTimeout(r2, 300));
    });
    if (r.after.modals.length) {
      const what = await p.evaluate(() => {
        const m = [...document.querySelectorAll('.modal')].filter(x => x.style.display === 'flex')[0];
        return m ? { id: m.id, text: (m.innerText || '').replace(/\s+/g, ' ').slice(0, 90),
                     view: (document.querySelector('.view.active') || {}).id,
                     intro: typeof Onboard !== 'undefined' && Onboard.active() } : null;
      });
      flag('nav', `signing out mid-test left a modal open: ${r.after.modals.join(',')} — "${what && what.text}" (view ${what && what.view}, intro ${what && what.intro})`);
    }
    const where = await p.evaluate(() => ({ view: (document.querySelector('.view.active')||{}).id,
                                            intro: typeof Onboard !== 'undefined' && Onboard.active(),
                                            verses: (Prog.memorized||[]).length }));
    if (where.verses !== 0) flag('data', `signing out mid-test left ${where.verses} verses on the device`);
    if (!where.intro) flag('nav', 'signing out mid-test did not land on the welcome screen');
  }

  console.log('=== trying to break it ===');
  if (!findings.length) console.log('  nothing found');
  findings.forEach(f => console.log('  [' + f.area + '] ' + f.detail));
  await b.close();
  server.close();
})();
