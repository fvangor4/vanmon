// Press-and-hold timing, so a 5-year-old can't wipe a save with one tap.

export interface HoldState {
  /** 0 to 1: how full the hold ring is. */
  progress: number;
  /** True exactly once, on the update where the hold completes. */
  done: boolean;
}

export class HoldTracker {
  private startedAt: number | null = null;
  private fired = false;

  constructor(private readonly holdMs: number) {}

  press(now: number): void {
    this.startedAt = now;
    this.fired = false;
  }

  release(): void {
    this.startedAt = null;
    this.fired = false;
  }

  update(now: number): HoldState {
    if (this.startedAt === null) return { progress: 0, done: false };
    const progress = Math.min(1, (now - this.startedAt) / this.holdMs);
    const done = progress >= 1 && !this.fired;
    if (done) this.fired = true;
    return { progress, done };
  }
}
