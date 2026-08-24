# Burning Bush — Project Handoff

Single-file, mobile-first **Bible-memory app** built on the **Major System** (digits → consonant sounds → peg words → images). A verse's book/chapter/verse becomes three number-images woven into a scene; memory palaces hold ordered lists. Reverent Christian tone: **God is shown only as light / fire / glory — never a face, body, or hand; never mock Scripture or its authors.**

Formerly "Verse Vault." Brand: **Burning Bush · Bible Memory**. Live at **https://kingdombuilders.ai/burningbush**.

---

## 1. Source of truth & files

- **Dev app (edit here):** `C:/Projects/BibleMemory/index.html` — **~4,040 lines, fully self-contained** (one inline `<script>`, one `<style>`). Uses **relative** asset paths. Everything below lives in this one file unless noted.
- **Bundled data:** `kjv.js` (`window.KJV`, 31,102 verses — aruljohn/Bible-kjv), `bbe.js` (`window.BBE`, Basic English). `fonts/` = bundled woff2 + `fonts.css` (no CDN for app fonts; theme display fonts currently via a Google Fonts `<link>` with local fallbacks — TODO bundle).
- **Art:** `images/books/{1..66}.svg` (book icons), `images/pegs/{n}.svg` (peg images). Rendered via the `pegImg()` helper.
- **Tooling (`tools/`):** `token-lint.js`, `decor-lint.js`, `gen-alt-pegs.js` (+ content import/export CSVs). See §5.
- **Notes:** `memoverse.md` (design notes), `THEMES_ROADMAP.md` (points at the prototype mockups).
- **Prototype mockups** (visual targets for the themes): `C:/Users/elija/Desktop/VerseVault-Designs/design-03-stained-glass.html`, `design-06-duolingo-fun.html`, `design-07-adventure-quest.html`.

**QA harness (Playwright)** lives in the session scratchpad, reusing Playbooks' node_modules:
`scratchpad/qa/theme_qa.js` (screenshots every theme × tab, asserts no console errors + no horizontal overflow), `syntaxcheck.js` (extracts the inline script and `vm.Script`-checks it), plus targeted probes (`probe_back.js`, `probe_peg.js`, `probe_table.js`). Playwright: `C:/Projects/KingdomBuilders.AI/Playbooks/node_modules/playwright`.

---

## 2. Core architecture / key internals

- **Storage:** ALL persistence goes through the `Store` module (`get/set/remove/getJSON/setJSON`, crash-proof). Single swap-point for Capacitor Preferences/SQLite on mobile. Keys: `vv_progress_v3`, `vv_srs_v3`, `vv_trans`, `vv_theme`, `vv_acct`, `vv_token`, `vv_skiplogin`, `vv_pro`.
- **Progress:** the `Prog` object. `PROG_SCHEMA` + `migrateProg()` upgrade old saves; corrupt saves are stashed to `vv_progress_v3_corrupt` and reset (never white-screen). `mergeProg()` unions two snapshots for cloud sync (favors "never lose progress"). Notable `Prog` fields: `memorized[]`, `doneSkills[]`, `saved[]`, `skipped[]`, `palaces{}`, `dayStreak`, `talents`, `freezes`, `level`, `customBook{}` (own book scenes), `customScene{}` (own verse scenes), **`customPeg{}` (user-chosen image words)**, `foundationsCelebrated`.
- **Major System:** `SND` (digit→sound), `PEGS`/`PEGS100` (peg words), `pegFor(n)` returns `{word, sounds}` — **the single source every screen reads** (teach, quizzes, decode, journey, tables). `digitSounds()`, `decodeSentence(n)` ("Use the Major System to decode SUN to 02 because 0 = s and 2 = N").
- **Learning path:** `UNITS` / `buildUnits()` → skills with ids like `snd:0-4`, `num:1`, `book:40`, `palace:0`, `story:N`, `peg:67`. `flatSkills()`, `skillUnlocked()`, `skillColor()` (new/gold/gray/locked). Leitner SRS (`SRS`, `INTERVAL`). **The Foundation is ONE merged track** (Torah `num:1..5` + Matthew `book:40` + first palace `palace:0`), not three.
- **Reachability:** a verse is practiceable when book#, chapter#, and verse# are ALL in `knownNumbers()`. `reachable(b,c,v)`; caches busted via `bustCaches()` on unlock. Bible stories sort by `storyReachKey` (highest of book/chapter/verse sinks to the bottom).
- **Single render path (critical):** ~30 `render*` functions emit `innerHTML` onto 6 shared `.view` sections. **There is zero JS theme-branching in render/logic** — this is what prevents feature divergence across themes (see §4). Keep it that way.

