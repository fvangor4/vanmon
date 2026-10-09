// The v1 world: home town, a grassy route, and a pond.
// Legend: . path  , grass  " tall grass (wild creatures!)  F flowers  D door
//         T tree  ~ water  # house  = fence

import type { AreaEncounters } from '../logic/encounters';
import type { MapDef, Point } from '../logic/map';

export const MAPS: Record<string, MapDef> = {
  town: {
    id: 'town',
    name: 'Home Town',
    home: { x: 7, y: 4 },
    rows: [
    'TTTTTTTTT..TTTTTTTTT',
    'T..................T',
    'T.F..####....F..,,.T',
    'T....####.......,,.T',
    'T....##D#..........T',
    'T.......,,,....F...T',
    'T..F....,,,........T',
    'T..................T',
    'T.====......FF.....T',
    'T.......~~~~.......T',
    'T..F....~~~~...F...T',
    'T.......~~~~.......T',
    'T.F..........,,,,..T',
    'T........F.........T',
    'TTTTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 0, to: 'route', toX: 11, toY: 16 },
      { x: 10, y: 0, to: 'route', toX: 12, toY: 16 },
    ],
  },
  route: {
    id: 'route',
    name: 'Grassy Route',
    rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'T......""""""........TTT',
    'T.....""""""""......TTTT',
    'T.....""""""""...TT....T',
    'T......""""""....TT....T',
    'T......................T',
    'T..TT.......""""""".....',
    'T..TT......"""""""""....',
    'T.........."""""""""....',
    'T...F.......""""""".....',
    'T......................T',
    'T.""""".........F......T',
    'T"""""""......TT.......T',
    'T""""""".....TT..""""..T',
    'T."""""........."""""".T',
    'T................""""..T',
    'T......................T',
    'TTTTTTTTTTT..TTTTTTTTTTT',
    ],
    warps: [
      { x: 11, y: 17, to: 'town', toX: 9, toY: 1 },
      { x: 12, y: 17, to: 'town', toX: 10, toY: 1 },
      { x: 23, y: 7, to: 'pond', toX: 1, toY: 7 },
      { x: 23, y: 8, to: 'pond', toX: 1, toY: 8 },
    ],
  },
  pond: {
    id: 'pond',
    name: 'Sparkle Pond',
    rows: [
    'TTTTTTTTTTTTTTTTTTTT',
    'T..""""......""""..T',
    'T.""""""...."""""".T',
    'T.""~~~~~~~~~~~~"".T',
    'T..~~~~~~~~~~~~~~..T',
    'T..~~~~~~~~~~~~~~..T',
    'T...~~~~~~~~~~~~...T',
    '.........~~~~~.....T',
    '..........~~~......T',
    'T..""".............T',
    'T.""""""....""""...T',
    'T."""""....."""""".T',
    'T..""".....""""....T',
    'T....F.........F...T',
    'TTTTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 0, y: 7, to: 'route', toX: 22, toY: 7 },
      { x: 0, y: 8, to: 'route', toX: 22, toY: 8 },
    ],
  },
};

/** Where a new game begins: just outside the home door. */
export const START: Point & { map: string } = { map: 'town', x: 7, y: 5 };

/** Wild creatures in each map's tall grass. Which species live where is in creatures.json ("areas"). */
export const AREAS: Record<string, AreaEncounters> = {
  route: { chance: 0.15, minLevel: 2, maxLevel: 4 },
  pond: { chance: 0.15, minLevel: 3, maxLevel: 5 },
};
