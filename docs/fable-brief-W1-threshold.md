# Fable 5 brief — Phase W1, The Threshold

Hand this whole file to a **Fable 5** agent (`model: "fable"`), per the authoring rule in
`memoverse.md`. It returns JSON; that JSON becomes the teach cards for the six W1 lessons.

---

## What you are making

Burning Bush teaches Bible verses with the Major System. A verse's address — book, chapter, verse —
is three peg images woven into one scene. The learner already owns every peg from 00 to 99.

Word for Word adds what the address cannot give: the verse's **opening words**. Across the KJV,
84.8% of verses open on a small function word, and **eight words open 61.8% of the whole Bible**.
Those words carry almost no meaning of their own, so they must never become a fourth picture in
the scene. Instead each one is **the manner in which the learner arrives** at the scene — an
*entrance*. The first word of real weight (LORD, said, came…) is waiting inside; that is Phase W2
and is not your job here.

Author one entrance for each of these:

| id | Word(s) | Verses | What the word does in the sentence |
|---|---|---|---|
| `and` | And | 11,615 · 37.3% | joins this verse to the one before; continuation |
| `for` | For | 1,654 · 5.3% | gives the reason; *because* |
| `but` | But | 1,456 · 4.7% | reversal; the opposite of what you expected |
| `the` | The | 1,402 · 4.5% | this one in particular; definiteness |
| `then` | Then | 1,274 · 4.1% | what comes next in order; sequence |
| `i` | I | 643 · 2.1% | the speaker is the self |
| `he` | He | 610 · 2.0% | a third person |
| `now` | Now | 578 · 1.9% | this moment; immediacy |
| `so` | So, Therefore | 898 · 2.9% | consequence; the result of what came before |
| `open` | *(no function word)* | 4,720 · 15.2% | the verse starts straight on a word of weight |

## Hard constraints

1. **An entrance is an arrival, not an object in the scene.** Motion, posture, light, sound, the
   way the learner crosses into the space. If it could sit on a shelf in the scene, it is wrong.
2. **It must not be — or be confusable with — any peg image.** The learner meets pegs in every
   address, and an entrance that looks like a peg will be decoded as a number. These were checked
   against every default peg and every alternate a user can choose, and **are already taken**:

   | Word | Peg |
   |---|---|
   | Door | **14** (default) |
   | Chain | 62 (alternate) |
   | Rope | 49 (alternate) |
   | Bell | 95 (alternate) |
   | Road | 41 (alternate) |
   | Fire | **84** (default) |
   | Foot / Feet | **81** (default) |
   | Mat | **31** (default) |
   | Rock | **47** (default) |
   | Dove | **18** (default) |
   | Cup | 79 (alternate) |

   Door is the important one: the whole metaphor is a threshold, so **never draw a door**. The
   crossing is expressed through the learner, not through furniture.
3. **No chains or links.** Phase W3 uses a link for the word *of*. An entrance that uses one will be
   confused with it.
4. **The decode must be real.** The entrance has to give the word back *because of what it is*, the
   way a three-legged Sumo gives back 3. "Continuation" must feel like continuing; "reversal" must
   feel like reversing. Not hand-waved, not symbolic-by-assertion.
5. **Ten at thumbnail size.** All ten must be told apart instantly, including the nearest pairs:
   *For/So* (both about causes), *The/Then* (both start with *th*), *I/He* (both people), and
   *And/open* (both about already being in motion).
6. **Reverence.** God is shown only as light, glory, fire or voice — never a face, body or hand.
   Never mock Scripture or its authors. (Because Fire is peg 84, prefer light, glory or voice
   wherever God is present.)
7. **House style** — from `memoverse.md`, the user's own standard: *concrete, dynamic, a little
   funny, unforgettable — NOT abstract or poetic.* One vivid subject. Exaggerated. Moving.

## Example verses to write against

Verified in the bundled KJV. Use them to test that each entrance lands on a real verse.

| id | Reference | Opens |
|---|---|---|
| `and` | Genesis 1:3 | And God said |
| `for` | John 3:16 | For God so |
| `but` | Isaiah 40:31 | But they that |
| `the` | Psalm 23:1 | The LORD is |
| `then` | Matthew 4:1 | Then was Jesus |
| `i` | Philippians 4:13 | I can do |
| `he` | Psalm 91:1 | He that dwelleth |
| `now` | Hebrews 11:1 | Now faith is |
| `so` | Genesis 1:27 · Romans 5:1 | So God created · Therefore being justified |
| `open` | John 11:35 · Matthew 5:3 | Jesus wept · Blessed are the |

## What to return

A single JSON array, one object per id, nothing around it:

```json
[
  {
    "id": "and",
    "entrance": "the arrival in six words or fewer",
    "arrive": "two or three sentences: the learner crossing into a scene that already holds the verse's three address pegs, arriving this way",
    "decode": "one sentence: how this arrival hands back the word, in the voice of decodeSentence()",
    "contrast": "one sentence: what separates it at a glance from its nearest neighbour entrance",
    "example": "Genesis 1:3 — one sentence walking this entrance into that verse's scene",
    "clear": "confirm it is not a door, a chain, or any word in the peg table above"
  }
]
```

## What you are NOT doing

- Not the words inside the scene (Phase W2), and not the verse's scene itself.
- Not the practice activities. *Recognise*, *Produce* and *Contrast* are generated from the KJV by
  the app, which already knows every verse's opening word.
- Not artwork. Your `entrance` line is the brief the artwork is drawn from.
