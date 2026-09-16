# Findings — the run-up to release

Newest first. Every finding ends as **fix** (with the test that now covers it), **not a bug** (with
why), or **deferred** (with what would change that). The plan is in
[release-readiness.md](release-readiness.md).

```
#n  [area]  what happens · how to see it · verdict · fixed in
```

---

## Pass 5 — the two that failed on the baseline too

**#29 [tests] the store paywall probe described a paywall that did not ship.**
`shell.js`, as the phone app, asked for a note saying where Pro is set up (`#payIosNote`) and for
unlocking a lesson with talents (`#payLesson`). Both failed, identically on a pristine 3aa60ab. The
first store release is free from end to end: `bin/build.js` removes the paywall rather than hiding
it (`openPaywall` becomes a no-op) and `isPro()` is true, so there is no note to show and nothing
locked to open. The two checks described an earlier plan, a paywall with its prices taken off.
*Verdict:* not a bug. The probe now checks what shipped: no paywall in the build, every lesson open.

**#28 [tests] the Library door probe read the sticker while it was still peeling.**
`library-door.js` asked that a round of practice lift the Word for Word sticker, and read the Library
straight after the round. The sticker is peeled, not deleted: `libUse("verses")` marks the peel pending,
the Library runs it 400ms later, and the foil animates away over a second. Real use is covered — the
hub runs a pending peel whenever it draws ("earned in a test, peeled here"), so finishing a round on the
practice screen still lifts it next time the Library opens. The leftover sticker also made "the first
palace lifts the last sticker" count one too many. The probe printed FAIL and exited 0, so no run ever
reported it (fixed).
*Verdict:* not a bug. The probe waits for the peel. Both probes are clean on 2.21.8.

## Pass 4 — owner requests, and what building them turned up

