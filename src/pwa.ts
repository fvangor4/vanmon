// Keeps the installed iPad app up to date without interrupting play.
// A new version (for example, a kid's new creature) downloads in the
// background; it is switched to on the title screen, never mid-adventure.

import { registerSW } from 'virtual:pwa-register';

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let updateReady = false;

export function startUpdates(): void {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // iPad apps resume instead of relaunching, so look for updates whenever the app comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });
}

/** Called from the title screen: if a new version is waiting, switch to it now. */
export function applyUpdateIfReady(): boolean {
  if (!updateReady || !applyUpdate) return false;
  void applyUpdate(true);
  return true;
}
