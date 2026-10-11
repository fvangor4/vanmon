---
status: done
base: 32e3b2d
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
    - Its level matches the player's lead creature.
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
- [x] Confirm at approval: Super Shadehog's level = the player's lead creature's
      level. Run is allowed in the Gold Kid battle. → approved as proposed

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
- [x] 1. Species can be marked `"wild": false`: never in any encounter pool, and
      must not also list `areas` (validation error). Set it on `super-shadehog` and
      drop its `areas`.
      files: src/logic/creatures.ts (+test), src/logic/encounters.ts (+test), public/data/creatures.json, src/logic/starters.ts (+test, added by review)
      commits: [56df58c, ddd9128, 047c415, 906c167]
- [x] 2. Math quiz generator: `makeQuiz(rng)` → 3 distinct problems, each with 3
      shuffled distinct choices, per the Intent rules; `rng` injected for tests.
      files: src/logic/mathQuiz.ts, src/logic/mathQuiz.test.ts
      commits: [dfaa8b2, 7d02bd7, 8a6d17e]
- [x] 3. Save v2: `GameState` gains `npcsBeaten: string[]` (ids, so later NPCs need
      no migration). `SAVE_VERSION` 2; a migration from v1 adds `[]`; load repair drops
      non-string entries.
      files: src/logic/gameState.ts, src/logic/save.ts (+tests)
      commits: [7b5f07f, 2e5d9cc]
- [x] 4. NPC battle rules in logic. An NPC battle rejects Catch. Outcome: win →
      XP, plus a first-time prize (Super Shadehog into party or Box) and the id
      added to `npcsBeaten`; a later win → XP only; loss → heal all, position
      unchanged; run → nothing. NPC definition data (id `gold-kid`, name, species,
      prize, level rule) lives in one new module.
      files: src/logic/npcs.ts (+test), src/logic/battle.ts (+test), src/logic/gameState.ts (+test)
      commits: [7876e81, 03d0bfb]
- [x] 5. Town placement: the Gold Kid's tile in town data, treated as not
      walkable by pathfinding, plus a helper for "tiles next to it". The tile is open
      floor, not START, not the door, and doesn't cut off any part of town (test).
      files: src/data/maps.ts, src/logic/map.ts (+test), src/logic/save.test.ts (review: old-save case)
      commits: [f0718ef, c251bba, a36a118]
- [x] 6. Gold Kid sprite: `drawPlayer` takes a color palette; bake `'player'`
      unchanged and a new all-gold `'gold-kid'` texture. Check both in the preview.
      files: src/scenes/textures.ts
      commits: [6348099]
- [x] 7. BattleScene NPC mode: `BattleLaunch` gains an optional `npc` id. In NPC
      mode: an intro line ("The Gold Kid sends out Super Shadehog!"), no Catch button,
      task 4's outcome rules, and win/prize/loss lines read aloud. Wild mode unchanged.
      files: src/scenes/BattleScene.ts, src/scenes/OverworldScene.ts (type only), src/logic/battleText.ts (+test, added: NPC lines are pure text logic)
      commits: [134c8db, b197de7]
- [x] 8. MathScene: the quiz from task 2, with big read-aloud problems, three
      answer buttons, wrong-button fade plus "Not quite, try again!", a cheer on right
      answers, and ✖ to leave. After three right answers, it starts the NPC battle.
      Registered with the game.
      files: src/scenes/MathScene.ts, src/main.ts (scene list)
      commits: [f5f9539, c23d9f7, ea69eb7, f515a15]
- [x] 9. Overworld: draw the Gold Kid in town. Tapping it walks the player next to
      it, then plays the spoken greeting (a different line after a win) and opens
      MathScene. After an NPC battle, the player is back beside the Gold Kid.
      Preview walkthrough of Done-when #6.
      files: src/scenes/OverworldScene.ts, src/logic/npcs.ts (+test, added: npcGreeting text); review fixes also touched src/logic/map.ts (+test), src/scenes/textures.ts, docs/ADDING_CREATURES.md
      commits: [62c1a5c, fe92f80, d3d7bf4, b3d12b2, a064c80]
- [x] 10. Docs: `"wild": false` in docs/ADDING_CREATURES.md (field table and the
      starters note), and the Gold Kid in the README feature list.
      files: docs/ADDING_CREATURES.md, README.md
      commits: [00b06c9, 4bff2db]

