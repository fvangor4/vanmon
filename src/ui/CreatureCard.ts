// A tappable card showing one creature: picture, name, level, and HP.

import Phaser from 'phaser';
import type { Creature, SpeciesDef } from '../logic/creatures';
import { creatureTexture } from '../session';
import { COLORS, FONT } from './Button';

export function creatureCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  c: Creature,
  sp: SpeciesDef,
  opts: { width?: number; height?: number; highlight?: boolean; onTap?: () => void } = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 280;
  const h = opts.height ?? 120;
  const card = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.2).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 20);
  bg.fillStyle(COLORS.panel).fillRoundedRect(-w / 2, -h / 2, w, h, 20);
  bg.lineStyle(opts.highlight ? 8 : 4, opts.highlight ? COLORS.sunny : COLORS[sp.type]).strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
  const pic = scene.add.image(-w / 2 + h / 2, 0, creatureTexture(sp.id)).setDisplaySize(h - 16, h - 16);
  const name = scene.add.text(-w / 2 + h + 4, -h / 2 + 12, sp.name, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#1d2b3a' });
  const lv = scene.add.text(w / 2 - 14, -h / 2 + 14, `Lv ${c.level}`, { fontFamily: FONT, fontSize: '22px', color: '#1d2b3a' }).setOrigin(1, 0);
  const barW = w - h - 20;
  const frac = c.hp / c.maxHp;
  const bar = scene.add.graphics();
  const barY = h / 2 - 26;
  bar.fillStyle(0xd9d9d9).fillRoundedRect(-w / 2 + h + 4, barY, barW, 16, 8);
  if (frac > 0) {
    bar.fillStyle(frac > 0.5 ? 0x4caf50 : frac > 0.2 ? 0xffc83d : 0xe05252).fillRoundedRect(-w / 2 + h + 4, barY, Math.max(16, barW * frac), 16, 8);
  }
  card.add([bg, pic, name, lv, bar]);
  if (opts.onTap) {
    card.setSize(w, h).setInteractive({ useHandCursor: true });
    let pressed = false;
    card.on('pointerdown', () => (pressed = true));
    card.on('pointerout', () => (pressed = false));
    card.on('pointerup', () => {
      if (pressed) opts.onTap!();
      pressed = false;
    });
  }
  return card;
}
