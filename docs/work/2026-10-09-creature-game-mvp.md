---
status: approved
base: 64a3c77
rigor:
  tests: tdd
  review: spec+code
  review_at: per-task
  rereview: on-nontrivial
  execution: inline
  triggers_fired: [serialization, deployment]
---

# VanMon — creature-collecting iPad web game for two kids (ages 5 and 7)

## Intent
- **Problem:** Make a Pokémon-style creature-collecting game the kids (5 and 7)
  can play on their own iPads, to show them creativity and fun. Mock creatures
  for now; the kids will design their own creatures later.
- **Platform:** Web game (Phaser 3 + TypeScript + Vite) played in iPad Safari,
  installed via Share → Add to Home Screen (full-screen, own icon, works
  offline after first load). Hosted on GitHub Pages from the public repo
  `github.com/fvangor4/vanmon` (exists, empty, public).
- **Saves:** One save per iPad, in on-device storage (localStorage), versioned.
- **Controls:** Tap where to go; character pathfinds there on the tile grid.
  Landscape only; portrait shows a "turn your iPad" prompt.
- **Reading:** Short text everywhere plus a speaker button on every dialog that
  reads it aloud (iPad built-in voice via Web Speech API). Every button has an
  icon/color so nothing *requires* reading.
- **v1 world:** Home town (with home/bed for healing) + one grassy route + a
  pond area. ~6 mock creatures across 3 types: Fire, Water, Leaf
  (Fire beats Leaf, Leaf beats Water, Water beats Fire).
- **Game rules (v1):**
  - New game: pick 1 of 3 starters (one per type).
  - Wild encounters when stepping in tall grass; species/levels set per area.
  - Battle menu: Fight (2 moves per creature: a plain move + a type move),
    Catch, Swap, Run (run always succeeds). Player acts first; wild creature
    picks a random move. "Super effective!" / "Not very effective…" feedback.
  - Catch: ball wiggles up to 3 times; usually succeeds; easier when the wild
    creature's HP is lower. On failure the creature stays and battle goes on.
  - Party max 6; extra catches go to a Box at home, swappable at home.
  - Winning gives XP to the active creature; level-ups celebrated. No evolution in v1.
  - Losing: when the active creature runs out of HP → "Your creatures got
    sleepy!" → wake up at home, whole party fully healed, nothing lost.
  - Creature Book: grid of every species, showing seen/caught; tap one to see
    it big and hear its name.
- **Art pipeline:** Each creature is a data entry in `public/data/creatures.json`
  plus an image file in `public/creatures/`. Kid art (photo of a paper drawing,
  which Claude converts to a sprite) replaces mock art with no code change.
  Documented in `docs/ADDING_CREATURES.md`.
- **Out of scope (v1):** In-game drawing "Creature Lab" (wanted — phase 2),
  native iOS app / App Store, online play or trading, multiple save slots per
  device, trainer battles / gyms, items/shops, evolution, real Pokémon
  names or assets.