## Log
- 2026-10-11: draft created. Super Shadehog (golden fire creature, id
  super-shadehog) added just before in 4006117; candidate for the NPC's creature.
- 2026-10-11: two rounds of questions answered (see Decided). Six recon unknowns
  resolved. Escalation checklist: "serialization shape / schema change" fires
  (save v1→v2, new species field) → schema-change. New feature → tdd anyway.
  Tasks ordered so the Gold Kid only becomes reachable in task 9; every earlier
  task leaves the build green and the game unchanged for players, except task 1,
  which takes Super Shadehog out of the grass.
- 2026-10-11: approved by the user ("Looks good!"), proposals confirmed. base 32e3b2d.
- task 1: implemented 56df58c. 3 new tests red → green; src/logic 216 passed, tsc clean.
- task 1 reviews: spec pass. code — 3 findings: (1) ADDING_CREATURES.md lacks `wild` → disagree for now: task 10 documents it (planned, same change); (2) shipped pool test hard-coded every pool, so each kid-drawn creature would break it → rewritten to assert super-shadehog absent and pools = areas rule minus wild:false; (3) pickStarters could hand out a wild:false species → skips them, +test (starters.ts added to task 1 files: it is the only other reader of the species list that the new field changes). Fixed ddd9128.
- task 2: implemented dfaa8b2. Red was the missing module (new file), then 4 passed. Wrong choices are within ±3 of the answer (clipped to 0–10) so they look like real guesses.
- task 1 re-review of ddd9128: 1 finding — the pool assertion copied speciesForArea's filter (tautological). Replaced with outcome checks: super-shadehog in no pool, every other shipped species in some pool. Fixed 047c415.
- task 1 re-review of 047c415: 2 findings. (1) exemption hard-coded the super-shadehog id → now by `wild === false`, fixed 906c167. (2) asks for explicit per-area pool lists → DISAGREE: that is exactly what round 1 flagged as brittle (every kid-drawn creature would break it, and adding creatures is documented as no-code). The area rule is covered by the unit tests on fixture data; "other pools unchanged" was verified for this change by the hard-coded assertion that passed in 56df58c. Not re-reviewing again: the fix is a one-line condition swap and the reviewers' remaining ask conflicts with round 1. Task 1 done.
- task 1: re-review of 906c167 pass. Done.
- task 2 reviews: spec pass (notes: distractors within ±3 is a narrowing of the intent — kept, it reads as real guesses; 3+4 and 4+3 could share a set → now treated as the same question). code — (1) "always tap the biggest" won ~43% (totals 9 and 10 have the most pairs; 10 is always the biggest) → totals now picked evenly, then a pair: test caps biggest/smallest at <38%; (2) negative rng untested → added; (3) constant-only assertions removed; (4) informational, no action. Fixed 7d02bd7.
- task 3: implemented 7b5f07f. 5 red (newGame, v1→v2 load, 2 migration tests re-based to v2, npcsBeaten repair) → 65 passed; tsc clean.
- task 2 re-review of 7d02bd7: 2 findings — "tap the middle" now won 52% (±3 guesses on both sides put mid answers in the middle 60%), and the test didn't check the middle. → where the answer lands is now weighted (10 biggest only; 9 middle; others 3:2:2 smallest:middle:biggest) so each habit wins ~1/3; test bounds all three habits to 29–38%. Fixed 8a6d17e.
- task 3 reviews: spec — repair also drops empty strings and duplicates: accepted, it fits "prize once" and is tested. code — (1) the v1 test couldn't tell a working migration from a no-op (repair also defaults the list) → MIGRATIONS exported and tested on its own; (2) non-object v1 state untested → covered (ends as "save has no party"). Fixed 2e5d9cc.
- task 4: implemented 7876e81. 12 red → 56 passed; tsc clean. Prize = fresh creature at the battle's level (full HP). Lead level = party[0].level.
- task 3: re-review of 2e5d9cc pass. Done.
- task 5: implemented f0718ef. 6 red → src/logic 244 passed; tsc clean. Gold Kid at town (12, 4). NPC tiles are unwalkable inside parseMap, so a saved position on that tile resets to START via the existing repair.
- task 4 reviews: spec — run marks Super Shadehog 'seen' in the Book (not literally "nothing") → kept on purpose: the kids did meet it, same as running from a wild one; now pinned by the test. code — (1) NPCS[id] read inherited keys ('constructor') → Object.hasOwn guard; (2) unknown-NPC throw untested → tested incl. 'constructor'/'toString'; (3) missing prize species untested → tested; (4) run test asserted little → now asserts the whole state equals before plus the Book entry. Fixed 03d0bfb.
- task 4: re-review of 03d0bfb pass. Done.
- task 5 reviews: spec pass. code — (1) a save standing on (12,4) now resets to START, untested → save test added; silently moving home is fine for the kids, so no message added; (2) map NPC ids not checked against NPCS → data test; (3) test BFS walked through exits unlike findPath → now stops at exits; (4) duplicate-NPC regex loose → matches the reason. Fixed c251bba.
- task 6: implemented 6348099. No scene test harness exists (see Unknowns), so verified in the preview: both textures exist, player unchanged (blue shirt, yellow cap), Gold Kid all gold with a sparkle.
- task 2: re-review of 8a6d17e pass (simulated 900k: biggest 33.5 / middle 33.4 / smallest 33.1%). Done.
- task 5: re-review of c251bba — 1 finding: an exit tile counted as a talk spot → excluded, a36a118; re-review pass. Done.
- task 6 reviews: code pass (cosmetic notes: gold cheeks faint, sparkle near the cap — fine at tile size). spec — notes only: white shine dots and the sparkle go slightly beyond "all gold" (accepted: they make it read as gold rather than yellow); drawPlayer renamed to drawKid; no automated test (no scene harness). Done.
- task 7: implemented 134c8db. battleText NPC lines tdd (3 red → 11 passed). Preview walkthrough via window.__game: NPC battle shows no Catch; "The Gold Kid's Super Shadehog is sleepy!", "You beat the Gold Kid!", prize "The Gold Kid gives you a Super Shadehog to keep! 🎁" → party gained super-shadehog, npcsBeaten ['gold-kid'], Book caught, save version 2; rematch win added nothing to party or Box; loss with lead at 1 HP → all healed, position kept (town 12,5), "Good try! Talk to the Gold Kid to try again." Prize HP card refilled for the gift. Preview save restored afterwards.
- task 7 reviews: spec pass (notes: Catch/prize/position rest on the preview walkthrough, no scene harness; end-to-end launch arrives in task 9). code — (1) unknown npc id silently became a catchable wild battle → logs an error and returns to town, verified in preview with 'constructor'; (2) midSentence untested for names without "The " → 'Goldie' and 'Theo The Brave' cases. Fixed b197de7.
- task 8: implemented f5f9539. Preview: "The Gold Kid's math!" with three ☆; tapping wrong "2" for 2 + 2 faded it; right "4" filled ⭐ and showed "2 + 2 = 4"; after three, "🎉" then Battle with npcId gold-kid vs super-shadehog and the intro "The Gold Kid sends out Super Shadehog!"; ✖ returns to Overworld; unknown NPC id → back to town with a console error. Quiz logic is unit-tested in task 2; the scene has no harness.
- task 7: re-review of b197de7 pass. Done.
- task 8 reviews: spec pass (notes: entry point arrives in task 9; no scene harness). code — (1) 🔊 after the third answer read quiz[3] → TypeError; now repeats the "all done" line (checked in preview, no errors); (2) battle-start catch went silently to town → now shows 😅 and says "Oops! Let's head back." first; the deterministic cause (NPC creature missing from data) is also guarded by the npcs data test. BattleScene.init throwing (all party asleep) is pre-existing wild-battle behavior, out of scope, and unreachable after the heal-on-loss rule. (3) unreachable scene → wired in task 9. Fixed c23d9f7.
- task 9: implemented 62c1a5c. npcGreeting tdd (1 red → 4 passed). Preview walkthrough by real taps (Done-when #6): Gold Kid visible in town (12,4) with a bobbing 💬; tapping it from (8,5) walked the player to (11,4), faced it, and showed + spoke "Hi! I'm the Gold Kid! ✨ Answer my three math questions, then let's battle!"; tap → Math scene; three answers → Battle (npcId gold-kid, no Catch); Run → back in town beside the Gold Kid; again with fights → a real loss (Leafbun Lv2, leaf vs fire) → healed 13/13 and back beside the Gold Kid at (11,4); tapping while adjacent talks immediately; with npcsBeaten set, greeting is "Hi again! ✨ Rematch? …"; ✖ → town. Win/prize/rematch-no-prize verified in task 7's walkthrough. A v1 save loaded as v2 with npcsBeaten [] (Done-when #3 live). Preview save restored after.
- note for the human: at equal level Super Shadehog (55/65/45, fire) beat a leaf starter in the preview. Kids can retry, swap, or level up; flagging in case it feels too hard.
- task 10: implemented 00b06c9. This also covers task 1's deferred review finding (ADDING_CREATURES lacked `wild`).
- task 8: re-review of c23d9f7 — 2 findings (🔊 said "Now let's battle!" on the Oops screen; Oops line cut off at 1.8 s) → 🔊 repeats the last line said, Oops waits 3 s, ea69eb7. Re-review of ea69eb7 — the cheer wasn't the repeated line → f515a15.
- task 9 reviews: spec — (1) wrong-tap fade not in this walkthrough → it was shown in task 8's preview (2 faded for 2 + 2); (2) win → prize → back beside the Gold Kid never run through the town flow → done (below); (3) "screenshots in the Log": screenshots were taken and checked in the preview session but not committed (binary files in docs/ for no reader); described here instead — deviation from Done-when #6 wording, flagged to the human. code — (1) 💬 sits in the tile above, tapping it walked there → sprite and bubble are tap targets calling approach; (2) menu-then-NPC tap dropped the talk → last tap wins both ways; (3) isNextTo now Manhattan distance 1 to that NPC; (4) unknown NPC id / texture → console.error, and only NPCs with a known picture are drawn. Pulling approach/talk into a pure function for tests: declined (one NPC, scene-only glue; covered by the walkthrough). Fixed fe92f80.
- task 9 full walkthrough through town (pane hidden, so game clocks were sped up for the check): lead Puddlefin (water) → tapped the 💬 bubble from a diagonal tile → walked beside the Gold Kid (13,4) and greeted → math ×3 → battle (Fight/Swap/Run, no Catch) → won in 2 turns → "You beat the Gold Kid! 🎉" → "The Gold Kid gives you a Super Shadehog to keep! 🎁" with the HP card refilled → back in town at (13,4) beside the Gold Kid; save version 2, npcsBeaten ['gold-kid'], super-shadehog in the party. Rematch through town: greeting "Hi again! ✨ Rematch? …" → math → won → party and Box counts unchanged, still exactly one Super Shadehog. Preview save restored.
- task 10 review: (1) `wild` row implied wild:false alone makes a prize → says only an NPC (code in src/logic/npcs.ts) can give it; (2) README "next to home" → "near home". Fixed 4bff2db.
- re-review of f515a15 / fe92f80 / 4bff2db: task 8 pass (done). task 9 — (1) an NPC with no picture became an invisible wall; (2) picture map untestable; (3) adjacency inline, npcNextTo dead → NpcDef.texture (data, so the existing "every map NPC is in NPCS" test covers it), npcNextTo replaced by tested isBeside(); "last tap wins" extraction declined again. task 10 — the doc's new-NPC file list was incomplete → lists npcs.ts, maps.ts and textures.ts. Fixed d3d7bf4; preview: Gold Kid drawn and tappable.
- task 9: re-review of d3d7bf4 — a texture key could exist with no drawing (Phaser's placeholder) and the texture assertion was tautological → NpcTexture union + Record<NpcTexture, draw> table (a missing drawing is a type error), b3d12b2. Re-review of b3d12b2 — the math screen still drew the Gold Kid by name → uses npc.texture, a064c80 (preview: math screen image key 'gold-kid'); key-collision-with-'player' hazard declined (one key). Re-review of a064c80 pass. Done.
- task 10: covered by the combined re-reviews (4bff2db, d3d7bf4 docs). Done.
- ship gate: `npm run build` green (tsc, 21 test files / 270 tests, vite build, check-dist ok with 19 offline files). `git diff 32e3b2d..HEAD`: 29 files, all named by tasks or recorded review additions (starters.ts, battleText.ts, map.ts, save.test.ts, textures.ts). No lint script exists. Not pushed: waiting for the human (pushing deploys to the kids' iPads). Done.
