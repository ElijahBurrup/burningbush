/**
 * tests/lib/normalize.js — turn a rendered screen into a stable fingerprint.
 *
 * A raw innerHTML comparison would fail on things that legitimately differ run to run without
 * the UI having changed at all: the SVG clip-path ids that count up per render, "today at
 * 5:23 PM", a talents total mid-animation. Normalisation strips exactly those, and nothing
 * else — anything it does not strip is deliberately part of the contract being pinned.
 */
const crypto = require('crypto');

// Run inside the page. Kept as a string so it can be handed straight to page.evaluate.
const CAPTURE = function (sel) {
  const root = document.querySelector(sel);
  if (!root) return null;
  const clone = root.cloneNode(true);
  // volatile attributes
  clone.querySelectorAll('*').forEach(n => {
    // per-render ids: pc12, ch7, tw3, rh9 — and anything referencing them
    ['id', 'clip-path', 'fill', 'href', 'xlink:href', 'aria-labelledby'].forEach(a => {
      const v = n.getAttribute && n.getAttribute(a);
      if (v && /\b(pc|ch|tw|rh)\d+\b/.test(v)) n.setAttribute(a, v.replace(/\b(pc|ch|tw|rh)\d+\b/g, '$1#'));
    });
    // inline styles that animation or measurement writes
    const st = n.getAttribute && n.getAttribute('style');
    if (st) n.setAttribute('style', st
      .replace(/rotate\([-\d.]+deg\)/g, 'rotate(#)')
      .replace(/width:\s*[\d.]+%/g, 'width:#%')
      .replace(/height:\s*[\d.]+px/g, 'height:#px')
      .replace(/top:\s*[\d.]+px/g, 'top:#px'));
  });
  let html = clone.innerHTML;
  return html
    // src/ uses relative asset paths, burningbush/ uses absolute ones — that is the ONLY
    // thing the build changes, so fold it away and one golden set validates both. The suite
    // then proves the published artifact renders identically to the source.
    // src/ uses relative asset paths; the published folder is a SITE ROOT and uses absolute ones.
    // That is the ONLY thing the build changes, so fold it away and one golden set validates both.
    .replace(/\/burningbush\//g, '')                                     // the old prefix, for older goldens
    .replace(/(["'(`])\/(?=(?:images|fonts|videos|bibles)\/|(?:kjv|bbe|sw|strongs|kjvtag)\.js|manifest\.webmanifest)/g, '$1')
    .replace(/\b\d{1,2}:\d{2}\s?(AM|PM)\b/gi, '#TIME')          // "today at 5:23 PM"
    .replace(/\b(today|tomorrow) at #TIME/gi, '#WHEN')
    .replace(/\b\d{10,}\b/g, '#TS')                              // epoch millis
    .replace(/\s+/g, ' ')
    .trim();
};

const hash = s => crypto.createHash('sha1').update(s || '').digest('hex').slice(0, 16);

/** A short, human-readable digest so a failure says something useful, not just "hash differs". */
function shape(html) {
  if (html == null) return { missing: true };
  const tag = re => (html.match(re) || []).length;
  return {
    len: html.length,
    els: tag(/<[a-z]/gi),
    buttons: tag(/<button/gi),
    svgs: tag(/<svg/gi),
    imgs: tag(/<img/gi),
    text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
  };
}

module.exports = { CAPTURE, hash, shape };
