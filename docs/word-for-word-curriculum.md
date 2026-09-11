# Word for Word — curriculum

The second track. It opens the moment the peg set 00–99 is complete, because from that point on
every word in the Bible can be given a picture the learner already owns.

All frequency figures here were counted from the bundled `kjv.js`: 791,420 running words,
12,545 distinct words, 31,102 verses.

---

## 1. Why this track exists

The number track teaches a **reversible rule**: a digit has a sound, a sound has a word, a word has
a picture, and the road runs both ways. A forgotten peg is not lost, it is *derived*.

Word for word has had no rule. First-letter reduction is a **cue**, not a code — it works while the
letters are on screen and leaves nothing behind when they are taken away. Picking the next word from
eight boxes trains recognition and then the review asks for recall, which is a different act
entirely. So a learner rehearses well, comes back a week later, and finds no first word and no way
to hunt for one.

This track gives word for word what numbers already have: something to derive from.

---

## 2. Where it sits, and the re-chunk it needs

The branch belongs at the end of the two-digit pegs. Today that boundary falls inside a phase:

```
Phase 12F   97, 98, 99, 0, 100, 101      ← 00–99 completes four tiles in
```

Re-chunk so the two-digit run closes on its own. Phases 12A–12E are untouched; only the tail moves:

```
Phase 12A   67 68 69 70 71 72
Phase 12B   73 74 75 76 77 78
Phase 12C   79 80 81 82 83 84
Phase 12D   85 86 87 88 89 90
Phase 12E   91 92 93 94 95 96
Phase 12F   97 98 99 00               ← four lessons + test. THE PEG SET IS COMPLETE.
                                          ↓ the path forks here
Phase 12G   100 101 102 103 104 105   ← numbers continue (the hundreds keep the 12 lettering)
Phase W1    The Threshold             ← word for word begins
```

Implementation: split `NUMS` into two runs — `range(67,99).concat([0])` and `range(100,176)` — and
chunk each separately, instead of chunking one continuous array. Phase 12F is deliberately short.
Ending the peg set on a four-lesson phase is better than ending it in the middle of a six.

---

## 3. Two tracks, one path screen

After 12F the learner has two ladders and may climb either, in any order, switching whenever they
like. Neither blocks the other.

**The chooser** sits pinned at the bottom of the Learn screen once the fork is open: two cards, each
showing the furthest-reached phase on its track, its icon and its progress. Tapping one makes that
track active and scrolls the path to it.

```
┌──────────────────────────┬──────────────────────────┐
│  📖  Word for Word       │  🔢  Numbers             │
│  Phase W2 · The Doorway  │  Phase 12I · 112–117     │
│  ●●●○○○  3 of 6          │  ●●●●●○  5 of 6          │
└──────────────────────────┴──────────────────────────┘
```

Rules:

- The active track is remembered (`Prog.track`, default `"num"`).
- The path renders the active track's phases only. The other track is reachable solely through the
  chooser, so the screen never becomes two interleaved ladders.
- **W1 unlocks when every peg 00–99 is done.** Each later W phase unlocks on the one before it.
  Number phases are unchanged and never wait on word-for-word work.
- Both tracks feed the same daily goal, the same streak, and the same review queue. A day's review
  may mix a peg, a book and an entrance without comment — they are all just cards.

---

## 4. What a lesson is

Every lesson is three beats, and the third is not optional.

**TEACH** — the fact, the mark, and the decode, on one card.
Always states *how often this thing occurs in the Bible*, because a learner who knows a mark is
worth a third of all verses will spend real attention on it.

**WORK** — three activities, always in this order:
1. **Recognise** — pick it out of a set. Cheapest, warms the trace.
2. **Produce** — generate it cold from the other direction. This is the one that does the work.
3. **Contrast** — separate it from its nearest neighbours, which is where errors actually live.

**TEST** — a tile of its own at the end of the phase, asking all six lessons together, **in both
directions**, exactly as `numtest:` does for pegs. Mark → word, and word → mark. One direction is
half a memory; `memoverse.md` has said so since the beginning and it applies here unchanged.

