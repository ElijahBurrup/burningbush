/**
 * tests/lib/harness.js — boot Burning Bush under Playwright, deterministically.
 *
 * Snapshot testing is worthless unless two runs of the same code produce the same bytes, and
 * this app is full of things that defeat that: Math.random() drives shuffled quiz options,
 * peg distractors, Caesar's wheel, which church piece you build and which blessing you see;
 * Date.now() drives streaks, spaced repetition, the daily goal and the levy clock. Both are
 * replaced BEFORE any app code runs, so every render is reproducible.
 */
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// A fixed instant to run every test at: 2026-06-15T12:00:00Z, a Monday.
// Monday matters — the daily goal has weekday/weekend modes and the week streak anchors there.
const FIXED_NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

function chromium() {
  // Playwright is borrowed from the Playbooks install rather than added as a dependency here.
  try { return require('C:/Projects/KingdomBuilders.AI/Playbooks/node_modules/playwright').chromium; }
  catch (e) {
    try { return require('playwright').chromium; }
    catch (e2) { throw new Error('Playwright not found. Install it, or run from a machine with the Playbooks checkout.'); }
  }
}

/**
 * Which build of the app to test.
 *
 * 'src' loads straight off disk — its asset paths are relative, so file:// is fine.
 * 'built' CANNOT be loaded that way: its paths are absolute (/kjv.js) because the published
 * folder IS the site root of burningbush.kingdombuilders.ai, with the app at /app. Over file://
 * resolve to the drive root and 404, so we serve the repo over HTTP exactly as Render does —
 * which also means the suite exercises the real trailing-slash-less URL where path bugs live.
 */
let _server = null;
async function serveBuilt() {
  if (_server) return _server.url;
  const http = require('http');
  const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/app') p = '/app/index.html';                          // exactly how production resolves
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, 'burningbush', p);   // the published folder is the site root
    if (!f.startsWith(ROOT) || !fsExists(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    require('fs').createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  _server = { srv, url: `http://127.0.0.1:${srv.address().port}/app` };
  return _server.url;
}
const fsExists = f => { try { return require('fs').statSync(f).isFile(); } catch (e) { return false; } };
function stopServer() { if (_server) { _server.srv.close(); _server = null; } }

async function appUrl(which = 'src') {
  if (which === 'built') return serveBuilt();
  return 'file:///' + path.join(ROOT, 'src/index.html').replace(/\\/g, '/');
}

const determinism = ({ now, seed }) => {
  // ---- reproducible pseudo-randomness (LCG) ----
  let s = seed >>> 0;
  Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  // Reset the stream so each screen renders independently of whatever ran before it —
  // theme starfields and quiz shuffles otherwise leave the generator at a different offset.
  window.__reseed = n => { s = (n >>> 0); };
  // ---- frozen clock ----
  // Only Date.now() and `new Date()` with no arguments are pinned. Timers, parsing and
  // explicit dates keep working, so nothing that depends on real scheduling breaks.
  const Real = Date;
  const Frozen = function (...a) {
    if (!(this instanceof Frozen)) return new Real(now).toString();
    return a.length ? new Real(...a) : new Real(now);
  };
  Frozen.prototype = Real.prototype;
  Frozen.now = () => now;
  Frozen.parse = Real.parse;
  Frozen.UTC = Real.UTC;
  window.Date = Frozen;
  // ---- no animation, no transitions ----
  const css = document.createElement('style');
  css.textContent = `*,*::before,*::after{animation:none!important;transition:none!important;
    animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}`;
  const put = () => (document.head || document.documentElement).appendChild(css);
  if (document.head) put(); else document.addEventListener('DOMContentLoaded', put);
};

/**
 * Open the app ready for testing.
 * @param {object} o
 *   which   'src' | 'built'
 *   width/height  viewport
 *   seed    PRNG seed (same seed ⇒ same shuffles)
 *   prog    extra fields merged into Prog after boot
 *   pro     grant Pro
 */
async function open(browser, o = {}) {
  const { which = 'src', width = 390, height = 844, seed = 12345, prog = null, pro = false,
          native = false } = o;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.addInitScript(determinism, { now: FIXED_NOW, seed });
  // Run as the phone app. Set BEFORE the app loads, because some of what the shell changes is
  // decided at boot rather than asked again later — the profile menu is built once.
  if (native) await page.addInitScript(() => {
    window.Capacitor = {
      getPlatform: () => 'android',
      Plugins: {
        SpeechRecognition: {
          async checkPermissions() { return { speechRecognition: 'granted' }; },
          async requestPermissions() { return { speechRecognition: 'granted' }; },
          async available() { return { available: true }; },
          async start() {}, async stop() {},
          async addListener() { return { remove() {} }; },
          removeAllListeners() {}
        },
        NativeSettings: { async openAndroid() { window.__openedSettings = true; } }
      }
    };
  });
  await page.goto(await appUrl(which));
  await page.waitForFunction(() => typeof window.Prog !== 'undefined' && typeof window.show === 'function', null, { timeout: 15000 })
    .catch(() => { });
  await page.waitForTimeout(400);

  // A known starting state: onboarding gone, every tab reachable, no modal left open.
  await page.evaluate(({ prog, pro }) => {
    Prog.onboarded = true;
    Prog.scratchWon = ['verse', 'palace', 'journey', 'stories'];
    if (pro) Billing.grant(); else Billing.revoke();
    if (prog) Object.assign(Prog, prog);
    // the blob is assigned raw, so run it through migration the way a real load would —
    // otherwise it is missing every field a saved account would have been given
    migrateProg(Prog);
    // grandfathering ran at boot against an EMPTY account; re-run it now the progress is here,
    // so the seeded account behaves like the established user it is meant to represent
    Prog.featuresInit = false; grandfatherFeatures(); applyFeatureVisibility();
    bustCaches(); saveProg(); updateMetrics(); updateTabLocks();
    // Hidden, not removed. Deleting it made Onboard.active() report "open" forever — it holds a
    // reference captured at startup, and a detached node keeps its classes — which quietly turned
    // two account specs green for the wrong reason.
    const ob = document.getElementById('obov'); if (ob) { ob.classList.remove('on'); ob.setAttribute('aria-hidden','true'); }
    document.querySelectorAll('.modal').forEach(m => (m.style.display = 'none'));
    ['taxov', 'buildov', 'scov', 'simov'].forEach(id => {
      const e = document.getElementById(id); if (e) e.classList.remove('on', 'march');
    });
  }, { prog, pro });
  await page.waitForTimeout(150);

  page.__errors = errors;
  return page;
}

/** A fully-stocked account: every number known, palaces, verses, talents. */
const SEEDED = {
  extraKnown: Array.from({ length: 176 }, (_, i) => i + 1),
  doneSkills: ['snd:0-4', 'snd:5-9', 'num:1', 'num:2', 'num:3', 'num:4', 'num:5', 'book:40', 'book:19', 'book:45'],
  palaces: [{ place: 'My Kitchen', stations: ['Front door', 'Sink', 'Stove'], learnedAt: FIXED_NOW, step: 1 }],
  memorized: ['19:23:1', '43:3:16', '45:8:28'],
  customScene: { '19:23:1': 'A tuba blows Nemo onto the bank' },
  verseLoc: { '19:23:1': { p: 0, room: 'Sink' } },
  talents: 1200, dayStreak: 4, freezes: 2,
};

module.exports = { chromium, open, appUrl, stopServer, ROOT, FIXED_NOW, SEEDED };
