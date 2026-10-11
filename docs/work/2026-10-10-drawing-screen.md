---
status: approved
base: 6c6cdfb
rigor:
  tests: tdd
  review: spec+code
  review_at: per-task
  rereview: always
  execution: inline
  triggers_fired: [serialization shape]
---

# In-game drawing screen for kid-made creatures

## Intent
- **Problem:** The kids want to invent creatures inside the game. Today a new
  creature needs a paper drawing, a photo, and a grown-up at a computer.
- **Behavior change:** A drawing screen in VanMon where a kid draws a creature
  with a finger. They take an iPad screenshot and send it to the parent, who adds
  it the usual way (docs/ADDING_CREATURES.md).
- **Out of scope:** Any server or in-game upload. Drawn creatures appearing in
  the game on their own (instant play). Changing the save format.
- **Decisions:**
  - Opened from a 🎨 button shown alongside 🎒 Team and 📖 Book while walking.
    Never during battles.
  - Tools: about 8 crayon colors, thin and thick brushes, eraser, undo, and a
    fill bucket. Clear is hold-to-clear, like "Hold for New".
  - Pick a type by tapping 🔥 / 💧 / 🍃. This is optional, and there is no name or area.
  - A "Done!" button shows a clean view: only the drawing and its type emoji.
    The kid takes the screenshot with the iPad's own buttons. Tapping anywhere
    goes back to drawing.
  - Only the latest drawing is kept on that iPad. It survives leaving the screen and closing
    the app, until Clear. It is stored separately from the saved game.
  - Instructions can be read aloud with 🔊, like the rest of the game.
- **Done when:**
  - From the overworld, 🎨 opens the drawing screen. Its back button returns to the
    same spot, and the button is not reachable during a battle.
  - Finger strokes draw in the chosen color and size. The eraser removes them.
    Undo steps back one stroke or fill at a time.
  - The fill bucket fills the tapped enclosed area, and only that area
    (unit-tested on pixel data).
  - Holding Clear until the bar fills empties the canvas. A short tap does nothing.
  - "Done!" shows only the drawing and type emoji, filling most of the screen.
    One tap returns to drawing with tools intact.
  - Leaving and reopening the screen, or relaunching the app, restores the
    latest drawing and type. A missing or corrupt stored drawing starts a blank
    canvas and never breaks the game or the saved game.
  - Saved-game behavior, the save format, and the existing scenes are unchanged.
    `npm run build` passes.

## Open Questions
- [x] Screenshot method → iPad buttons plus a clean "Done!" view. No in-game 📸.
- [x] Details on the drawing → type only (🔥/💧/🍃). No name or area.
- [x] Kept? → the latest drawing only, until Clear.
- [x] Opened from → 🎨 next to Team/Book while walking. Not in battles.
- [x] Clean view exit → tap anywhere.
- [x] Screenshot hint → yes. On Done!, show and speak "Take a picture! Press
      the top button and volume up together", then fade it out. Undo history is
      20 steps and is not kept across app restarts. Undo can't bring back a Clear.

## Unknowns
- [x] How do the HUD buttons open menus, and how are they blocked in battle?
      → `drawHud()` builds 🎒/📖 (and 📦 on home maps) as pinned `BigButton`s,
      `OverworldScene.ts:94-110`. A tap is ignored if `busy` or a menu is
      pending, `:104`. Mid-step taps queue `pendingMenu`, which opens after the step, `:106-107,137`.
      `openMenu` launches the scene and pauses the Overworld, `menuBase.ts:31-34`.
      ❌ `close()` saves, stops the menu, and resumes the Overworld, `menuBase.ts:19,23-27`. RESUME
      clears `busy`, `OverworldScene.ts:49`. A battle replaces the Overworld scene
      (`scene.start('Battle')`, `:198-202`), so the HUD isn't there in battle.
- [x] How does the saved game use storage?
      → localStorage keys `vanmon.save` and `vanmon.save.backup`, `save.ts:12-13`. The
      `KeyValueStore` interface lets tests pass a fake store, `save.ts:25-30`. `browserStore()`
      falls back to an in-memory Map, `save.ts:33-49`, and is built in `BootScene.ts:63`.
      A throwing `setItem` is caught, `save.ts:71-78`.
