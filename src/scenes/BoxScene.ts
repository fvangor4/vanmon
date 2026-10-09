// The Box at home: tap a team member to let it rest in the Box, or tap a
// Box creature to bring it along (up to 6).

import { GAME_WIDTH } from '../config';
import { depositToBox, PARTY_MAX, withdrawFromBox } from '../logic/gameState';
import { pageCount, pageOf } from '../logic/menus';
import { session } from '../session';
import { BigButton, COLORS, FONT } from '../ui/Button';
import { creatureCard } from '../ui/CreatureCard';
import { speaker } from '../ui/speech';
import { MenuScene } from './menuBase';

const PER_PAGE = 6;

export class BoxScene extends MenuScene {
  private page = 0;

  constructor() {
    super('Box');
  }

  create(): void {
    this.page = 0;
    this.frame('📦 Box');
    this.draw();
  }

  private draw(): void {
    this.content.removeAll(true);
    const s = session();
    const label = (x: number, text: string) =>
      this.content.add(this.add.text(x, 140, text, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#1d2b3a' }).setOrigin(0.5, 0));

    label(270, `🎒 Team (${s.state.party.length}/${PARTY_MAX})`);
    s.state.party.forEach((c, i) => {
      const sp = s.speciesById(c.speciesId);
      this.content.add(
        creatureCard(this, 270, 236 + i * 88, c, sp, {
          width: 420,
          height: 80,
          onTap: () => {
            if (s.state.party.length === 1) return speaker.say('You need one buddy with you!');
            s.state = depositToBox(s.state, i);
            s.save();
            speaker.say(`${sp.name} is resting in the Box.`);
            this.draw();
          },
        }),
      );
    });

    const pages = pageCount(s.state.box, PER_PAGE);
    this.page = Math.min(this.page, pages - 1);
    label(GAME_WIDTH - 290, `📦 Resting (${s.state.box.length})`);
    pageOf(s.state.box, this.page, PER_PAGE).forEach((c, j) => {
      const i = this.page * PER_PAGE + j;
      const sp = s.speciesById(c.speciesId);
      this.content.add(
        creatureCard(this, GAME_WIDTH - 290, 236 + j * 88, c, sp, {
          width: 420,
          height: 80,
          onTap: () => {
            if (s.state.party.length >= PARTY_MAX) return speaker.say('Your team is full!');
            s.state = withdrawFromBox(s.state, i);
            s.save();
            speaker.say(`${sp.name} joined your team!`);
            this.draw();
          },
        }),
      );
    });
    if (s.state.box.length === 0) {
      this.content.add(
        this.add.text(GAME_WIDTH - 290, 300, 'Nobody here yet!', { fontFamily: FONT, fontSize: '28px', color: '#1d2b3a' }).setOrigin(0.5, 0),
      );
    }
    if (pages > 1) {
      const nav = (x: number, icon: string, delta: number) =>
        new BigButton(this, x, 720, { icon, color: COLORS.sky, width: 110, height: 70, onTap: () => { this.page = (this.page + delta + pages) % pages; this.draw(); } });
      this.content.add([nav(GAME_WIDTH - 420, '◀️', -1), nav(GAME_WIDTH - 160, '▶️', 1)]);
    }
  }
}