Skill id shapes, so the existing machinery picks them up for free:

| Kind | Ids | SRS key |
|---|---|---|
| entrance | `onset:and` | `sk:onset:and` |
| doorway | `door:lord` | `sk:door:lord` |
| operator | `op:in-on` | `sk:op:in-on` |
| pronoun | `pro:thou` | `sk:pro:thou` |
| glyph | `gl:the` | `sk:gl:the` |
| spark | `spark:read` | `sk:spark:read` |
| chunk / register / cadence | `chunk:`, `fmla:`, `pros:` | as above |
| assembly | `asm:cold` | `sk:asm:cold` |
| phase test | `wtest:W1` (`testOnly:true`) | — |

None of these contribute to `knownNumbers()`, so `reachable()` is untouched and no verse becomes
practiceable or unpracticeable because of anything on this track.

---

## 5. The phases

Six lessons and a test in each, matching the number track exactly.

### Phase W1 · The Threshold — how a verse starts
*84.8% of verses open on a function word. Eight of them open 61.8% of the whole Bible. None of them
should cost an image in the scene — they are the manner of arrival, not an object in it.*

| # | Lesson | Teaches | Weight |
|---|---|---|---|
| 1 | The Chain | **And** — arrive mid-stride, a chain link on the doorframe | 11,615 verses · 37.3% |
| 2 | The Reason and the Turn | **For** (pulled in by a rope) · **But** (the door swings back) | 3,110 · 10.0% |
| 3 | The Nameplate and the Clock | **The** (one lit nameplate) · **Then** (a clock above the door) | 2,676 · 8.6% |
| 4 | Whose Hand | **I** (your own hand) · **He** (a third figure holds it) | 1,253 · 4.1% |
| 5 | The Bell and the Consequence | **Now** (a bell struck) · **So**, **Therefore** (a road running on) | 1,476 · 4.8% |
| 6 | The Open Door | verses that begin cold on a noun — you are already inside | 4,720 · 15.2% |
| T | **Test the Threshold** | all eight, both directions | |

### Phase W2 · The Doorway — the first word that carries meaning
*The first content word is what recall actually reaches for, and it is heavily concentrated: ten
words open about one verse in six.*

| # | Lesson | Teaches | Weight |
|---|---|---|---|
| 1 | The Name | **LORD** | 993 · 3.19% |
| 2 | The Saying | **said** | 886 · 2.85% |
| 3 | The Coming | **came** | 652 · 2.10% |
| 4 | Command and Attention | **shalt** · **behold** | 874 · 2.81% |
| 5 | The Declaration | **thus** · **king** | 745 · 2.39% |
| 6 | The Households | **children** · **God** · **Jesus** | 943 · 3.03% |
| T | **Test the Doorway** | all ten, both directions | |

### Phase W3 · Where Things Sit — the spatial operators
*A preposition is not an object in the scene. It is how two objects are arranged. This is the phase
that answers "how do I tell **in** from **on** from **an** when all three give only N" — you don't
separate them by sound, you separate them by shape.*

| # | Lesson | Teaches | Weight |
|---|---|---|---|
| 1 | Inside and On Top | **in** (contained) · **on** (bearing weight) | 14,677 |
| 2 | The Link | **of** (a chain between two things) | 34,618 |
| 3 | Toward and Away | **to**, **unto** · **from** | 22,000+ |
| 4 | Over and Under | **upon** · **under** | 8,000+ |
| 5 | Through and Into | **through** · **into** | 5,000+ |
| 6 | Beside | **by** · **at** · **with** | 12,000+ |
| T | **Test the Operators** | all, both directions | |

### Phase W4 · Who Is Speaking — the pronoun gestures
*33 words in the KJV yield no Major System consonant at all, and they are almost entirely pronouns.
That is not bad luck. Pronouns carry their meaning in pointing, so point.*

