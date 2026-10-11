// The drawing screen: draw a new creature with a finger. Kids take an iPad
// screenshot and send it to a grown-up, who adds it to the game.
// The latest drawing is kept on this iPad (logic/drawingStore), apart from the saved game.

import Phaser from 'phaser';
import { loadDrawing, saveDrawing } from '../logic/drawingStore';
import { browserStore, type KeyValueStore } from '../logic/save';
import { BigButton, COLORS } from '../ui/Button';
import { MenuScene } from './menuBase';

/** Pixel size of the drawing (the same as creature art), whatever size it is shown at. */
const SIZE = 512;
const TEXTURE = 'drawing';
/** Where the drawing sits on screen. */
const CANVAS_X = 56;
const CANVAS_Y = 150;
const SHOWN = 576;
const SCALE = SHOWN / SIZE;

const PAPER = '#ffffff';
const CRAYONS = [0x222222, 0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa, 0xf06292];
const BRUSH = { thin: 10, thick: 28 } as const;
/** Centers of the four tool columns on the right. */
const COLS = [700, 780, 860, 940];
const SWATCH = 68;

type Tool = 'crayon' | 'eraser';

let store: KeyValueStore | null = null;
/** One store for every visit, so a blocked-storage fallback still remembers within a session. */
const drawingStore = (): KeyValueStore => (store ??= browserStore());

const css = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

export class DrawScene extends MenuScene {
  private texture!: Phaser.Textures.CanvasTexture;
  private ctx!: CanvasRenderingContext2D;
  private color = CRAYONS[0];
  private size: number = BRUSH.thick;
  private tool: Tool = 'crayon';
  /** The finger currently drawing, and where it last was (in drawing pixels). */
  private stroke: { pointerId: number; x: number; y: number } | null = null;
  /** True while a stored drawing is still loading; drawing waits so it isn't painted over. */
  private restoring = false;

  constructor() {
    super('Draw');
  }

  create(): void {
    this.color = CRAYONS[0];
    this.size = BRUSH.thick;
    this.tool = 'crayon';
    this.stroke = null;
    this.restoring = false;
    this.frame('🎨 Draw a Creature');
    this.setUpCanvas();
    this.drawTools();
  }

  private setUpCanvas(): void {
    // The texture outlives the screen, so coming back shows the drawing straight away.
    if (this.textures.exists(TEXTURE)) {
      this.texture = this.textures.get(TEXTURE) as Phaser.Textures.CanvasTexture;
      this.ctx = this.texture.getContext();
    } else {
      this.texture = this.textures.createCanvas(TEXTURE, SIZE, SIZE)!;
      this.ctx = this.texture.getContext();
      this.fillPaper();
      this.restore();
    }

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2).fillRoundedRect(CANVAS_X - 4, CANVAS_Y + 2, SHOWN + 8, SHOWN + 8, 12);
    const image = this.add.image(CANVAS_X, CANVAS_Y, TEXTURE).setOrigin(0).setDisplaySize(SHOWN, SHOWN).setInteractive();
    g.lineStyle(4, COLORS.ink).strokeRect(CANVAS_X, CANVAS_Y, SHOWN, SHOWN);

    image.on('pointerdown', (p: Phaser.Input.Pointer) => this.startStroke(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.continueStroke(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.endStroke(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.endStroke(p));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove').off('pointerup').off('pointerupoutside');
    });
  }

  private fillPaper(): void {
    this.ctx.fillStyle = PAPER;
    this.ctx.fillRect(0, 0, SIZE, SIZE);
    this.texture.refresh();
  }

  /** Puts back the drawing kept on this iPad, if there is one. */
  private restore(): void {
    const saved = loadDrawing(drawingStore());
    if (!saved) return;
    this.restoring = true;
    const img = new Image();
    const done = () => {
      this.restoring = false;
    };
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, SIZE, SIZE);
      this.texture.refresh();
      done();
    };
    img.onerror = done;
    img.src = saved.png;
  }

  private drawTools(): void {
    const colorRing = this.add.graphics();
    CRAYONS.forEach((color, i) => {
      const b = new BigButton(this, COLS[i % 4], 185 + Math.floor(i / 4) * 84, {
        icon: '',
        color,
        width: SWATCH,
        height: SWATCH,
        onTap: () => {
          this.color = color;
          this.tool = 'crayon';
          ring(colorRing, b);
          ring(toolRing, crayon);
        },
      });
      if (i === 0) ring(colorRing, b);
    });

    const sizeRing = this.add.graphics();
    const thin = new BigButton(this, COLS[0], 355, { icon: '•', color: COLORS.ink, width: SWATCH, height: SWATCH, onTap: () => { this.size = BRUSH.thin; ring(sizeRing, thin); } });
    const thick = new BigButton(this, COLS[1], 355, { icon: '⬤', color: COLORS.ink, width: SWATCH, height: SWATCH, onTap: () => { this.size = BRUSH.thick; ring(sizeRing, thick); } });
    ring(sizeRing, thick);

    const toolRing = this.add.graphics();
    const crayon = new BigButton(this, COLS[2], 355, { icon: '🖍️', color: COLORS.sunny, width: SWATCH, height: SWATCH, onTap: () => { this.tool = 'crayon'; ring(toolRing, crayon); } });
    const eraser = new BigButton(this, COLS[3], 355, { icon: '🧽', color: COLORS.sky, width: SWATCH, height: SWATCH, onTap: () => { this.tool = 'eraser'; ring(toolRing, eraser); } });
    ring(toolRing, crayon);
  }

  /** Converts a screen position to drawing pixels. */
  private toCanvas(p: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: (p.x - CANVAS_X) / SCALE, y: (p.y - CANVAS_Y) / SCALE };
  }

  private paintColor(): string {
    return this.tool === 'eraser' ? PAPER : css(this.color);
  }

  private startStroke(p: Phaser.Input.Pointer): void {
    if (this.stroke || this.restoring) return; // one finger draws at a time
    const { x, y } = this.toCanvas(p);
    this.stroke = { pointerId: p.id, x, y };
    this.ctx.fillStyle = this.paintColor();
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.texture.refresh();
  }

  private continueStroke(p: Phaser.Input.Pointer): void {
    if (!this.stroke || p.id !== this.stroke.pointerId || !p.isDown) return;
    const { x, y } = this.toCanvas(p);
    const ctx = this.ctx;
    ctx.strokeStyle = this.paintColor();
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.stroke.x, this.stroke.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    this.stroke.x = x;
    this.stroke.y = y;
    this.texture.refresh();
  }

  private endStroke(p: Phaser.Input.Pointer): void {
    if (!this.stroke || p.id !== this.stroke.pointerId) return;
    this.stroke = null;
    this.keep();
  }

  /** Saves the drawing on this iPad. A failure only costs the drawing after a restart. */
  private keep(): void {
    const png = this.texture.getCanvas().toDataURL('image/png');
    if (!saveDrawing(drawingStore(), { type: null, png })) console.warn('VanMon: could not keep the drawing (too big, or storage full or blocked)');
  }
}

/** Marks the chosen button with a dark ring. */
function ring(g: Phaser.GameObjects.Graphics, b: BigButton): void {
  g.clear().lineStyle(6, COLORS.ink).strokeRoundedRect(b.x - SWATCH / 2 - 8, b.y - SWATCH / 2 - 8, SWATCH + 16, SWATCH + 16, 28);
}
