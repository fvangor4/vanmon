import { describe, expect, it } from 'vitest';
import { findPath, parseMap, type MapDef } from './map';
import { MAPS, START } from '../data/maps';

function def(rows: string[], extra: Partial<MapDef> = {}): MapDef {
  return { id: 'test', name: 'Test', rows, warps: [], ...extra };
}

describe('parseMap', () => {
  it('knows which tiles you can walk on', () => {
    const m = parseMap(def(['.T~', '"#,', 'DF=']));
    expect(m.width).toBe(3);
    expect(m.height).toBe(3);
    expect(m.isWalkable(0, 0)).toBe(true); // path
    expect(m.isWalkable(1, 0)).toBe(false); // tree
    expect(m.isWalkable(2, 0)).toBe(false); // water
    expect(m.isWalkable(0, 1)).toBe(true); // tall grass
    expect(m.isWalkable(1, 1)).toBe(false); // house
    expect(m.isWalkable(2, 1)).toBe(true); // short grass
    expect(m.isWalkable(0, 2)).toBe(true); // door
    expect(m.isWalkable(1, 2)).toBe(true); // flowers
    expect(m.isWalkable(2, 2)).toBe(false); // fence
    expect(m.isWalkable(-1, 0)).toBe(false);
    expect(m.isWalkable(3, 0)).toBe(false);
    expect(m.tileAt(0, 1)).toBe('tallGrass');
  });

  it('rejects ragged rows, unknown tiles, and warps on blocked tiles', () => {
    expect(() => parseMap(def(['...', '..']))).toThrow(/row 2/);
    expect(() => parseMap(def(['.?.']))).toThrow(/"\?"/);
    expect(() =>
      parseMap(def(['.T'], { warps: [{ x: 1, y: 0, to: 'x', toX: 0, toY: 0 }] })),
    ).toThrow(/warp/);
  });

  it('finds warps by position', () => {
    const m = parseMap(def(['..'], { warps: [{ x: 1, y: 0, to: 'route', toX: 3, toY: 4 }] }));
    expect(m.warpAt(1, 0)).toEqual({ x: 1, y: 0, to: 'route', toX: 3, toY: 4 });
    expect(m.warpAt(0, 0)).toBeUndefined();
  });
});

describe('findPath', () => {
  const open = parseMap(def(['.....', '.....', '.....']));

  it('returns the steps to the tapped tile (not including where you stand)', () => {
    const path = findPath(open, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
  });

  it('returns no steps when you tap where you stand', () => {
    expect(findPath(open, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
  });

  it('walks around obstacles using a shortest route with only up/down/left/right steps', () => {
    const m = parseMap(def(['.T.', '.T.', '...']));
    const path = findPath(m, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path).toHaveLength(6);
    expect(path.at(-1)).toEqual({ x: 2, y: 0 });
    let prev = { x: 0, y: 0 };
    for (const step of path) {
      expect(Math.abs(step.x - prev.x) + Math.abs(step.y - prev.y)).toBe(1);
      expect(m.isWalkable(step.x, step.y)).toBe(true);
      prev = step;
    }
  });

  it('tapping a tree or water walks to the closest reachable spot next to it', () => {
    const m = parseMap(def(['....', '..~~', '..~~']));
    const path = findPath(m, { x: 0, y: 0 }, { x: 3, y: 2 });
    expect(path.at(-1)).toEqual({ x: 3, y: 0 });
  });

  it('returns no steps when nothing closer is reachable', () => {
    const m = parseMap(def(['.T.']));
    expect(findPath(m, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([]);
  });

  it('ignores taps outside the map by clamping to the edge', () => {
    expect(findPath(open, { x: 0, y: 0 }, { x: 99, y: 0 }).at(-1)).toEqual({ x: 4, y: 0 });
  });
});

describe('game maps', () => {
  it('all parse, and the start spot is walkable', () => {
    for (const d of Object.values(MAPS)) parseMap(d);
    expect(parseMap(MAPS[START.map]).isWalkable(START.x, START.y)).toBe(true);
  });

  it('every warp lands on a walkable tile of an existing map, and has a way back', () => {
    for (const d of Object.values(MAPS)) {
      for (const w of d.warps) {
        const target = MAPS[w.to];
        expect(target, `${d.id} warp to ${w.to}`).toBeDefined();
        expect(parseMap(target).isWalkable(w.toX, w.toY), `${d.id} → ${w.to} (${w.toX},${w.toY})`).toBe(true);
        expect(target.warps.some((back) => back.to === d.id), `${w.to} has a warp back to ${d.id}`).toBe(true);
      }
    }
  });

  it('can reach every warp from the spot you arrive at (no one gets stuck)', () => {
    for (const d of Object.values(MAPS)) {
      const m = parseMap(d);
      const arrivals = Object.values(MAPS).flatMap((o) => o.warps.filter((w) => w.to === d.id));
      for (const a of arrivals) {
        for (const w of d.warps) {
          const path = findPath(m, { x: a.toX, y: a.toY }, { x: w.x, y: w.y });
          const end = path.at(-1) ?? { x: a.toX, y: a.toY };
          expect(end, `${d.id}: from (${a.toX},${a.toY}) to warp (${w.x},${w.y})`).toEqual({ x: w.x, y: w.y });
        }
      }
    }
  });

  it('has a home door in town, and tall grass on the route and at the pond', () => {
    const town = parseMap(MAPS.town);
    expect(MAPS.town.home).toBeDefined();
    expect(town.tileAt(MAPS.town.home!.x, MAPS.town.home!.y)).toBe('door');
    for (const id of ['route', 'pond']) {
      expect(MAPS[id].rows.join('')).toContain('"');
    }
  });
});
