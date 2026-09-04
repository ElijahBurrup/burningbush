/**
 * QA probe 20 — SPEAKING A SCENE.
 *
 * Typing two sentences of deliberate nonsense on a phone is the thing testers gave up on, so the
 * microphone matters. What matters more is that it cannot cost anybody their work: dictation writes
 * around the caret and every failure has to leave the box exactly as it was.
 *
 * SpeechRecognition is stubbed, so this runs the same on a machine with no microphone and can drive
 * failures that are hard to produce by hand — a denied permission, a dead network, silence.
 *
 *   node tests/qa/dictation.js
 */
const H = require('C:/Projects/BurningBush/tests/lib/harness.js');
const out = [];
const say = (ok, msg) => { out.push((ok ? '  ok   ' : '  FAIL ') + msg); return ok; };

(async () => {
  const browser = await H.chromium().launch();
  const page = await H.open(browser, { which: 'built', prog: H.SEEDED });
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  const r = await page.evaluate(async () => {
    const res = {};
    closeEveryOverlay();

    // A stub standing in for the browser's engine, so every ending can be driven on purpose.
    let inst = null;
    class FakeRec {
      constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; inst = this; }
      start() { this.started = true; }
      stop() { if (this.onend) this.onend(); }
      say(finalText, interim) {
        this.onresult({ resultIndex: 0, results: Object.assign(
          [{ 0: { transcript: finalText || '' }, isFinal: true },
           { 0: { transcript: interim || '' }, isFinal: false }].filter(x => x[0].transcript),
          { length: (finalText ? 1 : 0) + (interim ? 1 : 0) }) });
      }
      fail(code) { this.onerror({ error: code }); }
    }
    window.SpeechRecognition = FakeRec;

    const openEditor = (starting) => {
      closeEveryOverlay();
      editText({ title: 'A scene', value: starting || '', autoCap: true, onSave: v => { res.saved = v; } });
    };

    // 1. the button is there, and says what it does
    openEditor('');
    res.offered = !!el('edMic');
    res.label = (el('edMic') || {}).textContent || '';

    // 2. speaking into an empty box
    el('edMic').click();
    res.listeningLabel = el('edMic').textContent;
    inst.say('a nasa ship crashes into a hairbrush');
    res.afterSpeak = el('edTa').value;
    inst.stop();
    res.afterStop = el('edTa').value;

    // 3. interim words appear and then correct themselves
    openEditor('');
    el('edMic').click();
    inst.say('', 'a nasa ship crash');
    const interim = el('edTa').value;
    inst.say('a nasa ship crashes', '');
    const settled = el('edTa').value;
    inst.stop();
    res.interim = { showed: /crash/.test(interim), settled: /crashes/.test(settled), noDupe: !/crash crash/i.test(settled) };

    // 4. THE ONE THAT MATTERS: it writes around what is already typed
    openEditor('The lava is everywhere.');
    const ta = el('edTa');
    ta.setSelectionRange(9, 9);                      // caret after "The lava "
    el('edMic').click();
    inst.say('boils and');
    const mid = ta.value;
    inst.stop();
    res.aroundCaret = { kept: /The lava/.test(mid) && /is everywhere/.test(mid),
                        inserted: /boils and/.test(mid),
                        order: mid.indexOf('boils') > mid.indexOf('lava') && mid.indexOf('boils') < mid.indexOf('everywhere') };

    // 5. a denied microphone loses nothing and offers the way out
    openEditor('Already written.');
    el('edMic').click();
    inst.fail('not-allowed');
    res.denied = { kept: el('edTa').value === 'Already written.',
                   said: (el('edMicNote').innerText || ''),
                   offersHelp: !!el('edMicFix'),
                   backToIdle: /Speak it instead/.test(el('edMic').textContent) };

    // 6. every other ending is named rather than lumped together
    const endWith = code => { openEditor(''); el('edMic').click(); inst.fail(code); return (el('edMicNote').innerText || ''); };
    res.messages = { silence: endWith('no-speech'), offline: endWith('network'), noMic: endWith('audio-capture') };

    // 7. and the help names the path for how this app is actually being run
    closeEveryOverlay();
    const helpFor = (ua, installed) => {
      const realInstalled = window.isInstalledApp;
      window.isInstalledApp = () => installed;
      Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
      const h = micSettingsHelp();
      window.isInstalledApp = realInstalled;
      return h.steps.join(' | ');
    };
    res.paths = {
      androidInstalled: helpFor('Mozilla/5.0 (Linux; Android 14)', true),
      androidTab: helpFor('Mozilla/5.0 (Linux; Android 14)', false),
      iphone: helpFor('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', false)
    };

    // 8. INSIDE THE PHONE APP, where there is no Web Speech engine at all and Android's own
    //    recogniser does the work through a plugin. Its habits are different in ways that matter:
    //    it reports the whole utterance again on every partial rather than the new words, and it
    //    ends the utterance at a pause — which in a two-sentence scene is not the end.
    delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
    const tick = () => new Promise(r2 => setTimeout(r2, 0));
    const SR = {
      perm: 'granted', avail: true, starts: 0, asked: [], listeners: {},
      async checkPermissions(){ this.asked.push('check'); return { speechRecognition: this.perm }; },
      async requestPermissions(){ this.asked.push('request'); return { speechRecognition: this.perm }; },
      async available(){ return { available: this.avail }; },
      async start(o){ this.starts++; this.opts = o; },
      async stop(){ this.pause(); },
      async addListener(n, fn){ (this.listeners[n] = this.listeners[n] || []).push(fn); return { remove(){} }; },
      removeAllListeners(){ this.listeners = {}; },
      emit(n, d){ (this.listeners[n] || []).slice().forEach(f => f(d)); },
      partial(s){ this.emit('partialResults', { matches: [s] }); },
      pause(){ this.emit('listeningState', { status: 'stopped' }); }
    };
    const realCap = window.Capacitor;
    window.Capacitor = { getPlatform: () => 'android', Plugins: { SpeechRecognition: SR } };

    res.nat = { offeredWithNoWebEngine: (openEditor(''), !!el('edMic') && /Speak it/.test(el('edMic').textContent)) };

    // it asks for the microphone at the moment it is tapped, not before
    res.nat.askedBeforeTap = SR.asked.length;
    el('edMic').click(); await tick(); await tick();
    res.nat.asksOnTap = SR.asked.includes('check');
    res.nat.listening = /Listening/.test(el('edMic').textContent);

    // Android repeats the whole utterance each time; it must not stack up
    SR.partial('a nasa ship');
    SR.partial('a nasa ship crashes into a hairbrush');
    res.nat.noStacking = el('edTa').value === 'a nasa ship crashes into a hairbrush';

    // a breath between sentences is not the end of a scene
    const startsBefore = SR.starts;
    SR.pause(); await tick(); await tick();
    res.nat.keepsGoingAfterAPause = SR.starts === startsBefore + 1 && Dictation.listening();
    res.nat.keptFirstSentence = el('edTa').value === 'a nasa ship crashes into a hairbrush';
    SR.partial('the bristles catch fire');
    res.nat.joinsSentences = el('edTa').value === 'a nasa ship crashes into a hairbrush the bristles catch fire';

    // tapping the button commits everything heard
    el('edMic').click(); await tick(); await tick();
    res.nat.committed = el('edTa').value;
    res.nat.stopEnds = !Dictation.listening() && /Speak it/.test(el('edMic').textContent);

    // silence twice running is the end, and says so rather than pretending
    openEditor(''); el('edMic').click(); await tick(); await tick();
    SR.pause(); await tick(); await tick(); SR.pause(); await tick(); await tick();
    res.nat.givesUpOnSilence = !Dictation.listening() && /Nothing was heard/i.test(el('edMicNote').innerText || '');

    // a refused microphone loses nothing and offers the way out
    SR.perm = 'denied';
    openEditor('Already written.'); el('edMic').click(); await tick(); await tick(); await tick();
    res.nat.denied = { kept: el('edTa').value === 'Already written.',
                       offersHelp: !!el('edMicFix'),
                       said: (el('edMicNote').innerText || '') };
    SR.perm = 'granted';

    // no recogniser on the phone at all is its own message, not a hang
    SR.avail = false;
    openEditor(''); el('edMic').click(); await tick(); await tick(); await tick();
    res.nat.noEngine = { ended: !Dictation.listening(), said: (el('edMicNote').innerText || '') };
    SR.avail = true;

    // and in the app the help opens the settings screen rather than describing the walk to it
    const h = micSettingsHelp();
    res.nat.helpOpensSettings = !!h.native;

    window.Capacitor = realCap;
    closeEveryOverlay();
    return res;
  });

  say(r.offered, 'the scene editor offers a microphone');
  say(/Speak it/.test(r.label), '...saying plainly what it does ("' + r.label.trim() + '")');
  say(/Listening/.test(r.listeningLabel), 'tapping it starts listening, and says so');
  say(/nasa ship/.test(r.afterSpeak), 'what is said lands in the box');
  say(r.interim.showed && r.interim.settled && r.interim.noDupe,
      'half-heard words appear and then correct themselves, without doubling up');
  say(r.aroundCaret.kept, 'what was already typed survives dictation');
  say(r.aroundCaret.inserted && r.aroundCaret.order, '...and the new words land at the caret, not at the end');
  say(r.denied.kept, 'a denied microphone loses nothing that was written');
  say(/switched off/i.test(r.denied.said), '...says the microphone is off');
  say(r.denied.offersHelp, '...offers to show where the switch is');
  say(r.denied.backToIdle, '...and the button goes back to how it was');
  say(/Nothing was heard/i.test(r.messages.silence), 'silence is its own message, not an error');
  say(/connection/i.test(r.messages.offline), 'being offline is its own message');
  say(/No microphone/i.test(r.messages.noMic), 'a missing microphone is its own message');
  say(/Apps/.test(r.paths.androidInstalled) && /Permissions/.test(r.paths.androidInstalled),
      'installed on Android, the path is Settings → Apps → Permissions');
  say(/address/.test(r.paths.androidTab), '...in a browser tab it is the icon by the address instead');
  say(/keyboard/i.test(r.paths.iphone), '...and on iPhone it points at the keyboard microphone, which does work');

  const n = r.nat;
  say(n.offeredWithNoWebEngine, 'in the phone app the microphone is offered though the WebView has no speech engine');
  say(n.askedBeforeTap === 0 && n.asksOnTap, '...permission is asked when it is tapped, never at launch');
  say(n.listening, '...and it starts listening');
  say(n.noStacking, "Android repeating the whole utterance does not stack up in the box");
  say(n.keepsGoingAfterAPause, 'a breath between sentences does not end the scene');
  say(n.keptFirstSentence && n.joinsSentences, '...and the sentences either side of it join up');
  say(n.committed.toLowerCase() === 'a nasa ship crashes into a hairbrush the bristles catch fire',
      'tapping the button commits every sentence heard, in order');
  say(n.stopEnds, '...and stops');
  say(/^A nasa/.test(n.committed), '...and tidies the opening capital, as it does for typing');
  say(n.givesUpOnSilence, 'silence twice running gives up, and says nothing was heard');
  say(n.denied.kept && n.denied.offersHelp && /switched off/i.test(n.denied.said),
      'a refused microphone loses nothing and offers the way out');
  say(n.noEngine.ended && /not available/i.test(n.noEngine.said),
      'a phone with no recogniser on it says so rather than hanging');
  say(n.helpOpensSettings, 'and in the app the help offers to open the settings screen itself');

  console.log(out.join('\n'));
  console.log(errs.length ? '\npage errors:\n  ' + errs.join('\n  ') : '\npage errors: none');
  console.log(out.some(l => l.startsWith('  FAIL')) ? '\nDICTATION FAILED' : '\ndictation clean');
  await browser.close(); await H.stopServer();
})();
