---
status: done
base: e117ef1
rigor:
  tests: test-after
  review: code
  review_at: end
  rereview: always
  execution: inline
  triggers_fired: []
---

# Two kid-drawn shinies: Shiny Twintail and Shiny Shadehog

## Intent
- **Problem:** A kid drew two shiny versions of existing creatures on the in-game 🎨
  drawing screen and wants them in the game:
  - **Shiny Twintail** 🍃 leaf: a blue Twintail (black outline, big eyes, ears up top,
    a white tail tuft at the top right).
  - **Shiny Shadehog** 🔥 fire: a yellow Shadehog with pink stripes on its quills,
    a black face, big eyes.
- **Behavior change:** two new wild species in the Grassy Route's tall grass
  (`"areas": ["route"]`, where Twintail and Shadehog live), both `"rare": true`.
  The route goes from 7 to 9 species; each shiny is about 1 in 16 route encounters
  (0.5 / 8). Sparkle Pond is unchanged.
- **Out of scope:**
  - Any game code change (the `rare` field already exists).
  - Changing any existing creature, move, or id. Twintail and Shadehog stay as they are.
  - Changing the starters (new species are appended at the end of the list).
- **Decisions:**
  - Art: each shiny is the original's SVG recolored from the kid's drawing, plus the
    gold twinkles Shiny Zoomhog has, so it reads as "the same creature, different
    colors" (as was done for Shiny Zoomhog).
  - Stats and moves copy the original (as Shiny Zoomhog copied Zoomhog).

    | id | name | type | hp/atk/def | moves | areas | rare |
    |---|---|---|---|---|---|---|
    | shiny-twintail | Shiny Twintail | leaf | 55/45/50 | tail-whirl, leaf-twister | route | true |
    | shiny-shadehog | Shiny Shadehog | fire | 50/60/40 | night-dash, ember-skate | route | true |
- **Done when:**
  - `npm run build` passes (creature-data rules, art test, offline-cache check).
  - A test on the shipped data pins that both new ids live only on the route and are rare.
  - In the preview, the 📖 Book shows 14 entries over 2 pages; each new picture is
    clear at 340 px and recognizable as the kid's drawing.
  - A wild battle with each new creature starts in its area, and its moves work.

## Open Questions
- [x] Where does each live? → Grassy Route only
- [x] Rare, like Shiny Zoomhog? → yes

## Unknowns
- [x] Original stats/moves/areas? → Twintail leaf 55/45/50, tail-whirl + leaf-twister,
      route; Shadehog fire 50/60/40, night-dash + ember-skate, route.
      `public/data/creatures.json` (species list)
- [x] Rare mechanism? → `"rare": true`, weight 0.5. `src/logic/encounters.ts`
      (built in docs/work/done/2026-10-11-pond-creatures.md)
- [x] Art rules, Book page size, shipped-data area test → same as the pond-creatures
      work file (`src/logic/art.test.ts`, 8 per page, `src/logic/encounters.test.ts`).

## Tasks
- [x] 1. Draw both pictures: recolor twintail.svg and shadehog.svg from the kid's
      drawings, add gold twinkles. Check each at 340 px in the preview. Nothing
      references them yet, so the build stays green.
      files: public/creatures/shiny-twintail.svg, public/creatures/shiny-shadehog.svg
      commits: [635608e]
- [x] 2. Append both species to creatures.json per the Intent table, and extend the
      shipped-data test in encounters.test.ts (areas + rare). Then in the preview:
      Book paging, and a battle with each.
      files: public/data/creatures.json, src/logic/encounters.test.ts
      commits: [a11c5f2]

## Log
- 2026-10-11: work file created (draft) from two in-game drawing screenshots
  (Twintail drawing showed 🍃, Shadehog drawing showed 🔥).
- 2026-10-11: contract: no checklist category hits (data + art only, no new field) →
  test-after, code review, at end. Same as the speedy-trio creatures.
- 2026-10-11: answers: both live on the route only; both rare.
- 2026-10-11: approved by the user ("send") as written (base e117ef1).
- task 1: implemented. shiny-twintail.svg = twintail.svg with orange → blue (#2e8be6/#4aa3f0, navy outline), white tufts kept, + Shiny Zoomhog's three gold twinkles. shiny-shadehog.svg = shadehog.svg with black → yellow (#ffd84a/#ffe066, gold outline), red stripes → pink (#f06292), + a black mask behind the eyes (the kid drew black around the eyes), + twinkles (top-right moved to 228,22 to clear a quill). Checked at 340 px (Quick Look render; the browser pane's dev server belongs to another chat and serves a different checkout).
- task 2: implemented. Both species appended (copying Twintail's and Shadehog's stats and moves, `areas: ["route"]`, `rare: true`). New test in encounters.test.ts (route only in every AREAS entry, both rare): red before the data, green after; `npm run build` passed (275 tests, check-dist ok, 23 files offline).
  Preview (own dev server on 5174 via a temporary launch.json entry, reverted; fresh origin, so no kid save was touched; test save cleared after): starters still Emberpup/Puddlefin/Sproutle. Forced route grass steps through the real `grassStep` → `rollEncounter` path with pick rolls 7.2/8 and 7.8/8 → Shiny Twintail Lv2 and Shiny Shadehog Lv2 battles; one Bump turn each, and both sides took damage. Book: 1/14, page 2 shows both as seen silhouettes with twinkles.
- review (end, code): pass, no findings. (The brief's diff placeholder went out unfilled; the reviewer took `git diff e117ef1..HEAD` from git itself, which is the payload it should have had.) Its cosmetic note, brow ends peeking above Shiny Shadehog's mask, is kept: at 340 px they read as gold brows.
- ship gate: `npm run build` passes (21 files, 275 tests; check-dist ok, 23 files offline). `git diff e117ef1..HEAD` touches only the 4 planned files (+72). The user said "send", so pushing to main.
