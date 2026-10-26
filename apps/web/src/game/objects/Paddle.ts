import Phaser from 'phaser';
import { PADDLE_H, PADDLE_W, TEX, WALL_X } from '../config';

export type PaddleVariant = 'normal' | 'big' | 'small';

/**
 * Player paddle. Dynamic + immovable so the ball treats it as a solid wall but
 * we can still move it freely by setting `x`. The body auto-tracks displaySize.
 */
export class Paddle extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  variant: PaddleVariant = 'normal';
  /** Multiplier on keyboard move speed (slowBar/fastBar power-ups). */
  speedMultiplier = 1;
  /** When true, left/right input is reversed (invertedCommands power-up). */
  inverted = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.paddle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.body.allowGravity = false;
    this.applyVariant('normal');
  }

  applyVariant(v: PaddleVariant): void {
    this.variant = v;
    const tex = v === 'big' ? TEX.paddleBig : v === 'small' ? TEX.paddleSmall : TEX.paddle;
    this.setTexture(tex);
    this.setDisplaySize(PADDLE_W[v], PADDLE_H);
    this.syncBody();
  }

  /**
   * Match the physics body to the current paddle texture. The body source dims
   * don't auto-update when the texture changes (only scale tracks displaySize),
   * so set them explicitly. The paddle art is a pill/stadium with rounded caps
   * of radius ≈ height/2, so inset the rectangle horizontally by that radius on
   * each side — Arcade has no rounded-rect, and this keeps the rounded ends from
   * colliding as square corners. Authored in source px; Arcade scales it.
   */
  private syncBody(): void {
    const { realWidth, realHeight } = this.frame;
    this.body.setSize(realWidth - realHeight, realHeight, true);
  }

  resetState(): void {
    this.speedMultiplier = 1;
    this.inverted = false;
    this.setAlpha(1);
    this.applyVariant('normal');
  }

  /** Brief blink — used when the paddle changes size (big/small power-ups). */
  flash(): void {
    this.scene.tweens.add({
      targets: this, alpha: { from: 0.35, to: 1 }, duration: 120, repeat: 3,
    });
  }

  /** Clamp the paddle inside the playfield walls. Origin is centered. */
  clampToField(): void {
    const half = this.displayWidth / 2;
    const min = WALL_X + half;
    const max = this.scene.scale.width - WALL_X - half;
    this.x = Phaser.Math.Clamp(this.x, min, max);
  }
}