| # | Lesson | Teaches |
|---|---|---|
| 1 | Myself | **I** · **me** · **my** — point at your own chest |
| 2 | You, Singular | **thou** · **thee** · **thy** — point at one listener |
| 3 | Him | **he** · **him** · **his** — a figure to one side |
| 4 | Her and Them | **she** · **her** · **they** · **them** |
| 5 | Us | **we** · **us** · **our** — a closed circle |
| 6 | You, Plural | **ye** · **you** · **your** — a sweep across a crowd |
| T | **Test the Gestures** | all, both directions |

### Phase W5 · The Small Change — the glyphs that cannot be pictured
*About 25 words are neither spatial nor gestural. They get an arbitrary mark and no derivation rule,
which is honest: **the** appears 63,919 times and will be over-learned within a week whether the
learner intends it or not. These are punctuation for the scene, not things in it.*

| # | Lesson | Teaches |
|---|---|---|
| 1 | The Articles | **the** · **a** · **an** |
| 2 | The Joins | **and** (mid-sentence) · **but** · **or** |
| 3 | Being | **is** · **was** · **be** · **art** · **am** |
| 4 | What Will Be | **shall** · **shalt** · **will** · **would** |
| 5 | The Denials | **not** · **no** · **nor** |
| 6 | The Pointers | **that** · **which** · **all** |
| T | **Test the Small Change** | all, both directions |

### Phase W6 · The Spark — the phonetic code for content words
*Content words are unpredictable, so they need a sound handle. The Spark is a word's first two
consonants read through the Major System, landing on a peg 00–99 the learner already owns.*

**State this honestly in the teaching.** Measured across the KJV, only 110 two-digit codes are in
use and **no** Spark is unambiguous on its own — bucket 94 alone holds 738 words. But the right word
is among the three commonest in its bucket **63.6%** of the time, before context does any work at
all. A Spark is therefore a hint with teeth, not an encoding. It narrows the field so the sentence
can close the gap. Teaching it as more than that would set the learner up to distrust it.

| # | Lesson | Teaches |
|---|---|---|
| 1 | Reading a Word | pulling the first two consonants out of a word |
| 2 | Reading It Backwards | image → two digits → two sounds → the word |
| 3 | Sparks on Things | nouns |
| 4 | Sparks on Doings | verbs |
| 5 | Breaking a Tie | using the sentence to choose between candidates in a crowded bucket |
| 6 | When Not To | function words never get a Spark — they have their own code already |
| T | **Test the Spark** | encode and decode, both directions |

### Phase W7 · Breath and Cadence
*A verse is not twenty-five items. It is four to six phrases. Every oral tradition that ever held a
text verbatim across centuries did it in clauses, with a rhythm.*

| # | Lesson | Teaches |
|---|---|---|
| 1 | Breath Groups | splitting a verse where the voice would actually pause |
| 2 | One Chunk, One Station | walking the verse's own scene, a phrase per stop |
| 3 | The Stock Phrases I | *and it came to pass* and its relatives |
| 4 | The Stock Phrases II | *thus saith the LORD* · *verily I say unto you* |
| 5 | Fixing a Cadence | one rhythm and pitch shape per verse, held forever |
| 6 | Your Own Voice | record the verse once; review against the recording |
| T | **Test Breath and Cadence** | chunk a fresh verse; recite to its cadence |

### Phase W8 · The Whole Verse
*Assembly. Everything above, on real verses, ending with one carried through to sealed.*

| # | Lesson | Teaches |
|---|---|---|
| 1 | A Short Verse | address → entrance → doorway → chain, end to end |
| 2 | A Longer Verse | multiple chunks, multiple stations |
| 3 | Cold | full recall with only the hint ladder available |
| 4 | Repair | what to do with a word that will not come |
| 5 | Your Own | encode a verse the learner chooses |
| 6 | Sealed | take one verse the whole way down the review trail |
| T | **Test the Whole Verse** | a verse encoded and recited from nothing |

---

## 6. A lesson, fully written

`onset:and` — the highest-value single item on the track. Everything else follows this shape.

