import Phaser from 'phaser';
import {
  BALL_DIAMETER, BALL_DIAMETER_SMALL, BALL_SPEED, BALL_SPEED_RAMP,
  BALL_SPEED_RAMP_CAP, MAX_BALL_SPEED, MIN_BALL_PITCH, MIN_BALL_SPEED,
  PADDLE_BOUNCE_SHAPE, PADDLE_ENGLISH, PADDLE_ENGLISH_MAX, PADDLE_MAX_BOUNCE,
  TEX, ballFrameKey,
} from '../config';
import type { Paddle } from './Paddle';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  /** When stuck, the ball rides the paddle until launched. */
  stuck = true;
  small = false;
  /** Base speed — ramps up per paddle hit, independent of power-up scaling. */
  baseSpeed = BALL_SPEED;
  /** Power-up speed multiplier (fastBall/slowBall). */
  speedMul = 1;
  /** Horizontal offset from paddle center while stuck (magnet keeps catch spot). */
  stickOffsetX = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ballFrameKey(0));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setBounce(1, 1);
    this.body.allowGravity = false;
    this.body.onWorldBounds = true; // Game normalizes speed/pitch on wall hits
    this.play(TEX.ballAnim);
    this.setDisplaySize(BALL_DIAMETER, BALL_DIAMETER);
    this.syncBody();
  }

  get radius(): number {
    return this.displayWidth / 2;
  }

  /** Speed the velocity is normalized to: base × power-up multiplier, clamped. */
  get targetSpeed(): number {
    return Phaser.Math.Clamp(this.baseSpeed * this.speedMul, MIN_BALL_SPEED, MAX_BALL_SPEED);
  }

  /**
   * Resize the circular physics body to match the current display diameter.
   * The radius is authored in source pixels (the frame's half-width); Arcade
   * scales the body by the sprite's scale, so it tracks `setDisplaySize`
   * automatically. Must be re-run after any frame/display-size change because
   * the small/normal frames have different source sizes (12px vs 24px).
   */
  private syncBody(): void {
    this.body.setCircle(this.frame.realWidth / 2);
  }

  /** Park the ball on top of the paddle at its current stick offset. */
  followPaddle(paddle: Paddle): void {
    this.setVelocity(0, 0);
    const maxOff = paddle.displayWidth / 2 - this.radius * 0.5;
    this.x = paddle.x + Phaser.Math.Clamp(this.stickOffsetX, -maxOff, maxOff);
    this.y = paddle.y - paddle.displayHeight / 2 - this.radius;
  }

  /** Magnet catch: stick where the ball landed, not re-centered. */
  stickTo(paddle: Paddle): void {
    this.stuck = true;
    this.stickOffsetX = this.x - paddle.x;
    this.followPaddle(paddle);
  }

  /**
   * Launch upward. `angleFromVertical` (radians) fixes the direction (magnet
   * aim); otherwise a random spread. Paddle motion at launch adds english.
   */
  launch(angleFromVertical?: number, paddleVelX = 0): void {
    this.stuck = false;
    this.stickOffsetX = 0;
    let a = angleFromVertical ?? (Math.random() * 2 - 1) * (Math.PI / 5);
    a += Phaser.Math.Clamp(paddleVelX * PADDLE_ENGLISH, -PADDLE_ENGLISH_MAX, PADDLE_ENGLISH_MAX);
    a = Phaser.Math.Clamp(a, -PADDLE_MAX_BOUNCE, PADDLE_MAX_BOUNCE);
    this.setVelocity(Math.sin(a) * this.targetSpeed, -Math.abs(Math.cos(a) * this.targetSpeed));
  }

  /**
   * Re-normalize velocity to targetSpeed and enforce a minimum pitch so the
   * ball can never settle into a near-horizontal loop. Call after every bounce.
   */
  normalizeSpeed(): void {
    if (this.stuck) return;
    const v = this.body.velocity;
    const len = Math.hypot(v.x, v.y);
    if (len < 0.001) return;
    const speed = this.targetSpeed;
    let vx = (v.x / len) * speed;
    let vy = (v.y / len) * speed;
    const minVy = speed * Math.sin(MIN_BALL_PITCH);
    if (Math.abs(vy) < minVy) {
      const signY = vy === 0 ? -1 : Math.sign(vy);
      const signX = vx === 0 ? 1 : Math.sign(vx);
      vy = signY * minVy;
      vx = signX * speed * Math.cos(MIN_BALL_PITCH);
    }
    this.setVelocity(vx, vy);
  }

  /**
   * Custom paddle bounce: continuous angle from hit offset (center = straight
   * up, edge = PADDLE_MAX_BOUNCE), shaped so the center is forgiving and the
   * edges sharp, plus english from paddle motion.
   */
  bounceOffPaddle(paddle: Paddle, paddleVelX = 0): void {
    const rel = Phaser.Math.Clamp((this.x - paddle.x) / (paddle.displayWidth / 2), -1, 1);
    const shaped = Math.sign(rel) * Math.abs(rel) ** PADDLE_BOUNCE_SHAPE;
    let angle = shaped * PADDLE_MAX_BOUNCE;
    angle += Phaser.Math.Clamp(paddleVelX * PADDLE_ENGLISH, -PADDLE_ENGLISH_MAX, PADDLE_ENGLISH_MAX);
    angle = Phaser.Math.Clamp(angle, -PADDLE_MAX_BOUNCE, PADDLE_MAX_BOUNCE);
    const speed = this.targetSpeed;
    this.setVelocity(Math.sin(angle) * speed, -Math.abs(Math.cos(angle) * speed));
  }

  /** Rally ramp: small base-speed bump per paddle hit, capped. */
  rampUp(): void {
    this.baseSpeed = Math.min(this.baseSpeed + BALL_SPEED_RAMP, BALL_SPEED_RAMP_CAP);
  }

  scaleSpeed(factor: number): void {
    this.speedMul = factor;
    this.normalizeSpeed();
  }

  resetSpeed(): void {
    this.speedMul = 1;
    this.normalizeSpeed();
  }

  setSmall(small: boolean): void {
    this.small = small;
    // Switch frames first so `setDisplaySize` scales against the new source
    // frame and `syncBody` reads the right radius.
    this.play(small ? TEX.ballAnimSmall : TEX.ballAnim);
    const d = small ? BALL_DIAMETER_SMALL : BALL_DIAMETER;
    this.setDisplaySize(d, d);
    this.syncBody();
  }
}
