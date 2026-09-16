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

## Videos

Every video lives in the database (`burningbush.media`, served by burningbush-api's `content.js`
as part of `GET /api/content`) and lands in one list in the app, `MEDIA`, keyed by level:

| level | key | where its 📺 button is | where its camera mark is |
|---|---|---|---|
| `book` | `"11"` (canonical book number) | the book lesson's header | none |
| `chapter` | `"11:1"` (book:chapter) | the chapter screen's top row | none: nearly every chapter has one |
| `verse` | `"45:16:23"` (book:chapter:verse) | the verse page's top bar | over that verse number, and over its chapter's box (the only thing that marks a chapter) |

Each entry is `{kind, by, label, yt | fb, covers?}`. `kind` is one of `overview`, `hear`, `teach`
or `deep`, and sets the group it is listed under.

**Adding a video is adding a row, from Profile → Admin → Content → Videos. Nothing else, and no
release.** The 📺 button and the camera mark both read
`MEDIA` (`mediaFor`, `mediaChapterSet`, `mediaVerseHas`), so they appear together, and they
disappear together when an entry is removed. Never draw a mark or a button by hand, and never
keep a second list: that is how a camera ends up promising a video that is not there. The
behaviour spec adds and removes an entry to prove the two move together.

**Where the teaching comes from** (all approved by the owner, 2026-09-15): Gary Hamrick,
Cornerstone Chapel, verse by verse across 56 books (guest teachers named as themselves); David
Guzik, Enduring Word, on Job and Proverbs; Chuck Missler on Proverbs; Pastor Paul, Through the
Bible, on Psalms 1–41; and Josh Howerton, Lakepointe Church, on 43 single verses. The research that
mapped them, with every id checked, is summarised on the owner's review page, not in this repo.

**Psalm songs** come from the Burning Bush channel (@BurningBushApp), one playlist per style:
60's Choir Psalms (`PLT7O3cluGFuM`) and 80's Ballad Psalms (`PLN035pzuBsig`), with more styles to
follow. The styles are named ensembles (chosen 2026-09-16): **The Still Waters Choir** (60's choir),
**Deep Unto Deep** (80's rock ballad) and **Jordan & Grace** (90's country duo). Each new psalm is added
from Admin → Content → Videos as a Hear it video on `19:<psalm>`, labelled `Psalm N · <ensemble>` (e.g.
`Psalm 23 · Deep Unto Deep`), so a psalm with several lists them all to choose from. List a playlist
with a single request (`python -m yt_dlp --flat-playlist -J <playlist url>`), never a channel sweep.

Before an id goes in, check it. A YouTube id must pass oEmbed
(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`) with the
expected author and a title naming the right book, chapter or verse. A Facebook video must embed:
its plugin page carries a playable source. Videos play inside the app: YouTube through the
privacy-enhanced embed, full screen, with Close, Back and Esc all returning to the screen they
came from. The app is held upright (the manifest says portrait), but while a video is full screen
that lock is lifted so it follows the phone, and ⟳ turns it on purpose; closing hands it back.

## Content from the database

`GET /api/content` returns one bundle: every video, the announcements, and `config` (settings). The
app applies its saved copy before the first screen is drawn (`Content.boot`) and asks for a fresh one
1.5 s later (`Content.refresh`), redrawing only if it changed. Nothing waits on it, which matters on
Render's free plan.

- **Settings** are listed in `CONFIG_SCHEMA`: prices, limits, talent rewards, Rome's tax, each with
  a range. `config.features` changes a feature's default for people who have not chosen, and
  `config.switches.w4wTrack` shows the Word for Word track to everyone. A value out of range, or not
  a whole number, is ignored in favour of the built-in amount. Anything saved progress depends on
  the meaning of (the review ladder, cue and Word for Word stages, the story order) is deliberately
  not a setting.
- **Announcements** show one at a time at the top of Learn and the Library, between optional
  dates, for everyone, free or Pro users, and stay gone once dismissed.
- **Suggested verses** (`suggested`): heart-verses added (`gemsAdd`, each with a category) or
  hidden (`gemsHide`), the verse each Psalm number 67–150 offers (`psalmFor`), and the topics
  (`topics`, which replaces the built-in list whole). Nothing is ever taken out of the verse pool:
  a hidden gem or a replaced Psalm pick only stops being suggested, because someone may have
  memorized it and practice draws on that pool.
- **Stories** (`stories`): story names by the verse each starts at (`names`), milestone wording
  by the milestone's original title (`milestones.edit`), and new milestones at the end of a
  section (`milestones.add`). Section titles and the story order stay in code: purchases are saved
  against a section's title and finished stories against their position.
- **Editing:** Profile → Admin → 🗂️ Content, for the addresses in `ADMIN_EMAILS` (checked on the
  server too). Every saved version is kept and can be put back.
- **Tests** never reach the API. `tests/lib/harness.js` serves `tests/fixtures/content.json`, which
  holds the real videos with no announcements or settings. Rebuild it from the live bundle with
  `node tools/content-fixture.js` when the tests should see a change to the videos, then bless the
  snapshots that move.

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