**#26 [tests] a scroll spec had been measuring the Library, not the lesson.**
"Choosing an image leaves you where you were" opened a book lesson from the Library tab and read
the shared scroller. The lesson draws into the Learn tab, which is not showing, so the position it
measured was the Library's — and the check only worked because the Library overflowed the screen.
Once the Library fitted (#24) its precondition, "the card is long enough to scroll", failed.
*Verdict:* fixed. The spec gives the scroller room of its own, outside every tab, and still proves
that choosing an image or a book picture does not reset the scroll.

**#25 [app] the Library's fit leaked, and judged the wrong thing.**
Building #24 turned up two faults in the first version, both caught by that spec. The density class
sat on the whole Library tab, so a lesson or a verse drawn into the same tab kept it and its tiles
shrank too; and "does it fit" asked whether the whole scroller overflowed, so anything else in it
forced the smallest tier, which then changed on a redraw and moved the page by 151px.
*Verdict:* fixed. The classes live on the hub's own wrapper (`#libHub`), which goes when the hub
goes, and `libHubFits()` asks only whether the hub itself ends inside the visible scroller.

**#24 [ux, owner request] the Library scrolled, and Caesar's warning could not be put away.**
The tiles stepped down by screen height alone (`@media (max-height:760px)` and `620px`), tuned to the
seven tiles with nothing above them. On a tall phone with the goal bar, the levy warning and an
announcement showing, none of that applied, and Word for Word went below the fold.
*Verdict:* fixed. The breakpoints became three density tiers the hub steps through after drawing
(`fitLibraryHub()`), re-fitted on resize and when a banner is dismissed; the smallest drops the hint
line and tightens the bars. Measured with every banner showing at 412×915, 390×844, 360×740,
360×640 and 320×568: Word for Word in view at all five. The levy warning has a labelled ✕,
remembered against that levy's due date, so the next levy still warns. Spec: `the Library fits the
screen, and the levy warning can be put away`.

**#27 [owner request] number 3 offered Leviticus instead of the burning bush.**
After learning 3, the lesson ended with "Build a new verse", which opens suggestions for book 3 —
Leviticus. Exodus 3:2, the verse the app is named for, was already a curated verse and reachable
right then, but nothing offered it.
*Verdict:* done. `NUMBER_PICKS` lets any number have a verse of its own (3 → Exodus 3:2), and
`numberPick()` checks it before the Psalm picks past 66, which are untouched. The lesson ends with
"Memorize Exodus 3:2 →" and a line saying why. Spec: `learning number 3 offers Exodus 3:2`.

## Pass 3 — the 30 probes, run properly for the first time

**#21 [app] the verse scene box grew to 1,374px while you typed.**
Two sizers fought over `#wScene`. `fitBoxTo` pins it to the room left above the keyboard and scrolls
inside; an older handler in the walk set it to the height of its text on every keystroke ("auto-grow
so it never needs its own scrollbar"). The older one won on every input, so a long scene pushed the
mic and both buttons off a phone screen mid-sentence, and nothing brought it back. Found by the
writing-box probe once it could reach the box at all; a hand test missed it because focusing the
box schedules `applyFit`, which re-pinned the height a moment later.
*Verdict:* fixed. The old auto-grow is gone; `fitBoxTo` is the one sizer. The behaviour suite now
types a long scene and fails if the box changes size (`the verse scene box keeps its size while you
write`).

**#20 [ux, for the owner] the verse scene box is three lines tall on a phone.**
`applyFit` gives a writing box whatever is left: `viewport − top of box − reserve`, never below 90px.
The verse scene box reserves 190px for the mic, its note and the two buttons, and it sits low on the
walk, so on a 412×915 phone it is **already at the 90px floor with the keyboard up, and stays there
when the keyboard goes away** (measured 96px → 96px). The scene editor, reserving 150 and sitting
higher, grows 96px → 521px in the same run, which is what that check was written against.
*Verdict:* not a crash, and not mine to decide — how tall that box should be is a design call. The
probe now asserts what the app guarantees (never below the floor, scrolls, keeps the caret's line in
view) and prints the measurement as a note. Worth a look on a real phone: writing a scene in three
visible lines is the moment people give up on scenes.

**#19 [tests] the writing-box probe asked for the impossible in three ways.**
It never reached the scene box at all (#14), and once past that: it demanded the box scroll to within
4px of its very bottom, when the app deliberately keeps the *caret's line* in view and leaves the
box's own bottom padding below it; and it measured the box's height before `applyFit` had settled,
so "does not grow as you type" compared a stale number with a fresh one.
*Verdict:* fixed. Padding is allowed for, the measurement waits for the fit, and the floor is
reported rather than asserted (#20). One of its failures was not the probe's fault at all: "does not
grow as you type" was right, and is #21.

**#18 [app] the Library threw itself away if `kjv.js` had not landed.**
`renderVerse` read `window.KJV[b-1]` with no guard. The Bible text is a separate file, so a slow or
failed load meant a `TypeError` and no Library at all, rather than a Library with fewer books on it.
Found because two probes served the app without its assets (#13) — the wrong reason, but a real
fault: in production a cache miss or a half-applied update does the same thing.
*Verdict:* fixed. `const KJV=window.KJV||[]` — the screen draws what it can.

**#17 [tests] the sound probe counted the wrong instrument, and counted it too early.**
Sound is recorded files now: fetched, decoded, played through a buffer source. The probe counted
`createOscillator`, which only the fallback tones use, and counted it the instant after asking, before
any decode could finish. So a working palette read as silent, and it printed FAIL on a healthy app —
on the baseline too, which is how we know it was never about today's changes.
*Verdict:* fixed. It counts buffer sources as well as oscillators, and gives each a moment to arrive.

**#16 [tests] the chronological probe asked the app to be wrong.**
Typing a book name only until the letters can name one book is the design: "Ge" is Genesis and is
accepted there and then. The probe typed the name minus two letters ("Genes" for Genesis) — unique,
so accepted — and called that "taken early".
*Verdict:* fixed. It now uses the shortest prefix that still fits more than one book, which is the
thing that must not be taken early.

**#15 [tests] the goal-marker probe counted the review twice.**
Its setup put the review into `goalDay.count` as ordinary work, and `goalCount()` adds
`srDoneToday()` itself. `bumpGoal(defer, fromReview)` deliberately does not raise that counter, so
the state was one no real day could reach, and "the review on its own is one marker" failed at 2.
*Verdict:* fixed. The setup counts ordinary work only.

**#14 [tests] the writing-box probe could never reach the scene box.**
It walked `Prog.memorized[0]`, and `openVerseWizard` sends an already-memorized verse to
`renderLearnedVerse`, which has no scene box at all. It also parsed keys as `b43c3v16` while the app
writes `43:3:16`, so the fallback asked for book 0, and the intro film stood in front of the walk.
*Verdict:* fixed. It walks a verse that is actually being learned, parses the real key, and marks the
film seen.

**#13 [tests] two probes served the repo instead of the published folder.**
The built app asks for `/kjv.js` and friends absolutely, exactly as production serves them. The
harness serves `burningbush/` as the site root; `hostile.js` and `transitions.js` served the repo
root, so every asset 404d and the app ran with no Bible. That is what produced the
`Cannot read properties of undefined` crash in five hostile scenarios.
*Verdict:* fixed (both serve the published folder). Whatever they find now is about the app.

**#11 [tests] two probes have been driving the landing page, not the app.**
`hostile.js` ("trying to break it") and `transitions.js` ("transitions and where you land") both open
`/burningbush/index.html`. That is the 19 KB landing page; the app is at
`/burningbush/app/index.html` (1.6 MB). Every `page.evaluate` in them therefore died on
`Prog is not defined` / `migrateProg is not defined` before testing anything. It pre-dates today —
the URL was always that; the app moved under `/app/` and the probes were never followed up — and it
means the two probes meant to catch hostile input and dead-end screens have been catching nothing.
*Verdict:* fixed (both now open the app). Their findings, once they actually run, are triaged below.

**#12 [tests] `sound.js` printed FAIL and exited 0.**
`tests/qa/all.js` counts a probe by its exit code, so a probe that says "SOUND FAILED" and returns
success is reported as clean — which is exactly what happened on the first full run.
*Verdict:* fixed. It exits 1 when it prints a FAIL.

## Pass 2 — the QA sweep

**#9 [a11y] the sound switches announce nothing.**
Every `.sfx-sw` toggle — the sound palette, each alternative take, and the review checkpoints —
carried `aria-pressed` but no name at all, so a screen reader says "button, pressed" and nothing
else. Three render sites, and the sweep found them on Profile and Translations.
*Verdict:* fixed. Each switch now names what it toggles: the sound's own label, the take's name,
"Checkpoint N on or off". `aria-pressed` still carries the state.

**#10 [tests] the sweep exaggerated, and mis-stated one check.**
It printed five distinct findings and then "449 findings in 2 areas": the list is deduplicated per
area but the total counted every screen a finding was seen on. A run that looks like hundreds of
problems is a run nobody reads. It also reported `phaseIdxs misses some non-story units` on a
healthy app: `phaseIdxs(track)` answers for one ladder, and the check compared it against the
non-story units of *both* ladders, so the Word for Word phases made it fire every time.
*Verdict:* fixed. The total counts distinct findings (and says how many sightings). The phase check
now asks per ladder and names the numbers when they disagree.

## Pass 1 — the code as written (reading, before any run)

**#23 [asserts] a review card whose due date is not a number.**
The plan listed "a review card with no due date" as an assert to add. It is not an invariant: a
card graduates to `dueAt=null`, and old saves are back-filled with `learnedAt` and `step` only.
What IS damage is a due date that exists and is not a finite number — `now + cueFirstGap()` with
the gap undefined gives NaN, and a NaN date is never due, so the verse leaves review for good.
*Verdict:* asserted in `saveProg`, one pass over the cards; "no due date" deliberately left alone.

**#22 [simplify] the same small questions, asked by hand.**
Which screen is showing was written seven times in three spellings
(`(document.querySelector(".view.active")||{}).id`, `…?.id`, and a bare lookup), and a random pick
from a list — `x[Math.floor(Math.random()*x.length)]` — seven times, beside a `pick(a)` helper that
already did exactly that.
*Verdict:* fixed. `activeViewId()` beside `modalHost()`; the picks use `pick()`. One line keeps its
own spelling because it declares a local `const pick`, and `const pick=pick(left)` would throw.

**#8 [asserts] the app had almost nothing that said "this cannot be true".**
Five `console.warn`s and two `throw`s across 19,600 lines, against 143 places that write progress.
`migrateProg` heals a bad save on the way *in*, so a value that goes wrong while the app is running
is written out, synced, and only noticed as a number on a screen looking odd.
*Verdict:* fixed, narrowly. `bbAssert(ok, what)` writes to the console and keeps the last few in
`window.__BB_ASSERTS`; it never interrupts the person using the app. Eight call sites, each one
placed where it fires *before* damage lands: progress written with a talent count that is not a
number or with memorized/doneSkills not lists, a talent amount that is not finite earned or spent, a
verse key built from anything but three integers in range, and a pop-up with no `.phone` to hang on.
The behaviour run now ends by failing if any assert fired anywhere in it.

**#7 [simplify] every pop-up built its own host, 59 times over.**
`const m=el("xModal")||(()=>{ … createElement … className="modal" … appendChild … })()` appeared in
four spellings across the file: an inline arrow, a `let m` with `el`, a `let m` with
`document.getElementById`, and multi-line versions of each. Every copy is a chance to forget
`className="modal"` and ship a sheet nobody can see, or to append somewhere other than `.phone`.
*Verdict:* fixed. One `modalHost(id)` beside `el()`; the id stays a literal at every call so the
static check can still see which ids exist, and `tests/static/check.js` now counts `modalHost("id")`
as producing one.

## Pass 1 — Android readiness (reading, before any run)

**#1 [android] `versionCode` is pinned at 1 and nothing raises it.**
`mobile/android/app/build.gradle` has `versionCode 1`, and `bin/stamp-version.js` copies
`APP_VERSION` into `versionName` while deliberately leaving `versionCode` alone. Google Play refuses
an upload whose `versionCode` is not higher than the last one, so the first update after launch is
rejected at the door — after the build, at the point where it is most annoying.
*Verdict:* fixed. `stamp-version` now derives it from the same version rather than counting up:
2.21.7 → 22107 (`major*10000 + minor*100 + patch`), stamped beside `versionName` on every
`npm run sync`. It rises with every release, cannot come out differently on two machines, and the
script refuses to stamp a code lower than the one already in the file, or a version that does not
fit (minor or patch above 99). Stamped now: `versionCode 22107`, `versionName "2.21.7"`, was 1.

**#2 [android] `versionName` in gradle reads 2.2.2.**
It is stamped from `APP_VERSION` by `npm run sync`, so any real build corrects it. Anybody reading
the file in between sees a version that shipped months ago.
*Verdict:* not a bug, but #1's fix should leave both stamped in the same place.

**#3 [android] `mobile/node_modules` is missing.**
`npm install` has to run before a build, and it is what applies the speech-recognition patch
(`patches/@capacitor-community+speech-recognition+7.0.1.patch`) through `postinstall`. A build
without it is a build without the patch.
*Verdict:* done. `npm install` ran on 2026-09-16: 137 packages, and the speech-recognition patch
applied through `postinstall`.

**#6 [tests] 28 of 31 QA probes loaded the app from `C:/Projects/BurningBush`.**
The harness was required by absolute path, so a probe run from any other checkout — a worktree, a
colleague's clone — silently tested *that* tree instead of its own, and reported findings about code
the runner had never touched. With two sessions sharing this repo it could also read a tree in the
middle of an edit.
*Verdict:* fixed. Every probe now requires `../lib/harness`, which resolves to the repo the file
lives in, and `tests/qa/all.js` runs them all in one go.

**#5 [android] a release build would be unsigned.**
`mobile/android/app/build.gradle` has a `release` buildType with `minifyEnabled false` and no
`signingConfig` at all, and there is no keystore in the repo or a word about one in `docs/`. An
unsigned release artifact cannot be uploaded to Play.
*Verdict:* open, and it needs the owner: an upload key is a credential only they should hold. The
debug APK (`npm run apk`) is unaffected, which is why this has not bitten yet.

**#4 [android] no text-to-speech plugin.**
`mobile/package.json` lists speech *recognition* but nothing that speaks. If a screen offers to read
a verse aloud in the phone app, it either falls back to the browser voice inside the WebView or does
nothing.
*Verdict:* open. Decide: add the plugin, or hide the feature in the shell.
