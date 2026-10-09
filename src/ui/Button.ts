// A big, friendly button: emoji icon + short word, sized for small fingers.
// Every button has an icon and a color so nothing *requires* reading.

import Phaser from 'phaser';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const COLORS = {
  fire: 0xf26b3a,
  water: 0x3b8fe0,
  leaf: 0x4caf50,
  normal: 0x9e9e9e,
  go: 0x4caf50,
  stop: 0xe05252,
  sunny: 0xffc83d,
  sky: 0x5bb8ff,
  panel: 0xfffbea,
  ink: 0x1d2b3a,
} as const;

export interface ButtonOptions {
  icon: string;
  label?: string;
  color: number;
  width?: number;
  height?: number;
  onTap: () => void;
}

export class BigButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private enabled = true;
  private readonly bw: number;
  private readonly bh: number;
  private readonly fill: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    this.bw = opts.width ?? 220;
    this.bh = opts.height ?? 96;
    this.fill = opts.color;

    this.bg = scene.add.graphics();
    this.draw(false);
    const hasLabel = Boolean(opts.label);
    const icon = scene.add
      .text(hasLabel ? -this.bw / 2 + 48 : 0, 0, opts.icon, { fontFamily: FONT, fontSize: `${Math.round(this.bh * 0.45)}px` })
      .setOrigin(0.5);
    this.add([this.bg, icon]);
    if (hasLabel) {
      const label = scene.add
        .text(-this.bw / 2 + 88, 0, opts.label!, {
          fontFamily: FONT,
          fontSize: `${Math.round(this.bh * 0.3)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#00000055',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5);
      this.add(label);
    }

    this.setSize(this.bw, this.bh);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => this.enabled && this.press(true));
    this.on('pointerout', () => this.press(false));
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.press(false);
      opts.onTap();
    });
    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.4);
    return this;
  }

  private press(down: boolean): void {
    this.setScale(down ? 0.94 : 1);
    this.draw(down);
  }

  private draw(down: boolean): void {
    const { bw: w, bh: h } = this;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2, -h / 2 + (down ? 2 : 6), w, h, 24);
    this.bg.fillStyle(this.fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    this.bg.lineStyle(4, 0xffffff, 0.6).strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 22);
  }
}
