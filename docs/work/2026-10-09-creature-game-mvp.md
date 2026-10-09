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

## Tasks
- [x] 1. Scaffold: install Node, git init, Vite + TS + Phaser + Vitest, landscape
      FIT config (1024×768 logical), Boot scene showing "VanMon", smoke test.
      files: package.json, tsconfig.json, vite.config.ts, index.html, src/main.ts,
             src/scenes/BootScene.ts, src/logic/smoke.test.ts, .gitignore
      commits: [259bd4c, 91c3b46]
- [~] 2. Creature + move data model, JSON validation, create-instance-at-level;
      6 mock creatures in JSON.
      files: src/logic/creatures.ts, src/logic/creatures.test.ts, public/data/creatures.json
      commits: [1d48593, b262dc3]
- [~] 3. Mock creature art: 6 cute SVG blobs colored by type.
      files: public/creatures/*.svg
      commits: [a178afc]
- [ ] 4. Type chart + damage formula (injectable RNG).
      files: src/logic/damage.ts, src/logic/damage.test.ts
- [ ] 5. Battle engine (pure state machine): fight turn, wild random move,
      faint, run, swap; emits event list for the scene to play back.
      files: src/logic/battle.ts, src/logic/battle.test.ts
- [ ] 6. Catch logic in battle engine: wiggle count, HP-scaled chance, fail → wild turn.
      files: src/logic/catch.ts, src/logic/catch.test.ts, src/logic/battle.ts
- [ ] 7. XP + level-up (stat growth, cap at level 20).
      files: src/logic/xp.ts, src/logic/xp.test.ts
- [ ] 8. Game state: party (max 6), box, Book seen/caught, position, heal-all,
      send-home-on-loss.
      files: src/logic/gameState.ts, src/logic/gameState.test.ts
- [ ] 9. Save system: versioned serialize/load via localStorage, corrupt/unknown
      version → fresh + backup key, request persistent storage.
      files: src/logic/save.ts, src/logic/save.test.ts
- [ ] 10. Maps as ASCII data (town, route, pond) + parser + BFS tap-to-walk pathfinding.
      files: src/logic/map.ts, src/logic/map.test.ts, src/data/maps.ts
- [ ] 11. Encounter roll per area (chance per grass step, weighted species, level range).
      files: src/logic/encounters.ts, src/logic/encounters.test.ts, src/data/maps.ts
- [ ] 12. Read-aloud helper + DialogBox UI with speaker button + big Button UI.
      files: src/ui/speech.ts, src/ui/speech.test.ts, src/ui/DialogBox.ts, src/ui/Button.ts
- [ ] 13. Overworld scene: procedural tile textures, player sprite, tap-to-walk,
      map transitions, grass → battle, home bed heals, autosave.
      files: src/scenes/OverworldScene.ts, src/scenes/textures.ts, src/main.ts
- [ ] 14. Battle scene: plays back engine events, move buttons by type color,
      effectiveness text + read-aloud, catch wiggle animation, win/lose flows.
      files: src/scenes/BattleScene.ts, src/main.ts
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
