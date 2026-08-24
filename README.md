# Burning Bush · Bible Memory

Memorize Scripture with the Major System, memory palaces and spaced repetition.
Live at **https://kingdombuilders.ai/burningbush**

## Layout

```
src/                  ← THE SOURCE. Edit here.
  index.html            the whole app: markup, styles, script (relative asset paths)
  sw.js                 service worker (notifications only, deliberately no caching)
  kjv.js bbe.js         bundled Bibles
  strongs.js kjvtag.js  Hebrew/Greek lexicons + the KJV→Strong's word index (lazy-loaded)
  images/ fonts/        peg art, book icons, bundled woff2

burningbush/          ← BUILT OUTPUT. Never edit by hand. This is what Render serves.
bin/build.js          ← src/ → burningbush/ (path rewriting + asset copy)
tools/                ← token-lint, decor-lint, peg generation, content import/export
tests/                ← the regression suite
docs/                 ← handoff notes, design notes, theme roadmap
```

## Build

```bash
node bin/build.js          # src/ → burningbush/
node bin/build.js --check  # verify the published output is current; changes nothing
```

The only transformation is making asset paths absolute. The app is served at `/burningbush`
**with no trailing slash**, so a relative `kjv.js` would resolve to `/kjv.js` and 404. Every
rewrite rule in `bin/build.js` asserts how many sites it expects to hit — add or rename an
asset reference and the build fails rather than shipping a broken path.

## Hosting

Static site on Render (`kb-burningbush`, KB account), publish directory = repo root, with no
build command — which is why `burningbush/` is committed. A Cloudflare Worker binds only the
narrow route `kingdombuilders.ai/burningbush*` and proxies to this service; the production
`kingdombuilders.ai/*` wildcard belongs to a **separate** worker (`kb-router`) that also serves
`/playbooks`, `/sunosmart`, `/znotes` and `/evidence`. Never point the local worker at the
wildcard — see §6 of `docs/burningbush.md`.

Push to `master` and Render deploys automatically. **Pushed is not deployed** — always confirm
Render reaches `live` and that the live URL serves the expected `APP_VERSION` before calling a
release done.

## Releasing

Every release bumps `APP_VERSION` and adds a `CHANGELOG` entry at the top of the array in
`src/index.html` (see §5b of `docs/burningbush.md`). A version the device hasn't seen shows the
"What's new" card once; the full history lives under Profile → What's new.

## Guardrails

Run before every deploy:

```bash
node tools/token-lint.js   # base CSS must read design tokens only, never raw hex
node tools/decor-lint.js
node tests/run.js          # the regression suite
```

Base component CSS reads **only** design tokens, so a theme that redefines the token set
transforms the whole app coherently and any new component inherits correct theming for free.
Never hardcode a colour in base CSS, and never branch on the theme in JavaScript.
