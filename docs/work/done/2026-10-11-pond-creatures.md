---
status: done
base: 75aa2e0
rigor:
  tests: tdd
  review: spec+code
  review_at: per-task
  rereview: always
  execution: inline
  triggers_fired: [serialization-shape]
---

# Two kid-drawn pond creatures: Shiny Zoomhog and Xpeoon

## Intent
- **Problem:** A kid drew two new creatures on the in-game 🎨 drawing screen and
  wants them in the game, living only at Sparkle Pond (the water area):
  - **Shiny Zoomhog**: a green Zoomhog (big eyes, spiky quills, orange at the mouth).
    The drawing screen showed 💧 water. It should be **rare**, like a real shiny.
  - **Xpeoon** 🔥 fire: a purple round creature with big eyes, a yellow beak-like
    arm on one side, spikes along its back, and stubby legs.
- **Behavior change:**
  - Two new wild species appear in Sparkle Pond's tall grass (`"areas": ["pond"]`),
    and nowhere else.
  - New optional species field `"rare": true`: a rare creature is half as likely to
    be picked as a normal one in the same grass. With the pond's 6 species, Shiny
    Zoomhog is about 1 in 11 pond encounters (0.5 / 5.5) instead of 1 in 6.
  - Pools with no rare creature pick exactly as today (same rng value → same species).
- **Out of scope:**
  - Any game code change beyond the `rare` field (no shiny sparkle effect, no
    Book marker for rare creatures).
  - Changing any existing creature, move, or id. Zoomhog itself keeps living on the
    route and at the pond.
  - Changing the starters (new species are appended at the end of the list).
- **Decisions:**
  - Art: refine each kid drawing into a house-style SVG (256×256 viewBox, explicit
    width/height, transparent, darker same-family outlines), as was done for Super
    Shadehog. Shiny Zoomhog keeps Zoomhog's shape so it reads as "the same creature,
    different colors".
  - Stats total 150 (40–65 each); reuse existing moves, so no new move ids.

    | id | name | type | hp/atk/def | moves | areas | rare |
    |---|---|---|---|---|---|---|
    | shiny-zoomhog | Shiny Zoomhog | water | 45/60/45 | zoom-roll, wave-dash | pond | true |
    | xpeoon | Xpeoon | fire | 55/50/45 | swipe, spark | pond | — |
  - `rare` must be `true` or `false` if present; anything else is a creature-data
    error with a clear message (same style as the existing checks).
  - Rare weight 0.5 is gentle on purpose (kids aged 5 and 7).
- **Done when:**
  - `npm run build` passes (creature-data rules, art test, offline-cache check).
  - `speciesForArea(data, 'pond')` includes both new ids; `speciesForArea(data, 'route')`
    includes neither (a test on the shipped data pins this).
  - Tests: a pool with one rare creature picks it for the expected rng range only
    (half-width slot); a pool without rare creatures maps rng → species exactly as
    before; `"rare": "yes"` fails validation.
  - In the preview, the 📖 Book shows 12 entries over 2 pages; each new picture is
    clear at 340 px and recognizable as the kid's drawing (green hedgehog; purple
    round creature with yellow arm).
  - A wild battle with each new creature starts at the pond, and its two moves work.

## Open Questions
- [x] Xpeoon's type (hidden in the screenshot)? → 🔥 fire
- [x] Should Shiny Zoomhog be rarer than other pond creatures? → yes, rare
      (encounters are a uniform pick today, `src/logic/encounters.ts:51`)

## Unknowns
- [x] How do creatures get limited to one map? → `areas` list in creatures.json,
      filtered by `speciesForArea`. `src/logic/encounters.ts:26`
- [x] Water area's map id? → `pond` ("Sparkle Pond"). `src/data/maps.ts:67`, area at `src/data/maps.ts:100`
- [x] Art file rules? → root `<svg>` with explicit width and height; every species
      image must exist. `src/logic/art.test.ts:10-27`
- [x] Book page size? → 8 per page. `src/scenes/BookScene.ts:13`

## Tasks
- [x] 1. Rarity: optional `rare` boolean on species (validated in creatures.ts),
      and `rollEncounter` picks by weight (rare = 0.5, else 1). TDD.
      files: src/logic/creatures.ts, src/logic/encounters.ts, src/logic/encounters.test.ts, src/logic/creatures.test.ts
      commits: [177a99b]
