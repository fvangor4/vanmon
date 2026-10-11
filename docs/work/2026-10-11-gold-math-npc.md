---
status: draft
base:
rigor:
  tests: tdd
  review: spec+code
  review_at: per-task
  rereview: always
  execution: inline
  triggers_fired: [schema-change]
---

# Gold NPC: three addition problems, then a battle

## Intent
- **Problem:** The kids (5 and 7) asked for an all-gold character they talk to,
  who asks three simple addition problems and then battles them. VanMon has no
  NPCs today.
- **Behavior change:**
  - **The Gold Kid**, an all-gold version of the player sprite, stands on a
    fixed open tile in **town**. The tile blocks walking.
  - Tapping the Gold Kid walks the player next to it. It then greets them, read
    aloud, and opens a math screen.
  - Math screen: **three** addition problems, one at a time. Each is `a + b` with
    a, b ≥ 1 and a + b ≤ 10, shown big and read aloud ("What is 3 plus 4?"), with
    **three** big tappable answers: the correct one plus two different wrong
    numbers from 0 to 10, in random order. The three problems in a set are all
    different.
    - Right answer: a cheer, then the next problem.
    - Wrong answer: that button fades and can't be tapped again, and "Not quite,
      try again!" is read aloud. Same problem.
    - A ✖ button leaves the math screen at any time, back to town, with no battle.
  - After the third right answer: "Now let's battle!", then a battle against the
    Gold Kid's **Super Shadehog**.
    - *Proposed, confirm at approval:* its level matches the player's lead creature.
    - In this battle there is **no Catch** button. **Run** still works and returns
      to town next to the Gold Kid.
  - **Win, first time:** normal XP, plus the player **gets a Super Shadehog**
    (into the party, or the Box if the party is full). This is recorded in the
    save, and the Gold Kid congratulates them.
  - **Win again (rematch):** new math problems and a battle for XP only. Never a
    second Super Shadehog.
  - **Loss:** everyone is healed and the player **stays in town next to the Gold
    Kid** (not sent to START). "Good try! Talk to me to try again!"
  - **Super Shadehog no longer appears in the tall grass.** A new optional
    species field `"wild": false` marks it, since nothing like that exists today.
- **Out of scope:** other NPCs or a general dialogue/quest system; per-kid
  difficulty; subtraction; changing wild-battle behavior; a second save slot.
- **Existing behavior to keep:** wild battles (catch always offered; a loss heals
  and sends the player to START); every other species' encounter pool; old saves.
  Super Shadehog shipped in the grass today (4006117), so a kid may already have
  caught one. The prize still comes on the first Gold Kid win, because it's keyed
  on the save flag, not on owning one.
- **Decided (2026-10-11, user):** creature Super Shadehog; sums up to 10, tap one
  of three; wrong answer means try the same problem again; prize Super Shadehog,
  which leaves the grass; stands in town; named "The Gold Kid"; a loss means a
  retry right there with new math; after a win, rematches for fun.
- **Done when:**
  1. A test shows no wild encounter on any map ever yields `super-shadehog`, and
     every other species' pool is unchanged.
  2. A test over many seeds shows every generated set has 3 distinct problems with
     a, b ≥ 1 and a + b ≤ 10, and 3 distinct choices in 0–10 including the answer.
  3. A version-1 save loads as version 2 with no Gold Kid win recorded and the
     same party, box and book (test).
  4. Logic tests: the first NPC win adds Super Shadehog (party, or the Box when
     the party is full) and records the win; a second win adds nothing; an NPC loss
     heals all and keeps the position; Catch is rejected in an NPC battle.
  5. A test shows every town tile reachable before stays reachable except the Gold
     Kid's tile, which is never walkable.
  6. In the browser preview (via `window.__game`): the Gold Kid is visible in
     town. Tapping it shows a spoken greeting and then the math screen. A wrong tap
     fades that button. ✖ returns to town. Three right answers start a battle with
     no Catch button. Winning puts Super Shadehog in the party, and a rematch does
     not add another. Losing leaves the player next to the Gold Kid with full HP.
     Screenshots go in the Log.
  7. `npm run build` is green.

## Open Questions
- [x] Creature, math, wrong answers, prize, location, name, losing, rematch →
      see "Decided" above.
