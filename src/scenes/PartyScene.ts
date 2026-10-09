// "My Team": see your creatures; tap one to make it the leader (it goes first in battle).

import { setLead } from '../logic/gameState';
import { session } from '../session';
import { FONT } from '../ui/Button';
import { creatureCard } from '../ui/CreatureCard';
import { speaker } from '../ui/speech';
import { MenuScene } from './menuBase';

export class PartyScene extends MenuScene {
  constructor() {
    super('Party');
  }

  create(): void {
    this.frame('🎒 My Team');
    this.add.text(60, 112, 'Tap a buddy to make it go first ⭐', { fontFamily: FONT, fontSize: '26px', color: '#1d2b3a' });
    this.draw();
  }

  private draw(): void {
    this.content.removeAll(true);
    const s = session();
    s.state.party.forEach((c, i) => {
      const sp = s.speciesById(c.speciesId);
      const card = creatureCard(this, 280 + (i % 2) * 470, 230 + Math.floor(i / 2) * 160, c, sp, {
        width: 440,
        height: 140,
        highlight: i === 0,
        onTap: () => {
          if (i === 0) {
            speaker.say(`${sp.name} is your leader!`);
            return;
          }
          s.state = setLead(s.state, i);
          s.save();
          speaker.say(`${sp.name} will go first!`);
          this.draw();
        },
      });
      this.content.add(card);
    });
  }
}
