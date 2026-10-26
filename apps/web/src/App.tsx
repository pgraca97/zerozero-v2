import { useCallback, useEffect, useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { EventBus } from './game/EventBus';
import { audio } from './game/audio';
import { getHighScore } from './state/storage';
import type {
  ActivePowerUp, GameOverPayload, LevelInfo, Screen,
} from './game/types';
import { MainMenu } from './ui/screens/MainMenu';
import { LevelSelect } from './ui/screens/LevelSelect';
import { Settings } from './ui/screens/Settings';
import { HUD } from './ui/components/HUD';
import { GameOverOverlay, LoadingOverlay, PauseOverlay, WinOverlay } from './ui/components/Overlays';

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(getHighScore());
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [activePowerUp, setActivePowerUp] = useState<ActivePowerUp | null>(null);
  const [endPayload, setEndPayload] = useState<GameOverPayload | null>(null);
  const [muted, setMuted] = useState(audio.isMuted());

  useEffect(() => {
    const offs = [
      EventBus.on('loading-progress', setProgress),
      EventBus.on('preload-complete', () => setScreen((s) => (s === 'loading' ? 'menu' : s))),
      EventBus.on('score-changed', setScore),
      EventBus.on('lives-changed', setLives),
      EventBus.on('level-changed', setLevel),
      EventBus.on('powerup-activated', setActivePowerUp),
      EventBus.on('powerup-cleared', () => setActivePowerUp(null)),
      EventBus.on('paused', () => setScreen('paused')),
      EventBus.on('resumed', () => setScreen('playing')),
      EventBus.on('game-over', (p) => { setEndPayload(p); setHighScore(p.highScore); setScreen('gameOver'); }),
      EventBus.on('level-won', (p) => { setEndPayload(p); setHighScore(p.highScore); setScreen('won'); }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const startGame = useCallback((levelIndex: number, keepScore = false) => {
    audio.ensure();
    setActivePowerUp(null);
    setEndPayload(null);
    EventBus.emit('cmd-start', { levelIndex, keepScore });
    setScreen('playing');
  }, []);

  const pause = useCallback(() => EventBus.emit('cmd-pause'), []);
  const resume = useCallback(() => EventBus.emit('cmd-resume'), []);
  const quit = useCallback(() => { EventBus.emit('cmd-quit'); setScreen('menu'); }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      EventBus.emit('cmd-mute', next);
      return next;
    });
  }, []);

  const showHud = screen === 'playing' || screen === 'paused';

  return (
    <div className="app">
      <div className="stage">
        <PhaserGame />

        {showHud && (
          <HUD
            score={score}
            highScore={highScore}
            lives={lives}
            level={level}
            activePowerUp={activePowerUp}
            muted={muted}
            onPause={pause}
            onToggleMute={toggleMute}
          />
        )}
      </div>

      {screen === 'loading' && <LoadingOverlay progress={progress} />}

      {screen === 'menu' && (
        <MainMenu
          highScore={highScore}
          onPlay={() => startGame(0)}
          onLevelSelect={() => setScreen('levelSelect')}
          onSettings={() => setScreen('settings')}
        />
      )}

      {screen === 'levelSelect' && (
        <LevelSelect onSelect={(i) => startGame(i)} onBack={() => setScreen('menu')} />
      )}

      {screen === 'settings' && <Settings onBack={() => setScreen('menu')} />}

      {screen === 'paused' && (
        <PauseOverlay onResume={resume} onRestart={() => startGame(level?.index ?? 0)} onQuit={quit} />
      )}

      {screen === 'gameOver' && endPayload && (
        <GameOverOverlay
          payload={endPayload}
          onRetry={() => startGame(level?.index ?? 0)}
          onQuit={quit}
        />
      )}

      {screen === 'won' && endPayload && (
        <WinOverlay
          payload={endPayload}
          level={level}
          onNext={() => startGame((level?.index ?? 0) + 1, true)}
          onReplay={() => startGame(level?.index ?? 0)}
          onQuit={quit}
        />
      )}
    </div>
  );
}
