#!/usr/bin/env node
/**
 * Build the debug APK.
 *
 * A node script rather than a line in package.json because "cd android && gradlew.bat" means
 * different things to cmd.exe and to a bash shell, and gets silently skipped in one of them —
 * which looks exactly like a successful build that produced yesterday's file.
 *
 *   node bin/apk.js
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ANDROID = path.join(__dirname, '..', 'android');
const wrapper = path.join(ANDROID, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
if (!fs.existsSync(wrapper)) { console.error('no gradle wrapper at ' + wrapper); process.exit(1); }

// Node refuses to launch a .bat directly, so on Windows it goes through the command processor.
const win = process.platform === 'win32';
const r = win
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/c', wrapper, 'assembleDebug'], { cwd: ANDROID, stdio: 'inherit' })
  : spawnSync(wrapper, ['assembleDebug'], { cwd: ANDROID, stdio: 'inherit' });
if (r.error) { console.error('could not run gradle: ' + r.error.message); process.exit(1); }
if (r.status !== 0) { console.error(`\ngradle failed (exit ${r.status})`); process.exit(r.status || 1); }

const apk = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(apk)) { console.error('gradle said it succeeded but there is no APK at ' + apk); process.exit(1); }
const { size, mtime } = fs.statSync(apk);
const age = Date.now() - mtime.getTime();
if (age > 5 * 60 * 1000) { console.error(`the APK is ${Math.round(age / 60000)} minutes old — this build did not produce it`); process.exit(1); }
console.log(`\n${apk}\n${(size / 1048576).toFixed(1)} MB, built just now`);
