// The battle screen: plays back the battle engine's events with simple
// animations, big type-colored buttons, and every message read aloud.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeBattleContext, startBattle, takeTurn, type BattleAction, type BattleEvent, type BattleState } from '../logic/battle';
import { battleText, boxText, levelUpText, npcIntroText, prizeText, TYPE_ICON, typeLabel, type BattleNames } from '../logic/battleText';
import type { Creature, CreatureType } from '../logic/creatures';
import { moveHint } from '../logic/damage';
import { applyBattleOutcome, PARTY_MAX, type OutcomeResult } from '../logic/gameState';
import { NPCS, type NpcDef } from '../logic/npcs';
import { xpFillSteps, xpFraction } from '../logic/xp';
import { creatureTexture, session } from '../session';
import { BigButton, COLORS, FONT, type ButtonBadge } from '../ui/Button';
import { DialogBox } from '../ui/DialogBox';
import type { BattleLaunch } from './OverworldScene';

const WILD_SPOT = { x: 760, y: 230 };
const PLAYER_SPOT = { x: 270, y: 400 };
const CREATURE_SIZE = 230;
const BALL_TEXTURE = 'ball';

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));

/** Time to leave a message up so the voice can finish it (~2.5 words a second). */
function readingTime(text: string): number {
  return Math.max(1300, text.split(/\s+/).length * 420);
}

const CARD_W = 320;
const CARD_PAD = 18;
const NAME_FONT_MAX = 28;
const NAME_FONT_MIN = 16;
const XP_BAR = { x: 62, y: 84, w: 240, h: 10 };

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

const HINT_BADGE: Record<'super' | 'weak', ButtonBadge> = {
  super: { text: 'Super!', fill: COLORS.sunny, color: hex(COLORS.ink) },
  weak: { text: 'Weak', fill: 0x6b6b6b, color: '#e6e6e6' },
};

class HpCard extends Phaser.GameObjects.Container {
  private bar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private typeTag: Phaser.GameObjects.Text;
  /** Only on the player's card. */
  private xpBar?: Phaser.GameObjects.Graphics;
  private shown = 1;
  private creatureName = '';

  constructor(scene: Phaser.Scene, x: number, y: number, withXp = false) {
    super(scene, x, y);
    const h = withXp ? 108 : 90;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.2).fillRoundedRect(0, 6, CARD_W, h, 20);
    bg.fillStyle(COLORS.panel, 1).fillRoundedRect(0, 0, CARD_W, h, 20);
    bg.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(0, 0, CARD_W, h, 20);
    this.label = scene.add.text(CARD_PAD, 28, '', { fontFamily: FONT, fontSize: `${NAME_FONT_MAX}px`, fontStyle: 'bold', color: '#1d2b3a' }).setOrigin(0, 0.5);
    this.typeTag = scene.add.text(CARD_W - CARD_PAD, 28, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.bar = scene.add.graphics();
    this.add([bg, this.label, this.typeTag, this.bar]);
    if (withXp) {
      const xpLabel = scene.add
        .text(CARD_PAD, XP_BAR.y + XP_BAR.h / 2, 'EXP', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: hex(COLORS.ink) })
        .setOrigin(0, 0.5);
      this.xpBar = scene.add.graphics();
      this.add([xpLabel, this.xpBar]);
    }
    scene.add.existing(this);
  }

  show(species: { name: string; type: CreatureType }, c: Creature): void {
    this.typeTag.setText(typeLabel(species.type)).setColor(hex(COLORS[species.type]));
    this.creatureName = species.name;
    this.setLevel(c.level);
    this.drawXp(xpFraction(c.level, c.xp));
    this.shown = c.hp / c.maxHp;
    this.drawBar(this.shown);
  }

  /** Updates just the "Lv" in the label, e.g. mid-way through an EXP fill. */
  setLevel(level: number): void {
    this.label.setText(`${this.creatureName}  Lv ${level}`);
    // Long kid-made names shrink to fit beside the type tag.
    const room = CARD_W - CARD_PAD * 2 - this.typeTag.width - 10;
    let size = NAME_FONT_MAX;
    this.label.setFontSize(size).setScale(1);
    while (this.label.width > room && size > NAME_FONT_MIN) this.label.setFontSize(--size);
    if (this.label.width > room) this.label.setScale(room / this.label.width);
  }

  fillXp(from: number, to: number): Promise<void> {
    const bar = { v: from };
    this.drawXp(from);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: bar,
        v: to,
        duration: Math.max(200, 900 * Math.abs(to - from)),
        onUpdate: () => this.drawXp(bar.v),
        onComplete: () => resolve(),
      });
    });
  }

  animateTo(hp: number, maxHp: number): Promise<void> {
    const from = { v: this.shown };
    this.shown = hp / maxHp;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: from,
        v: this.shown,
        duration: 500,
        onUpdate: () => this.drawBar(from.v),
        onComplete: () => resolve(),
      });
    });
  }

  private drawXp(fraction: number): void {
    if (!this.xpBar) return;
    const { x, y, w, h } = XP_BAR;
    this.xpBar.clear();
    this.xpBar.fillStyle(0xd9d9d9).fillRoundedRect(x, y, w, h, h / 2);
    if (fraction > 0) this.xpBar.fillStyle(COLORS.water).fillRoundedRect(x, y, Math.max(h, w * fraction), h, h / 2);
  }

  private drawBar(fraction: number): void {
    const color = fraction > 0.5 ? 0x4caf50 : fraction > 0.2 ? 0xffc83d : 0xe05252;
    this.bar.clear();
    this.bar.fillStyle(0xd9d9d9).fillRoundedRect(18, 54, 284, 22, 11);
    if (fraction > 0) this.bar.fillStyle(color).fillRoundedRect(18, 54, Math.max(22, 284 * fraction), 22, 11);
  }
}

