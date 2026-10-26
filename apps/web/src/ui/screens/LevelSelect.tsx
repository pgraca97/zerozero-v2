import { LEVELS } from '../../game/data/levels';

interface Props {
  onSelect: (index: number) => void;
  onBack: () => void;
}

export function LevelSelect({ onSelect, onBack }: Props) {
  return (
    <div className="overlay menu">
      <h2 className="screen-title">Select Level</h2>
      <div className="level-grid">
        {LEVELS.map((lvl, i) => (
          <button key={lvl.id} className="btn level-btn" onClick={() => onSelect(i)}>
            <span className="level-num">{i + 1}</span>
            <span className="level-name">{lvl.name}</span>
          </button>
        ))}
      </div>
      <button className="btn ghost" onClick={onBack}>Back</button>
    </div>
  );
}
