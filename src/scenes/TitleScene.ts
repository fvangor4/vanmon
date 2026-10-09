// Title: "Play" continues the saved game; "New Game" starts over (press and
// hold when a save exists). The first tap here also lets iOS speak aloud.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pickStarters } from '../logic/starters';
import { creatureTexture, Session, setSession, type BootResult } from '../session';
import { BigButton, COLORS, FONT } from '../ui/Button';
import { HoldButton } from '../ui/HoldButton';
import { speaker } from '../ui/speech';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const boot = this.registry.get('boot') as BootResult;
    const g = this.add.graphics();
    g.fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xc9f0a6, 0xc9f0a6).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const logo = this.add
      .text(GAME_WIDTH / 2, 150, 'VanMon', {
        fontFamily: FONT,
        fontSize: '140px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#1d2b3a',
        strokeThickness: 14,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: logo, scale: 1.05, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });

    pickStarters(boot.data).forEach((s, i) => {
      const img = this.add.image(GAME_WIDTH / 2 + (i - 1) * 260, 380, creatureTexture(s.id)).setDisplaySize(190, 190);
      this.tweens.add({ targets: img, y: 360, yoyo: true, repeat: -1, duration: 600 + i * 120, ease: 'Sine.InOut' });
    });

    const hasSave = boot.loaded.state !== null;
    if (hasSave) {
      new BigButton(this, GAME_WIDTH / 2, 560, {
        icon: '▶️',
        label: 'Play',
        color: COLORS.go,
        width: 460,
        height: 110,
        onTap: () => this.continueGame(boot),
      });
      new HoldButton(this, GAME_WIDTH / 2, 690, {
        icon: '✨',
        label: 'Hold for New',
        color: COLORS.normal,
        width: 460,
        height: 84,
        onTap: () => this.newGame(),
      });
    } else {
      new BigButton(this, GAME_WIDTH / 2, 600, {
        icon: '✨',
        label: 'New Game',
        color: COLORS.go,
        width: 460,
        height: 110,
        onTap: () => this.newGame(),
      });
    }
  }

  private continueGame(boot: BootResult): void {
    speaker.say("Let's go!");
    const s = new Session(boot.data, boot.loaded.state!, boot.store);
    s.canSave = !boot.loaded.protectSave;
    setSession(s);
    this.scene.start('Overworld');
  }

  private newGame(): void {
    speaker.say('Pick your buddy!');
    this.scene.start('Starter');
  }
}