- [x] 2. Draw the two pictures from the kid's drawings in the house style. Check each
      renders at 340 px in the preview. Nothing references them yet, so the build stays green.
      files: public/creatures/shiny-zoomhog.svg, public/creatures/xpeoon.svg
      (art only: the existing art test covers it once task 3 references the files)
      commits: [2c96341, 72d6cb9]
- [x] 3. Append both species to creatures.json per the Intent table, with a test on
      the shipped data: both live only at the pond, Shiny Zoomhog is rare, starters
      unchanged. Then in the preview: Book paging, and a pond battle with each.
      files: public/data/creatures.json, src/logic/starters.test.ts (test went to encounters.test.ts, see Log)
      commits: [7a14da2, f7ea7c7]
- [x] 4. Docs: add `rare` to the field table in ADDING_CREATURES.
      files: docs/ADDING_CREATURES.md
      commits: [aac2685, e7e7805]

## Log
- 2026-10-11: work file created (draft) from two in-game drawing screenshots.
- 2026-10-11: answers: Xpeoon is fire; Shiny Zoomhog rare. Rarity adds a
  creatures.json field → serialization-shape trigger fired → tdd, spec+code, per-task.
- 2026-10-11: approved by the user as written (base 75aa2e0).
- task 1: implemented. `rare` validated in creatures.ts; encounters.ts `pickSpecies` weights rare at RARE_WEIGHT 0.5 (no-rare pools identical to the old floor pick). 3 new tests red→green; 39 passed in the two files; tsc clean.
- task 1 reviews: spec pass (its build/type-check worry about `rare = 'yes'` is moot: tsc clean); code pass, no findings.
- task 2: implemented. shiny-zoomhog.svg = zoomhog.svg recolored green (orange muzzle/ears from the drawing) + three gold twinkles; xpeoon.svg drawn from the kid's picture. Both checked rendered at 340 px; art test passes.
- task 2 reviews: spec — Xpeoon's lower black band read as a smile (non-blocking); code — top-right twinkle overlapped a quill tip. Fixed 72d6cb9 (twinkle moved to 214,24; band thickened to 16).
- task 2 re-review (code): twinkle fixed; still says the band reads as a mouth, not a stripe. Disagree: in both kid drawings that black band sits where the mouth goes (on the green one, orange shows under it like a tongue), so a wide, thick mouth is the faithful reading. My Intent wording "band across the lower body" was the imprecise part. Kept as is.
- task 3: implemented. Both species appended to creatures.json. The shipped-data test went into src/logic/encounters.test.ts (next to the existing shipped-grass test) instead of starters.test.ts as planned: it is an encounters fact, and the starters test already pins the starters, unchanged. Red→green; 46 passed in creatures/encounters/starters/art tests.
  Preview (dev server, save backed up and restored): forced pond grass steps through the real `grassStep` → `rollEncounter` path with pick rolls 4.2/5.5 and 0.9 → Shiny Zoomhog Lv3 and Xpeoon Lv3 battles; one Fight turn each, and both sides took damage. Book: 12 entries over 2 pages, ▶️ works; both new ones show as seen silhouettes on page 2.
- task 3 reviews: spec findings — (1) test in encounters.test.ts, not starters.test.ts: deliberate, logged above; (2) starters not re-asserted: the existing starters.test.ts:15 pins them and passes (code reviewer confirmed), so no new test; (3) only one move per creature seen in the preview: both creatures' moves are existing moves already used by other creatures, and validation rejects unknown moves, so accepted; (4) pictures only seen as silhouettes in the Book: they were checked in full colour in both battles and at 340 px in task 2; (5) `npm run build` not run yet: it runs at the ship gate. Code finding: pond-only test only ruled out the route → now checks every area in AREAS. Fixed f7ea7c7; re-review pass.
- task 4: implemented. Added a `rare` row to the field table.
- task 4 reviews: spec pass; code — wording said "half as likely as the other creatures" (wrong if two are rare) → "as a normal creature", fixed e7e7805, re-review pass. Disagreed with its second note (say rare does nothing with wild: false): the wild row already says those never appear in the grass, and the combination is harmless.
- ship gate: `npm run build` passes (21 files, 274 tests; check-dist ok, 21 files offline). `git diff 75aa2e0..HEAD` touches only the planned files (8 files, +111/-1). Not pushed yet: waiting on the user.
