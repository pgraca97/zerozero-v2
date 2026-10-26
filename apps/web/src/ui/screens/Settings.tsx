import { useState } from 'react';
import { audio } from '../../game/audio';
import { EventBus } from '../../game/EventBus';

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props) {
  const [muted, setMuted] = useState(audio.isMuted());
  const [volume, setVolume] = useState(audio.getMusicVolume());

  return (
    <div className="overlay menu">
      <h2 className="screen-title">Settings</h2>
      <div className="settings-list">
        <label className="setting-row">
          <span>Sound</span>
          <button
            className="btn small"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              EventBus.emit('cmd-mute', next);
            }}
          >
            {muted ? 'Muted' : 'On'}
          </button>
        </label>
        <label className="setting-row">
          <span>Music Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              audio.setMusicVolume(v);
            }}
          />
        </label>
      </div>
      <button className="btn ghost" onClick={onBack}>Back</button>
    </div>
  );
}
