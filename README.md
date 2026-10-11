# VanMon

A creature-catching adventure made for two young explorers (ages 5 and 7) to play
on their iPads. Walk through the tall grass, meet wild creatures, pick the move
that beats their color, and catch them for your team. Every message can be read
aloud with the 🔊 button, so you don't need to be able to read to play.

**Play:** https://fvangor4.github.io/vanmon/

## Put it on an iPad

1. Open the link above in **Safari** (not Chrome) on the iPad.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open VanMon from its new icon. It runs full-screen and works offline after the first launch.

Always play from the Home Screen icon. Safari and the Home Screen app keep
**separate** saved games on iPad, so progress made in a Safari tab won't carry over.

Each iPad keeps its own saved game. New versions (like a newly added creature)
download in the background and switch in at the title screen; if one doesn't show
up, close VanMon fully and open it again. To start over, hold **Hold for New** on the
title screen until the bar fills up. The old game is kept in a backup.

## How to play

- **Walk:** tap anywhere and your character walks there.
- **Tall grass:** this is where wild creatures hide.
- **Battles:** 🔥 beats 🍃, 🍃 beats 💧, 💧 beats 🔥. Use ⚔️ Fight, 🎯 Catch, 🔄 Swap or 🏃 Run.
- **Getting tired:** if your creature gets sleepy, everyone goes home for a nap. Nothing is lost.
- **✨ The Gold Kid** stands next to home in Home Town. Tap them to answer three
  addition questions, then battle their Super Shadehog. Beat them once to win a
  Super Shadehog of your own (it never appears in the grass). Lose, and everyone is
  healed right there so you can try again.
- **Home:** step on your front door to heal everyone. The 📦 Box button (in Home Town) lets you change who is on your team.
- **🎒 Team** picks who goes first. **📖 Book** shows every creature you've met.
- **🎨 Draw** a new creature with your finger. You can tap 🔥, 💧 or 🍃 to pick its type.
  Tap **✅ Done!**, wait for the yellow hint to disappear, then take a screenshot
  (top button + volume up; on an iPad with a Home button, top button + Home) to send
  to a grown-up. Tap the picture to go back to drawing. Your latest drawing stays
  until you hold **🗑️ Clear**.

## Adding the kids' own creatures

See [docs/ADDING_CREATURES.md](docs/ADDING_CREATURES.md).

## For grown-ups who code

```bash
npm install
npm run dev      # play at http://localhost:5173 (and on the iPad via your Mac's IP)
npm test         # game rules, saves, maps, creature data
npm run build    # tests + production build into dist/
npm run preview  # try the production build at http://localhost:4173/vanmon/
```

Built with [Phaser 3](https://phaser.io), TypeScript and Vite. Game rules live in
`src/logic/` (all tested); screens live in `src/scenes/`. Pushing to `main`
deploys automatically with GitHub Actions (Node 24+). One-time setup: the GitHub
repo must be named `vanmon` (to match the `/vanmon/` base in `vite.config.ts`), and
**Settings → Pages → Source** must be set to **GitHub Actions**.