- [ ] Confirm at approval: Super Shadehog's level = the player's lead creature's
      level. Run is allowed in the Gold Kid battle.

## Unknowns
- [x] Overworld: is there a map, player, NPCs, dialog?
      → One scene, `src/scenes/OverworldScene.ts`. Maps are rows of tile characters
      (`src/data/maps.ts:2-3`): town `:9`, Grassy Route `:35-63`, Sparkle Pond `:65-88`.
      Tap a tile and the player pathfinds there (`OverworldScene.ts:62-65, 120-129`).
      Warps restart the scene on a new map (`:162-170`). **No NPCs, signs or talk
      mechanism exist**; the only tile interaction is the home-door heal (`:173-179`).
      Dialog goes through `DialogBox` (`src/ui/DialogBox.ts:14`) via `say()`
      (`OverworldScene.ts:214-219`).
- [x] How does a battle start and end?
      → Only input is `BattleLaunch { wild: Creature }` (`OverworldScene.ts:19-21`);
      only caller is `grassStep` (`:182-202`), which uses `createCreature(species, level)`
      (`:197`). `BattleScene.init` → `startBattle(party, data.wild)` (`BattleScene.ts:85-86`).
      Loss = active creature faints (`src/logic/battle.ts:112-115`); win = wild at 0 HP
      (`:157-159`); run always works (`:128-131`). Effects: win → XP, catch → party/Box,
      loss → heal all + move to `START`, run → nothing (`src/logic/gameState.ts:105-122`,
      `BattleScene.ts:233`). Every outcome returns to Overworld (`BattleScene.ts:221-222,
      319, 322-324`). **Catch is always offered** (`BattleScene.ts:155`). Logic is a
      state machine returning events (`battle.ts:1-4, 118`); the scene plays them.
- [x] Read-aloud and kid UI parts?
      → `speaker` (`src/ui/speech.ts:75`; `say/stop/unlock` `:11-17`, strips emoji `:58`).
      `BigButton` (`src/ui/Button.ts:30`, `COLORS` `:8`), `HoldButton`
      (`src/ui/HoldButton.ts:10`), `DialogBox.show(text, {speak, waitForTap})` returning
      a Promise (`src/ui/DialogBox.ts:~74`), `MenuScene.frame()` panel
      (`src/scenes/menuBase.ts:13`). Closest choice UI: battle 2×2 BigButton grid
      (`BattleScene.ts:154-157`). **No quiz or number-entry screen exists.**
- [x] Save and tests?
      → localStorage `vanmon.save` (`src/logic/save.ts:12`), shape `{version, savedAt,
      state}` (`:52-56`), `GameState = {party, box, book, position}`
      (`src/logic/gameState.ts:18-24`). One save per device (each kid has their own iPad).
      `SAVE_VERSION` 1 (`save.ts:14`), `MIGRATIONS` empty, applied stepwise (`:22-23,
      216-224`); load repairs creatures/position (`:130-273`); newer-version saves are
      protected (`:209-210`). Vitest, node env; 19 test files (16 logic, 3 ui), **no scene
      tests**; dev-only `window.__game` (`src/main.ts:35`).
- [x] What decides which species appear in the grass?
      → `AREAS` (`src/data/maps.ts:96-99`) sets per-map chance and min/max level; a map
      without an entry has no encounters (`OverworldScene.ts:187-188`). The species pool is
      `!s.areas || s.areas.includes(mapId)` (`src/logic/encounters.ts:25-27`); level and
      species are uniform random (`:49-50`). `areas` must be non-empty when present
      (`src/logic/creatures.ts:139-141`, test `creatures.test.ts:164-165`); omitted =
      everywhere (`creatures.ts:33-35`); every named area needs an AREAS entry
      (`encounters.ts:71-74`). **No existing "not wild" field** (`creatures.ts:25-36`).
