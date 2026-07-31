# memoverse.md — Number ↔ Image ↔ Book Relationship Training

**This file is the source of truth for how Verse Vault teaches the links between a
number, its peg image, and the Bible book that shares that number. Never lose it.**

## Why this exists
A learner must be able to travel the chain **in both directions**:

```
number  →  image  →  book        (encode / recall forward)
book    →  image  →  number       (decode / recall backward)
```

If only one direction is trained, recall breaks: they can see "3 → Sumo" but stall on
"Leviticus → ? → 3". So every learnable number that is also a book number gets a full,
reversible relationship set.

## The four review scenes (authored per number N)
Given `N`, its peg **IMAGE** (from the user's memoryOS peg list), and its **BOOK** (`bookName(N)`):

1. **Number → Image** *(encode)* — a vivid scene that fixes the image as N's picture.
2. **Image → Number** *(decode)* — a **count / feature** hook that reads N back out of the image
   (e.g. a 3‑legged Sumo = 3; a Sore on each of 4 tires = 4; a Soul out of all 5 fingers = 5).
   For two‑digit book numbers (40–44…), decode with the Major‑System **sounds** instead
   (Rose → R = 4, soft S = 0 → 40), since a single count no longer maps cleanly.
3. **Image → Book** *(bridge forward)* — a scene that ties the peg image to the book's theme /
   meaning / name, so the image summons the book.
4. **Book → Image** *(bridge backward)* — the reverse scene, so the book summons the image.

Scenes 1–2 lock the **number↔image** pair; scenes 3–4 lock the **image↔book** pair.
Chained, they give **number↔book** in both directions.

## Deep‑planning design rules
- **Reverence first.** God is shown only as light, glory, fire, or voice — never a face, body,
  or hand. Never mock Scripture, a book, or its author. A peg image that is awkward for a book
  (e.g. "Rum" for John) must be bridged tastefully (living water, new wine of the Spirit), not crudely.
- **One vivid subject per scene.** Concrete, exaggerated, moving, a little absurd = sticky.
- **The decode hook must be a real count/feature** equal to N (legs, tires, fingers, petals…),
  or the Major sounds for 2‑digit numbers. It cannot be hand‑wavy.
- **Bridge to the book naturally** where the theme allows (Seed → Genesis = beginnings;
  Sun/light → Exodus = coming out into freedom). Where no natural tie exists, invent a memorable
  one and keep it consistent forever.
- **A number's image never changes.** Consistency is what makes it reflexive.

## House style for the Image → Book bridge (books 40–43 are CANON)
The user set the standard with these image→book scenes. **Match this style for every future book**
(and prefer it over the earlier, more poetic/abstract bridges that are currently in place):

- **Name the book with a vivid, instantly-recognizable soundalike character or object** — use the
  closest famous namesake: Mat→Matthew, Marker→Mark, Luke Skywalker→Luke, John the Baptist→John.
- **Physically bring in the number's peg image and put it into a dramatic, specific ACTION with the
  namesake.** The peg is transformed, not just mentioned. Canonical examples:
  - **Matthew** (Rose): a welcome **MAT** reading "WELCOME ALL" with the **ROSE** growing straight out of its center.
  - **Mark** (Radio): a giant talking **MARKER** head bursts from the **RADIO** speaker booming "Have you Heard the Good News!"
  - **Luke** (Rhino): **LUKE SKYWALKER** sidesteps the charging **RHINO** and slices it into two halves.
  - **John** (Rum): **JOHN THE BAPTIST** empties the **RUM** barrel, fills it with water, and baptises people in it.
- **Tie the action to the book's theme** where possible (good news→Mark, baptism→John, welcoming all→Matthew).
- **Concrete, dynamic, a little funny, unforgettable — NOT abstract or poetic.**
- Where a book name has no clean namesake (much of the Torah), fall back to a strong theme bridge, but
  still put the peg image into a memorable action.

This paragraph is part of the Fable-5 brief for every future book image.

## Authoring model — Fable 5 ONLY
These number/image/book memory relationships are **authored with the Fable 5 model
(`claude-fable-5`)** for narrative sense and stickiness. Do **not** use any other model to
create or rewrite these relationship scenes. (Verse curation, code, and other copy may use the
default model — this rule is specifically for the number↔image↔book relationship scenes.)

## Data shape in the app
```
REL[N] = { img, book, numToImg, imgToNum, imgToBook, bookToImg }
```
Rendered in the Learn "teach" step as four labelled, reviewable relationships.

## Current coverage
- **Numbers 1–5** → Torah books Genesis…Deuteronomy.
- **Numbers 40–44** → New Testament Matthew…Acts.
Extend with Fable 5 for each new number as the learning path grows.
