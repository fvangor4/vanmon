import { describe, expect, it } from 'vitest';
import { floodFill, type Rgba } from './fill';

const WHITE: Rgba = [255, 255, 255, 255];
const BLACK: Rgba = [0, 0, 0, 255];
const RED: Rgba = [230, 40, 40, 255];

/** Builds an image from rows of characters: '.' white, '#' black, '~' almost white. */
function image(rows: string[]) {
  const height = rows.length;
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color: Rgba = ch === '#' ? BLACK : ch === '~' ? [250, 248, 252, 255] : WHITE;
      pixels.set(color, (y * width + x) * 4);
    }),
  );
  return { pixels, width, height };
}

/** Reads the image back as rows: 'R' for red, '#' black, '.' anything else. */
function rows(img: { pixels: Uint8ClampedArray; width: number; height: number }): string[] {
  const out: string[] = [];
  for (let y = 0; y < img.height; y++) {
    let row = '';
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const px = [...img.pixels.subarray(i, i + 4)];
      row += px.join() === RED.join() ? 'R' : px.join() === BLACK.join() ? '#' : '.';
    }
    out.push(row);
  }
  return out;
}

describe('floodFill', () => {
  it('fills only the enclosed area that was tapped', () => {
    const img = image([
      '.......',
      '.#####.',
      '.#...#.',
      '.#...#.',
      '.#####.',
      '.......',
    ]);
    const changed = floodFill(img.pixels, img.width, img.height, 3, 2, RED, 0);
    expect(changed).toBe(true);
    expect(rows(img)).toEqual([
      '.......',
      '.#####.',
      '.#RRR#.',
      '.#RRR#.',
      '.#####.',
      '.......',
    ]);
  });

  it('fills the outside without leaking through a closed outline', () => {
    const img = image([
      '.....',
      '.###.',
      '.#.#.',
      '.###.',
    ]);
    floodFill(img.pixels, img.width, img.height, 0, 0, RED, 0);
    expect(rows(img)).toEqual([
      'RRRRR',
      'R###R',
      'R#.#R',
      'R###R',
    ]);
  });

  it('does not cross a line that only touches corner to corner', () => {
    const img = image([
      '.#.',
      '#..',
    ]);
    floodFill(img.pixels, img.width, img.height, 0, 0, RED, 0);
    expect(rows(img)).toEqual([
      'R#.',
      '#..',
    ]);
  });

  it('never wraps from one edge of the picture to the other', () => {
    const left = image(['##.', '.##']);
    floodFill(left.pixels, left.width, left.height, 0, 1, RED, 0);
    expect(rows(left)).toEqual(['##.', 'R##']);

    const right = image(['##.', '.##']);
    floodFill(right.pixels, right.width, right.height, 2, 0, RED, 0);
    expect(rows(right)).toEqual(['##R', '.##']);
  });

  it('treats nearly matching colors as the same area when given a tolerance', () => {
    const img = image(['..~~', '#~..']);
    floodFill(img.pixels, img.width, img.height, 0, 0, RED, 0);
    expect(rows(img)).toEqual(['RR..', '#...']);

    const img2 = image(['..~~', '#~..']);
    floodFill(img2.pixels, img2.width, img2.height, 0, 0, RED, 16);
    expect(rows(img2)).toEqual(['RRRR', '#RRR']);
  });

  it('counts a color exactly at the tolerance as matching', () => {
    // '~' differs from white by at most 7 in any channel.
    const atLimit = image(['.~']);
    floodFill(atLimit.pixels, atLimit.width, atLimit.height, 0, 0, RED, 7);
    expect(rows(atLimit)).toEqual(['RR']);

    const underLimit = image(['.~']);
    floodFill(underLimit.pixels, underLimit.width, underLimit.height, 0, 0, RED, 6);
    expect(rows(underLimit)).toEqual(['R.']);
  });

  it('finishes when the fill color is within tolerance of the tapped color', () => {
    const img = image(['....', '....']);
    const nearWhite: Rgba = [250, 250, 250, 255];
    expect(floodFill(img.pixels, img.width, img.height, 1, 1, nearWhite, 32)).toBe(true);
    expect([...img.pixels.subarray(0, 4)]).toEqual(nearWhite);
    expect([...img.pixels.subarray(28, 32)]).toEqual(nearWhite);
  });

  it('changes nothing when the tapped area is already that color', () => {
    const img = image(['..#', '..#']);
    const before = img.pixels.slice();
    expect(floodFill(img.pixels, img.width, img.height, 0, 0, WHITE, 0)).toBe(false);
    expect(img.pixels).toEqual(before);

    // The same color written with out-of-range or fractional numbers is still "already that color".
    expect(floodFill(img.pixels, img.width, img.height, 0, 0, [255.2, 300, 254.8, 255], 0)).toBe(false);
  });

  it('changes nothing when the tap is outside the picture', () => {
    const img = image(['...', '...']);
    const before = img.pixels.slice();
    for (const [x, y] of [[-1, 0], [3, 0], [0, -1], [0, 2], [Number.NaN, 0]]) {
      expect(floodFill(img.pixels, img.width, img.height, x, y, RED, 0)).toBe(false);
    }
    expect(img.pixels).toEqual(before);
  });

  it('accepts fractional tap positions by using the pixel underneath', () => {
    const img = image(['.#.', '.#.']);
    floodFill(img.pixels, img.width, img.height, 2.7, 1.4, RED, 0);
    expect(rows(img)).toEqual(['.#R', '.#R']);
  });
});
