// The drawing screen: draw a new creature with a finger. Kids take an iPad
// screenshot and send it to a grown-up, who adds it to the game.
// The latest drawing is kept on this iPad (logic/drawingStore), apart from the saved game.

import Phaser from 'phaser';
import { clearDrawing, loadDrawing, saveDrawing } from '../logic/drawingStore';
import { floodFill } from '../logic/fill';
import { browserStore, type KeyValueStore } from '../logic/save';
import { UndoHistory } from '../logic/undo';
import { BigButton, COLORS } from '../ui/Button';
import { HoldButton } from '../ui/HoldButton';
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
/** How different a pixel can be and still get filled: enough to reach into soft crayon edges. */
const FILL_TOLERANCE = 48;

type Tool = 'crayon' | 'eraser' | 'fill';

let store: KeyValueStore | null = null;
/** One store for every visit, so a blocked-storage fallback still remembers within a session. */
const drawingStore = (): KeyValueStore => (store ??= browserStore());
/**
 * True while the stored drawing is still loading into the texture. Drawing waits so
 * it isn't painted over. It belongs to the texture, not one visit, so it survives a
 * close and reopen during the load.
 */
let restoring = false;
/** Bumped to cancel a restore still loading (Clear wins over a late-arriving old drawing). */
let restoreId = 0;
/** How the drawing looked before each stroke or fill. Kept in memory with the texture, never stored. */
const history = new UndoHistory<ImageData>();

const css = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

export class DrawScene extends MenuScene {
  private texture!: Phaser.Textures.CanvasTexture;
  private ctx!: CanvasRenderingContext2D;
  private color = CRAYONS[0];
  private size: number = BRUSH.thick;
  private tool: Tool = 'crayon';
  /** The finger currently drawing, and where it last was (in drawing pixels). */
  private stroke: { pointerId: number; x: number; y: number } | null = null;
  /** The texture changed since the last frame (uploaded once per frame, not per finger move). */
  private dirty = false;
  private undoButton!: BigButton;
  /** What the Undo button last showed, so it's only redrawn on a change (a redraw cancels a press). */
  private undoShown: boolean | null = null;

  constructor() {
    super('Draw');
  }

  create(): void {
    this.color = CRAYONS[0];
    this.size = BRUSH.thick;
    this.tool = 'crayon';
    this.stroke = null;
    this.dirty = false;
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
    // Closing mid-stroke (another finger on ❌) still keeps what was drawn.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.dirty) this.texture.refresh();
      if (this.stroke) {
        this.stroke = null;
        this.keep();
      }
    });
  }

  update(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.texture.refresh();
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
    restoring = true;
    const id = ++restoreId;
    const img = new Image();
    img.onload = () => {
      if (id !== restoreId) return;
      restoring = false;
      this.ctx.drawImage(img, 0, 0, SIZE, SIZE);
      this.texture.refresh();
    };
    img.onerror = () => {
      if (id !== restoreId) return;
      restoring = false;
      console.warn('VanMon: the kept drawing could not be shown; starting with blank paper');
    };
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
          ring(colorRing, b);
          // A color means drawing again after erasing; the fill bucket stays, to fill with the new color.
          if (this.tool === 'eraser') {
            this.tool = 'crayon';
            ring(toolRing, crayon);
          }
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
    const bucket = new BigButton(this, COLS[0], 440, { icon: '🪣', color: COLORS.sunny, width: SWATCH, height: SWATCH, onTap: () => { this.tool = 'fill'; ring(toolRing, bucket); } });
    ring(toolRing, crayon);

    this.undoShown = null;
    this.undoButton = new BigButton(this, COLS[1], 440, { icon: '↩️', color: COLORS.sky, width: SWATCH, height: SWATCH, onTap: () => this.undo() });
    this.updateUndo();
    // Clearing everything needs a long press, so a stray tap can't wipe a drawing.
    new HoldButton(this, (COLS[2] + COLS[3]) / 2, 440, { icon: '🗑️', label: 'Clear', color: COLORS.stop, width: COLS[3] - COLS[2] + SWATCH, height: SWATCH, onTap: () => this.clearAll() });
  }

  private updateUndo(): void {
    if (this.undoShown === history.canUndo) return;
    this.undoShown = history.canUndo;
    this.undoButton.setEnabled(history.canUndo);
  }

  /** Remembers how the drawing looks now, so Undo can come back to it. */
  private snapshot(): void {
    history.push(this.ctx.getImageData(0, 0, SIZE, SIZE));
    this.updateUndo();
  }

  private undo(): void {
    if (this.stroke || restoring) return;
    const before = history.undo();
    this.updateUndo();
    if (!before) return;
    this.ctx.putImageData(before, 0, 0);
    this.dirty = true;
    this.keep();
  }

  /** Blank paper, on screen and on this iPad. Undo can't bring it back. */
  private clearAll(): void {
    // A drawing still loading is cancelled, so it can't reappear over the blank paper.
    restoreId++;
    restoring = false;
    this.stroke = null;
    this.ctx.fillStyle = PAPER;
    this.ctx.fillRect(0, 0, SIZE, SIZE);
    this.dirty = true;
    history.clear();
    this.updateUndo();
    if (!clearDrawing(drawingStore())) console.warn('VanMon: could not forget the kept drawing (storage blocked)');
  }

  private fill(x: number, y: number): void {
    const image = this.ctx.getImageData(0, 0, SIZE, SIZE);
    const c = this.color;
    if (!floodFill(image.data, SIZE, SIZE, x, y, [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff, 255], FILL_TOLERANCE)) return;
    this.snapshot();
    this.ctx.putImageData(image, 0, 0);
    this.dirty = true;
    this.keep();
  }

  /** Converts a screen position to drawing pixels. */
  private toCanvas(p: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: (p.x - CANVAS_X) / SCALE, y: (p.y - CANVAS_Y) / SCALE };
  }

  private paintColor(): string {
    return this.tool === 'eraser' ? PAPER : css(this.color);
  }

  private startStroke(p: Phaser.Input.Pointer): void {
    if (this.stroke || restoring) return; // one finger draws at a time
    const { x, y } = this.toCanvas(p);
    if (this.tool === 'fill') {
      this.fill(x, y);
      return;
    }
    this.snapshot();
    this.stroke = { pointerId: p.id, x, y };
    this.ctx.fillStyle = this.paintColor();
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.dirty = true;
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
    this.dirty = true;
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
