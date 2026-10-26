import { assetUrl } from '../../game/config';

interface Props {
  highScore: number;
  onPlay: () => void;
  onLevelSelect: () => void;
  onSettings: () => void;
}

export function MainMenu({ highScore, onPlay, onLevelSelect, onSettings }: Props) {
  return (
    <div className="overlay menu">
      <img className="title" src={assetUrl('zerozero.png')} alt="ZeroZero" />
      <div className="menu-buttons">
        <button className="btn primary" onClick={onPlay} autoFocus>Play</button>
        <button className="btn" onClick={onLevelSelect}>Levels</button>
        <button className="btn" onClick={onSettings}>Settings</button>
      </div>
      <p className="hint">Arrow keys / mouse to move &middot; Space to launch</p>
      <p className="highscore-line">High Score: <span>{highScore}</span></p>
    </div>
  );
}
