import { describe, expect, it } from 'vitest';
import { isUpright } from './rotatePrompt';

describe('isUpright', () => {
  it('follows the iPad itself when it can', () => {
    expect(isUpright({ type: 'portrait-primary', windowIsTall: true })).toBe(true);
    expect(isUpright({ type: 'portrait-secondary', windowIsTall: false })).toBe(true);
    // Split View on a sideways iPad: tall window, but no prompt
    expect(isUpright({ type: 'landscape-primary', windowIsTall: true })).toBe(false);
  });

  it('falls back to the window shape when the orientation is unknown', () => {
    expect(isUpright({ type: undefined, windowIsTall: true })).toBe(true);
    expect(isUpright({ type: undefined, windowIsTall: false })).toBe(false);
  });
});