export class BattleScene extends Phaser.Scene {
  private battle!: BattleState;
  private dialog!: DialogBox;
  private wildSprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private wildCard!: HpCard;
  private playerCard!: HpCard;
  private menu: Phaser.GameObjects.GameObject[] = [];
  /** The NPC being battled, or undefined in a wild battle. */
  private npc?: NpcDef;
  /** An NPC id the launch named that doesn't exist (a bug): the battle is skipped. */
  private unknownNpc?: string;

  constructor() {
    super('Battle');
  }

  init(data: BattleLaunch): void {
    this.unknownNpc = data.npc !== undefined && !Object.hasOwn(NPCS, data.npc) ? data.npc : undefined;
    this.npc = data.npc !== undefined && !this.unknownNpc ? NPCS[data.npc] : undefined;
    this.battle = startBattle(session().state.party, data.wild, this.npc ? { npcId: this.npc.id } : {});
    this.menu = [];
  }

  create(): void {
    if (this.unknownNpc !== undefined) {
      // A launch bug, not a wild battle: don't let an NPC's creature be caught by mistake.
      console.error(`VanMon: battle launched for unknown NPC "${this.unknownNpc}"`);
      this.scene.start('Overworld');
      return;
    }
    this.drawBackground();
    this.makeBallTexture();
    const s = session();
    const wild = this.battle.wild;
    const active = this.battle.party[this.battle.activeIndex];

    this.wildSprite = this.add.image(WILD_SPOT.x, WILD_SPOT.y, creatureTexture(wild.speciesId)).setDisplaySize(CREATURE_SIZE, CREATURE_SIZE);
    this.playerSprite = this.add
      .image(PLAYER_SPOT.x, PLAYER_SPOT.y, creatureTexture(active.speciesId))
      .setDisplaySize(CREATURE_SIZE * 1.1, CREATURE_SIZE * 1.1)
      .setFlipX(true);
    this.wildCard = new HpCard(this, 60, 60);
    this.wildCard.show(s.speciesById(wild.speciesId), wild);
    this.playerCard = new HpCard(this, 640, 400, true);
    this.playerCard.show(s.speciesById(active.speciesId), active);
    this.dialog = new DialogBox(this);

    this.cameras.main.fadeIn(250);
    void this.intro();
  }

  private names(): BattleNames {
    const s = session();
    return {
      player: (i) => s.speciesById(this.battle.party[i].speciesId).name,
      active: this.battle.activeIndex,
      wild: s.speciesById(this.battle.wild.speciesId).name,
      npc: this.npc?.name,
    };
  }

