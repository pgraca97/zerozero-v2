import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import {
  assetUrl, buildImageManifest, TEX, ballFrameKey, ballSmallFrameKey, glossFrameKey,
} from '../config';

/** Loads every texture, builds ball animations, then hands off to Game. */
export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.load.on('progress', (p: number) => EventBus.emit('loading-progress', p));
    for (const asset of buildImageManifest()) {
      this.load.image(asset.key, assetUrl(asset.path));
    }
  }

  async create(): Promise<void> {
    const frames = (key: (i: number) => string) =>
      [0, 1, 2, 3].map((i) => ({ key: key(i) }));

    this.anims.create({ key: TEX.ballAnim, frames: frames(ballFrameKey), frameRate: 10, repeat: -1 });
    this.anims.create({ key: TEX.ballAnimSmall, frames: frames(ballSmallFrameKey), frameRate: 10, repeat: -1 });
    this.anims.create({
      key: TEX.glossAnim,
      frames: [0, 1, 2].map((i) => ({ key: glossFrameKey(i) })),
      frameRate: 10,
      repeat: 0,
    });

    await this.loadFonts();

    EventBus.emit('loading-progress', 1);
    EventBus.emit('preload-complete');
    this.scene.start('Game');
  }

  private async loadFonts(): Promise<void> {
    try {
      await Promise.all([
        document.fonts.load('16px "ArcadeClassic"'),
        document.fonts.load('16px "DePixelBreit"'),
      ]);
    } catch {
      /* fonts will fall back to defaults */
    }
  }
}
