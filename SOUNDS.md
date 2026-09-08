# Where the sounds came from

`src/sounds/` holds 122 mp3 files — every recording the app can play. They are the audio half of
the palette declared in `SFX_FILES` (in `src/index.html`, beside `sfxPick`). The other half, the
synthesised tones in `SFX_PALETTE_SRC`, is still there and still runs: it is what plays for any
sound with no recording, and what plays if a recording fails to load.

## Licence

All of it is **CC0 1.0 (public domain)** from [Kenney.nl](https://kenney.nl/assets), whose asset
packs are released CC0 without exception. CC0 waives copyright entirely: no attribution is
required, commercial use is unrestricted, and redistribution inside a packaged app is fine. This
file exists because provenance is worth keeping even when the licence does not demand it.

Packs used:

| Pack | Prefix | What it covers |
|---|---|---|
| RPG Audio | `rpg__` | doors, books, cloth, coins, footsteps |
| Interface Sounds | `ui__` | taps, switches, scratches, plucks, glass |
| Music Jingles | `jingle__` | victory and flourish families |
| Impact Sounds | `impact__` | bells, wood, metal, stone |

Filenames keep their pack prefix so any file can be traced back to its source pack.

## Why mp3 and not ogg

The packs ship ogg. Safari before version 17 will not decode ogg at all, and a silent app on an
older iPhone is a worse trade than a slightly larger download. Everything was converted with
ffmpeg to mono 96kbps mp3 — 0.77MB for the whole set, which is less than one of the app's images.

```
ffmpeg -i in.ogg -ac 1 -ar 44100 -b:a 96k out.mp3
```

## Adding or changing a sound

1. Put the mp3 in `src/sounds/`.
2. Name it in `SFX_FILES` as `key: [["file.mp3", ...], gain]`. More than one file is a family the
   picker rotates through, so a sound heard often is not the same take every time.
3. The key must already exist in `SFX_PALETTE_SRC` — that is what gives it a label, a group, and a
   switch on the Profile → Sound effects screen. A recording whose key has no palette entry is a
   sound nothing can play, and `tests/sound/run.js` fails on it.
4. Run `node tests/sound/run.js`. It fetches and decodes every file in a real browser at the path
   the built app actually asks for. A missing or unplayable sound never throws — it is simply
   silent — which is why it is checked rather than assumed.

Two sounds are built rather than played straight, in the `Files` player:

- **`wheelSpin`** is a ratchet: thirteen recorded clicks scheduled with a widening gap, so it slows
  against the pegs and ends when the wheel ends rather than when a recording runs out.
- **`comboBuild`** climbs by `playbackRate` — the same struck note a step higher each time, a fifth
  up by the eighth right answer in a row.
