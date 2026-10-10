# Adding the kids' own creatures

Every creature in VanMon is one entry in `public/data/creatures.json` plus one
picture in `public/creatures/`. Adding a new one needs no code.

## The easy way: ask Claude

1. Your child draws a creature on paper (bold markers on white paper work best).
2. Take a photo of it, straight on, in good light.
3. Give Claude the photo and a few details:
   - **Name** (for example, "Sparkle Kitty")
   - **Type:** 🔥 fire, 💧 water, or 🍃 leaf
   - **Where it lives:** the Grassy Route, Sparkle Pond, or both
   - Optional: is it strong, tough, or speedy? Any move names your child made up?
4. Claude cleans up the drawing into a game picture, adds it to the game, runs
   the checks, and publishes it.

## Doing it by hand

### 1. Make the picture

- Crop the drawing to a **square**, with the creature filling most of it.
- Remove the background if you can (a transparent PNG looks best). A white background also works.
- Save it as a PNG of about **512×512**, named with lowercase letters and dashes, for example `sparkle-kitty.png`.
- Put it in `public/creatures/`.

### 2. Add the creature to `public/data/creatures.json`

Add an entry to the `"species"` list:

```json
{
  "id": "sparkle-kitty",
  "name": "Sparkle Kitty",
  "type": "fire",
  "image": "sparkle-kitty.png",
  "baseStats": { "hp": 50, "attack": 55, "defense": 45 },
  "moves": ["swipe", "spark"],
  "areas": ["route"]
}
```

| Field | What to put |
|---|---|
| `id` | Lowercase letters, numbers and dashes. Must be unique. |
| `name` | What the game shows and reads aloud. |
| `type` | `fire`, `water`, or `leaf`. |
| `image` | The file name from step 1 (must match exactly, including capital letters). |
| `baseStats` | Whole numbers. Around 40–65 keeps things fair; higher is stronger. |
| `moves` | Exactly two: one **normal** move and one move of the creature's own type. |
| `areas` | `"route"`, `"pond"`, or both. Leave the line out to have it appear everywhere. |

Moves you can use today:

- Normal: `bump`, `bonk`, `swipe`
- Fire: `spark`, `flame-dash`
- Water: `splash-shot`, `bubble-pop`
- Leaf: `leaf-toss`, `vine-swing`

To invent a new move, add it to the `"moves"` list at the top of the file:

```json
{ "id": "sparkle-swipe", "name": "Sparkle Swipe", "type": "fire", "power": 50 }
```

Keep `power` between 35 and 50 so battles stay gentle.

### 3. Check it

```bash
npm test
```

If anything is wrong, the test says exactly what to fix (for example,
`species "sparkle-kitty": needs one normal move and one fire move`). The game
shows the same kind of message on screen if a broken file ever gets published.

### 4. Publish it

Commit and push to `main`. GitHub Actions runs the tests and updates the site
in a minute or two. The iPads pick up the new version the next time VanMon is
opened. If it doesn't appear yet, close the app fully and open it again.

The new creature shows up in the tall grass of its area, and in the 📖 Creature
Book as ❓ until someone meets it.