- **Done when:**
  1. `npm test` passes, covering: type chart, damage, battle turns, catch,
     XP/level-up, encounter rolls, pathfinding, game state, save
     load/version/corrupt handling, creature data validation.
  2. `npm run build` succeeds, and a push to `main` deploys via GitHub Actions
     to `https://fvangor4.github.io/vanmon/`, which loads without console errors.
  3. In the browser pane at iPad landscape size (≈1180×820, touch): new game →
     pick starter → tap-to-walk → grass encounter → battle shows
     super-effective feedback → catch succeeds → creature appears in party and
     Creature Book → reload page → progress is still there.
  4. Losing: active creature reaches 0 HP → "sleepy" message → player is at
     home, party fully healed, party and Book unchanged.
  5. Tapping a dialog's speaker button calls `speechSynthesis.speak` with that
     dialog's text (verified in-browser; real voice confirmed on an iPad by you).
  6. Adding a test creature by editing `creatures.json` + dropping an image
     makes it appear in encounters and the Book with no code change.
  7. Corrupt or unknown-version save data → game starts fresh without
     crashing, and the bad data is kept under a backup key.
  8. Starting a New Game when a save exists needs a deliberate press-and-hold
     confirm (a 5-year-old can't wipe a save with one tap).
  9. Portrait orientation shows the rotate prompt; landscape plays.
  10. Manifest + service worker present: Add to Home Screen opens full-screen
      with the VanMon icon, and the game loads with the network off after first
      visit (offline check in browser; real Home Screen check on iPad by you).

## Open Questions
- [x] Hosting → GitHub Pages, public repo `fvangor4/vanmon`.
- [x] Reading support → short text + read-aloud speaker button + icons.
- [x] Creature designs → paper drawing → photo → Claude converts (v1);
      in-game Creature Lab is wanted later (phase 2, out of scope here).
- [x] v1 size → small & polished (town + route + pond, ~6 creatures, 3 types).
- [x] Controls → tap where to go.
- [x] Losing → nap & go home, fully healed, nothing lost.
- [x] Catching → easy with suspense (wiggles, usually works, retry allowed).
- [x] Node.js → OK to install via Homebrew.
- [x] Git → OK to `git init` and use `fvangor4/vanmon` as remote.

## Unknowns
- [x] Existing code? → None; folder was empty.
- [x] Toolchain? → git 2.50.1, Homebrew present, gh logged in as fvangor4.
      Node/npm not installed (approved to install).
- [x] iPad Simulator available? → No. Only Command Line Tools
      (`xcode-select -p` = /Library/Developer/CommandLineTools), no Xcode.
      Verification uses the browser pane at iPad size with touch emulation;
      final real-device check is done by the user.
- [x] Package versions → pinned exact, each ≥2 weeks old: phaser 3.90.0 (final v3;
      Phaser 4.2.1 exists but plan says 3), vite 8.3.1, vitest 5.0.1, typescript 7.0.2,
      jsdom 30.1.1. Node v26.11.1 via Homebrew. vite-plugin-pwa: check vite 8 peer at task 17.

- [x] Saved creatures vs edited creatures.json (from task 2 review) → decision:
      task 9 load must recompute maxHp/attack/defense from species + level
      (clamping hp), and drop creatures whose speciesId no longer exists
      (logging them into the backup key), so parent edits never break a save.
      Also (task 7 review): load must require level a whole number 1..LEVEL_CAP
      and xp a whole number 0..xpToNextLevel(level)-1 (0 at the cap); gainXp
      throws on broken values rather than silently misbehaving.
- [x] Encounter levels (task 7 review) → task 11 must keep wild levels ≤ LEVEL_CAP (20).
- [x] Runtime data checks (task 11 review) → task 13/15 boot must run
      validateCreatureData + validateAreas on the fetched creatures.json and show a
      parent-readable error instead of a blank game. `npm run build` now runs tests
      (8ff65df) so a bad edit can't deploy.
- [x] Encounter cooldown counter (task 11 review) → overworld keeps
      stepsSinceBattle in scene memory, starting at 0 after battle/new game/reload
      (not saved).

- [x] Image URLs under the Pages base (from task 3 review) → requirement for
      task 13/14: build creature image URLs as
      `import.meta.env.BASE_URL + 'creatures/' + image`, never '/creatures/…'.

## Tasks
- [x] 1. Scaffold: install Node, git init, Vite + TS + Phaser + Vitest, landscape
      FIT config (1024×768 logical), Boot scene showing "VanMon", smoke test.
      files: package.json, tsconfig.json, vite.config.ts, index.html, src/main.ts,
             src/scenes/BootScene.ts, src/logic/smoke.test.ts, .gitignore
      commits: [259bd4c, 91c3b46]
- [x] 2. Creature + move data model, JSON validation, create-instance-at-level;
      6 mock creatures in JSON.
      files: src/logic/creatures.ts, src/logic/creatures.test.ts, public/data/creatures.json
      commits: [1d48593, b262dc3, 1b639e9]
- [x] 3. Mock creature art: 6 cute SVG blobs colored by type.
      files: public/creatures/*.svg
      commits: [a178afc, f918bde]
- [x] 4. Type chart + damage formula (injectable RNG).
      files: src/logic/damage.ts, src/logic/damage.test.ts
      commits: [f4e6525, c4c268d, bfb7f7e]
- [x] 5. Battle engine (pure state machine): fight turn, wild random move,
      faint, run, swap; emits event list for the scene to play back.
      Wild creatures deal ×0.6 damage (gentle difficulty; see task 4 log).
      files: src/logic/battle.ts, src/logic/battle.test.ts
      commits: [472b856, 7e60a72]
- [x] 6. Catch logic in battle engine: wiggle count, HP-scaled chance, fail → wild turn.
      files: src/logic/catch.ts, src/logic/catch.test.ts, src/logic/battle.ts
      commits: [d036573, 2dc97f6]
- [x] 7. XP + level-up (stat growth, cap at level 20).
      files: src/logic/xp.ts, src/logic/xp.test.ts
      commits: [9f46e37, 559518f]
- [x] 8. Game state: party (max 6), box, Book seen/caught, position, heal-all,
      send-home-on-loss.
      files: src/logic/gameState.ts, src/logic/gameState.test.ts
      commits: [214a656, 5c33689, 0b82f0b]
- [x] 9. Save system: versioned serialize/load via localStorage, corrupt/unknown
      version → fresh + backup key, request persistent storage.
      files: src/logic/save.ts, src/logic/save.test.ts
      commits: [7f5f347, 5f22bd4, 3714f7d, c96e377]
- [x] 10. Maps as ASCII data (town, route, pond) + parser + BFS tap-to-walk pathfinding.
      files: src/logic/map.ts, src/logic/map.test.ts, src/data/maps.ts
      commits: [673e810, efdd912, bddca4d]
- [x] 11. Encounter roll per area (chance per grass step, weighted species, level range).
      files: src/logic/encounters.ts, src/logic/encounters.test.ts, src/data/maps.ts
      commits: [b8bb08f, 8ff65df]
- [x] 12. Read-aloud helper + DialogBox UI with speaker button + big Button UI.
      files: src/ui/speech.ts, src/ui/speech.test.ts, src/ui/DialogBox.ts, src/ui/Button.ts
      commits: [a70a6a8, d5734e9]
- [x] 13. Overworld scene: procedural tile textures, player sprite, tap-to-walk,
      map transitions, grass → battle, home bed heals, autosave.
      files: src/scenes/OverworldScene.ts, src/scenes/textures.ts, src/main.ts
      commits: [cc463ce, d6dfa5b]
- [~] 14. Battle scene: plays back engine events, move buttons by type color,
      effectiveness text + read-aloud, catch wiggle animation, win/lose flows.
      files: src/scenes/BattleScene.ts, src/main.ts
      commits: [d15af9e]
- [ ] 15. Title + starter pick + hold-to-confirm New Game.
      files: src/scenes/TitleScene.ts, src/scenes/StarterScene.ts, src/ui/HoldButton.ts
- [ ] 16. Menus: Party (swap lead), Box (at home), Creature Book.
      files: src/scenes/PartyScene.ts, src/scenes/BoxScene.ts, src/scenes/BookScene.ts
- [ ] 17. PWA: manifest, icons, Apple meta tags, offline service worker, rotate prompt.
      files: vite.config.ts, index.html, public/icons/*, src/ui/rotatePrompt.ts
- [ ] 18. Deploy: GitHub Actions → Pages, remote + push, README,
      docs/ADDING_CREATURES.md.
      files: .github/workflows/deploy.yml, README.md, docs/ADDING_CREATURES.md

## Log
- 2026-10-09: draft created; all open questions answered; tasks proposed.
- 2026-10-09: checklist fired `serialization` (save format) and `deployment`
  (Pages deploy) → per-task spec+code review. Human may relax at approval.
- Note: scene tasks (13–16) keep `tests: tdd` by putting their decision logic in
  tested `src/logic/` modules; rendering itself is verified in the browser pane.
- 2026-10-09: approved by human (rigor unchanged: per-task spec+code). base = 64a3c77 (initial commit holding this plan).
- task 1: implemented. Added src/config.ts (logical size constants, so the smoke test has a pure module to import) and .claude/launch.json (dev server for browser pane) beyond the named files. Browser pane at 1180×820 renders "VanMon", no console errors; build green.
- task 1 review: spec findings (extra files config.ts + launch.json; unused jsdom; smoke test overclaims) and code findings (tautological smoke test; `vite preview` base mismatch; launch.json port not strict; jsdom dead dep; iOS ignores user-scalable=no). Fixed in 91c3b46: base keyed on mode (preview now serves /vanmon/assets JS as text/javascript, verified with curl), `--strictPort`, jsdom removed, touch-action on canvas + gesturestart preventDefault.
- task 1 disagreement: smoke test deleted rather than strengthened — Phaser can't load under Node, so FIT config / Boot text are verified in the browser pane (screenshot showed "VanMon", no console errors). Extra files config.ts and launch.json kept (justified above). Re-review skipped (rereview=on-nontrivial; fixes mechanical).
- task 2: implemented; 14 tests pass, typecheck clean. Stat formula: hp=floor(b*L/50)+L+10, atk/def=floor(b*L/50)+5.
- task 2 review: spec — no normal+type move rule; real Pokémon move names (Tackle/Scratch/Ember). code — 11 findings (move rule, dup ids incl. undefined noise, non-string move refs, randomUUID needs secure context/iOS 15.4, unchecked level, stale saved stats, untrimmed ids/unknown keys, image name not checked, missing branch coverage, unreachable-in-try, no stat anchor). Fixed in b262dc3 (moves renamed Bump/Swipe/Spark; id + image patterns; level RangeError; getRandomValues uid; problemsOf() test helper; 24 tests).
- task 2 disagreements: unknown JSON keys stay allowed (kids may add fields like "artist"; a typo'd key next to the valid one is harmless). Stale saved stats → recorded as a task 9 requirement under Unknowns rather than changing the Creature shape now.
- task 3: implemented. 6 SVGs viewed in browser pane (contact sheet looked right). Added src/logic/art.test.ts (not in file list): fails naming the file when a species' image is missing (checked by temporarily moving leafbun.svg).
- task 2 re-review (code): 5 findings — move rule fired on invalid type ("undefined"/"rock" noise), case-insensitive dup test untested, whitespace test masked by capital E, uppercase extensions (IMG_1234.JPG) rejected, untested branches (move missing id, non-array moves, upper bounds/fractions). Fixed in 1b639e9; toLowerCase dropped since ID_PATTERN already forbids capitals. 34 tests. No further re-review (rereview=on-nontrivial, fix was targeted).
- task 3 review: spec — art.test.ts outside file list (accepted, see above); "colored by type" untested → disagree: color is visual, verified by eye in browser and by reviewer. code — SVG width/height/XML untested → fixed f918bde (verified failing when toastle width/height removed); base-path loader → recorded for task 13/14; glob matches non-images → disagree, IMAGE_PATTERN already limits names.
- task 4 review: spec — same-type ×1.25 bonus stacked with ×2 made wild type moves 2-shot starters (not "gentle"); anchor used power 45 not the real 35; weak multiplier unpinned. code — min-damage clamp not reached by its test; ±15% roll bound too loose; weak unpinned; rng output unchecked. Fixed c4c268d: same-type bonus removed (kids only need "pick the move that beats their color"), exact anchors (plain 4, neutral type 5, super 11 → 5 hits vs 2 hits on 20 HP), exact roll bounds 35..41, clamp test uses weak+no-bonus+low roll, rng outside [0,1) throws RangeError. Gentleness lever moved to the battle engine: wild damage ×0.6 (added to task 5).
- task 4 re-review: weak multiplier only loosely pinned on base 5.6; ceil(20/x) asserts tautological. Fixed bfb7f7e (exact ×1/×2/×0.5 on base 42 → 41/83/20). Done.
- task 5: implemented; 14 tests. Engine copies state each turn (inputs never mutated); events: move/damage/faint/swap/ran/won/lost.
- task 5 review: spec — wild move choice only tested at rng 0.999. code — 8 findings (random pick untested; 0.6 not pinned; Math.min clamp hid bad rng; damage `amount` overshot remaining HP; takeTurn non-mutation untested; loss-after-swap untested; context errors untested; asleep wild accepted). All fixed in 7e60a72 (seq rng helper; amount = HP actually lost; rng outside [0,1) throws; startBattle rejects asleep wild). 20 tests. Re-review skipped (on-nontrivial; fixes mostly tests + 3 small guards).
- task 7 review: spec pass. code — level/xp from saves unchecked; species mismatch unchecked; above-cap behavior undocumented; level-up not asserted in hp test; curve pinned at one level. Fixed 559518f (RangeErrors; species id check; above-cap unchanged + test; curve loop: 2-3 wins every level). Load-side invariants recorded under Unknowns for task 9. 13 tests.
- task 10: implemented; 13 tests incl. whole-world checks (every warp lands walkable, has a way back, and is reachable from every arrival point). Town 20×15, route 24×18, pond 20×15; home door (7,4), start (7,5).
- task 6: implemented (battle.test.ts also touched for catch tests). Chance 60% full HP → 95% near 0; 3 wiggles each pass with chance^(1/3). 30 tests across battle+catch.
- task 6 spec review: only finding = battle.test.ts outside file list (accepted; catch tests belong with the engine).
- task 8: implemented; 16 tests. applyBattleOutcome folds won (XP to active)/caught/ran/lost (home + heal all) into GameState.
- task 6 code review: catchChance accepted impossible HP (NaN → always caught, hp>maxHp → never); LCG in odds test overflowed 2^53; boundary untested; fresh-case assertion weak; retry untested. Fixed 2dc97f6 (RangeError; mulberry32; exact-boundary, first-event and retry tests). 33 tests. No re-review (targeted).
- task 8 review: spec — Book changes on loss (marks wild 'seen') vs "Book unchanged" → disagree: intent is "nothing lost"; seeing a new species only adds. Pinned both cases in tests. code — caught-HP untested; no-mutation only on caught path; no party-identity guard; activeIndex unchecked; GameState unversioned (→ disagree: SaveFile wrapper carries version, task 9); fixture Book inconsistent; bad-slot coverage thin. Fixed 5c33689 + 0b82f0b (I committed 5c33689 with one test red from the fixture change — a `grep` in the command chain masked vitest's exit code; fixed immediately in 0b82f0b). 18 tests.
- task 9: implemented; 21 tests. Save = {version:1, savedAt, state}. Load repairs: drop unknown-species / bad-level creatures (into backup `dropped`), recompute stats, clamp hp/xp (xp 0 at cap), regenerate missing/duplicate uids, refill empty party from Box, filter Book + force owned species to caught, reset bad position to START. Unreadable storage → no save; setItem failure → saveGame false.
- task 10 review: spec — closest-tile test relied on a tie. code — paths walked through/ended on warps (tap tree next to town exit → sent to route!); tie test; empty-map check untested; world-data gaps (arrival-on-warp, key≠id); `from` unchecked. Fixed efdd912: BFS never enters a warp unless it is the tapped tile; unambiguous closest test; empty map test; id/arrival checks; invalid start throws (save load already repairs positions). Reverse-warp coordinate check → disagree: arrival tiles are deliberately one step inside the exit, not the mirror tile. 18 tests. Code re-review requested (logic change).
- task 11: implemented. Also touched creatures.ts/test + creatures.json (optional `areas` per species) — needed for Done-when #6 (new creature appears in encounters with no code change). AREAS (chance 0.15, levels) in maps.ts; 3-step cooldown after battles. 148 logic tests green.
- task 9 review: spec — xp clamped rather than rejected (→ intended: repair-first, kids keep creatures; level drops only when statsAtLevel can't compute it); whole-number xp/hp paths untested; parent-edit scenario not truly exercised. code — inherited-key map lookup ("constructor") crashed load; above-cap creatures deleted; PARTY_MAX not enforced; single backup slot overwritten; no migration path / newer-version handling; missing box discarded save; backup-write failure untested; valid non-START position untested; top-level array/primitive untested; weak problem assertion. Fixed 5f22bd4: Object.hasOwn + last-resort try/catch → fresh+backup; clamp level to cap; overflow → Box; backup history (last 5, deduped); MIGRATIONS hook, newer version → backup+fresh (documented); box defaults []; resume-on-exit tile → START (from task 10 re-review #4). 35 tests. Code re-review requested.
- task 10 re-review: off-map tap beside exit counted as tapping it; detour test didn't detour; unanchored throws; save could resume on a warp; crash-y data test. Fixed bddca4d (+ save part in 5f22bd4). Done.
- task 11 review: spec — "weighted species" but pick is uniform → disagree: uniform odds are simpler and fair for kids; task wording was loose. Out-of-list files (creatures.ts/json) accepted for Done-when #6. Cooldown not requested → keep: gentle difficulty lever, documented. Runtime cap enforcement → validateAreas at boot (recorded under Unknowns). code — validateAreas never runs at runtime/build; stepsSinceBattle semantics; evenness untested; validation branches + fixture isolation. Fixed 8ff65df (build runs vitest; doc comment; per-bucket ±3%; chance/level cases on isolated fixture). Done.
- task 12: implemented (speech 7 tests; Button/DialogBox are Phaser UI, verified visually in task 13).
- task 9 re-reviews: round 2 (3714f7d) — injectable migrations/version for tests, migrate inside safety net, broken map → START, junk-tolerant backups, dedupe/trim tests, protectSave for newer saves. Round 3 (c96e377) — missing/crashing upgrade also sets protectSave, 2-step ordered migration test, broken map reported in `problem`, backup entries normalized (at/dropped), legacy single-object backup read. 41 tests. Stopping re-review here: remaining risk is in code paths dormant until SAVE_VERSION changes. Done.
- task 12 review: spec — speak() gets emoji-stripped text, not the literal dialog text → Done-when #5 interpreted as "the spoken form of the dialog text" (verified that way in task 13). code — redundant stopPropagation (removed; topOnly makes speaker win); pressed-scale shrank hit area (now scales an inner face); onTap fired on slide-in releases (pressed tracking on Button + DialogBox); speech kept talking after text changed (stop on show/hide/continue); overlapping show() (→ disagree, documented single-sequence contract); auto-speak before first gesture is silent on iOS (→ title screen "tap to play" in task 15 unlocks it); voices lazy (warm getVoices); emoji filter gaps; cancel-before-speak order and voice-preference tests. Fixed d5734e9. DialogBox/Button lifecycle unit tests → disagree: Phaser objects, verified in browser instead. Done.
- task 13: implemented (cc463ce). Added src/session.ts (shared Session: data, state, rng, save; honors protectSave via canSave) and rewrote BootScene (loads + validates creatures.json and areas, shows a "Grown-ups: creatures.json needs fixing" screen on bad data, loads art via BASE_URL, loads save). Added pinToScreen() to Button.ts: Phaser's Container.setScrollFactor doesn't reach nested children, so the dialog was drawn off-screen once the camera scrolled. Browser-verified at 1180x820: town renders, tap-to-walk + autosave, north exit → Grassy Route, grass encounter → "A wild Emberpup appeared!" dialog, speaker tap → speechSynthesis.speak("A wild Emberpup appeared!") without closing the box, tap box → continues. Battle hand-off waits for task 14.
- task 13 review: spec — extra files (BootScene, session.ts, pinToScreen) accepted (recorded requirements + fix for task 12); BootScene new-game stand-in must be replaced in task 15 (noted); grass→battle verified in task 14; home heal / bad-JSON screen / BASE_URL / cooldown not browser-checked → home heal + bad data checked at the end-to-end pass, BASE_URL at `vite preview` in task 18. code — taps during warp fade (busy now set); stale retarget mid-step (plan from stepTarget; verified retarget in browser); localStorage access can throw (browserStore() fallback, tested); scene decision logic untested (→ disagree for now, thin glue over tested modules; browser-verified); tall-grass map without area (validateAreas now checks, tested); creatures.json network failure vs data error + missing images (separate messages, FILE_LOAD_ERROR); per-step saves (now on stop/warp/heal/encounter); dead GAME_WIDTH import. Fixed d6dfa5b. 187 tests.
- testing note: the browser pane is hidden during this session, so rAF is throttled. main.ts exposes `window.__game` in DEV only; checks step frames manually with a faked Date.now (Phaser tweens time themselves with Date.now).
- task 14: implemented (d15af9e). Added src/logic/battleText.ts (+8 tests) for all battle messages. Catch ball redrawn as a blue/yellow "buddy ball" with a heart: the first draft was red/white with a band, too close to Nintendo's Poké Ball. Browser-verified: grass encounter → Battle; intro slides wild in, "Go, Emberpup!"; menu (Fight/Catch/Swap greyed with 1 creature/Run); Fight → Bump/Spark type-colored; turn plays (spoken: "Emberpup used Bump!", "The wild Toastle used Flame Dash!"), HP bars animate; Catch → ball throw, wiggles, "Yay! You caught Toastle!" → tap → Overworld; save has party [emberpup, toastle 9/14], book toastle caught; survives reload.
