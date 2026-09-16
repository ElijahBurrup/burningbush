#!/usr/bin/env node
/**
 * The app says its own version on the About screen, and the store reads two different numbers out of
 * build.gradle. Three places to remember is two too many, so this copies APP_VERSION into both.
 *
 * versionName is the version as people read it: "2.21.7".
 * versionCode is the whole number Play orders uploads by, and it must be HIGHER than the last one
 * or the upload is refused — after the build, at the point where it is most annoying. It is derived
 * from the same version rather than counted up: 2.21.7 -> 22107 (major*10000 + minor*100 + patch).
 * That rises with every release, cannot be minted differently on two machines, and leaves room for
 * 99 minors and 99 patches. A release that needs a second upload of the SAME version bumps the
 * patch, which is what the changelog wants anyway.
 *
 *   node bin/stamp-version.js
 */
const fs = require('fs');
const path = require('path');
const HERE = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(HERE, '..', 'src', 'index.html'), 'utf8');
const ver = (src.match(/const APP_VERSION="([^"]+)"/) || [])[1];
if (!ver) { console.error('stamp-version: no APP_VERSION in src/index.html'); process.exit(1); }

const [maj, min, pat] = ver.split('.').map(Number);
if (min > 99 || pat > 99) { console.error(`stamp-version: ${ver} does not fit major*10000 + minor*100 + patch`); process.exit(1); }
const code = maj * 10000 + min * 100 + pat;

const G = path.join(HERE, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(G, 'utf8');
const hits = g.match(/versionName "[^"]+"/g) || [];
if (hits.length !== 1) { console.error(`stamp-version: expected one versionName, found ${hits.length}`); process.exit(1); }
const codes = g.match(/versionCode \d+/g) || [];
if (codes.length !== 1) { console.error(`stamp-version: expected one versionCode, found ${codes.length}`); process.exit(1); }
const was = Number((codes[0].match(/\d+/) || [])[0]);
if (code < was) { console.error(`stamp-version: ${ver} would give versionCode ${code}, below the ${was} already there — Play refuses that`); process.exit(1); }
g = g.replace(/versionName "[^"]+"/, `versionName "${ver}"`).replace(/versionCode \d+/, `versionCode ${code}`);
fs.writeFileSync(G, g);

const P = path.join(HERE, 'package.json');
const pkg = JSON.parse(fs.readFileSync(P, 'utf8'));
pkg.version = ver;
fs.writeFileSync(P, JSON.stringify(pkg, null, 2) + '\n');

console.log(`stamped v${ver} (versionCode ${code}${was !== code ? ', was ' + was : ''}) into build.gradle and package.json`);
