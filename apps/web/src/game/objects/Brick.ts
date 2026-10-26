import Phaser from 'phaser';
import type { BrickSpec } from '../types';
import { brickBrokenKey, brickKey, glossFrameKey, TEX } from '../config';

export class Brick extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  hits: number;
  readonly points: number;
  readonly spec: BrickSpec;

  constructor(scene: Phaser.Scene, x: number, y: number, spec: BrickSpec, w: number, h: number) {
    super(scene, x, y, brickKey(spec.color));
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.spec = spec;
    this.hits = spec.hits;
    this.points = spec.points;
    this.setDisplaySize(w, h);
    this.body.updateFromGameObject();
  }

  /** Apply one hit. Returns true if the brick was destroyed. */
  hit(): boolean {
    this.hits--;
    if (this.hits <= 0) return true;
    // hits === 1 is the cracking hit: reveal the broken texture, no gloss.
    // Earlier hits (hits >= 2) play the gloss to anticipate the break — the
    // gloss and the crack never share a hit.
    if (this.hits === 1) this.showBroken();
    else this.playGloss();
    return false;
  }

  /** Gloss shine overlay — plays only on hits before the brick cracks. Auto-destroys. */
  private playGloss(): void {
    const gloss = this.scene.add
      .sprite(this.x, this.y, glossFrameKey(0))
      .setDisplaySize(this.displayWidth, this.displayHeight)
      .setDepth(this.depth + 1);
    gloss.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => gloss.destroy());
    gloss.play(TEX.glossAnim);
  }

  /** Swap to the cracked texture, preserving display size. */
  private showBroken(): void {
    const w = this.displayWidth;
    const h = this.displayHeight;
    this.setTexture(brickBrokenKey(this.spec.color));
    this.setDisplaySize(w, h);
    this.body.updateFromGameObject();
  }
}
