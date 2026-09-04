/**
 * QA probe 21 — DOES THE PACKAGED APP BOOT?
 *
 * The failure this is looking for is the blank screen: an asset path that resolves against the site
 * but not against the shell, where the app sits at the ROOT of its own little server rather than at
 * /app. That is exactly the shape Capacitor serves — https://localhost/ with webDir underneath — so
 * serving mobile/www at a root origin and loading it reproduces the risk without an emulator.
 *
 * It also stubs Capacitor, because inside the shell the app takes different branches: the paywall
 * loses its price buttons and dictation switches to the native recogniser. A crash in either would
 * only ever happen on a phone.
 *
 *   node bin/build.js --native && node tests/qa/shell.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Projects/BurningBush/tests/lib/harness.js');

const WWW = path.resolve('C:/Projects/BurningBush/mobile/www');   // resolved, so the containment check below compares like with like
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
                '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2',
                '.webmanifest':'application/manifest+json', '.txt':'text/plain' };

const missing = [];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(WWW, url === '/' ? 'index.html' : url);
  if (!file.startsWith(WWW) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    missing.push(url);                       // every 404 is a path the shell would not have found
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

if (!fs.existsSync(path.join(WWW, 'index.html'))) {
  console.error('nothing packaged yet — run: node bin/build.js --native');
  process.exit(1);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port;

  const browser = await chromium().launch();
  const page = await browser.newPage();
  const errs = [], console_ = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') console_.push(m.text()); });

  // Stand in for the native shell BEFORE any of the app's code runs, so it takes the store branches.
  await page.addInitScript(() => {
    window.Capacitor = {
      getPlatform: () => 'android',
      Plugins: {
        SpeechRecognition: {
          async checkPermissions(){ return { speechRecognition: 'granted' }; },
          async requestPermissions(){ return { speechRecognition: 'granted' }; },
          async available(){ return { available: true }; },
          async start(){}, async stop(){},
          async addListener(){ return { remove(){} }; },
          removeAllListeners(){}
        },
        NativeSettings: { async openAndroid(){ window.__openedSettings = true; } }
      }
    };
  });

  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);

  const r = await page.evaluate(() => {
    const out = {};
    out.version   = typeof APP_VERSION !== 'undefined' ? APP_VERSION : null;
    out.platform  = typeof nativePlatform === 'function' ? nativePlatform() : null;
    out.store     = typeof isStoreApp === 'function' ? isStoreApp() : null;
    out.bible     = typeof KJV !== 'undefined' ? Object.keys(KJV).length : 0;
    out.painted   = document.body.innerText.trim().length;
    out.screen    = document.body.innerText.trim().replace(/\s+/g,' ').slice(0,300);
    out.visible   = [...document.querySelectorAll('.screen,.view,[id]')].filter(e=>e.offsetParent&&e.id).map(e=>e.id).slice(0,14);
    out.tabs      = document.querySelectorAll('.tabbar button, .tab').length;
    // the films must point at a host on the internet, not at this little server
    out.filmHost  = typeof FILM_HOST !== 'undefined' ? FILM_HOST : null;
    out.aFilm     = typeof filmSrc === 'function' ? filmSrc('intro') : null;
    // the microphone must be live rather than the dead button it is in a plain WebView
    out.micLives  = typeof Dictation !== 'undefined' && Dictation.supported();
    out.micHelp   = typeof micSettingsHelp === 'function' ? !!micSettingsHelp().native : null;
    return out;
  });

  // and the paywall must come up without its prices
  const pay = await page.evaluate(() => {
    try {
      closeEveryOverlay(); openPaywall(null);
      const vis = id => { const b = document.getElementById(id); return !!b && b.style.display !== 'none'; };
      const note = document.getElementById('payIosNote');
      const res = { yearly: vis('payYearly'), monthly: vis('payMonthly'),
                    note: !!note && note.style.display !== 'none',
                    lesson: !!document.getElementById('payLesson') };
      closeEveryOverlay();
      return res;
    } catch (e) { return { threw: String(e.message) }; }
  });

  const say = (ok, m) => console.log((ok ? '  ok   ' : '  FAIL ') + m);
  const bad = [];
  const t = (ok, m) => { say(ok, m); if (!ok) bad.push(m); };

  t(r.version === '2.2.0',        'the packaged app boots and is v' + r.version);
  t(r.painted > 150, 'it paints a screen, not a blank one: ' + JSON.stringify(r.screen.slice(0,90)));
  t(r.bible > 60,                 'the whole Bible loaded from the root path (' + r.bible + ' books)');
  t(r.tabs > 0,                   'the navigation rendered');
  t(missing.length === 0,         'nothing 404s at the shell root' + (missing.length ? ': ' + [...new Set(missing)].slice(0,6).join(', ') : ''));
  t(errs.length === 0,            'no page errors' + (errs.length ? ': ' + errs.slice(0,3).join(' | ') : ''));
  t(console_.length === 0,        'no console errors' + (console_.length ? ': ' + console_.slice(0,3).join(' | ') : ''));
  t(r.platform === 'android' && r.store === true, 'it knows it is inside the shell');
  t(/^https:\/\//.test(r.filmHost || ''), 'the films point at a host on the internet: ' + r.filmHost);
  t(/^https:\/\/.+intro\.mp4$/.test(r.aFilm || ''), '...and a film resolves to a real URL: ' + r.aFilm);
  t(r.micLives === true,          'the microphone is live through the native recogniser');
  t(r.micHelp === true,           '...and its help offers to open the settings screen');
  t(pay.yearly === false && pay.monthly === false, 'the paywall has no price buttons');
  t(pay.note === true,            '...and says where Pro is set up instead');
  t(pay.lesson === true,          '...while unlocking a lesson with talents still stands');

  console.log(bad.length ? '\nSHELL CHECK FAILED — ' + bad.length : '\nthe packaged app boots clean');
  await browser.close();
  server.close();
  process.exit(bad.length ? 1 : 0);
})();
