import Phaser from 'phaser';

/** Entry scene — nothing to load for the loader itself, so jump to Preload. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
