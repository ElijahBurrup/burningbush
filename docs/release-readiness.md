# Release readiness — the plan for shipping this thing

Written 2026-09-15, for the run-up to the Android build and the first real users. It is a plan of
work, not a description of the app: the app is in [README.md](../README.md).

The rule for the whole exercise: **every finding becomes either a fix with a test, or a line here
saying why it is not a bug.** Nothing is "noticed" and left.

---

## 0. What already guards the app

| Layer | What it pins | Run |
|---|---|---|
| static (17) | ids, handlers, orphan markup, tokens | `node tests/run.js static` |
| behaviour (1991) | what the app DOES, screen by screen | `node tests/run.js spec` |
| sync (37) | two devices, one account, merge convergence | `node tests/run.js sync` |
| sound (11) | every recording decodes in a real browser | `node tests/run.js sound` |
| snapshot (310 × 2) | every screen in five themes, source and built | `node tests/run.js snapshot` |
| layout (52) | nothing overflows at phone width | `node tests/run.js layout` |
| QA probes (30 files) | questions a regression suite cannot ask | `node tests/qa/all.js` |

The regression suite pins today's behaviour, so it is blind to anything that has been wrong all
along. That is what the QA probes and the exploratory passes below are for.

---

## 1. Phases

### P1 — everything green, every probe run
- The six suite layers green on the built artifact (`node tests/run.js --built`).
- All 30 QA probes run and their findings triaged. `node tests/qa/all.js` runs them in one go.
- **Exit:** a findings list with every item marked fix / not-a-bug / deferred.

### P2 — the journeys a person actually takes
Driven in Playwright end to end, not unit by unit. Each is a fresh profile, run on the built
artifact, and again as the phone shell (`--native`).

1. **First run.** Onboarding start to finish, the first lesson, the first verse, the first scratch
   ticket. No dead end, no screen without a way out, nothing says "undefined".
2. **The daily loop.** A day's goal set, met and rolled over; the review due, done, and the ladder
   advancing; the streak surviving a missed day with a freeze.
3. **Learning a verse.** Warm up, type it, hint, typo forgiveness, I Know By Heart, and the verse
   appearing in review afterwards.
4. **The long game.** Palace built and walked, a story section bought, a book unlocked, talents
   earned and spent, Rome's levy paid.
5. **Money.** Free user hits every paid door, subscribes (test card), Pro follows the account to a
   second browser, cancel returns them.
6. **Content.** A video plays and closes; the camera marks match the videos; an announcement shows
   and dismisses; an admin change reaches a second browser.
7. **Interruption.** Backgrounded mid-test, mid-review, mid-video; rotated; offline and back;
   signed out and in. **Nothing may move the user off the screen they are on** (2.21.7).

### P3 — Android readiness
Preparation only. The APK is built when the owner says "deploy android".
- ✅ `cd mobile && npm install` — done 2026-09-16; the speech patch applied through `postinstall`.
- ✅ `versionCode` derived from `APP_VERSION` by `bin/stamp-version.js` (2.21.7 → 22107), so every
  release outranks the last on Play and two machines cannot mint different codes.
- ⛔ **Release signing — needs the owner.** `build.gradle` has no `signingConfig`, so a release build
  would be unsigned. An upload key is a credential only the owner should hold (findings #5).
- Text-to-speech plugin decided: in, or the feature hidden in the shell.
- `npx cap sync android` clean; the version stamped by `bin/stamp-version.js`.
- Permissions asked in context, and the app still usable when they are refused.
- The phone's Back button: every screen returns, and the last press leaves the app.
- Rotation: portrait locked except a full-screen video.
- Notifications fire; a reminder still arrives after a reboot.
- Store build strips payment (`store-build.js` probe) and the sound default is off.
- The shell boots offline with no network at all.

### P4 — the code itself
- **Simplify** what has been rewritten enough times to have gone loose. Candidates, to be judged by
  reading rather than by feel: the verse screens (one renderer, several entrances), the reward and
  price call sites (now `REWARD`/`CONFIG_SCHEMA`), the modal openers (the same shell repeated), and
  the sync merge.
- **Assert** what is assumed. An assert earns its place when it fires before a user sees damage:
  progress written with no owner, a verse key that is not `b:c:v`, a talent balance going negative,
  a review card with no due date, a screen drawn with no way out.
- Every simplification lands with the suite green and the snapshots unchanged, or with the diff
  explained.

### P5 — sign-off
- Suite green on the built artifact, PAGEERROR 0.
- Probes clean or knowingly accepted.
- A fresh account taken through P2.1 to P2.6 on the live site.
- `version.json` matches `APP_VERSION`.
- The CHANGELOG entry written.

---

## 2. How the iterations run

Each pass: **run → list → fix → re-run**, smallest safe change first, suite green before the next
pass. Findings live in [`docs/findings.md`](findings.md), newest first, each with:

```
#12  [area]  what happens  ·  how to see it  ·  verdict: fix | not a bug | deferred  ·  fixed in <commit>
```

A fix with no test is not a fix: every one names the spec that now covers it.

---

## 3. Known before we start

- **Memory on this machine.** Chrome holds ~8 GB; background test runs have been killed twice. Run
  the layers one at a time, in the foreground.
- **YouTube.** No bulk calls from this PC, ever (it was bot-blocked on 2026-09-15). One playlist
  listing when the owner hands over a playlist.
- **The peer session** shares the repo. Fetch before committing; never ship its uncommitted work.
