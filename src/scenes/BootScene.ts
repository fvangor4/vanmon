import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { validateCreatureData, type CreatureData } from '../logic/creatures';
import { validateAreas } from '../logic/encounters';
import { browserStore, loadGame, requestPersistentStorage } from '../logic/save';
import { AREAS, MAPS } from '../data/maps';
import { creatureTexture, publicUrl, type BootResult } from '../session';
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
    const raw: unknown = this.cache.json.get('creatures');
    if (raw === undefined) {
      this.showProblem("Couldn't load creatures.json. If this is the first visit, check the internet connection and reload.", false);
      return;
    }
    let data: CreatureData;
    try {
      data = validateCreatureData(raw);
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
    const missing: string[] = [];
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => missing.push(String(file.url)));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (missing.length > 0) this.showProblem(`These creature pictures are missing from public/creatures/:\n${missing.join('\n')}`);
      else this.start(data);
    });
    this.load.start();
  }

  private start(data: CreatureData): void {
    makeTextures(this);
    void requestPersistentStorage();
    const store = browserStore();
    const loaded = loadGame(store, data);
    if (loaded.problem) console.warn(`VanMon: ${loaded.problem}`);
    const boot: BootResult = { data, store, loaded };
    this.registry.set('boot', boot);
    this.scene.start('Title');
  }

  /** For a parent who edited creatures.json: say what's wrong instead of a blank screen. */
  private showProblem(message: string, dataProblem = true): void {
    this.children.removeAll();
    const title = dataProblem ? 'Grown-ups: creatures.json needs fixing' : 'Grown-ups: VanMon could not start';
    this.add
      .text(40, 40, `${title}\n\n${message}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0);
  }
}
