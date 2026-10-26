import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './phaserConfig';

/**
 * Mounts a single Phaser.Game into a container div for the component's lifetime.
 * All gameplay <-> UI communication goes through the EventBus, so this component
 * needs no props. (StrictMode is intentionally not used; see main.tsx.)
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const game = new Phaser.Game(createGameConfig(el));

    // Re-fit the canvas whenever the stage container changes size (responsive
    // layout, orientation change) — not just on window resize.
    const ro = new ResizeObserver(() => game.scale.refresh());
    ro.observe(el);

    return () => {
      ro.disconnect();
      game.destroy(true);
    };
  }, []);

  return <div ref={containerRef} className="phaser-parent" aria-hidden="true" />;
}
