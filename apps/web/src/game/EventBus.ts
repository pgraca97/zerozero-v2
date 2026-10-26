// Tiny typed event emitter bridging Phaser <-> React.
//
// Phaser scenes emit gameplay events; React listens and renders HUD/overlays.
// React emits commands; the active Phaser scene listens and reacts.
// Keeping a single shared instance avoids React importing Phaser and vice-versa.

import type {
  ActivePowerUp,
  GameOverPayload,
  LevelInfo,
  PowerUpType,
} from './types';

/** Phaser -> React (state changes) and React -> Phaser (commands). */
export interface GameEvents {
  // --- Phaser -> React ---
  'loading-progress': number; // 0..1
  'preload-complete': void;
  'score-changed': number;
  'lives-changed': number;
  'level-changed': LevelInfo;
  'powerup-activated': ActivePowerUp;
  'powerup-cleared': PowerUpType;
  'game-over': GameOverPayload;
  'level-won': GameOverPayload;
  'paused': void;
  'resumed': void;

  // --- React -> Phaser (commands) ---
  'cmd-start': { levelIndex: number; keepScore?: boolean };
  'cmd-pause': void;
  'cmd-resume': void;
  'cmd-quit': void;
  'cmd-mute': boolean;
}

// A `() => void` handler is assignable to `(payload: void) => void`, so void
// events can still be subscribed with a zero-arg callback. Using a plain
// (non-conditional) param type keeps contextual inference working for callers.
type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

class TypedEmitter {
  private handlers = new Map<keyof GameEvents, Set<(p: unknown) => void>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    const fn = handler as (p: unknown) => void;
    set.add(fn);
    return () => set!.delete(fn);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler as (p: unknown) => void);
  }

  emit<K extends keyof GameEvents>(
    event: K,
    ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    const payload = args[0];
    for (const fn of [...set]) fn(payload);
  }
}

export const EventBus = new TypedEmitter();
