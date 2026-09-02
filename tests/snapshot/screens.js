/**
 * tests/snapshot/screens.js — the catalogue of every screen the suite pins.
 *
 * Each entry navigates the app to one surface and names the element to fingerprint. These are
 * CHARACTERISATION tests: they record what the app does today, quirks and all. A refactor that
 * changes any rendered output fails and names the screen — which is exactly the safety net a
 * 6,000-line single-scope file needs before anyone restructures it.
 *
 * `go` runs inside the page. Keep each one to plain calls into the app's own functions.
 */
module.exports = [
  // ---- Learn ----
  { name: 'learn/path', sel: '#learn', go: () => { show('learn'); expandedUnits = new Set([0, 1]); renderPath(); } },

  // ---- Verses ----
  // The Library arrives in stages, so both ends of it are worth a picture: what a new reader opens
  // to, and what it looks like once every present has been handed over.
  { name: 'verse/hub', sel: '#verse', go: () => { Prog.libWon = []; show('verse'); vView = 'hub'; renderVerse(); } },
  { name: 'verse/hub-full', sel: '#verse', go: () => { Prog.libWon = ['pair', 'w4w']; show('verse'); vView = 'hub'; renderVerse(); } },
  { name: 'verse/suggested', sel: '#verse', go: () => { show('verse'); vView = 'sugg'; renderVerse(); } },
  { name: 'verse/topics', sel: '#verse', go: () => { show('verse'); vView = 'topics'; renderVerse(); } },
  { name: 'verse/memorized', sel: '#verse', go: () => { Prog.verseStage = {}; show('verse'); vView = 'mem'; renderVerse(); } },
  { name: 'verse/saved', sel: '#verse', go: () => { Prog.saved = ['40:6:33']; show('verse'); vView = 'saved'; renderVerse(); } },

  // ---- the verse wizard ----
  // 40:6:33 is deliberately NOT in the seeded account: openVerseWizard sends an already
  // memorized verse to the learned-verse page instead, which has no "Save Visual" button.
  { name: 'wizard/visual', sel: '#verse', go: () => { markVideoSeen('verse'); openVerseWizard(40, 6, 33, () => { }); } },   // the film plays on first use, so the first theme in the loop was recording that, not the wizard
  // Building the Scene plays before the first verse anyone ever builds, so this capture is of the
  // wizard itself, not of the film that precedes it once.
  { name: 'wizard/scene', sel: '#verse', go: () => { markVideoSeen('verse'); openVerseWizard(40, 6, 33, () => { }); el('wToScene').click(); } },
  { name: 'wizard/learned', sel: '#verse', go: () => { openVerseWizard(19, 23, 1, () => { }); } },

  // ---- practice ----
  { name: 'practice/verse-test', sel: '#verse', go: () => { show('verse'); askVerse('43:3:16'); } },
  { name: 'practice/word-pick', sel: '#verse', go: () => { startWordPick(43, 11, 35, () => { }); } },
  { name: 'practice/type-test', sel: '#verse', go: () => { startTypeTest(43, 11, 35, () => { }); } },
  { name: 'practice/w4w-win', sel: '#verse', go: () => { Prog.w4w = {}; Prog.blessIdx = 0; TT = { b: 43, c: 3, v: 16, ret: null, hintUsed: false, words: [] }; typeTestComplete(); } },
  { name: 'practice/w4w-locked', sel: '#verse', go: () => { Prog.w4w = { '43:3:16': { count: 3, times: [Date.now()] } }; w4wLockScreen(43, 3, 16, () => { }); } },
  // the set-up screen the practice now opens on — prefs reset so the ticks are reproducible
  { name: 'practice/num-setup', sel: '#verse', go: () => { Prog.ntPrefs = {}; saveProg(); openNumTestSetup(); } },
  { name: 'practice/number-test', sel: '#verse', go: () => { startNumberTest(1); } },
  { name: 'practice/text-fade', sel: '#verse', go: () => { startTextFade(43, 11, 35, () => { }); } },

  // ---- palaces ----
  { name: 'palace/list', sel: '#palace', go: () => { show('palace'); renderPalace(); } },
  { name: 'palace/mine', sel: '#palace', go: () => { show('palace'); renderMyPalace(0); } },
  { name: 'palace/edit', sel: '#palace', go: () => { show('palace'); startPalaceEdit(0); } },
  { name: 'palace/ready-made', sel: '#palace', go: () => { show('palace'); renderPalaceWalk('ten'); } },

  // ---- the Bible browser ----
  { name: 'bible/whole', sel: '#journey', go: () => { show('journey'); renderJourney(); } },
  { name: 'bible/book', sel: '#journey', go: () => { show('journey'); renderBookScreen(19); } },
  { name: 'bible/chapter', sel: '#journey', go: () => { show('journey'); renderChapterScreen(19, 23); } },
  { name: 'bible/chapter-long', sel: '#journey', go: () => { show('journey'); renderChapterScreen(19, 119); } },

  // ---- stories & reference ----
  { name: 'stories/list', sel: '#stories', go: () => { show('stories'); renderStories(); } },
  { name: 'stories/section', sel: '#storySecModal', go: () => { const u = UNITS.findIndex(U => U.story); Billing.grant(); openStorySection(u); } },
  // a story now opens on the verse scene screen, so that is where it is captured
  { name: 'stories/lesson', sel: '#verse', go: () => { const u = UNITS.findIndex(U => U.story); startStoryLesson(UNITS[u].skills[0], 'stories', () => { }); } },
  // Build the Book, both ways round: nothing chosen yet (instructions open, no sentence), and
  // both pictures chosen (instructions folded, the sentence showing).
  { name: 'learn/build-the-book', sel: '#verse', go: () => { delete Prog.bookWord[16]; delete Prog.numRef[16]; saveProg(); show('verse'); startAdhocLearn(16, true, () => { }); } },
  { name: 'learn/build-the-book-done', sel: '#verse', go: () => { Prog.bookWord[16] = 'knee-high socks'; Prog.numRef[16] = "a driver's licence"; saveProg(); show('verse'); startAdhocLearn(16, true, () => { }); } },
  { name: 'reference/foundations', sel: '#foundations', go: () => { show('foundations'); buildNumGrid(); buildBookTable(); } },

  // ---- modals ----
  { name: 'modal/profile', sel: '#themeModal', go: () => { el('themeBtn').click(); } },
  { name: 'modal/prof-section', sel: '#profSecModal', go: () => { el('themeBtn').click(); openProfSection('back-up-your-progress'); } },
  { name: 'modal/goal-same', sel: '#goalSetModal', go: () => { Prog.goalMode = 'same'; openGoalSettings(); } },
  { name: 'modal/goal-week', sel: '#goalSetModal', go: () => { Prog.goalMode = 'week'; openGoalSettings(); } },
  { name: 'modal/goal-days', sel: '#goalSetModal', go: () => { Prog.goalMode = 'days'; openGoalSettings(); } },
  { name: 'modal/paywall', sel: '#payModal', go: () => { openPaywall(UNITS.flatMap(U => U.skills).find(s => s.kind === 'book' && s.id !== 'book:40')); } },
  { name: 'modal/store', sel: '#storeModal', go: () => { openStore(); } },
  { name: 'modal/whats-new', sel: '#whatsNewModal', go: () => { openWhatsNew(true); } },
  { name: 'modal/church', sel: '#churchModal', go: () => { Prog.church = { given: 1400, built: 3, total: 8900 }; openChurch(); } },
  { name: 'modal/feature-store', sel: '#featModal', go: () => { openFeatureStore(); } },
  { name: 'modal/video', sel: '#videoModal', go: () => { openVideoScreen('palace'); } },
  { name: 'modal/translations', sel: '#themeModal', go: () => { el('themeBtn').click(); renderTransList(); } },
  { name: 'modal/video-intro', sel: '#videoModal', go: () => { openVideoScreen('intro', () => { }); } },
  { name: 'modal/book-image', sel: '#bookImgModal', go: () => { delete Prog.customBookImg[1]; saveProg(); openBookImagePicker(1, () => { }); } },
  // the Library (v1.17). videoOrder is set explicitly so the list is reproducible.
  { name: 'verse/videos', sel: '#verse', go: () => { Prog.videoOrder = ['sr', 'palace']; saveProg(); show('verse'); vView = 'videos'; renderVerse(); } },
  { name: 'modal/learn-verses', sel: '#libModal', go: () => { openLearnVerses(); } },
  // ---- the verse ladder (v1.13) ----
  { name: 'modal/stage', sel: '#stageModal', go: () => { openStagePicker(19, 23, 1, '19:23:1', () => { }); } },
  { name: 'modal/promote-pool', sel: '#promoteModal', go: () => { openStagePromote(43, 3, 16, '43:3:16', 'w4w', () => { }); } },
  { name: 'modal/promote-heart', sel: '#promoteModal', go: () => { openStagePromote(19, 23, 1, '19:23:1', 'heart', () => { }); } },
  // The review chooser is gone; Practice has its own screen now. A palace and a placed verse are
  // staged so all three orders are offered, then put straight back.
  { name: 'practice/setup', sel: '#verse', go: () => {
      const wasP = Prog.palaces, wasL = Prog.verseLoc;
      Prog.palaces = [{ place: 'My house', stations: ['Front door', 'Kitchen', 'Sofa'], learnedAt: 1, step: 1 }];
      Prog.verseLoc = { '43:3:16': { p: 0, room: 'Kitchen' } }; saveProg();
      openPracticeSetup();
      Prog.palaces = wasP; Prog.verseLoc = wasL; saveProg(); } },
  { name: 'modal/snooze', sel: '#snoozeModal', go: () => { openSnoozeAsk(43, 3, 16, '43:3:16', () => { }); } },
  { name: 'modal/spqr', sel: '#spqrModal', go: () => { openSpqrNote(); } },
  { name: 'modal/word-def', sel: '#wordDefModal', go: () => { openWordDef(19, 23, 1, 1, 'LORD'); } },
  { name: 'modal/notify-help', sel: '#notifyHelpModal', go: () => { openNotifyHelp(true); } },
  { name: 'modal/pace', sel: '#paceModal', go: () => { Prog.paceIdx = 0; Prog.goalDay = { date: dayKey(new Date()), count: 15 }; openPaceNudge(); } },
  { name: 'modal/goal-done', sel: '#goalDoneModal', go: () => { onGoalComplete(); } },

  // ---- Rome ----
  { name: 'rome/letter', sel: '#taxov', pro: true, go: () => { Prog.romeLetterSeen = false; openRomeLetter(); } },
  { name: 'rome/wheel', sel: '#taxov', pro: true, go: () => { Prog.talents = 3000; Prog.taxAt = Date.now() - 8 * DAY; openTaxWheel(false); } },
  { name: 'rome/wheel-poor', sel: '#taxov', pro: true, go: () => { Prog.talents = 400; Prog.taxAt = Date.now() - 8 * DAY; openTaxWheel(false); } },
  { name: 'rome/build', sel: '#buildov', pro: true, go: () => { Prog.church = { given: 400, built: 1, total: 2900 };
      Prog.piecesUsed = []; saveProg();   // pieces are DEALT, not rolled — reset the deck so the capture is reproducible
      openChurchBuild(500, null); } },
];
