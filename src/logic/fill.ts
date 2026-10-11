// The drawing screen's fill bucket: paints the area a kid tapped, stopping at lines.

export type Rgba = readonly [number, number, number, number];

/**
 * Fills the area connected to (x, y) that matches the tapped pixel's color, in
 * place. Pixels count as a match when every channel is within `tolerance`, so the
 * fill reaches into the soft edges of crayon lines. Areas connect up, down, left
 * and right, never corner to corner, so a fill can't slip through a diagonal line.
 * Returns false (and changes nothing) for a tap outside the picture or on an area
 * already that color.
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: Rgba,
  tolerance: number,
): boolean {
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (!(sx >= 0 && sx < width && sy >= 0 && sy < height)) return false;

  // Stored the way the pixels are (whole numbers 0-255), so "already that color" compares like with like.
  const paint = Uint8ClampedArray.from(color);
  const start = (sy * width + sx) * 4;
  const seed = [pixels[start], pixels[start + 1], pixels[start + 2], pixels[start + 3]];
  if (seed.every((v, c) => v === paint[c])) return false;

  const matches = (i: number) =>
    Math.abs(pixels[i] - seed[0]) <= tolerance &&
    Math.abs(pixels[i + 1] - seed[1]) <= tolerance &&
    Math.abs(pixels[i + 2] - seed[2]) <= tolerance &&
    Math.abs(pixels[i + 3] - seed[3]) <= tolerance;

  // Visited pixels are tracked separately so a fill color close to the tapped color still finishes.
  const visited = new Uint8Array(width * height);
  const stack = [sy * width + sx];
  visited[stack[0]] = 1;
  while (stack.length > 0) {
    const p = stack.pop()!;
    pixels.set(paint, p * 4);
    const px = p % width;
    const neighbors = [
      px > 0 ? p - 1 : -1,
      px < width - 1 ? p + 1 : -1,
      p >= width ? p - width : -1,
      p < width * (height - 1) ? p + width : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && !visited[n] && matches(n * 4)) {
        visited[n] = 1;
        stack.push(n);
      }
    }
  }
  return true;
}