- [x] Tiles, walkability, pathfinding, door, player sprite?
      → Tiles `. , " F D T ~ # =` (`src/logic/map.ts:15-25`); `WALKABLE` = path, grass,
      tall grass, flowers, door (`:27`); `isWalkable` (`:76-79`). `findPath` is a
      4-direction BFS that walks to the nearest reachable tile when the target can't be
      reached, and skips warps unless tapped (`:109-151`); called at
      `OverworldScene.ts:123`. Home heal: town `home {x:7,y:4}` (`maps.ts:12`), the `D`
      tile (`:18`), triggered by stepping on it in `arrive()` (`OverworldScene.ts:173-180`).
      `START {map:'town', x:7, y:5}` (`maps.ts:93`). Player sprite: `drawPlayer`
      procedural Graphics with inline hex colors and no color parameter
      (`src/scenes/textures.ts:90-98`), baked once as `'player'` (`:110-113`).

## Tasks
- [ ] 1. Species can be marked `"wild": false`: never in any encounter pool, and
      must not also list `areas` (validation error). Set it on `super-shadehog` and
      drop its `areas`.
      files: src/logic/creatures.ts (+test), src/logic/encounters.ts (+test), public/data/creatures.json
- [ ] 2. Math quiz generator: `makeQuiz(rng)` → 3 distinct problems, each with 3
      shuffled distinct choices, per the Intent rules; `rng` injected for tests.
      files: src/logic/mathQuiz.ts, src/logic/mathQuiz.test.ts
- [ ] 3. Save v2: `GameState` gains `npcsBeaten: string[]` (ids, so later NPCs need
      no migration). `SAVE_VERSION` 2; a migration from v1 adds `[]`; load repair drops
      non-string entries.
      files: src/logic/gameState.ts, src/logic/save.ts (+tests)
- [ ] 4. NPC battle rules in logic. An NPC battle rejects Catch. Outcome: win →
      XP, plus a first-time prize (Super Shadehog into party or Box) and the id
      added to `npcsBeaten`; a later win → XP only; loss → heal all, position
      unchanged; run → nothing. NPC definition data (id `gold-kid`, name, species,
      prize, level rule) lives in one new module.
      files: src/logic/npcs.ts (+test), src/logic/battle.ts (+test), src/logic/gameState.ts (+test)
- [ ] 5. Town placement: the Gold Kid's tile in town data, treated as not
      walkable by pathfinding, plus a helper for "tiles next to it". The tile is open
      floor, not START, not the door, and doesn't cut off any part of town (test).
      files: src/data/maps.ts, src/logic/map.ts (+test)
- [ ] 6. Gold Kid sprite: `drawPlayer` takes a color palette; bake `'player'`
      unchanged and a new all-gold `'gold-kid'` texture. Check both in the preview.
      files: src/scenes/textures.ts
- [ ] 7. BattleScene NPC mode: `BattleLaunch` gains an optional `npc` id. In NPC
      mode: an intro line ("The Gold Kid sends out Super Shadehog!"), no Catch button,
      task 4's outcome rules, and win/prize/loss lines read aloud. Wild mode unchanged.
      files: src/scenes/BattleScene.ts, src/scenes/OverworldScene.ts (type only)
- [ ] 8. MathScene: the quiz from task 2, with big read-aloud problems, three
      answer buttons, wrong-button fade plus "Not quite, try again!", a cheer on right
      answers, and ✖ to leave. After three right answers, it starts the NPC battle.
      Registered with the game.
      files: src/scenes/MathScene.ts, src/main.ts (scene list)
- [ ] 9. Overworld: draw the Gold Kid in town. Tapping it walks the player next to
      it, then plays the spoken greeting (a different line after a win) and opens
      MathScene. After an NPC battle, the player is back beside the Gold Kid.
      Preview walkthrough of Done-when #6.
      files: src/scenes/OverworldScene.ts
- [ ] 10. Docs: `"wild": false` in docs/ADDING_CREATURES.md (field table and the
      starters note), and the Gold Kid in the README feature list.
      files: docs/ADDING_CREATURES.md, README.md

## Log
- 2026-10-11: draft created. Super Shadehog (golden fire creature, id
  super-shadehog) added just before in 4006117; candidate for the NPC's creature.
- 2026-10-11: two rounds of questions answered (see Decided). Six recon unknowns
  resolved. Escalation checklist: "serialization shape / schema change" fires
  (save v1→v2, new species field) → schema-change. New feature → tdd anyway.
  Tasks ordered so the Gold Kid only becomes reachable in task 9; every earlier
  task leaves the build green and the game unchanged for players, except task 1,
  which takes Super Shadehog out of the grass.