### TEACH — "The Chain"

> **11,615 verses begin with the word *And*.**
> More than one verse in three. It is the commonest opening in the Bible by a distance, and it is
> Hebrew narrative doing what Hebrew narrative does: joining this verse to the one before it, and
> that one to the one before that, all the way back to the beginning.
>
> **So it is not a word you walk up to. It is a word you arrive already walking.**
>
> Your scene has three pictures in it — the book, the chapter, the verse. Those are the address.
> *And* is not a fourth picture. It is **how you come in**: still mid-stride, carried on from the
> last verse, with **a chain link hanging on the doorframe** as you pass it.
>
> **Coming back the other way:** you reach the scene and find yourself already moving, the link
> swinging beside you. The verse opens **And**.

Card furniture: the chain-link mark drawn in the peg style, the count in gold, and the decode
sentence in the same voice `decodeSentence()` uses for numbers.

### WORK

**1 · Recognise.** Six verse openings. Tap every one that begins *And*.
*(Answers hidden until all six are marked, so it cannot be done by trial.)*

**2 · Produce.** Three scenes appear with an entrance mark and no word.
The learner says the opening word aloud, then taps to check. This is the beat that does the work —
generation, not selection. It is never skippable and never offers choices.

**3 · Contrast.** Four verse openings, each needing one of: the chain *(And)*, the nameplate
*(The)*, the clock *(Then)*, the rope *(For)*. Drag each to its door.
Contrast is where the errors live, so it comes last, when the trace is warm enough to be tested.

Completion sets `doneSkills` and seeds `sk:onset:and` into box 1, due immediately — same as a peg.

### TEST — the phase tile

`wtest:W1` asks all eight entrances, mixed, in both directions:

- **Mark → word.** The chain link is shown. Which word opens this verse?
- **Word → mark.** The verse opens *Then*. Which entrance?
- **In place.** A full scene with its entrance. Say the first word, then the first content word.

Graded through `gradeKey()` like everything else: *good* promotes, *hard* shortens, *again* returns
it to box 1. No new grading logic.

---

## 7. What changes in the app

**Build**
1. Split the peg chunking into two runs so Phase 12F closes on 00.
2. Emit the W phases after it, tagged `track:"w4w"`; tag every existing phase `track:"num"`.
3. `Prog.track` remembers the active ladder; the Learn path renders one track at a time.
4. The two-card chooser, pinned to the bottom of Learn once the fork is open.

**Existing behaviour that must not move**
- `knownNumbers()` and `reachable()` — this track adds no numbers and must not touch verse gating.
- The daily goal, streak and review queue absorb the new cards with no special-casing.
- No JS branching on theme; the chooser is tokens and base CSS like everything else.
- Run `token-lint`, `decor-lint` and `tests/run.js` before shipping, and bump `APP_VERSION` with a
  `CHANGELOG` entry written for the reader.

**Artwork**
8 entrances + 10 doorway objects + ~12 operators + ~10 pronoun gestures + ~25 glyphs = **about 65
new marks.** Per `memoverse.md`, the scenes and images are authored with **Fable 5** only.

---

## 8. The numbers behind the design

Counted from `kjv.js`.

| | |
|---|---|
| Running words | 791,420 |
| Distinct words | 12,545 |
| Verses | 31,102 |
| Top 10 words | 28.8% of the text |
| Top 50 words | 52.6% of the text |
| Words of 2 letters or fewer | 44 distinct · 19.0% of the text |
| Words of 3 letters or fewer | 351 distinct · 47.0% of the text |
| Words giving only ONE consonant | 448 distinct · 37.4% of the text |
| Words giving NO consonant | 33 — almost all pronouns |
| Verses opening on a function word | 84.8% |
| Verses opening cold on content | 15.2% |
| Top 8 openers | 61.8% of all verses |
| Top 10 first-content words | ~16% of all verses |
| Spark codes in use | 110 |
| Sparks unambiguous alone | 0% |
| Right word in bucket's top 3 | 63.6% |