- [x] What APIs exist for 🔊, buttons, and hold-to-confirm?
      → `speaker.say(text)` comes from `ui/speech.ts:75`. A 🔊 button is a plain `BigButton`
      with `onTap: () => speaker.say(...)`, `DialogBox.ts:42-48`. `BigButton(scene,x,y,
      {icon,label?,color,width?,height?,onTap})`, `Button.ts:21-41`, and `pinToScreen`, `:115`.
      `HoldButton` has the same constructor and fires `onTap` after a 1500 ms hold,
      `HoldButton.ts:8-18`. Title screen usage: `TitleScene.ts:52-59`.
- [x] What is the game config, and what can tests do?
      → `Phaser.AUTO`, 1024×768, `Scale.FIT`, 2 pointers, `main.ts:19-31`, `config.ts:2-3`.
      Scene list at `main.ts:30`. Landscape only, via `rotatePrompt.ts` and the manifest.
      Vitest runs in a `node` environment, `vite.config.ts:40-42`. All tests are pure logic
      (no canvas or Phaser), so fill, undo and storage must be pure functions over arrays or
      strings.

## Design notes
- The drawing is a 512×512 offscreen `<canvas>` (the creature art size) shown
  through a Phaser canvas texture. Strokes use the 2D context with round caps.
  The eraser paints white.
- Fill is a pure function over `Uint8ClampedArray` RGBA with a small color
  tolerance, so it fills up to anti-aliased crayon edges.
- Undo keeps up to 20 `ImageData` snapshots in memory, not stored. The canvas
  must stay a fixed 512×512, never scaled by devicePixelRatio, so 20 snapshots
  use about 20 MB. A full-screen or retina canvas would be 60–250 MB and could crash iPad Safari.
- Storage uses its own key `vanmon.drawing`: `{ v: 1, type: 'fire'|'water'|'leaf'|null,
  png: 'data:image/png;base64,...' }`. It goes through the existing `KeyValueStore`.
  Never touches `vanmon.save`. Bad or missing data gives a blank canvas, and a failed write gives a
  console warning only.

## Tasks
- [x] 1. Flood fill: `floodFill(pixels, width, height, x, y, rgba, tolerance)`
      fills the connected same-color region only. It does nothing if the tap is out of
      bounds or already that color.
      files: src/logic/fill.ts, src/logic/fill.test.ts
      commits: [f9f3002, 043e17c]
- [x] 2. Bounded undo history: push/undo, capped at 20 (oldest dropped). Undo
      on empty returns nothing.
      files: src/logic/undo.ts, src/logic/undo.test.ts
      commits: [9d929e1, c16a594]
- [x] 3. Drawing storage: save/load the latest `{type, png}` under
      `vanmon.drawing` through a `KeyValueStore`. It tolerates missing, corrupt,
      wrong-version and throwing stores, and has a clear() function.
      files: src/logic/drawingStore.ts, src/logic/drawingStore.test.ts
      commits: [5f02e59, 48d36eb]
- [x] 4. DrawScene basics: a canvas you can draw on with a finger, 8 crayon colors,
      thin and thick brushes, eraser, and ❌ close back to the Overworld via `menuBase`.
      It restores and saves the drawing via task 3. Registered in `main.ts`.
      files: src/scenes/DrawScene.ts, src/main.ts
      commits: [f1e3f08, e2e777a]
- [x] 5. 🎨 HUD button opens DrawScene with the same guards as 🎒/📖.
      files: src/scenes/OverworldScene.ts
      commits: [3c734f9]
- [~] 6. Fill bucket and Undo in DrawScene (using tasks 1 and 2). Hold-to-clear
      with `HoldButton` clears the canvas and the stored drawing.
      files: src/scenes/DrawScene.ts
- [ ] 7. Type picker (🔥/💧/🍃, tap again to unset, stored), and the "Done!" clean
      view: only the drawing and type, with the spoken and fading screenshot hint. Tap
      anywhere to return. 🔊 on the drawing screen reads its instructions.
      files: src/scenes/DrawScene.ts
- [ ] 8. Docs: a 🎨 line in README "How to play". ADDING_CREATURES gets a
      "from an in-game drawing (screenshot)" route.
      files: README.md, docs/ADDING_CREATURES.md

