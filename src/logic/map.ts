// Tile maps drawn as text, plus tap-to-walk pathfinding.
// Each character in a map row is one tile (see TILE_CHARS).

export type TileKind =
  | 'path'
  | 'grass'
  | 'tallGrass'
  | 'flowers'
  | 'door'
  | 'tree'
  | 'water'
  | 'house'
  | 'fence';

export const TILE_CHARS: Record<string, TileKind> = {
  '.': 'path',
  ',': 'grass',
  '"': 'tallGrass',
  F: 'flowers',
  D: 'door',
  T: 'tree',
  '~': 'water',
  '#': 'house',
  '=': 'fence',
};

const WALKABLE = new Set<TileKind>(['path', 'grass', 'tallGrass', 'flowers', 'door']);

export interface Point {
  x: number;
  y: number;
}

/** Stepping on (x, y) moves the player to (toX, toY) on map `to`. */
export interface Warp extends Point {
  to: string;
  toX: number;
  toY: number;
}

/** Someone standing on the map (see src/logic/npcs.ts). Nobody can walk onto their tile. */
export interface NpcSpot extends Point {
  id: string;
}

export interface MapDef {
  id: string;
  name: string;
  rows: string[];
  warps: Warp[];
  /** The home door: stepping on it heals the party. */
  home?: Point;
  npcs?: NpcSpot[];
}

export interface GameMap {
  def: MapDef;
  width: number;
  height: number;
  tileAt(x: number, y: number): TileKind | undefined;
  isWalkable(x: number, y: number): boolean;
  warpAt(x: number, y: number): Warp | undefined;
  npcAt(x: number, y: number): NpcSpot | undefined;
}

/** True when `a` is one step up, down, left or right of `b` (where you stand to talk to someone). */
export function isBeside(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function parseMap(def: MapDef): GameMap {
  const height = def.rows.length;
  const width = def.rows[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error(`map ${def.id}: has no tiles`);

  const tiles: TileKind[][] = def.rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`map ${def.id}: row ${y + 1} is ${row.length} wide, expected ${width}`);
    }
    return [...row].map((ch, x) => {
      const kind = TILE_CHARS[ch];
      if (!kind) throw new Error(`map ${def.id}: unknown tile "${ch}" at (${x}, ${y})`);
      return kind;
    });
  });

  const tileAt = (x: number, y: number) => tiles[y]?.[x];
  const isOpenGround = (x: number, y: number) => {
    const t = tileAt(x, y);
    return t !== undefined && WALKABLE.has(t);
  };
  const warpAt = (x: number, y: number) => def.warps.find((w) => w.x === x && w.y === y);
  const npcs = def.npcs ?? [];
  const npcAt = (x: number, y: number) => npcs.find((n) => n.x === x && n.y === y);

  for (const w of def.warps) {
    if (!isOpenGround(w.x, w.y)) throw new Error(`map ${def.id}: warp at (${w.x}, ${w.y}) is not on a walkable tile`);
  }
  npcs.forEach((n, i) => {
    const at = `map ${def.id}: NPC "${n.id}" at (${n.x}, ${n.y})`;
    if (!isOpenGround(n.x, n.y)) throw new Error(`${at} is not on a walkable tile`);
    if (warpAt(n.x, n.y)) throw new Error(`${at} is standing on an exit`);
    if (def.home && def.home.x === n.x && def.home.y === n.y) throw new Error(`${at} is blocking the home door`);
    if (npcs.findIndex((o) => o.x === n.x && o.y === n.y) !== i) throw new Error(`${at} is on top of another NPC`);
  });

  return {
    def,
    width,
    height,
    tileAt,
    isWalkable: (x, y) => isOpenGround(x, y) && !npcAt(x, y),
    warpAt,
    npcAt,
  };
}

const STEPS: Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * Shortest up/down/left/right route from `from` to the tapped tile.
 * If the tapped tile can't be reached (a tree, water), walks to the reachable
 * tile closest to it instead. Warp tiles (exits) are only walked onto when
 * tapped directly, so a tap near an exit never sends a kid somewhere new.
 * Returns the steps after `from`; [] if none.
 */
export function findPath(map: GameMap, from: Point, tapped: Point): Point[] {
  if (!map.isWalkable(from.x, from.y)) {
    throw new Error(`map ${map.def.id}: can't start a path from (${from.x}, ${from.y})`);
  }
  const goal = {
    x: Math.min(map.width - 1, Math.max(0, tapped.x)),
    y: Math.min(map.height - 1, Math.max(0, tapped.y)),
  };
  const key = (p: Point) => p.y * map.width + p.x;
  const cameFrom = new Map<number, Point | null>([[key(from), null]]);
  const queue: Point[] = [from];
  let best = from;
  const distToGoal = (p: Point) => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);

  const isGoal = (p: Point) => p.x === goal.x && p.y === goal.y;
  const isWarp = (p: Point) => map.warpAt(p.x, p.y) !== undefined;
  // A tap off the edge is clamped onto the map, but must not count as tapping an exit.
  const tappedInside = tapped.x === goal.x && tapped.y === goal.y;

  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (isGoal(cur)) {
      best = cur;
      break;
    }
    // BFS visits in order of steps taken, so the first tile at a given goal
    // distance is also the nearest one to walk to.
    if (distToGoal(cur) < distToGoal(best)) best = cur;
    for (const s of STEPS) {
      const next = { x: cur.x + s.x, y: cur.y + s.y };
      if (!map.isWalkable(next.x, next.y) || cameFrom.has(key(next))) continue;
      if (isWarp(next) && !(tappedInside && isGoal(next))) continue;
      cameFrom.set(key(next), cur);
      queue.push(next);
    }
  }

  const path: Point[] = [];
  for (let p: Point | null = best; p && key(p) !== key(from); p = cameFrom.get(key(p)) ?? null) {
    path.unshift(p);
  }
  return path;
}
