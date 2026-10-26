import { useEffect, useState } from 'react';
import { assetUrl } from '../../game/config';
import { POWER_UPS } from '../../game/data/powerups';
import type { ActivePowerUp, LevelInfo } from '../../game/types';

interface Props {
  score: number;
  highScore: number;
  lives: number;
  level: LevelInfo | null;
  activePowerUp: ActivePowerUp | null;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
}

export function HUD({
  score, highScore, lives, level, activePowerUp, muted, onPause, onToggleMute,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!activePowerUp) return;
    setToast(POWER_UPS[activePowerUp.type].message);
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [activePowerUp?.startedAt, activePowerUp?.type]);

  return (
    <div className="hud" aria-hidden="false">
      <div className="hud-top">
        <div className="hud-stat">
          <label>Score</label>
          <span>{score}</span>
        </div>
        <div className="hud-stat center">
          <label>High</label>
          <span>{highScore}</span>
        </div>
        <div className="hud-actions">
          <button className="icon-btn" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            <img src={assetUrl(`Sound FX/${muted ? 'muted' : 'unmuted'}.png`)} alt="" />
          </button>
          <button className="icon-btn pause" onClick={onPause} aria-label="Pause">❚❚</button>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="hud-lives" aria-label={`${lives} lives`}>
          {Array.from({ length: lives }).map((_, i) => (
            <img key={i} src={assetUrl('Life.png')} alt="" />
          ))}
        </div>
        {activePowerUp && (
          <div className="hud-powerup">
            <span className="pu-label">{POWER_UPS[activePowerUp.type].label}</span>
            {activePowerUp.durationMs > 0 && (
              <div className="pu-bar">
                <div
                  className="pu-bar-fill"
                  key={activePowerUp.startedAt}
                  style={{ animationDuration: `${activePowerUp.durationMs}ms` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {level && <div className="hud-level">{level.name}</div>}

      {toast && <div className="hud-toast" key={activePowerUp?.startedAt}>{toast}</div>}
    </div>
  );
}
