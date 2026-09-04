#!/usr/bin/env node
/**
 * The app says its own version on the About screen, and the store reads a different number out of
 * build.gradle. Two places to remember is one too many, so this copies APP_VERSION across and
 * leaves versionCode alone — that one only ever goes up, and only when something is published.
 *
 *   node bin/stamp-version.js
 */
const fs = require('fs');
const path = require('path');
const HERE = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(HERE, '..', 'src', 'index.html'), 'utf8');
const ver = (src.match(/const APP_VERSION="([^"]+)"/) || [])[1];
if (!ver) { console.error('stamp-version: no APP_VERSION in src/index.html'); process.exit(1); }

const G = path.join(HERE, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(G, 'utf8');
const hits = g.match(/versionName "[^"]+"/g) || [];
if (hits.length !== 1) { console.error(`stamp-version: expected one versionName, found ${hits.length}`); process.exit(1); }
g = g.replace(/versionName "[^"]+"/, `versionName "${ver}"`);
fs.writeFileSync(G, g);

const P = path.join(HERE, 'package.json');
const pkg = JSON.parse(fs.readFileSync(P, 'utf8'));
pkg.version = ver;
fs.writeFileSync(P, JSON.stringify(pkg, null, 2) + '\n');

const code = (g.match(/versionCode (\d+)/) || [])[1];
console.log(`stamped v${ver} (versionCode ${code}) into build.gradle and package.json`);
