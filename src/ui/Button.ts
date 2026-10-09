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
  /** What shrinks when pressed. The button itself keeps its size, so its tap area never shrinks. */
  private face: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private enabled = true;
  /** True only between a press that started on this button and its release. */
  private pressed = false;
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
    this.face = scene.add.container(0, 0, [this.bg, icon]);
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
      this.face.add(label);
    }
    this.add(this.face);

    this.setSize(this.bw, this.bh);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.show(true);
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.show(false);
    });
    this.on('pointerup', () => {
      const wasPressed = this.pressed;
      this.pressed = false;
      this.show(false);
      if (this.enabled && wasPressed) opts.onTap();
    });
    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.pressed = false;
    this.show(false);
    this.setAlpha(enabled ? 1 : 0.4);
    return this;
  }

  private show(down: boolean): void {
    this.face.setScale(down ? 0.94 : 1);
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

/**
 * Keeps a UI object fixed on screen while the camera scrolls. Containers need
 * this on every descendant (Phaser's own option only goes one level deep).
 */
export function pinToScreen<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  const o = obj as unknown as Phaser.GameObjects.Components.ScrollFactor;
  if (typeof o.setScrollFactor === 'function') o.setScrollFactor(0, 0);
  if (obj instanceof Phaser.GameObjects.Container) obj.list.forEach((child) => pinToScreen(child));
  return obj;
}
