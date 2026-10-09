// The Creature Book: every creature, shown if caught, a shadow if only seen,
// and ❓ if not met yet. Tap one to see it big and hear its name.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { bookEntries, bookProgress, pageCount, pageOf, type BookRow } from '../logic/menus';
import { TYPE_ICON } from '../logic/battleText';
import { creatureTexture, session } from '../session';
import { BigButton, COLORS, FONT } from '../ui/Button';
import { speaker } from '../ui/speech';
import { MenuScene } from './menuBase';

const PER_PAGE = 8;
const TYPE_WORD = { fire: 'Fire', water: 'Water', leaf: 'Leaf' } as const;

export class BookScene extends MenuScene {
  private page = 0;

  constructor() {
    super('Book');
  }

  create(): void {
    const s = session();
    const p = bookProgress(s.data, s.state.book);
    this.page = 0;
    this.frame(`📖 Creature Book  ${p.caught}/${p.total}`);
    this.draw();
  }

  private draw(): void {
    this.content.removeAll(true);
    const s = session();
    const rows = bookEntries(s.data, s.state.book);
    pageOf(rows, this.page, PER_PAGE).forEach((row, j) => {
      const x = 170 + (j % 4) * 228;
      const y = 250 + Math.floor(j / 4) * 250;
      this.content.add(this.tile(x, y, row));
    });
    const pages = pageCount(rows, PER_PAGE);
    if (pages > 1) {
      const nav = (x: number, icon: string, delta: number) =>
        new BigButton(this, x, GAME_HEIGHT - 80, { icon, color: COLORS.sky, width: 110, height: 70, onTap: () => { this.page = (this.page + delta + pages) % pages; this.draw(); } });
      this.content.add([nav(GAME_WIDTH / 2 - 90, '◀️', -1), nav(GAME_WIDTH / 2 + 90, '▶️', 1)]);
    }
  }

  private tile(x: number, y: number, row: BookRow): Phaser.GameObjects.Container {
    const t = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff).fillRoundedRect(-100, -110, 200, 220, 24);
    bg.lineStyle(4, row.status === 'caught' ? COLORS[row.species.type] : 0xb0bec5).strokeRoundedRect(-100, -110, 200, 220, 24);
    t.add(bg);
    if (row.status === 'unknown') {
      t.add(this.add.text(0, -10, '❓', { fontFamily: FONT, fontSize: '80px' }).setOrigin(0.5));
      return t;
    }
    const pic = this.add.image(0, -25, creatureTexture(row.species.id)).setDisplaySize(150, 150);
    if (row.status === 'seen') pic.setTintFill(0x5a6b78);
    const name = row.status === 'caught' ? row.species.name : `${row.species.name}?`;
    t.add([pic, this.add.text(0, 75, name, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#1d2b3a' }).setOrigin(0.5)]);
    t.setSize(200, 220).setInteractive({ useHandCursor: true });
    t.on('pointerup', () => this.showBig(row));
    return t;
  }

  private showBig(row: BookRow): void {
    const caught = row.status === 'caught';
    const sp = row.species;
    speaker.say(caught ? `${sp.name}! A ${TYPE_WORD[sp.type]} creature.` : `You saw ${sp.name}. Can you catch one?`);
    const layer = this.add.container(0, 0).setDepth(100);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel).fillRoundedRect(GAME_WIDTH / 2 - 300, 110, 600, 560, 40);
    g.lineStyle(8, COLORS[sp.type]).strokeRoundedRect(GAME_WIDTH / 2 - 300, 110, 600, 560, 40);
    const pic = this.add.image(GAME_WIDTH / 2, 340, creatureTexture(sp.id)).setDisplaySize(340, 340);
    if (!caught) pic.setTintFill(0x5a6b78);
    const label = this.add
      .text(GAME_WIDTH / 2, 580, caught ? `${TYPE_ICON[sp.type]} ${sp.name}` : `${sp.name}?`, { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#1d2b3a' })
      .setOrigin(0.5);
    layer.add([shade, g, pic, label]);
    this.tweens.add({ targets: pic, scale: pic.scale * 1.06, yoyo: true, repeat: -1, duration: 500 });
    shade.on('pointerup', () => layer.destroy(true));
  }
}
