// localStorage persistence. Highscore key is unchanged from the p5 version so
// existing players keep their score.

const HIGH_SCORE_KEY = 'zerozero_highscore';
const SETTINGS_KEY = 'zerozero_settings';

export function getHighScore(): number {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  if (raw === null) return 0;
  return parseInt(raw, 10) || 0;
}

export function setHighScore(score: number): void {
  localStorage.setItem(HIGH_SCORE_KEY, String(score));
}

/** Returns true and persists if `score` beats the stored best. */
export function commitHighScore(score: number): boolean {
  if (score > getHighScore()) {
    setHighScore(score);
    return true;
  }
  return false;
}

export interface Settings {
  muted: boolean;
  musicVolume: number; // 0..1
}

const DEFAULT_SETTINGS: Settings = { muted: false, musicVolume: 0.5 };

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
