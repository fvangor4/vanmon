// The Gold Kid's three addition questions, then a battle. Every question is
// read aloud; a wrong answer fades out so the child always gets there; ✖ goes
// back to town without a battle.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeQuiz, type MathProblem } from '../logic/mathQuiz';
import { NPCS, npcCreature, type NpcDef } from '../logic/npcs';
import { session } from '../session';
import { BigButton, COLORS, FONT } from '../ui/Button';
import { speaker } from '../ui/speech';
import type { BattleLaunch } from './OverworldScene';
import { GOLD_KID_TEXTURE } from './textures';

export interface MathLaunch {
  npc: string;
}

const ANSWER_COLORS = [COLORS.sky, COLORS.fire, COLORS.leaf];
const CHEERS = ['Yes!', 'You got it!', 'Super!'];

const question = (p: MathProblem) => `What is ${p.a} plus ${p.b}?`;

export class MathScene extends Phaser.Scene {
  private npc?: NpcDef;
  private quiz: MathProblem[] = [];
  private index = 0;
  private problemText!: Phaser.GameObjects.Text;
  private stars: Phaser.GameObjects.Text[] = [];
  private answers: BigButton[] = [];
  /** True while a right answer is being cheered, so extra taps do nothing. */
  private busy = false;

  constructor() {
    super('Math');
  }

  init(data: MathLaunch): void {
    this.npc = Object.hasOwn(NPCS, data.npc) ? NPCS[data.npc] : undefined;
    if (!this.npc) console.error(`VanMon: math launched for unknown NPC "${data.npc}"`);
    this.quiz = makeQuiz(session().rng);
    this.index = 0;
    this.answers = [];
    this.stars = [];
    this.busy = false;
  }

  create(): void {
    if (!this.npc) {
      this.scene.start('Overworld');
      return;
    }
    const npc = this.npc;
    const g = this.add.graphics();
    g.fillGradientStyle(0xfff6d5, 0xfff6d5, 0xffe08a, 0xffe08a).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    if (this.textures.exists(GOLD_KID_TEXTURE)) this.add.image(150, 300, GOLD_KID_TEXTURE).setScale(3);
    this.add
      .text(GAME_WIDTH / 2, 70, `${npc.name}'s math!`, { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#1d2b3a' })
      .setOrigin(0.5);
    new BigButton(this, 80, 70, { icon: '✖️', color: COLORS.normal, width: 110, height: 90, onTap: () => this.leave() });
    new BigButton(this, GAME_WIDTH - 80, 70, { icon: '🔊', color: COLORS.sky, width: 110, height: 90, onTap: () => speaker.say(question(this.quiz[this.index])) });
    this.stars = this.quiz.map((_, i) =>
      this.add.text(GAME_WIDTH / 2 + (i - 1) * 80, 150, '☆', { fontFamily: FONT, fontSize: '56px', color: '#b8860b' }).setOrigin(0.5),
    );
    this.problemText = this.add
      .text(GAME_WIDTH / 2 + 90, 320, '', { fontFamily: FONT, fontSize: '120px', fontStyle: 'bold', color: '#1d2b3a' })
      .setOrigin(0.5);
    this.cameras.main.fadeIn(250);
    this.showProblem();
  }

  private showProblem(): void {
    const p = this.quiz[this.index];
    this.problemText.setText(`${p.a} + ${p.b} = ?`);
    this.answers.forEach((b) => b.destroy());
    this.answers = p.choices.map(
      (n, i) =>
        new BigButton(this, GAME_WIDTH / 2 + (i - 1) * 300, 560, {
          icon: String(n),
          color: ANSWER_COLORS[i],
          width: 240,
          height: 200,
          onTap: () => void this.answer(n, this.answers[i]),
        }),
    );
    this.busy = false;
    speaker.say(question(p));
  }

  private async answer(n: number, button: BigButton): Promise<void> {
    if (this.busy) return;
    const p = this.quiz[this.index];
    if (n !== p.answer) {
      button.setEnabled(false);
      this.tweens.add({ targets: button, x: button.x + 12, yoyo: true, repeat: 2, duration: 60 });
      speaker.say('Not quite, try again!');
      return;
    }
    this.busy = true;
    this.answers.forEach((b) => b.setEnabled(b === button));
    this.problemText.setText(`${p.a} + ${p.b} = ${p.answer}`);
    this.stars[this.index].setText('⭐');
    this.tweens.add({ targets: button, scale: 1.12, yoyo: true, duration: 180 });
    speaker.say(`${CHEERS[this.index % CHEERS.length]} ${p.a} plus ${p.b} is ${p.answer}!`);
    await this.wait(2200);
    this.index++;
    if (this.index < this.quiz.length) {
      this.showProblem();
      return;
    }
    this.answers.forEach((b) => b.destroy());
    this.answers = [];
    this.problemText.setText('🎉');
    speaker.say("You got them all! Now let's battle!");
    await this.wait(2200);
    this.startBattle();
  }

  private startBattle(): void {
    try {
      const s = session();
      const npc = this.npc!;
      const launch: BattleLaunch = { wild: npcCreature(npc, s.state, s.data), npc: npc.id };
      this.cameras.main.fadeOut(300);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Battle', launch));
    } catch (err) {
      // Never leave a child stuck here.
      console.error('VanMon math error', err);
      this.leave();
    }
  }

  private leave(): void {
    speaker.stop();
    this.scene.start('Overworld');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }
}