  private async intro(): Promise<void> {
    this.wildSprite.setX(GAME_WIDTH + 200);
    this.tweens.add({ targets: this.wildSprite, x: WILD_SPOT.x, duration: 600, ease: 'Back.Out' });
    const n = this.names();
    await this.say(this.npc ? npcIntroText(this.npc.name, n.wild) : `A wild ${n.wild} appeared!`);
    await this.say(`Go, ${n.player(n.active)}!`);
    this.showMainMenu();
  }

  /** Shows a message and reads it aloud; waits for a tap, or for the voice to finish. */
  private async say(text: string, waitForTap = false): Promise<void> {
    if (waitForTap) {
      await this.dialog.show(text, { speak: true });
    } else {
      void this.dialog.show(text, { speak: true, waitForTap: false });
      await wait(this, readingTime(text));
    }
  }

  // ---- menus -------------------------------------------------------------

  private clearMenu(): void {
    this.menu.forEach((o) => o.destroy());
    this.menu = [];
  }

  private showMainMenu(): void {
    this.dialog.hide();
    this.clearMenu();
    const y1 = GAME_HEIGHT - 175;
    const y2 = GAME_HEIGHT - 70;
    const canSwap = this.battle.party.some((c, i) => i !== this.battle.activeIndex && c.hp > 0);
    this.menu = [
      new BigButton(this, 270, y1, { icon: '⚔️', label: 'Fight', color: COLORS.fire, width: 420, height: 92, onTap: () => this.showMoveMenu() }),
      new BigButton(this, 270, y2, { icon: '🔄', label: 'Swap', color: COLORS.sky, width: 420, height: 92, onTap: () => this.showSwapMenu() }).setEnabled(canSwap),
      new BigButton(this, 754, y2, { icon: '🏃', label: 'Run', color: COLORS.normal, width: 420, height: 92, onTap: () => void this.act({ kind: 'run' }) }),
    ];
    // An NPC's creature can't be caught, so its battles have no Catch button.
    if (!this.npc) {
      this.menu.push(new BigButton(this, 754, y1, { icon: '🎯', label: 'Catch', color: COLORS.sunny, width: 420, height: 92, onTap: () => void this.act({ kind: 'catch' }) }));
    }
  }

  private showMoveMenu(): void {
    this.clearMenu();
    const s = session();
    const active = this.battle.party[this.battle.activeIndex];
    const moves = s.speciesById(active.speciesId).moves.map((id) => s.data.moves.find((m) => m.id === id)!);
    const foeType = s.speciesById(this.battle.wild.speciesId).type;
    const y1 = GAME_HEIGHT - 175;
    this.menu = moves.map((m, i) => {
      const hint = moveHint(m.type, foeType);
      return new BigButton(this, 270 + i * 484, y1, {
        icon: TYPE_ICON[m.type],
        label: m.name,
        color: COLORS[m.type],
        width: 420,
        height: 92,
        badge: hint ? HINT_BADGE[hint] : undefined,
        onTap: () => void this.act({ kind: 'fight', moveIndex: i }),
      });
    });
    this.menu.push(new BigButton(this, 270, GAME_HEIGHT - 70, { icon: '⬅️', label: 'Back', color: COLORS.normal, width: 420, height: 92, onTap: () => this.showMainMenu() }));
  }

  private showSwapMenu(): void {
    this.clearMenu();
    const s = session();
    const cols = 3;
    this.menu = this.battle.party.map((c, i) => {
      const sp = s.speciesById(c.speciesId);
      const b = new BigButton(this, 180 + (i % cols) * 332, GAME_HEIGHT - 290 + Math.floor(i / cols) * 104, {
        icon: TYPE_ICON[sp.type],
        label: `${sp.name}`,
        color: COLORS[sp.type],
        width: 316,
        height: 92,
        onTap: () => void this.act({ kind: 'swap', partyIndex: i }),
      });
      return b.setEnabled(i !== this.battle.activeIndex && c.hp > 0);
    });
    this.menu.push(new BigButton(this, 180, GAME_HEIGHT - 70, { icon: '⬅️', label: 'Back', color: COLORS.normal, width: 316, height: 92, onTap: () => this.showMainMenu() }));
  }

  // ---- turns -------------------------------------------------------------