---

## 3. Feature state — all built & live

- **Onboarding:** boots straight to the **Learn** tab (no intro-verse carousel). Bottom nav order L→R: **Learn · Verse · Stories · Palace · Journey**. On a fresh account every tab except Learn is **locked**; completing the Foundation (`foundationsDone()` = books 1-5 + 40 known and `palace:0` done) fires the **"Foundations Laid"** milestone and flashes/unlocks Verse + Stories (one-time, `Prog.foundationsCelebrated`). `tabUnlocked()`/`updateTabLocks()` in `updateMetrics`.
- **Book teach card:** 3-line stacked header — `[book icon] BookName`, then **`Book NN`** big & gold-centered, then `ImageWord [peg image]`; book/image names share size + color, number takes the image gold. "Write my own scene" sits under the iconography with ONE combined **image→book** example + the decode sentence. Scroll-resets to top on entry.
- **Editable image words** (`ALT_PEGS`, `pegAlts`, `pegPicker`): users swap a peg's image word from a **curated, Major-System-verified** list (never freeform) — offered in the **lesson teach card AND both reference tables**. Every option decodes to the same two-digit code (so "Soup" is valid for 9, "Cat" is impossible). Picking sets `Prog.customPeg[n]` (flows everywhere via `pegFor`) and **blanks the drawn art** (dashed "✎ your picture" slot, since the SVG no longer matches). `tools/gen-alt-pegs.js` regenerates + verifies `ALT_PEGS`.
- **Verse hub** (`renderVerse`, `vView`): 6 big **square** buttons — Suggested, Browse by topic, Memorized, Saved, Test Numbers & Books, and **Test my verses** (review, full-width, at the bottom). Random verse removed; Share + Talent Store moved to Profile.
- **Android/browser back button = in-app back** (`appBack()` + `popstate`): one press steps back one screen (close pop-up → exit lesson via ✕ → leave a "← back" sub-page → drop any tab to Learn home). At the Learn home it arms with a "Press back again to exit" toast; a second press exits. Single history seed, no per-screen bookkeeping.
- **Profile:** backup/export, restore/import, **Reset all progress** (`resetAllProgress()` — prompts to save first, restorable via Restore), Share progress, Talent Store.
- **Paywall** — `Billing` module, Pro = $25/yr. Free = sounds (`snd:*`), Torah `num:1..5`, first palace `palace:0`, Matthew `book:40`. Everything else Pro-gated (`skillPaywalled`, `#payModal` with a top-right ✕, `openPaywall`). **Unlock code `elijahsentme`** (`Billing.codes`) unlocks permanently — but note: the unlock code is slated for removal before go-live, so don't harden it. Stripe not wired: set `Billing.cfg.checkoutUrl` to a Payment Link whose success redirect appends `?checkout=success` (`Billing.handleReturn()` trusts it — add a backend verify later). Mobile stores forbid Stripe for digital goods → IAP there. Test: `Billing.grant()` / `Billing.revoke()` in devtools.
- **Palace SRS trail** — `SR_TRAIL=[0,1,3,7,16,30]` days; each palace has `learnedAt`+`step`. `palaceDue()`, red badge on the Palace tab, video placeholder at the top of the first palace lesson. `startPalaceEdit()` renames/reorders/adds/removes locations.
- **"I forgot this"** on the memorized test — `forgotVerse()` moves a verse back to `saved`, clears its SRS + 24h points lock.
- **Translations:** KJV + BBE ship. NKJV/NIV/NLT/ESV are stubbed (`licensed:true`, data→null) pending a Bible-API license.
- **Video placeholders** (4): Learn intro, palace build, palace why, spaced-repetition — user will supply the videos.

