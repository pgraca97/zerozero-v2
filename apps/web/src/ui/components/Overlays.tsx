import { isLevelUnlocked } from '../../game/data/levels';
import type { GameOverPayload, LevelInfo } from '../../game/types';

export function LoadingOverlay({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="overlay loading">
      <h1 className="loading-title">ZeroZero</h1>
      <div className="loading-bar">
        <div className="loading-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="loading-pct">{pct}%</p>
    </div>
  );
}

export function PauseOverlay(
  { onResume, onRestart, onQuit }: { onResume: () => void; onRestart: () => void; onQuit: () => void },
) {
  return (
    <div className="overlay dim">
      <h2 className="screen-title">Paused</h2>
      <div className="menu-buttons">
        <button className="btn primary" onClick={onResume} autoFocus>Resume</button>
        <button className="btn" onClick={onRestart}>Restart</button>
        <button className="btn ghost" onClick={onQuit}>Quit to Menu</button>
      </div>
    </div>
  );
}

export function GameOverOverlay(
  { payload, onRetry, onQuit }: { payload: GameOverPayload; onRetry: () => void; onQuit: () => void },
) {
  return (
    <div className="overlay dim">
      <h2 className="screen-title danger">Game Over</h2>
      <p className="big-score">{payload.score}</p>
      {payload.isNewHighScore && <p className="badge">New High Score!</p>}
      <p className="sub">Best: {payload.highScore}</p>
      <div className="menu-buttons">
        <button className="btn primary" onClick={onRetry} autoFocus>Retry</button>
        <button className="btn ghost" onClick={onQuit}>Menu</button>
      </div>
    </div>
  );
}

export function WinOverlay(
  { payload, level, onNext, onReplay, onQuit }: {
    payload: GameOverPayload;
    level: LevelInfo | null;
    onNext: () => void;
    onReplay: () => void;
    onQuit: () => void;
  },
) {
  const hasNext = level != null && isLevelUnlocked(level.index + 1);
  return (
    <div className="overlay dim">
      <h2 className="screen-title success">You Win!</h2>
      <p className="big-score">{payload.score}</p>
      {payload.isNewHighScore && <p className="badge">New High Score!</p>}
      <div className="menu-buttons">
        {hasNext && <button className="btn primary" onClick={onNext} autoFocus>Next Level</button>}
        <button className="btn" onClick={onReplay}>Replay</button>
        <button className="btn ghost" onClick={onQuit}>Menu</button>
      </div>
    </div>
  );
}
