import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'VanMon', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#1d2b3a',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
  }
}
