// A button you must press and hold (a ring fills up) before it acts.
// Used for "New Game" when a save exists.

import Phaser from 'phaser';
import { BigButton, COLORS, type ButtonOptions } from './Button';
import { HoldTracker } from './hold';

const HOLD_MS = 1500;

export class HoldButton extends BigButton {
  private ring: Phaser.GameObjects.Graphics;
  private tracker = new HoldTracker(HOLD_MS);
  /** Time this button has been on screen, from frame deltas (steady even if the page lagged). */
  private clock = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    // Taps alone do nothing; only a completed hold calls onTap.
    super(scene, x, y, { ...opts, onTap: () => {} });
    const w = opts.width ?? 220;
    const h = opts.height ?? 96;
    this.ring = scene.add.graphics();
    this.add(this.ring);

    this.on('pointerdown', () => this.tracker.press(this.clock));
    this.on('pointerup', () => this.reset());
    this.on('pointerout', () => this.reset());

    const tick = (_time: number, delta: number) => {
      this.clock += delta;
      const { progress, done } = this.tracker.update(this.clock);
      this.ring.clear();
      if (progress > 0) {
        this.ring.fillStyle(COLORS.go, 0.85).fillRoundedRect(-w / 2, h / 2 - 14, w * progress, 14, 7);
      }
      if (done) {
        this.reset();
        opts.onTap();
      }
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }

  private reset(): void {
    this.tracker.release();
    this.ring.clear();
  }
}
