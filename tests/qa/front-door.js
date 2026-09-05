/**
 * QA probe 23 — THE FRONT DOOR.
 *
 * The root of the site has two audiences with opposite needs. A stranger needs to be told what this
 * is. Somebody who already uses it needs the app, and resents being sold to. Rather than choosing
 * one, the root reads a crumb the app leaves and behaves differently.
 *
 * Three things have to hold, and the third is the one that would be discovered by an angry email:
 * a stranger is never forwarded, a reader always is, and the page stays reachable on purpose so it
 * can still be shared, screenshotted and read for the price.
 *
 *   node tests/qa/front-door.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

// The published folder is the site root; the landing page is at "/" and the app at "/app".
const site = async () => (await H.appUrl('built')).replace(/\/app$/, '');

(async () => {
  const browser = await H.chromium().launch();
  const root = await site();

  // Each case gets its own context, so one visitor's storage is not another's.
  const visit = async (seed, path) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    if (seed) {
      await page.goto(root + '/');                       // reach the origin before writing to it
      await page.evaluate(k => localStorage.setItem(k, '1'), seed);
    }
    await page.goto(root + (path || '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const where = new URL(page.url()).pathname;
    const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 60);
    await ctx.close();
    return { where, text };
  };

  const stranger = await visit(null, '/');
  const reader   = await visit('vv_home', '/');
  const onPurpose = await visit('vv_home', '/?stay');
  const deep     = await visit('vv_home', '/?utm=church#verses');

  say(stranger.where === '/', 'a stranger stays on the landing page');
  say(/Know where every verse lives|Burning Bush/i.test(stranger.text),
      '...and is told what this is: "' + stranger.text.trim() + '"');
  say(reader.where === '/app', 'somebody who already uses it goes straight to the app');
  say(onPurpose.where === '/', '...unless they asked for the page on purpose (?stay)');
  say(deep.where === '/app', 'a shared link with a campaign tag on it still forwards');

  // The crumb must mean "there is a reader here", not "somebody once opened this".
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(await H.appUrl('built'));
  await page.waitForTimeout(1200);
  const afterGlance = await page.evaluate(() => localStorage.getItem('vv_home'));
  await page.evaluate(() => { Prog.onboarded = true; saveProg(); });
  const afterOnboard = await page.evaluate(() => localStorage.getItem('vv_home'));
  await ctx.close();

  say(!afterGlance, 'merely opening the app once does NOT mark you as a reader');
  say(!!afterOnboard, '...finishing onboarding does');

  console.log(out.join('\n'));
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nFRONT DOOR FAILED' : '\nfront door clean');
  await browser.close(); await H.stopServer();
  process.exit(out.some(l => l.startsWith('  FAIL')) ? 1 : 0);
})();
