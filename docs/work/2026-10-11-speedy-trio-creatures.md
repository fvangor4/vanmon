---
status: approved
base: 17048f4
rigor:
  tests: test-after
  review: code
  review_at: end
  rereview: always
  execution: inline
  triggers_fired: []
---

# Three speedy new creatures: Zoomhog, Twintail, Shadehog

## Intent
- **Problem:** The kids want their favorite video-game hedgehog and his two
  friends in VanMon. (Which characters, and the naming decision, are in Claude's
  project memory, not in this public repo.)
- **Behavior change:** Three new wild creatures, with Claude-drawn original art and
  six new moves, appear in the tall grass like the existing six:
  - **Zoomhog** 💧 water: a blue hedgehog. Lives on the Grassy Route and at Sparkle Pond.
  - **Twintail** 🍃 leaf: an orange fox with two tails. Lives on the Grassy Route.
  - **Shadehog** 🔥 fire: a black hedgehog with red stripes. Lives on the Grassy Route.
- **Out of scope:**
  - Any game code change. No rarity or weighting, and no new type.
  - Changing the existing six creatures, their moves, or any existing id.
  - Changing the starters (Emberpup, Puddlefin, Sproutle).
- **Decisions:**
  - The art is original cartoony SVG drawn by Claude in the house style. It never copies or
    traces official art from any company.
  - No trademarked character names or move names anywhere in the repo or on the site.
  - The new species are **appended** after the existing six, because starters are
    the first species of each type in file order.
  - Stats total 150 like the others (40–65 each). Normal moves have power 35 like
    today's, and typed moves 45–50.

    | id | type | hp/atk/def | moves | areas |
    |---|---|---|---|---|
    | zoomhog | water | 45/60/45 | zoom-roll, wave-dash | route, pond |
    | twintail | leaf | 55/45/50 | tail-whirl, leaf-twister | route |
    | shadehog | fire | 50/60/40 | night-dash, ember-skate | route |

    | move id | name | type | power |
    |---|---|---|---|
    | zoom-roll | Zoom Roll | normal | 35 |
    | tail-whirl | Tail Whirl | normal | 35 |
    | night-dash | Night Dash | normal | 35 |
    | wave-dash | Wave Dash | water | 45 |
    | leaf-twister | Leaf Twister | leaf | 45 |
    | ember-skate | Ember Skate | fire | 50 |
- **Done when:**
  - `npm run build` passes. It runs the creature-data rules, the art test, and the offline-cache check.
  - A test on the shipped data pins the starters as emberpup, puddlefin and
    sproutle (so a reordered file fails the build).
  - In the browser preview, the 📖 Book shows 9 entries over 2 pages, and ◀️/▶️
    move between them. Each new creature's picture renders clearly at
    Book-detail size (340 px), with a transparent background, and is recognizable:
    blue hedgehog, two-tailed orange fox, black-and-red hedgehog.
  - A wild battle with each new creature starts on its stated map(s), and its
    two moves work in battle.
  - The existing six creatures, their ids, and the existing moves are byte-for-byte
    unchanged in creatures.json (diff shows additions only).

## Open Questions
- [x] Names → Zoomhog, Twintail, Shadehog.
- [x] Types → one of each: Zoomhog 💧 water, Twintail 🍃 leaf, Shadehog 🔥 fire.
- [x] Ordinary wild creatures, or rare/special? → same as the others, found in
      the tall grass. No rarity mechanism and no game code changes.
- [x] Moves → new themed moves with original names, as gentle as today's moves.

## Unknowns
- [x] What does the build/test suite enforce on creatures.json, and does anything pin the species count or ids?
      → `build` = tsc, vitest, vite build, check-dist (`package.json:8`). The rules are in
      `validateCreatureData` (`creatures.ts:176-202`):
      - ids are lowercase, digits and dashes, with no duplicates (`:69,81-86,193-198`)
      - move type is normal/fire/water/leaf, power 1–200 (`:7,100,103`)
      - species type is fire/water/leaf, image a bare png/svg/jpg/webp name (`:121,124-127`)
      - stats are whole numbers 1–255 (`:132-135`)
      - exactly 2 known moves: one normal plus one of the species' own type (`:144-159`)
      - `areas` is optional, but if given each id must be a defined wild area (`:139-141`, `encounters.ts:71-75`)
      - each image must exist (`art.test.ts:10-14`) and be precached (`check-dist.mjs:24-28`)
      - every grass map needs at least 1 species (`encounters.test.ts:93-95`), and the
        shipped data needs 3+ species covering all types (`creatures.test.ts:58-59`)

      No exact count is pinned. `menus.test.ts:10` lists six ids, but on made-up data.