  private async act(action: BattleAction): Promise<void> {
    this.clearMenu();
    try {
      const s = session();
      const { state, events } = takeTurn(this.battle, action, makeBattleContext(s.data, s.rng));
      // Save a finished battle's result before the animations, so closing the
      // iPad mid-celebration never loses a catch or a level-up.
      const fighter = state.party[state.activeIndex];
      const result = state.outcome ? this.saveOutcome(state) : null;
      const before = this.battle;
      for (const e of events) {
        if (e.kind === 'swap') this.battle = { ...this.battle, activeIndex: e.partyIndex };
        await this.play(e, before);
      }
      this.battle = state;
      if (result) {
        // Only a win earns XP; the fighter's party slot is the same in the saved game.
        const xp = state.outcome === 'won' ? { before: fighter, after: session().state.party[state.activeIndex] } : null;
        await this.celebrate(xp, result.wentToBox, result.prize);
      }
      else this.showMainMenu();
    } catch (err) {
      // Never leave a child stuck on a screen with no buttons.
      console.error('VanMon battle error', err);
      await this.say("Oops! Let's head back.", true);
      this.leave();
    }
  }

  private saveOutcome(state: BattleState): { wentToBox: boolean; prize: OutcomeResult['prize'] } {
    const s = session();
    const prev = s.state;
    const { state: next, prize } = applyBattleOutcome(prev, state, s.data);
    s.state = next;
    s.stepsSinceBattle = 0;
    s.save();
    return { wentToBox: state.outcome === 'caught' && prev.party.length >= PARTY_MAX, prize };
  }

  private async play(e: BattleEvent, before: BattleState): Promise<void> {
    const text = battleText(e, this.names());
    switch (e.kind) {
      case 'move': {
        const sprite = e.side === 'player' ? this.playerSprite : this.wildSprite;
        const dx = e.side === 'player' ? 40 : -40;
        this.tweens.add({ targets: sprite, x: sprite.x + dx, yoyo: true, duration: 140 });
        if (text) await this.say(text);
        break;
      }
      case 'damage': {
        const target = e.target === 'wild' ? this.wildSprite : this.playerSprite;
        const card = e.target === 'wild' ? this.wildCard : this.playerCard;
        const maxHp = e.target === 'wild' ? before.wild.maxHp : this.battle.party[this.battle.activeIndex].maxHp;
        target.setTintFill(0xffffff);
        this.cameras.main.shake(e.effectiveness === 'super' ? 250 : 120, e.effectiveness === 'super' ? 0.012 : 0.004);
        this.time.delayedCall(120, () => target.clearTint());
        await card.animateTo(e.hpAfter, maxHp);
        if (text) await this.say(text);
        break;
      }
      case 'faint': {
        const target = e.side === 'wild' ? this.wildSprite : this.playerSprite;
        this.tweens.add({ targets: target, y: target.y + 40, alpha: 0, duration: 500 });
        if (text) await this.say(text);
        break;
      }
      case 'swap': {
        const c = this.battle.party[e.partyIndex];
        this.playerSprite.setTexture(creatureTexture(c.speciesId)).setDisplaySize(CREATURE_SIZE * 1.1, CREATURE_SIZE * 1.1).setAlpha(1).setY(PLAYER_SPOT.y);
        this.playerCard.show(session().speciesById(c.speciesId), c);
        if (text) await this.say(text);
        break;
      }
      case 'catch':
        await this.throwBall(e.wiggles, e.caught);
        if (text) await this.say(text, e.caught);
        break;
      default:
        if (text) await this.say(text, true);
    }
  }

  private async throwBall(wiggles: number, caught: boolean): Promise<void> {
    const ball = this.add.image(PLAYER_SPOT.x, PLAYER_SPOT.y, BALL_TEXTURE);
    await new Promise<void>((r) =>
      this.tweens.add({ targets: ball, x: WILD_SPOT.x, y: WILD_SPOT.y + 60, angle: 720, duration: 600, ease: 'Quad.Out', onComplete: () => r() }),
    );
    this.tweens.add({ targets: this.wildSprite, scale: 0, duration: 250 });
    await wait(this, 400);
    for (let i = 0; i < wiggles; i++) {
      await new Promise<void>((r) => this.tweens.add({ targets: ball, angle: { from: -25, to: 25 }, yoyo: true, duration: 220, onComplete: () => r() }));
      await wait(this, 350);
    }
    if (caught) {
      ball.setTint(0xffe066);
      this.add.particles(ball.x, ball.y, BALL_TEXTURE, { speed: 200, scale: { start: 0.3, end: 0 }, lifespan: 600, quantity: 12, emitting: false }).explode(12);
    } else {
      ball.destroy();
      // Grow back to its exact size (kids' drawings may not be square).
      this.wildSprite.setDisplaySize(1, 1);
      await new Promise<void>((r) =>
        this.tweens.add({
          targets: this.wildSprite,
          displayWidth: CREATURE_SIZE,
          displayHeight: CREATURE_SIZE,
          duration: 250,
          ease: 'Back.Out',
          onComplete: () => r(),
        }),
      );
    }
  }