---

## 4. Theming — "one app, four apps" (the maintenance backbone)

Five themes (Illumined [default], Classic, **Stained Glass**, **Scripture Quest** [youth], **Verse Buddy** [youth]) that read as genuinely different apps. The whole point of the architecture: **a feature added once must work and look right in every theme automatically — no per-theme bug drift.** Read `project_burningbush_theming.md` (memory) before touching themes.

Two hard rules, mechanically enforced:
1. **Base CSS reads ONLY design tokens** (~70 tokens in `:root`; per-theme `.phone[data-theme="x"]{}` blocks redefine tokens + additive chrome + per-theme layout). No hardcoded colors in base component CSS. Key trick: separate **text vs fill** tokens (`--gold-ink`/`--miss-ink` default to `--gold`/`--miss`; light themes darken them).
2. **No JS theme-branching** in render/logic. Layout differences are pure CSS on the shared semantic DOM.

Youth themes add a **decorator layer** (option 3): `paintTheme()` runs after render; `THEME_DECOR = {buddy, quest}` inject read-only `.theme-decor` DOM (dove/lamb mascots, speech bubbles, sticky CTAs) via `DecorAPI` (a frozen read-only bridge — the ONLY sanctioned way a decorator reads `Prog`). Decorators may **only decorate** — never touch state/logic.

⚠️ **When editing the decorator comment block, never let a comment contain the literal `*/`** (it closes the block early — this bit us with "render*/startLesson"). Say "render fn" instead.

---

## 5. Guardrails — run before every deploy

```bash
cd C:/Projects/BibleMemory
node tools/token-lint.js     # fails if base CSS hardcodes a color (the exact bug class that broke Buddy)
node tools/decor-lint.js     # fails if a decorator touches Prog/SRS/Store/render*/startLesson, or a node lacks .theme-decor
# syntax + visual regression (from scratchpad/qa):
node syntaxcheck.js          # extracts the inline script and vm.Script-checks it — 0 errors
node theme_qa.js             # screenshots every theme × tab; asserts no console errors + no horizontal overflow
```
`gen-alt-pegs.js` regenerates the `ALT_PEGS` table with a Major-System encoder (only run when changing the alternate-word list; paste its literal back into `index.html`).

**Green bar = all four lints/harness pass with no console errors and no overflow.** Do not deploy on a red bar.

---

## 5b. Versioning & the in-app changelog (do this on EVERY release)

The app ships a user-facing changelog. Before you deploy:

1. Bump `APP_VERSION` in `index.html` (semver — patch for fixes, minor for features).
2. Add an entry at the **top** of `CHANGELOG` using that same version:
   `{v:"1.2.0", d:"Month D, YYYY", t:"short theme", items:[["new"|"fix","what changed"], …]}`
   Write items **for the user**, not the codebase — say what they will notice, not what you refactored.
3. That's all. A version the device hasn't seen pops the "What's new" card once
   (`checkVersionCard()` at boot; a brand-new user gets it recorded silently instead of shown).
   The full history lives under **Profile → What's new → Version history** (`openWhatsNew(true)`).
   Seen-state is the `Store` key `vv_version`.

Current: **v1.9.4** (2026-08-24).

## 6. Deployment (⚠️ read before pushing)

Live at **https://kingdombuilders.ai/burningbush** (origin: `kb-burningbush.onrender.com/burningbush`). Deploy repo `C:/Projects/BurningBush/` → GitHub `ElijahBurrup/burningbush` (branch **`master`**, app lives in subfolder `burningbush/`) → Render auto-deploys the static site → Cloudflare routes.

`kjv.js`, `bbe.js`, `fonts/`, and `images/` are already committed in the repo — **routine deploys ship `index.html` only**. The one required transform: rewrite relative asset paths to the `/burningbush/` prefix. Copy-paste pipeline:

