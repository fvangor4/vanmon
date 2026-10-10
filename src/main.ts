import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BattleScene } from './scenes/BattleScene';
import { BookScene } from './scenes/BookScene';
import { BootScene } from './scenes/BootScene';
import { BoxScene } from './scenes/BoxScene';
import { PartyScene } from './scenes/PartyScene';
import { OverworldScene } from './scenes/OverworldScene';
import { StarterScene } from './scenes/StarterScene';
import { TitleScene } from './scenes/TitleScene';
import { startUpdates } from './pwa';
import { watchOrientation } from './ui/rotatePrompt';
import { unlockSpeechOnFirstTouch } from './ui/speech';

unlockSpeechOnFirstTouch(document);
watchOrientation(document.getElementById('rotate')!);
if (import.meta.env.PROD) startUpdates();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b3a',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, TitleScene, StarterScene, OverworldScene, BattleScene, PartyScene, BoxScene, BookScene],
});

// Dev only: lets automated checks drive the game (e.g. step frames while the tab is hidden).
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