- [x] Would a new species show up as a starter? Are wild encounters uniform within an area?
      → Starters are the **first species of each type in file order**
      (`starters.ts:5-7`, `creatures.ts:6`), so new species must be **appended**
      after the existing ones or they replace a starter. Encounters are uniform over
      species whose `areas` include the map, or that have no `areas` at all
      (`encounters.ts:25-27,49`). There is no rarity field (`creatures.ts:25-36`).
- [x] What do the existing creature SVGs look like and how are they loaded? Must a new image be listed anywhere else?
      → Root `<svg xmlns viewBox="0 0 256 256" width="256" height="256">` (`emberpup.svg:1`).
      Transparent background. Filled shapes with a darker same-family stroke, 4–6 wide
      (6 for the body) (`emberpup.svg:3-5`). They all end with a shared `<g id="face">`
      (eyes, blush, smile in `#222`) (`emberpup.svg:8`). About 1.1–1.3 KB each.
      Loaded by `load.svg(..., {width:256,height:256})` (`BootScene.ts:48-49`).
      Shown at 150–340 px (`BookScene.ts:69,87`). Nothing needs a manual listing:
      the PWA precache uses a glob (`vite.config.ts:35`). `art.test.ts:10-26` checks every
      species' file exists, starts `<svg` with width/height and ends `</svg>`.
      `scripts/check-dist.mjs:24` runs during build.
- [x] Which screens lay out one entry per species, and do 9 fit?
      → Only the 📖 Book (`menus.ts:14-15`): a 4×2 grid, 8 per page
      (`BookScene.ts:13,47-48`), with ◀️/▶️ paging that wraps (`BookScene.ts:51-55`,
      `menus.ts:27-34`). With 9 creatures there are 2 pages, and **the arrows
      show for the first time**. Starter and Title screens show one per type and are
      unaffected (`starters.ts:5-7`).

## Contract notes
- No checklist category fires. The data shape is unchanged, and only entries are added.
- The checklist says "new feature work gets tdd". Proposed instead: **test-after**,
  because this is content, not code. The existing validation and art tests cover every
  new entry automatically. The one new test, which pins the shipped starters, would
  pass before and after, so a red-first cycle isn't possible. The human decides at approval.

## Tasks
- [~] 1. Draw the three creature pictures in the house style (256×256 viewBox,
      transparent, darker same-family outlines, the shared face group). Check each one
      renders in the browser at 340 px before moving on. Nothing references them yet,
      so the build stays green.
      files: public/creatures/zoomhog.svg, public/creatures/twintail.svg, public/creatures/shadehog.svg
      commits: [7dfb203]
- [~] 2. Append the six moves and three species to creatures.json, per the
      tables in Intent (additions only, after the existing entries). Add a test
      that the shipped data's starters are still emberpup, puddlefin and sproutle.
      Then check in the preview: Book paging, and one wild battle with each new creature.
      files: public/data/creatures.json, src/logic/starters.test.ts
- [ ] 3. Docs: add the six new moves to "Moves you can use today" in
      ADDING_CREATURES, and say new creatures go at the end of the list
      (so the starters don't change).
      files: docs/ADDING_CREATURES.md

## Log
- 2026-10-11: work file created (draft). Started after the drawing-screen plan was archived (17048f4).
- 2026-10-11: intent pinned with the user (names, types, rarity, moves). Recon answered all 4 unknowns.
- 2026-10-11: approved by user ("looks good"), including the test-after contract.
- task 1: implemented. Three SVGs (1.8–2.3 KB) with the shared face group unchanged. Checked in the browser at 340 px on the panel color and at 150 px on the dark game background; Twintail's tails were enlarged after the first look so they read as tails. Shadehog alone has angled brows for a cool look; the face group itself is identical. A temporary preview page in public/ was deleted, not committed.
- task 2: implemented. Targeted tests: 4 files, 38 passed. A mutation check (moving a new species to the front of the list) makes the new starters test fail (1 failed). JSON diff is additions only, except that the old last move and last species lines each gained a comma.
  Browser (shared dev server on :5173, run by another chat in this folder):
  - title starters unchanged; the Book shows 6/9, with ◀️/▶️ going to page 2 (1 entry).
  - wild battles started via `__game` for each new creature render their art; Zoomhog's turn hit back.
  - real-module `calcDamage` gives sensible damage and effectiveness for all six moves against each type.
  - `speciesForArea`: route has 7 species incl. all three new ones; pond has 4 incl. Zoomhog.
  - Book detail view of a new creature not seen, since they're unseen in this save; the art was checked at 340 px in task 1.
