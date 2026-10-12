---
name: add-creature
description: Add a kid-drawn creature to VanMon from a drawing (in-game 🎨 screenshot or paper photo), from picture to live site. Use whenever the user shares a creature drawing, says a kid drew something for the game, or asks to add a new creature or a shiny version of an existing one. This is the whole workflow for creature additions that need no game-code change (no docs/work file, no plan approval, no review subagent).
---

# Add a creature

VanMon is played by two kids (5 and 7) on iPads, and the site is public. A new
creature is one SVG in `public/creatures/` plus one entry at the end of the species
list in `public/data/creatures.json`. No code changes.
`docs/ADDING_CREATURES.md` is the human guide: it has the field table and the list
of moves that exist. Read it instead of guessing.

**Only one stop:** the check-in in step 6. Don't ask anything else unless a fact is
missing in step 1.

## 0. Is it really just a creature?

If the request needs game code, this skill doesn't cover it. Examples: a new type, a
new species field, a new area, an NPC, a sparkle effect. Use the normal
dev-workflow instead.

## 1. Gather the facts

From the screenshot, the type shows as 🔥/💧/🍃 beside the drawing (if the kid picked
one). Ask about anything still missing in **one** AskUserQuestion batch, with the
default marked (Recommended):

| Fact | Default |
|---|---|
| Name | What the user called it |
| Type | The emoji on the screenshot; for a shiny, the original's type |
| Where it lives: any of `route` (Grassy Route), `pond` (Sparkle Pond), `valley` (Alien Valley: the TV-show alien heroes, and nobody else) | A shiny lives where the original lives |
| Rare (`"rare": true`, half as likely) | Shinies are rare; other creatures aren't |

Then decide these yourself, without asking:
- **id:** lowercase-with-dashes from the name. Never reuse, rename or remove an
  existing id or move id: saves reference them, and caught creatures would vanish.
- **Stats:** a shiny copies the original. Otherwise aim for a total near 150, with
  each stat between 40 and 65, tilted by any hint ("strong" → attack, "tough" →
  defense).
- **Moves:** exactly one normal move and one move of its own type, from the guide's
  list. A shiny copies the original's moves. Only add a new move if the kid named
  one (power 35–50).
- **No franchise names in the repo.** If the kid names a character from a game or
  show (Pokémon, Sonic, …), use a VanMon-style name instead, and never write the
  real name in any repo file, commit message or test.

## 2. Draw the picture

`public/creatures/<id>.svg`, house style:
- Root `<svg xmlns=… viewBox="0 0 256 256" width="256" height="256">`. The art test
  needs the explicit width and height.
- Transparent background. Each shape gets an outline in a darker shade of its own
  colour.
- Big friendly eyes: reuse the `<g id="face">` group from an existing SVG unless the
  drawing's face is distinctive.
- Keep what makes the kid's drawing theirs: its colours, marks, stripes, and odd
  extra parts. Tidy the drawing up; don't redesign it.
- **Shiny recipe:** copy the original SVG, swap its colours for the drawing's, and add
  the three gold twinkles from `shiny-zoomhog.svg` (its last `<path>`s). Move a
  twinkle if it overlaps a spike or tail tip.

Check it at 340 px before going on. Render the original and the new picture side by
side:

```bash
qlmanage -t -s 340 -o <scratchpad> public/creatures/<id>.svg
```

Then Read the PNG it writes. Compare it to the drawing, and fix anything that reads
wrong (a stripe that looks like a mouth, a twinkle on a quill).

## 3. Add the entry

Append it at the **end** of `"species"`. Starters are the first fire, water and
leaf creatures in the list, so putting it higher up would change the starters.
Copy the formatting of the entry above it. Add `"rare": true` only for a rare
creature.

## 4. Build

```bash
npm run build
```

This runs the type check, every test (including that the picture exists, every
creature's types, moves and areas are valid, and the starters are unchanged), the
production build, and the offline-cache check. Don't add a per-creature test; these
checks cover it.

## 5. Play it in the preview

Start the `vanmon-dev` launch config. If another chat already holds port 5173, use
`vanmon-dev-alt` (port 5174). The alt config's save lives on its own origin, so it's
usually empty. Either way, before anything else, copy `localStorage['vanmon.save']`
into sessionStorage, and restore it at the end.

1. From the title screen, tap through **New Game** (or Play) → pick a starter → **Yes!**.
   A hidden pane throttles frames, so wait with
   `await new Promise(r => setTimeout(r, 4000))` in javascript_tool rather than
   screenshotting repeatedly.
2. Force a meeting with the new creature through the real encounter code:
   ```js
   const s = (await import('/src/session.ts')).session();
   s.state = { ...s.state, position: { map: '<area>', x: 1, y: 1 } };
   __game.scene.getScene('Overworld').scene.restart();
   await new Promise(r => setTimeout(r, 1500));
   const orig = s.rng, q = [0.01, PICK, 0];   // chance, species pick, level
   s.rng = () => (q.length ? q.shift() : orig());
   s.stepsSinceBattle = 10;
   __game.scene.getScene('Overworld').grassStep();
   await new Promise(r => setTimeout(r, 3000)); s.rng = orig;
   __game.scene.getScene('Battle').battle.wild.speciesId
   ```
   To find `PICK`, list the area's pool: the species whose `areas` include it, or that
   have no `areas` and aren't `wild: false`, in file order. Each one weighs 1, or 0.5
   if rare. `PICK` = (the weight before the new creature + half its own weight) ÷ the
   total weight.
3. Screenshot the battle, and check that the picture looks right at battle size. Tap
   **Fight** (≈210,463) and then the first move (same spot). Then check that both
   creatures' HP went down (`battle.wild.hp`, `battle.party[0].hp`). Then tap **Run**
   (≈588,545), and tap the dialog (≈350,515).
4. Run `__game.scene.getScene('Overworld').scene.start('Book')`, then tap ▶ (≈470,537)
   until you see the new creature as a seen silhouette. The page title shows `n/<total>`.
5. Restore the save, and stop the server.

## 6. Check in (the one stop)

Send the user the rendered picture next to the kid's drawing, or the battle
screenshot (SendUserFile), plus a short table: name, type, where it lives, rare,
stats, moves. Say what passed. Wait for a go-ahead ("send", "yes"). Make any changes
they ask for, then show it again.

## 7. Publish

One commit with the SVG and the JSON entry, message `<Name>: kid-drawn <type>
creature at <area>` (plus any attribution lines the session requires). Push to
`main`. Then:

```bash
gh run watch <run id> --exit-status
```

```bash
curl -s https://fvangor4.github.io/vanmon/data/creatures.json | grep -c '"<id>"'
```

Tell the user it's live, and that the iPads pick it up the next time VanMon is
opened (close the app fully if it doesn't appear).
