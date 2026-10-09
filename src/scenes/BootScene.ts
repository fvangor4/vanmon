import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { createCreature, validateCreatureData, type CreatureData } from '../logic/creatures';
import { validateAreas } from '../logic/encounters';
import { newGame } from '../logic/gameState';
import { loadGame, requestPersistentStorage } from '../logic/save';
import { AREAS, MAPS } from '../data/maps';
import { creatureTexture, publicUrl, Session, setSession } from '../session';
import { FONT } from '../ui/Button';
import { makeTextures } from './textures';

/** Loads creatures.json and every creature picture, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'VanMon', {
        fontFamily: FONT,
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#1d2b3a',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.load.json('creatures', publicUrl('data/creatures.json'));
  }

  create(): void {
    let data: CreatureData;
    try {
      data = validateCreatureData(this.cache.json.get('creatures'));
      validateAreas(AREAS, data, MAPS);
    } catch (err) {
      this.showProblem(err instanceof Error ? err.message : String(err));
      return;
    }

    for (const s of data.species) {
      const url = publicUrl(`creatures/${s.image}`);
      if (s.image.toLowerCase().endsWith('.svg')) this.load.svg(creatureTexture(s.id), url, { width: 256, height: 256 });
      else this.load.image(creatureTexture(s.id), url);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.start(data));
    this.load.start();
  }

  private start(data: CreatureData): void {
    makeTextures(this);
    void requestPersistentStorage();
    const loaded = loadGame(localStorage, data);
    if (loaded.problem) console.warn(`VanMon: ${loaded.problem}`);
    // Until the title/starter screens exist (task 15), a new game starts with the first creature.
    const state = loaded.state ?? newGame(createCreature(data.species[0], 5));
    const s = new Session(data, state);
    s.canSave = !loaded.protectSave;
    setSession(s);
    this.scene.start('Overworld');
  }

  /** For a parent who edited creatures.json: say what's wrong instead of a blank screen. */
  private showProblem(message: string): void {
    this.children.removeAll();
    this.add
      .text(40, 40, `Grown-ups: creatures.json needs fixing\n\n${message}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0);
  }
}
