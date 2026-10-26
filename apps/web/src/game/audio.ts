// Web Audio manager (ported from the p5 version, which already used raw Web
// Audio — no p5.sound dependency). Loads SFX + looping music, handles mute and
// page-visibility suspend/resume. A singleton shared by Phaser + React.

import { assetUrl } from './config';
import { getSettings, saveSettings } from '../state/storage';

type SoundName = 'backgroundMusic' | 'collision' | 'coin' | 'hit';

const FILES: Record<SoundName, string> = {
  backgroundMusic: 'Sound FX/5 - Stellar Drift (Loop)_louder.mp3',
  collision: 'Sound FX/Retro3.mp3',
  coin: 'Sound FX/Coin.wav',
  hit: 'Sound FX/Hit.wav',
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SoundName, AudioBuffer>> = {};
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private muted: boolean;
  private musicVolume: number;
  private loaded = false;

  constructor() {
    const s = getSettings();
    this.muted = s.muted;
    this.musicVolume = s.musicVolume;
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  ensure(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      void this.loadAll();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private async loadAll(): Promise<void> {
    if (!this.ctx) return;
    await Promise.all(
      (Object.entries(FILES) as [SoundName, string][]).map(async ([name, rel]) => {
        try {
          const resp = await fetch(assetUrl(rel));
          const arr = await resp.arrayBuffer();
          this.buffers[name] = await this.ctx!.decodeAudioData(arr);
        } catch (e) {
          console.warn('Failed to load sound:', name, e);
        }
      }),
    );
    this.loaded = true;
    if (!this.muted) this.startMusic();
  }

  private play(name: SoundName, volume: number): void {
    if (this.muted || !this.ctx || !this.buffers[name]) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[name]!;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(0);
  }

  startMusic(): void {
    this.stopMusic();
    if (this.muted || !this.ctx || !this.buffers.backgroundMusic) return;
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.buffers.backgroundMusic;
    this.musicSource.loop = true;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicSource.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);
    this.musicSource.start(0);
  }

  stopMusic(): void {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch { /* already stopped */ }
      this.musicSource = null;
      this.musicGain = null;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.persist();
    if (muted) {
      this.stopMusic();
    } else if (this.ctx && this.loaded) {
      this.startMusic();
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
    this.persist();
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended' && !this.muted) void this.ctx.resume();
  }

  private persist(): void {
    saveSettings({ muted: this.muted, musicVolume: this.musicVolume });
  }

  playHit(): void { this.play('hit', 0.5); }
  playCollision(): void { this.play('collision', 1.0); }
  playCoin(): void { this.play('coin', 0.3); }
}

export const audio = new AudioManager();
