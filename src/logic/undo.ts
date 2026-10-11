// The drawing screen's Undo: remembers how the picture looked before each stroke or fill.

export const UNDO_LIMIT = 20;

/** The most recent saved states, newest last. Past the limit, the oldest is forgotten. */
export class UndoHistory<T> {
  private states: T[] = [];

  constructor(private readonly limit = UNDO_LIMIT) {}

  get canUndo(): boolean {
    return this.states.length > 0;
  }

  /** Remember a state to go back to. */
  push(state: T): void {
    this.states.push(state);
    if (this.states.length > this.limit) this.states.shift();
  }

  /** The newest remembered state, removed from the history; undefined when there is none. */
  undo(): T | undefined {
    return this.states.pop();
  }

  clear(): void {
    this.states = [];
  }
}
