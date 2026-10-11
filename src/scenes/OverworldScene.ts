// Walking around: tap where to go, step into tall grass to meet creatures,
// step on the home door to heal, walk off the edge to change area.

import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { createCreature, type Creature } from '../logic/creatures';
import { rollEncounter, speciesForArea } from '../logic/encounters';
import { healAll, markSeen } from '../logic/gameState';
import { findPath, parseMap, type GameMap, type Point } from '../logic/map';
import { AREAS, MAPS } from '../data/maps';
import { session } from '../session';
import { BigButton, COLORS, FONT, pinToScreen } from '../ui/Button';
import { DialogBox } from '../ui/DialogBox';
import { openMenu } from './menuBase';
import { PLAYER_TEXTURE, TILE, tileTexture } from './textures';

const STEP_MS = 160;

export interface BattleLaunch {
  wild: Creature;
}

export class OverworldScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Phaser.GameObjects.Image;
  private dialog!: DialogBox;
  private path: Point[] = [];
  /** The tile the current step is heading to (null when standing still). */
  private stepTarget: Point | null = null;
  private walking = false;
  private busy = false;
  /** A menu tapped mid-step opens once the step finishes. */
  private pendingMenu: string | null = null;

  constructor() {
    super('Overworld');
  }

  create(): void {
    const s = session();
    this.map = parseMap(MAPS[s.state.position.map]);
    this.path = [];
    this.stepTarget = null;
    this.walking = false;
    this.busy = false;
    this.pendingMenu = null;
    this.drawMap();
    // Menus pause this scene; it is ready for taps again when they close.
    this.events.on(Phaser.Scenes.Events.RESUME, () => (this.busy = false));

    const { x, y } = s.state.position;
    this.player = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, PLAYER_TEXTURE).setDepth(10);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.width * TILE, this.map.height * TILE);
    cam.startFollow(this.player, true, 0.2, 0.2);
    cam.fadeIn(250);

    this.drawAreaName();
    this.drawHud();
    this.dialog = pinToScreen(new DialogBox(this));

    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.busy || over.length > 0) return; // taps on buttons/dialogs aren't walking
      this.walkTo({ x: Math.floor(p.worldX / TILE), y: Math.floor(p.worldY / TILE) });
    });
  }

  private drawMap(): void {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const kind = this.map.tileAt(x, y)!;
        const isRoof = kind === 'house' && this.map.tileAt(x, y - 1) !== 'house';
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, tileTexture(isRoof ? 'roof' : kind));
      }
    }
  }

  private drawAreaName(): void {
    const label = this.add
      .text(24, 20, this.map.def.name, {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#1d2b3a',
        backgroundColor: '#fffbea',
        padding: { x: 18, y: 10 },
      })
      .setScrollFactor(0)
      .setDepth(500);
    this.tweens.add({ targets: label, alpha: 0.85, delay: 2500, duration: 600 });
  }

  /** Menu buttons in the top-right corner. The Box lives at home, in Home Town. */
  private drawHud(): void {
    const buttons: [string, string][] = [['🎒', 'Party'], ['📖', 'Book'], ['🎨', 'Draw']];
    if (this.map.def.home) buttons.push(['📦', 'Box']);
    buttons.forEach(([icon, key], i) => {
      const b = new BigButton(this, GAME_WIDTH - 70 - i * 116, 60, {
        icon,
        color: COLORS.panel,
        width: 100,
        height: 88,
        onTap: () => {
          if (this.busy || this.pendingMenu) return;
          this.stop();
          if (this.walking) this.pendingMenu = key;
          else this.openMenuNow(key);
        },
      });
      pinToScreen(b).setDepth(500);
    });
  }

  private openMenuNow(key: string): void {
    this.busy = true; // one menu at a time, even with two fingers
    this.pendingMenu = null;
    openMenu(this, key);
  }

  private walkTo(tapped: Point): void {
    // Mid-step, plan from where this step lands so the new route joins up smoothly.
    const from = this.stepTarget ?? session().state.position;
    this.path = findPath(this.map, from, tapped);
    if (this.path.length === 0) return;
    const end = this.path[this.path.length - 1];
    const marker = this.add.circle(end.x * TILE + TILE / 2, end.y * TILE + TILE / 2, 14, COLORS.sunny).setDepth(5);
    this.tweens.add({ targets: marker, scale: 2, alpha: 0, duration: 500, onComplete: () => marker.destroy() });
    if (!this.walking) this.nextStep();
  }

  private nextStep(): void {
    const step = this.path.shift();
    if (!step || this.busy) {
      this.walking = false;
      this.stepTarget = null;
      if (!this.busy) session().save(); // stopped walking: remember where we are
      if (this.pendingMenu && !this.busy) this.openMenuNow(this.pendingMenu);
      else this.pendingMenu = null;
      return;
    }
    this.walking = true;
    this.stepTarget = step;
    const pos = session().state.position;
    if (step.x !== pos.x) this.player.setFlipX(step.x < pos.x);
    this.tweens.add({
      targets: this.player,
      x: step.x * TILE + TILE / 2,
      y: step.y * TILE + TILE / 2,
      duration: STEP_MS,
      onComplete: () => {
        this.arrive(step);
        this.nextStep();
      },
    });
  }

  /** Everything that can happen when you finish a step onto a tile. */
  private arrive(at: Point): void {
    const s = session();
    s.state = { ...s.state, position: { map: this.map.def.id, x: at.x, y: at.y } };

    const warp = this.map.warpAt(at.x, at.y);
    if (warp) {
      this.stop();
      this.busy = true; // no taps during the fade; the scene restarts on the new map
      s.state = { ...s.state, position: { map: warp.to, x: warp.toX, y: warp.toY } };
      s.save();
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart());
      return;
    }

    const home = this.map.def.home;
    if (home && home.x === at.x && home.y === at.y) {
      this.stop();
      s.state = healAll(s.state);
      s.save();
      void this.say('🏠 Home sweet home!\nEveryone feels great! 💖');
      return;
    }

    if (this.map.tileAt(at.x, at.y) === 'tallGrass') this.grassStep();
  }

  private grassStep(): void {
    const s = session();
    const area = AREAS[this.map.def.id];
    if (!area) return;
    const met = rollEncounter(area, speciesForArea(s.data, this.map.def.id), s.rng, s.stepsSinceBattle);
    s.stepsSinceBattle++;
    if (!met) return;
    this.stop();
    s.stepsSinceBattle = 0;
    const species = s.speciesById(met.speciesId);
    s.state = markSeen(s.state, species.id);
    s.save();
    const launch: BattleLaunch = { wild: createCreature(species, met.level) };
    this.busy = true;
    this.cameras.main.flash(300, 255, 255, 255);
    this.time.delayedCall(350, () => {
      if (this.scene.manager.keys['Battle']) {
        this.scene.start('Battle', launch);
      } else {
        // Battle screen arrives in task 14.
        void this.say(`A wild ${species.name} appeared!`);
      }
    });
  }

  private stop(): void {
    this.path = [];
  }

  private async say(text: string): Promise<void> {
    this.busy = true;
    await this.dialog.show(text, { speak: true });
    this.dialog.hide();
    this.busy = false;
  }
}