## Log
- 2026-10-10: work file created (draft).
- 2026-10-10: approved by user ("Works for me"), with the proposed screenshot-hint and undo defaults.
- task 1: implemented, 8 tests pass. Uses 4-way connections and a visited map so a near-matching fill color still finishes.
- task 1 review: spec pass. Code review had 5 findings: (1) edge-wrap guard untested, (2) tolerance boundary untested, (3) fractional/out-of-range color broke the "already that color" check. All three fixed in 043e17c. (4) A regression that drops `visited` would hang rather than fail: accepted, since it's still caught. (5) Trigger not applicable to this task, as it covers the storage in task 3. Re-review pass.
- task 2: implemented, 5 tests pass.
- task 2 review: spec flagged `clear()`/`canUndo` as extra API. Disagree: they're needed for "Undo can't bring back a Clear" and for greying out Undo, and both are in the task's files. Code review findings:
  - (1) Snapshot memory → canvas size pinned at 512×512 in the design notes.
  - (2) Unvalidated `limit` → not fixed; only the default is used.
  - (3) Mixed and after-clear tests missing → added in c16a594.
  - (4) Trigger not applicable here.
  Re-review pass.
- task 3: implemented, 8 tests pass. Added a 1.5 MB size cap so a drawing can't use up the quota the saved game needs. An unknown type is dropped but the picture is kept.
- task 3 review, spec findings:
  - (1) Console warning on a failed write → the scene's job. Task 4 must `console.warn` when saveDrawing returns false.
  - (2) Size cap is a new product decision → kept. It protects the saved game, and a crayon drawing is far under it. Tell the user at the end.
  - (3) Unknown type keeps the picture → kept on purpose. Losing a kid's art over a type tag is worse than dropping the tag.
- task 3 review, code findings:
  - Fixed in 48d36eb: (1) save now validates the PNG like load does; (3) load-side cap test; (4) stored-shape test; (5) boundary test; (6) cap lowered to 1,000,000 chars, about 2 MB worst case under UTF-16.
  - (2) A failed save leaves the older drawing in storage → accepted. An older picture beats a blank one, and the canvas on screen still has the new one.
  - (7) Junk left in storage on a failed load → accepted. The first stroke overwrites it, and deleting a wrong-version entry would destroy a newer game's drawing.
  - Re-review pass.
- task 4: implemented. Checked in the browser pane: thick black, thin red and eraser strokes draw. The drawing is stored (16 KB) and restored after a page reload. A corrupt stored value gives a blank canvas with no console errors. ❌ close not yet exercised from the overworld; that comes in task 5. The canvas texture is kept between visits so returning is instant. The store is a module-level `browserStore()`, because session's store is private and session.ts is outside this task.
- task 4 review, spec findings:
  - (1) ❌ also writes the saved game through MenuScene.close → accepted. All menus do this, and the state is unchanged.
  - (2) `keep()` hard-codes `type: null` → task 7 must carry the chosen type into `keep()` and restore it.
  - (3) The onerror path was untested → now warns. Browser check: an undecodable PNG gives a blank canvas plus a warning.
  - (4) ❌ return and reopening in-session not yet checked → verify in task 5.
- task 4 review, code findings: all fixed in e2e777a. The restore race moved to module scope, closing mid-stroke now saves on SHUTDOWN, onerror warns, refresh happens once per frame in update(), and the blanket input.off was removed. Re-review pass.
- Browser pane note: when the pane is hidden, rAF stops. Step frames with `__game.loop.step(performance.now())`.
- task 5: implemented. Added 🎨 to the HUD list, so it shares the busy/pendingMenu guards. Browser check: 🎨 opens Draw over the paused Overworld. A stroke, then ❌, returns to the same spot in Home Town. Reopening shows the stroke (in-session texture reuse). No console errors.
- task 5 review: code pass. Spec findings:
  - (1) The mid-step and battle paths were untested → browser check: tapping 🎨 mid-walk queues `pendingMenu='Draw'` and opens it after the step. Battles replace the Overworld scene, so there's no HUD in battle.
  - (2) 📦 Box moves one slot left in Home Town → kept. With 🎨 third, 🎒/📖/🎨 sit in the same spot on every map and only the home-only Box is added at the end. Putting 🎨 last would make 🎨 jump between maps. Mention to the user.
- task 6: implemented. The undo history lives at module level next to the texture, so it survives close and reopen. Fill tolerance is 48. Picking a color switches from the eraser back to the crayon but keeps the fill bucket. Browser check:
  - A short tap on Clear changes nothing.
  - A 2 s hold blanks the canvas, removes `vanmon.drawing` and disables Undo.
  - Drew a closed box, red fill inside: 59,415 red pixels, outside untouched.
  - Undo removed the fill: 0 red pixels, box intact.
