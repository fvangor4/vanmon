// Tile and player pictures drawn in code (no art files needed for the world).

import Phaser from 'phaser';
import type { TileKind } from '../logic/map';

export const TILE = 64;

export function tileTexture(kind: TileKind | 'roof'): string {
  return `tile:${kind}`;
}

export const PLAYER_TEXTURE = 'player';
/** The Gold Kid NPC: the player sprite, all in gold. */
export const GOLD_KID_TEXTURE = 'gold-kid';

type Draw = (g: Phaser.GameObjects.Graphics) => void;

const GROUND = 0x8fd16a;

const ground: Draw = (g) => {
  g.fillStyle(GROUND).fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x7fc45c);
  for (const [x, y] of [[10, 12], [40, 20], [24, 44], [52, 52], [6, 54]]) g.fillRect(x, y, 4, 4);
};

const DRAW: Record<TileKind | 'roof', Draw> = {
  path: (g) => {
    g.fillStyle(0xf2d9a0).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xe6c785);
    for (const [x, y] of [[12, 10], [44, 24], [20, 46], [50, 50]]) g.fillCircle(x, y, 3);
  },
  grass: ground,
  tallGrass: (g) => {
    g.fillStyle(0x5aa83c).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x3f8a2a);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const x = 4 + i * 16;
        const y = 12 + j * 30;
        g.fillTriangle(x, y + 22, x + 6, y, x + 12, y + 22);
      }
    }
  },
  flowers: (g) => {
    ground(g);
    for (const [x, y, c] of [[16, 18, 0xff6f91], [44, 14, 0xffd84a], [30, 42, 0xffffff], [52, 46, 0xff6f91]] as const) {
      g.fillStyle(c).fillCircle(x, y, 6);
      g.fillStyle(0xffb400).fillCircle(x, y, 2);
    }
  },
  tree: (g) => {
    ground(g);
    g.fillStyle(0x7a4a23).fillRect(26, 40, 12, 20);
    g.fillStyle(0x2f7d32).fillCircle(32, 28, 24);
    g.fillStyle(0x43a047).fillCircle(26, 22, 12);
  },
  water: (g) => {
    g.fillStyle(0x4fa8e8).fillRect(0, 0, TILE, TILE);
    g.lineStyle(3, 0xbfe6ff, 0.9);
    g.beginPath();
    g.arc(18, 22, 8, Math.PI * 1.1, Math.PI * 1.9);
    g.strokePath();
    g.beginPath();
    g.arc(44, 44, 8, Math.PI * 1.1, Math.PI * 1.9);
    g.strokePath();
  },
  house: (g) => {
    g.fillStyle(0xfff3d6).fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, 0xd8c9a3).strokeRect(1, 1, TILE - 2, TILE - 2);
    g.fillStyle(0x7fd0ff).fillRect(18, 18, 28, 24);
    g.lineStyle(3, 0x8a5a2b).strokeRect(18, 18, 28, 24);
  },
  roof: (g) => {
    g.fillStyle(0xe0524a).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xc23f38);
    for (let y = 8; y < TILE; y += 16) g.fillRect(0, y, TILE, 4);
  },
  door: (g) => {
    g.fillStyle(0xfff3d6).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x8a5a2b).fillRoundedRect(14, 8, 36, 56, { tl: 16, tr: 16, bl: 0, br: 0 });
    g.fillStyle(0xffd84a).fillCircle(42, 38, 4);
    g.fillStyle(0xff6f91).fillCircle(32, 22, 6);
  },
  fence: (g) => {
    ground(g);
    g.fillStyle(0xd9a066);
    g.fillRect(4, 18, 8, 40).fillRect(52, 18, 8, 40);
    g.fillRect(0, 26, TILE, 8).fillRect(0, 44, TILE, 8);
  },
};

interface KidColors {
  shirt: number;
  face: number;
  cap: number;
  eyes: number;
  cheeks: number;
}

const PLAYER_COLORS: KidColors = { shirt: 0x3b8fe0, face: 0xffd9b3, cap: 0xffc83d, eyes: 0x222222, cheeks: 0xff8fa3 };
const GOLD_COLORS: KidColors = { shirt: 0xd4a017, face: 0xffd54a, cap: 0xb8860b, eyes: 0x5a3a00, cheeks: 0xffe9a0 };

function drawKid(g: Phaser.GameObjects.Graphics, c: KidColors): void {
  // A kid with a cap, sized to one tile.
  g.fillStyle(0x000000, 0.2).fillEllipse(32, 60, 36, 10);
  g.fillStyle(c.shirt).fillRoundedRect(18, 34, 28, 24, 10); // shirt
  g.fillStyle(c.face).fillCircle(32, 26, 15); // face
  g.fillStyle(c.cap).fillRoundedRect(15, 8, 34, 14, 8); // cap
  g.fillStyle(c.cap).fillRect(30, 16, 22, 6); // brim
  g.fillStyle(c.eyes).fillCircle(26, 28, 3).fillCircle(38, 28, 3); // eyes
  g.fillStyle(c.cheeks, 0.8).fillCircle(22, 33, 3).fillCircle(42, 33, 3); // cheeks
}

function drawGoldKid(g: Phaser.GameObjects.Graphics): void {
  drawKid(g, GOLD_COLORS);
  // a little shine so it reads as gold, not just yellow
  g.fillStyle(0xffffff, 0.75).fillCircle(22, 14, 2.5).fillCircle(24, 42, 2);
  g.fillStyle(0xfff3b0).fillTriangle(54, 4, 56, 10, 52, 10).fillTriangle(54, 16, 56, 10, 52, 10);
  g.fillStyle(0xfff3b0).fillTriangle(48, 10, 54, 8, 54, 12).fillTriangle(60, 10, 54, 8, 54, 12);
}

export function makeTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const [kind, draw] of Object.entries(DRAW)) {
    const key = tileTexture(kind as TileKind | 'roof');
    if (scene.textures.exists(key)) continue;
    g.clear();
    draw(g);
    g.generateTexture(key, TILE, TILE);
  }
  if (!scene.textures.exists(PLAYER_TEXTURE)) {
    g.clear();
    drawKid(g, PLAYER_COLORS);
    g.generateTexture(PLAYER_TEXTURE, TILE, TILE);
  }
  if (!scene.textures.exists(GOLD_KID_TEXTURE)) {
    g.clear();
    drawGoldKid(g);
    g.generateTexture(GOLD_KID_TEXTURE, TILE, TILE);
  }
  g.destroy();
}
