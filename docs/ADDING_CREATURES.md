# Adding the kids' own creatures

Every creature in VanMon is one entry in `public/data/creatures.json` plus one
picture in `public/creatures/`. Adding a new one needs no code.

## The easy way: ask Claude

1. Your child draws a creature, either:
   - **in the game:** tap 🎨, draw, optionally pick a type, and tap **✅ Done!**.
     Wait a few seconds for the yellow hint to fade, then take an iPad screenshot
     (top button + volume up; on an iPad with a Home button, top button + Home).
     The screenshot is in Photos, ready to send to you. The type shows as 🔥, 💧
     or 🍃 beside the drawing if one was picked; ask for anything else (name, where
     it lives, and the type if none shows); or
   - **on paper** (bold markers on white paper work best). Take a photo of it,
     straight on, in good light.
2. Give Claude the screenshot or photo and a few details:
   - **Name** (for example, "Sparkle Kitty")
   - **Type:** 🔥 fire, 💧 water, or 🍃 leaf
   - **Where it lives:** the Grassy Route, Sparkle Pond, or both
   - Optional: is it strong, tough, or speedy? Any move names your child made up?
3. Claude cleans up the drawing into a game picture, adds it to the game, runs
   the checks, and publishes it.

## Doing it by hand

First time only: install the tools with `npm install`.

> ⚠️ **Never change or remove an existing `id`.** Saved games remember creatures
> by their `id`, so renaming `sparkle-kitty` to `sparkly-kitty` would make every
> Sparkle Kitty the kids already caught disappear. To fix a spelling, change the
> `name` instead. The same goes for existing move ids.

### 1. Make the picture

- Crop the drawing to a **square**, with the creature filling most of it.
- Remove the background if you can (a transparent PNG looks best). A white background also works.
- Save it as a PNG of about **512×512**, named with lowercase letters and dashes, for example `sparkle-kitty.png`.
- Put it in `public/creatures/`.

### 2. Add the creature to `public/data/creatures.json`

Add an entry at the **end** of the `"species"` list. (The three starters are the
first fire, water and leaf creatures in the list, so a new creature put higher up
would replace a starter.)

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

- Normal: `bump`, `bonk`, `swipe`, `zoom-roll`, `tail-whirl`, `night-dash`
- Fire: `spark`, `flame-dash`, `ember-skate`
- Water: `splash-shot`, `bubble-pop`, `wave-dash`
- Leaf: `leaf-toss`, `vine-swing`, `leaf-twister`

To invent a new move, add it to the `"moves"` list at the top of the file:

```json
{ "id": "sparkle-swipe", "name": "Sparkle Swipe", "type": "fire", "power": 50 }
```

Keep `power` between 35 and 50 so battles stay gentle.

### 3. Check it

```bash
npm run build
```

This runs the same checks as the website deploy: the creature rules, the game
tests, and a check that every picture can be saved for offline play (pictures
must be under 8 MB; about 512×512 is plenty). If anything is wrong, it says
exactly what to fix, for example
`species "sparkle-kitty": needs one normal move and one fire move`.

### 4. Publish it

Commit and push to `main`. GitHub Actions runs the same checks and updates the
site in a minute or two. The iPads pick up the new version the next time VanMon
is opened. If it doesn't appear yet, close the app fully and open it again.

**If the deploy fails**, the site simply stays on the old version (nothing
breaks for the kids). You'll see a red ✗ next to the commit on GitHub, and
GitHub emails you. Open the **Actions** tab, click the failed run, then the
`npm run build` step: the message there says what to fix, just like step 3.

The new creature shows up in the tall grass of its area, and in the 📖 Creature
Book as ❓ until someone meets it.