```bash
DEV="C:/Projects/BibleMemory"; REPO="C:/Projects/BurningBush/burningbush"
sed -e 's#href="images/icon-512.png"#href="/burningbush/images/icon-512.png"#g' \
    -e 's#href="manifest.webmanifest"#href="/burningbush/manifest.webmanifest"#g' \
    -e 's#href="fonts/fonts.css"#href="/burningbush/fonts/fonts.css"#g' \
    -e 's#src="kjv.js"#src="/burningbush/kjv.js"#g' -e 's#src="bbe.js"#src="/burningbush/bbe.js"#g' \
    -e 's#`images/books/${n}.svg`#`/burningbush/images/books/${n}.svg`#g' \
    -e 's#`images/pegs/${n}.svg`#`/burningbush/images/pegs/${n}.svg`#g' \
    "$DEV/index.html" > "$REPO/index.html"
# sanity: diff should show exactly 7 rewritten lines
diff "$DEV/index.html" "$REPO/index.html" | grep -c '^>'   # expect 7
cd "C:/Projects/BurningBush" && git add burningbush/index.html    # NOT -A (sibling repos live alongside)
git commit -m "…                                    # end with: Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

**CRITICAL path rule:** image refs MUST use the exact template `` `images/books/${n}.svg` `` / `` `images/pegs/${n}.svg` `` (that's what `pegImg` does) so `sed` rewrites them. An inline `${s.n}` or a differently-shaped literal will NOT be rewritten and will 404 on deploy.

**Verify live** (~20–40s after push): `curl -s "https://kingdombuilders.ai/burningbush/index.html?cb=$RANDOM" | grep -o "<a-marker-from-your-change>"`. Pushed ≠ deployed — confirm the marker is actually live.

**Cloudflare gotcha:** `kingdombuilders.ai/*` is owned by a separate worker **`kb-router`** (source NOT on this machine) serving the admin dashboard + `/playbooks`, `/sunosmart`, `/znotes`, `/evidence`. Burning Bush is served by a narrow route **`kingdombuilders.ai/burningbush*`** only. Never point a wildcard worker at `kingdombuilders.ai/*` or you break `/evidence`. **Never share the `onrender.com` URL** — prod is always `kingdombuilders.ai/...`.

---

## 7. Credentials & accounts

- **GitHub:** `gh auth switch --user ElijahBurrup` before KB repo ops (the default active user is `elijahburrup323-droid`). Repo git identity: name `ElijahBurrup`, email `elijah@kingdombuilders.ai`.
- **Render** (KB account): service `kb-burningbush` (`srv-d9lvsbfqj5pc739rpre0`).
- **Cloudflare Workers token** (only needed if the worker itself must be redeployed): `C:/Users/elija/.claude/credentials/cloudflare-api.md` → "Token #3 — Workers (Burning Bush deploy)".
- **Cloud accounts / sync (LIVE):** `burningbush-api` on the SHARED `kb-playbooks-db` via Postgres schemas (`kb.users` + `burningbush.progress`) — $0 extra DB. See `project_kb_data_platform.md`.

---

## 8. Authoring rule

Author number↔image↔book **relationship scenes** (and verse scenes) ONLY with the **Fable 5** model — spawn an Agent with `model:"fable"`. Roll out / test WITHOUT Fable. Peg/scene *artwork* is generated in Higgsfield. See `feedback_verse_vault_fable5.md`.

---

## 9. What's next

- Bundle the theme display fonts locally (Bangers / Fredoka / Nunito / EB Garamond) — currently Google-Fonts-linked with local fallbacks.
- Wire real Stripe (Payment Link + backend verify); remove the unlock code before go-live.
- Supply the 4 explainer videos.
- Capacitor mobile wrap + Play in-app purchase; Play Store submission.
- Prioritized plan: `C:/Users/elija/Desktop/Burning Bush Next Steps.html`.

## 10. Related memory (`…/memory/`)
`project_burningbush_deploy.md`, `project_burningbush_theming.md`, `project_kb_data_platform.md`, `project_verse_vault.md`, `feedback_verse_vault_fable5.md`.
