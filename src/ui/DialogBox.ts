// The message box at the bottom of the screen. Short text, a speaker button
// that reads it aloud, and "tap to continue".

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { BigButton, COLORS, FONT } from './Button';
import { speaker } from './speech';

const BOX_W = GAME_WIDTH - 48;
const BOX_H = 170;

export class DialogBox extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private current = '';
  private resolve: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT - BOX_H / 2 - 20);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.25).fillRoundedRect(-BOX_W / 2, -BOX_H / 2 + 6, BOX_W, BOX_H, 28);
    bg.fillStyle(COLORS.panel, 1).fillRoundedRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 28);
    bg.lineStyle(6, COLORS.ink, 1).strokeRoundedRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 28);

    this.text = scene.add.text(-BOX_W / 2 + 36, -BOX_H / 2 + 28, '', {
      fontFamily: FONT,
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#1d2b3a',
      wordWrap: { width: BOX_W - 200 },
      lineSpacing: 6,
    });
    this.arrow = scene.add.text(BOX_W / 2 - 150, BOX_H / 2 - 52, '▶', { fontFamily: FONT, fontSize: '36px', color: '#1d2b3a' });
    scene.tweens.add({ targets: this.arrow, x: '+=10', yoyo: true, repeat: -1, duration: 400 });

    const speak = new BigButton(scene, BOX_W / 2 - 70, 0, {
      icon: '🔊',
      color: COLORS.sky,
      width: 100,
      height: 100,
      onTap: () => speaker.say(this.current),
    });
    // The speaker sits inside the box; stop its tap from also closing the box.
    speak.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());

    this.add([bg, this.text, this.arrow, speak]);
    this.setSize(BOX_W, BOX_H);
    this.setInteractive();
    this.on('pointerup', () => this.finish());
    this.setDepth(1000).setVisible(false);
    scene.add.existing(this);
  }

  /** Shows a message and resolves when the player taps the box. */
  show(text: string, opts: { speak?: boolean; waitForTap?: boolean } = {}): Promise<void> {
    this.finish();
    this.current = text;
    this.text.setText(text);
    this.arrow.setVisible(opts.waitForTap !== false);
    this.setVisible(true);
    if (opts.speak) speaker.say(text);
    if (opts.waitForTap === false) return Promise.resolve();
    return new Promise((resolve) => (this.resolve = resolve));
  }

  hide(): void {
    this.finish();
    this.setVisible(false);
  }

  private finish(): void {
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }
}
