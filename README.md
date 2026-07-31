# Burning Bush — Bible Memory

A mobile-first Bible-verse memorization app (Major System). Single self-contained HTML app
plus the bundled KJV and BBE texts. Served at **kingdombuilders.ai/burningbush**.

## Structure
- `burningbush/index.html` — the app (loads `/burningbush/kjv.js` + `/burningbush/bbe.js`)
- `burningbush/kjv.js`, `burningbush/bbe.js` — bundled public-domain Bible texts

## Hosting
Static site on Render (KB account), publish directory = repo root. The Cloudflare Worker
`kingdombuilders-router` proxies `kingdombuilders.ai/burningbush/*` to this service, so the
files must live under the `burningbush/` path (they do).
