// "Turn your iPad sideways!" — shown when the iPad itself is upright.
// Uses the device orientation, not the window shape, so a narrow Split View
// window on a sideways iPad doesn't trigger it.

export interface OrientationSource {
  /** e.g. 'portrait-primary' (screen.orientation.type); undefined if unknown. */
  type: string | undefined;
  /** Fallback when the type is unknown: the window's own shape. */
  windowIsTall: boolean;
}

export function isUpright(o: OrientationSource): boolean {
  if (o.type) return o.type.startsWith('portrait');
  return o.windowIsTall;
}

function read(): OrientationSource {
  return {
    type: typeof screen !== 'undefined' ? screen.orientation?.type : undefined,
    windowIsTall: window.innerHeight > window.innerWidth,
  };
}

export function watchOrientation(prompt: HTMLElement): void {
  const update = () => prompt.classList.toggle('show', isUpright(read()));
  update();
  screen.orientation?.addEventListener('change', update);
  window.addEventListener('resize', update);
}
