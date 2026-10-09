// Shared frame for the overlay menus (Party, Box, Book): a panel over the
// paused overworld, a title, and a big ❌ to go back.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { session } from '../session';
import { BigButton, COLORS, FONT } from '../ui/Button';

export abstract class MenuScene extends Phaser.Scene {
  /** Everything that is redrawn when the menu changes. */
  protected content!: Phaser.GameObjects.Container;

  protected frame(title: string): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0).setInteractive(); // blocks taps to the map
    const g = this.add.graphics();
    g.fillStyle(0xeaf7ff).fillRoundedRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48, 36);
    g.lineStyle(6, COLORS.ink).strokeRoundedRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48, 36);
    this.add.text(60, 50, title, { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#1d2b3a' });
    new BigButton(this, GAME_WIDTH - 100, 82, { icon: '❌', color: COLORS.stop, width: 96, height: 84, onTap: () => this.close() });
    this.content = this.add.container(0, 0);
  }

  protected close(): void {
    session().save();
    this.scene.stop();
    this.scene.resume('Overworld');
  }
}

/** Opens a menu over the overworld. */
export function openMenu(from: Phaser.Scene, key: string): void {
  from.scene.launch(key);
  from.scene.pause();
}