  private async celebrate(xp: { before: Creature; after: Creature } | null, wentToBox: boolean, prize: OutcomeResult['prize']): Promise<void> {
    const n = this.names();
    if (wentToBox) await this.say(boxText(n.wild), true);
    if (xp) await this.fillXp(xp.before, xp.after, n.player(this.battle.activeIndex));
    if (prize && this.npc) await this.givePrize(prize.creature, prize.where);
    this.leave();
  }

  /** The EXP bar fills up; each time it reaches the end, the creature grows a level. */
  private async fillXp(before: Creature, after: Creature, name: string): Promise<void> {
    const steps = xpFillSteps(before, after);
    for (const [i, step] of steps.entries()) {
      if (i > 0) {
        this.playerCard.setLevel(step.level);
        const { scaleX, scaleY } = this.playerSprite;
        this.tweens.add({ targets: this.playerSprite, scaleX: scaleX * 1.15, scaleY: scaleY * 1.15, yoyo: true, duration: 250, repeat: 1 });
        await this.say(levelUpText(name, step.level), true);
      }
      await this.playerCard.fillXp(step.from, step.to);
    }
    // Catch the HP bar up with the new max HP.
    this.playerCard.show(session().speciesById(after.speciesId), after);
  }

  /** The NPC's creature hops back in, sparkling, as a gift. */
  private async givePrize(creature: Creature, where: 'party' | 'box'): Promise<void> {
    const species = session().speciesById(creature.speciesId);
    const name = species.name;
    this.wildCard.show(species, creature);
    this.wildSprite.setTexture(creatureTexture(creature.speciesId)).setDisplaySize(CREATURE_SIZE, CREATURE_SIZE).setPosition(WILD_SPOT.x, WILD_SPOT.y).setAlpha(0);
    this.tweens.add({ targets: this.wildSprite, alpha: 1, duration: 400 });
    this.tweens.add({ targets: this.wildSprite, y: WILD_SPOT.y - 30, yoyo: true, repeat: 2, duration: 220, ease: 'Sine.Out' });
    this.add
      .particles(WILD_SPOT.x, WILD_SPOT.y, BALL_TEXTURE, { speed: 220, scale: { start: 0.25, end: 0 }, tint: 0xffd23f, lifespan: 700, quantity: 16, emitting: false })
      .explode(16);
    await this.say(prizeText(this.npc!.name, name, where), true);
  }

  private leave(): void {
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Overworld'));
  }

  // ---- drawing -----------------------------------------------------------

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xd8f1ff, 0xd8f1ff).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x9fdc7c).fillRect(0, 320, GAME_WIDTH, GAME_HEIGHT - 320);
    g.fillStyle(0x7cc95a).fillEllipse(WILD_SPOT.x, WILD_SPOT.y + 100, 340, 80);
    g.fillStyle(0x7cc95a).fillEllipse(PLAYER_SPOT.x, PLAYER_SPOT.y + 110, 380, 90);
  }

  private makeBallTexture(): void {
    if (this.textures.exists(BALL_TEXTURE)) return;
    // A "buddy ball": sky blue and sunny yellow with a heart (our own design).
    const g = this.make.graphics({}, false);
    g.fillStyle(COLORS.sky).slice(32, 32, 28, Math.PI, 0, false).fillPath();
    g.fillStyle(COLORS.sunny).slice(32, 32, 28, 0, Math.PI, false).fillPath();
    g.lineStyle(4, 0xffffff).strokeCircle(32, 32, 28);
    g.fillStyle(0xff6f91).fillCircle(27, 30, 7).fillCircle(37, 30, 7).fillTriangle(20, 33, 44, 33, 32, 46);
    g.generateTexture(BALL_TEXTURE, 64, 64);
    g.destroy();
  }
}
