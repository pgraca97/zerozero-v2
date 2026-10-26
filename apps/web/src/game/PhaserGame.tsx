import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

/**
 * Mounts a single Phaser.Game into a container div for the component's lifetime.
 * All gameplay <-> UI communication goes through the EventBus, so this component
 * needs no props. (StrictMode is intentionally not used; see main.tsx.)
 *
 * Phaser and the scenes are loaded on demand: they are most of the bundle, and
 * a static import would keep the page blank until all of it downloaded. This way
 * React paints the loading screen first and Phaser streams in behind it.
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let game: Phaser.Game | undefined;
    let ro: ResizeObserver | undefined;
    let disposed = false;

    void Promise.all([import('phaser'), import('./phaserConfig')]).then(
      ([{ default: PhaserLib }, { createGameConfig }]) => {
        if (disposed) return;
        const g = new PhaserLib.Game(createGameConfig(el));
        game = g;
        // Re-fit the canvas whenever the stage container changes size (responsive
        // layout, orientation change) — not just on window resize.
        ro = new ResizeObserver(() => g.scale.refresh());
        ro.observe(el);
      },
    );

    return () => {
      disposed = true;
      ro?.disconnect();
      game?.destroy(true);
    };
  }, []);

  return <div ref={containerRef} className="phaser-parent" aria-hidden="true" />;
}
