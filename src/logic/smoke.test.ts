import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

describe('game config', () => {
  it('uses a landscape iPad-shaped logical size', () => {
    expect(GAME_WIDTH).toBe(1024);
    expect(GAME_HEIGHT).toBe(768);
    expect(GAME_WIDTH).toBeGreaterThan(GAME_HEIGHT);
  });
});
