# Verse Vault — Theme Roadmap

## Active
- **Illumined Night** (MAIN / default) — KingdomBuilders.ai "Playbooks"-inspired: deep indigo
  starfield, radiant gold, elegant serif headings, glowing/worship-night feel. This is the flagship look.
- **Classic** — the original midnight-navy + gold base (kept as a simple alternate).

## To add later (once the app is fully built out)
These were prototyped as full mockups in `Desktop/VerseVault-Designs/` and approved for later.
Each needs a *full* treatment (layout + components + motion), not just a recolor:

1. **Stained Glass** (`design-03`) — gothic cathedral: cobalt/ruby/emerald jewel panels with black
   leading lines and gold, light rays, Cinzel display. Reverent and dramatic.
2. **Scripture Quest** (`design-07`) — RPG/comic adventure MAP: the Learn path becomes a winding
   trail of book-islands with treasure-chest milestones, HP/XP bars, a lamb mascot, "LEVEL UP"
   bursts. For kids & church youth. **Biggest build** — the path is a real map layout, not a list.
3. **Verse Buddy** (`design-06`) — bright Duolingo style: glowing dove mascot, bouncy path bubbles,
   chunky drop-shadow buttons, confetti, XP. Light theme. Also for kids & youth.

**Note:** the current theme system swaps CSS variables + fonts + backgrounds (a "skin"). The three
above also change **layout and components**, so each is a larger effort — build the app fully first,
then implement them one at a time (start with Scripture Quest's map since it's the most structural).

## Translations (see index.html TRANSLATIONS)
- **Bundled (public domain):** KJV (backbone), BBE (Bible in Basic English — modern free text).
- **Licensed (cannot bundle — need Bible API in the mobile app):** NKJV, NIV, NLT, ESV. The picker
  lists them; until a license/API key is wired, selecting one shows KJV text. In production, load via
  a licensed provider (api.bible / Bible Gateway) keyed by the same book/chapter/verse coordinates.
