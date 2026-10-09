// "Pick your buddy!": tap one of three creatures, then tap ✅ to choose it.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { createCreature, type SpeciesDef } from '../logic/creatures';
import { newGame } from '../logic/gameState';
import { pickStarters } from '../logic/starters';
import { TYPE_ICON } from '../logic/battleText';
import { creatureTexture, Session, setSession, type BootResult } from '../session';
import { BigButton, COLORS, FONT } from '../ui/Button';
import { speaker } from '../ui/speech';

const STARTER_LEVEL = 5;

export class StarterScene extends Phaser.Scene {
  private chosen: SpeciesDef | null = null;
  private confirm: Phaser.GameObjects.GameObject[] = [];
  private highlight!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Starter');
  }

  create(): void {
    this.chosen = null;
    this.confirm = [];
    const boot = this.registry.get('boot') as BootResult;
    const g = this.add.graphics();
    g.fillGradientStyle(0xfff3c4, 0xfff3c4, 0xc9f0a6, 0xc9f0a6).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add
      .text(GAME_WIDTH / 2, 80, 'Pick your buddy!', { fontFamily: FONT, fontSize: '64px', fontStyle: 'bold', color: '#1d2b3a' })
      .setOrigin(0.5);

    this.highlight = this.add.graphics();
    const starters = pickStarters(boot.data);
    starters.forEach((s, i) => {
      const x = GAME_WIDTH / 2 + (i - (starters.length - 1) / 2) * 320;
      const card = this.add.graphics();
      card.fillStyle(COLORS[s.type], 0.25).fillRoundedRect(x - 140, 170, 280, 340, 32);
      const img = this.add.image(x, 320, creatureTexture(s.id)).setDisplaySize(230, 230).setInteractive({ useHandCursor: true });
      this.add
        .text(x, 470, `${TYPE_ICON[s.type]} ${s.name}`, { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#1d2b3a' })
        .setOrigin(0.5);
      img.on('pointerup', () => this.select(s, img, x, boot));
    });
  }

  private select(s: SpeciesDef, img: Phaser.GameObjects.Image, x: number, boot: BootResult): void {
    this.chosen = s;
    this.highlight.clear().lineStyle(10, COLORS.sunny, 1).strokeRoundedRect(x - 146, 164, 292, 352, 36);
    speaker.say(`${s.name}?`);
    this.tweens.add({ targets: img, y: img.y - 30, yoyo: true, duration: 180 });
    this.confirm.forEach((o) => o.destroy());
    this.confirm = [
      new BigButton(this, GAME_WIDTH / 2 - 150, 640, { icon: '✅', label: 'Yes!', color: COLORS.go, width: 260, height: 100, onTap: () => this.start(boot) }),
      new BigButton(this, GAME_WIDTH / 2 + 150, 640, {
        icon: '❌',
        label: 'No',
        color: COLORS.normal,
        width: 260,
        height: 100,
        onTap: () => {
          this.chosen = null;
          this.highlight.clear();
          this.confirm.forEach((o) => o.destroy());
          this.confirm = [];
        },
      }),
    ];
  }

  private start(boot: BootResult): void {
    if (!this.chosen) return;
    const s = new Session(boot.data, newGame(createCreature(this.chosen, STARTER_LEVEL)), boot.store);
    s.canSave = !boot.loaded.protectSave;
    setSession(s);
    s.save();
    speaker.say(`You and ${this.chosen.name} are going on an adventure!`);
    this.scene.start('Overworld');
  }
}
