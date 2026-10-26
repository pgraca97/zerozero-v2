// Pushes a message to the visually-hidden aria-live region for screen readers.
export function announce(message: string): void {
  const el = document.getElementById('game-announcer');
  if (!el) return;
  el.textContent = '';
  // Clearing then setting on a tick makes repeat messages re-announce.
  window.setTimeout(() => {
    el.textContent = message;
  }, 50);
}
