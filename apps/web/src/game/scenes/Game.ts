import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { announce } from '../../state/announce';
import { audio } from '../audio';
import { commitHighScore, getHighScore } from '../../state/storage';
import {
  BRICK_TOP_OFFSET, GAME_HEIGHT, GAME_WIDTH, LAUNCH_DELAY, MAX_LIVES,
  MAX_POWER_UPS_TO_DROP, DROP_CHECK_INTERVAL, PADDLE_SPEED, PADDLE_Y_OFFSET,
  POWER_UP_DURATION, SHOOT_INTERVAL, START_LIVES, TEX, WALL_TOP, WALL_X,
} from '../config';
import { LEVELS, resolveLevel } from '../data/levels';
import { POWER_UPS, rollPowerUpDrop } from '../data/powerups';
import type { PowerUpType } from '../types';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { Bullet } from '../objects/Bullet';
import { Paddle } from '../objects/Paddle';
import { PowerUp } from '../objects/PowerUp';

type Phase = 'idle' | 'playing' | 'over';

export class Game extends Phaser.Scene {
  private phase: Phase = 'idle';
  private paddle!: Paddle;
  private ballGroup!: Phaser.GameObjects.Group;
  private brickGroup!: Phaser.GameObjects.Group;
  private powerupGroup!: Phaser.GameObjects.Group;
  private bulletGroup!: Phaser.GameObjects.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private serveText!: Phaser.GameObjects.Text;

  private score = 0;
  private lives = START_LIVES;
  private levelIndex = 0;
  private serveDeadline = 0;
  private lastShootTime = 0;

  private activePowerUp: { type: PowerUpType; timer: Phaser.Time.TimerEvent | null } | null = null;
  private bulletsActive = false;
  private magnetActive = false;
  private shooting = false;
  private pointerDown = false;
  private aimArrow!: Phaser.GameObjects.Image;
  private aimAngle = 0;
  private aimDir = 1;
  private devCycle = 0;
  /** Smoothed paddle horizontal velocity (px/s) — feeds bounce english. */
  private paddleVelX = 0;
  private prevPaddleX = 0;
  private destroyTimes: number[] = [];
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.physics.world.setBounds(WALL_X, WALL_TOP, GAME_WIDTH - 2 * WALL_X, GAME_HEIGHT - WALL_TOP);
    this.physics.world.setBoundsCollision(true, true, true, false); // bottom open

    this.createStarfield();

    this.paddle = new Paddle(this, GAME_WIDTH / 2, GAME_HEIGHT - PADDLE_Y_OFFSET);
    this.ballGroup = this.add.group();
    this.brickGroup = this.add.group();
    this.powerupGroup = this.add.group();
    this.bulletGroup = this.add.group();

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.frame)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(20);

    this.serveText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: 'ArcadeClassic, monospace', fontSize: '48px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(25).setVisible(false);

    this.aimArrow = this.add.image(0, 0, TEX.arrow)
      .setOrigin(0.5, 1).setDisplaySize(26, 40).setDepth(15).setVisible(false);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.physics.add.collider(this.ballGroup, this.paddle,
      (ball, paddle) => this.onPaddleHit(ball as Ball, paddle as Paddle));
    this.physics.add.collider(this.ballGroup, this.brickGroup,
      (ball, brick) => this.onBrickHit(ball as Ball, brick as Brick));
    this.physics.add.overlap(this.paddle, this.powerupGroup,
      (_paddle, pu) => this.onCollectPowerUp(pu as PowerUp));
    this.physics.add.overlap(this.bulletGroup, this.brickGroup,
      (bullet, brick) => this.onBulletHit(bullet as Bullet, brick as Brick));

    // Wall bounces: re-normalize speed and enforce min pitch so the ball can
    // never grind into a flat horizontal loop off the side walls.
    this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_BOUNDS,
      (body: Phaser.Physics.Arcade.Body) => {
        const go = body.gameObject;
        if (go instanceof Ball && !go.stuck) go.normalizeSpeed();
      });

    this.bindInput();
    this.bindCommands();

    // Dev-only handle so e2e tests and tooling can read live game state
    // (ball/paddle positions). Tree-shaken from production builds.
    if (import.meta.env.DEV) {
      (window as Window & { __ZZ_GAME__?: Game }).__ZZ_GAME__ = this;
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  // --- Input ---------------------------------------------------------------

  private bindInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'playing') return;
      const x = this.paddle.inverted ? GAME_WIDTH - pointer.x : pointer.x;
      this.paddle.x = x;
      this.paddle.clampToField();
    });
    this.input.on('pointerdown', () => {
      if (this.phase !== 'playing') return;
      this.pointerDown = true;
      this.onActionPress();
    });
    this.input.on('pointerup', () => { this.pointerDown = false; });

    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.phase === 'playing') this.pauseGame();
    });

    // Dev-only: cycle-spawn a power-up at the top of the field for testing.
    // import.meta.env.DEV is false in production builds → tree-shaken away.
    if (import.meta.env.DEV) {
      this.input.keyboard!.on('keydown-P', () => this.devSpawnPowerUp());
    }
  }

  private devSpawnPowerUp(): void {
    if (this.phase !== 'playing') return;
    const types = Object.keys(POWER_UPS) as PowerUpType[];
    const type = types[this.devCycle % types.length];
    this.devCycle++;
    this.powerupGroup.add(new PowerUp(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.3, type));
  }

  private bindCommands(): void {
    this.unsubscribers.push(
      EventBus.on('cmd-start', ({ levelIndex, keepScore }) => this.startLevel(levelIndex, keepScore)),
      EventBus.on('cmd-pause', () => this.pauseGame()),
      EventBus.on('cmd-resume', () => this.resumeGame()),
      EventBus.on('cmd-quit', () => this.quitToMenu()),
      EventBus.on('cmd-mute', (muted) => audio.setMuted(muted)),
    );
  }

  private cleanup(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
  }

  // --- Level flow ----------------------------------------------------------

  private startLevel(index: number, keepScore = false): void {
    this.levelIndex = Phaser.Math.Clamp(index, 0, LEVELS.length - 1);
    this.clearActivePowerUp();
    this.bulletGroup.clear(true, true);
    this.powerupGroup.clear(true, true);
    this.ballGroup.clear(true, true);
    this.brickGroup.clear(true, true);
    this.destroyTimes = [];
    this.bulletsActive = false;
    this.magnetActive = false;
    this.shooting = false;
    this.paddle.resetState();
    this.paddle.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - PADDLE_Y_OFFSET);
    this.prevPaddleX = this.paddle.x;
    this.paddleVelX = 0;

    if (!keepScore) this.score = 0;
    this.lives = START_LIVES;

    this.buildBricks();

    const def = LEVELS[this.levelIndex];
    EventBus.emit('level-changed', { index: this.levelIndex, id: def.id, name: def.name });
    EventBus.emit('score-changed', this.score);
    EventBus.emit('lives-changed', this.lives);

    this.phase = 'playing';
    this.scene.resume();
    this.serveBall();
    announce(`Level ${this.levelIndex + 1}: ${def.name}. ${this.lives} lives.`);
  }

  private buildBricks(): void {
    const level = resolveLevel(LEVELS[this.levelIndex]);
    const innerW = GAME_WIDTH - 2 * WALL_X;
    const usableW = innerW * 0.92;
    const brickW = Math.floor(usableW / level.cols);
    const brickH = Math.max(12, Math.floor(brickW / 3));
    const gridW = brickW * level.cols;
    const startX = (GAME_WIDTH - gridW) / 2 + brickW / 2;
    const startY = WALL_TOP + BRICK_TOP_OFFSET + brickH / 2;

    for (const { col, row, spec } of level.bricks) {
      const brick = new Brick(this, startX + col * brickW, startY + row * brickH, spec, brickW - 2, brickH - 2);
      this.brickGroup.add(brick);
    }
  }

  private serveBall(): void {
    this.ballGroup.clear(true, true);
    const ball = new Ball(this, this.paddle.x, 0);
    ball.followPaddle(this.paddle);
    this.ballGroup.add(ball);
    this.serveDeadline = this.time.now + LAUNCH_DELAY;
  }

  // --- Collisions ----------------------------------------------------------

  private onPaddleHit(ball: Ball, paddle: Paddle): void {
    if (ball.stuck) return;
    if (this.magnetActive) {
      ball.stickTo(paddle); // keeps the catch offset instead of re-centering
      this.serveDeadline = Number.POSITIVE_INFINITY; // wait for manual launch
      return;
    }
    // Apply the custom bounce only on a genuine top hit. We must key off
    // `touching.down` (set during separation: the ball's underside met the
    // paddle top), NOT velocity.y — by the time this collider callback runs,
    // Arcade has already reflected the velocity (bounce:1), so `velocity.y > 0`
    // is always false and the bounce would never fire.
    if (ball.body.touching.down) {
      ball.bounceOffPaddle(paddle, this.paddleVelX);
      ball.rampUp();
      audio.playHit();
    } else if (ball.body.touching.left || ball.body.touching.right) {
      // Pinch save: a side hit means the ball is beside the paddle heading for
      // the gutter — deflect it outward and upward instead of a flat reflection
      // that slams it straight down.
      const dir = ball.body.touching.left ? 1 : -1;
      const speed = ball.targetSpeed;
      ball.setVelocity(dir * speed * Math.SQRT1_2, -speed * Math.SQRT1_2);
      audio.playHit();
    }
  }

  private onBrickHit(ball: Ball, brick: Brick): void {
    const destroyed = brick.hit();
    audio.playCollision();
    if (destroyed) this.destroyBrick(brick);
    ball.normalizeSpeed();
  }

  private onBulletHit(bullet: Bullet, brick: Brick): void {
    bullet.destroy();
    const destroyed = brick.hit();
    audio.playCollision();
    if (destroyed) this.destroyBrick(brick);
  }

  private destroyBrick(brick: Brick): void {
    this.score += brick.points;
    EventBus.emit('score-changed', this.score);
    this.maybeDropPowerUp(brick.x, brick.y);
    brick.destroy();
    if (this.brickGroup.getLength() === 0) this.levelWon();
  }

  private onCollectPowerUp(pu: PowerUp): void {
    const type = pu.puType;
    pu.destroy();
    audio.playCoin();
    this.applyPowerUp(type);
  }

  // --- Power-ups -----------------------------------------------------------

  private maybeDropPowerUp(x: number, y: number): void {
    const now = this.time.now;
    this.destroyTimes = this.destroyTimes.filter((t) => now - t <= DROP_CHECK_INTERVAL);
    this.destroyTimes.push(now);
    if (this.destroyTimes.length > MAX_POWER_UPS_TO_DROP) return;

    const type = rollPowerUpDrop(this.activePowerUp?.type ?? null, this.lives, MAX_LIVES, Math.random);
    if (!type) return;
    this.powerupGroup.add(new PowerUp(this, x, y, type));
  }

  private applyPowerUp(type: PowerUpType): void {
    const def = POWER_UPS[type];

    if (type === 'life') {
      this.lives = Math.min(this.lives + 1, MAX_LIVES);
      EventBus.emit('lives-changed', this.lives);
      announce(def.message);
      return;
    }

    this.clearActivePowerUp();
    announce(def.message);

    if (type === 'magnet') {
      this.magnetActive = true;
      this.activePowerUp = { type, timer: null };
      EventBus.emit('powerup-activated', { type, startedAt: Date.now(), durationMs: 0 });
      return;
    }

    this.applyEffect(type);
    const timer = this.time.delayedCall(POWER_UP_DURATION, () => this.clearActivePowerUp());
    this.activePowerUp = { type, timer };
    EventBus.emit('powerup-activated', { type, startedAt: Date.now(), durationMs: POWER_UP_DURATION });
  }

  private applyEffect(type: PowerUpType): void {
    const balls = this.balls();
    switch (type) {
      case 'fastBall': balls.forEach((b) => b.scaleSpeed(1.5)); break;
      case 'slowBall': balls.forEach((b) => b.scaleSpeed(0.5)); break;
      case 'smallBall': balls.forEach((b) => b.setSmall(true)); break;
      case 'bigBar': this.paddle.applyVariant('big'); this.paddle.flash(); break;
      case 'smallBar': this.paddle.applyVariant('small'); this.paddle.flash(); break;
      case 'slowBar': this.paddle.speedMultiplier = 0.5; break;
      case 'fastBar': this.paddle.speedMultiplier = 1.5; break;
      case 'invertedCommands': this.paddle.inverted = true; break;
      case 'multiball': this.spawnMultiball(); break;
      case 'bullets': this.bulletsActive = true; break;
    }
  }

  private clearActivePowerUp(): void {
    if (!this.activePowerUp) return;
    const { type, timer } = this.activePowerUp;
    timer?.remove();
    const balls = this.balls();
    switch (type) {
      case 'fastBall':
      case 'slowBall': balls.forEach((b) => b.resetSpeed()); break;
      case 'smallBall': balls.forEach((b) => b.setSmall(false)); break;
      case 'bigBar':
      case 'smallBar': this.paddle.applyVariant('normal'); break;
      case 'slowBar':
      case 'fastBar': this.paddle.speedMultiplier = 1; break;
      case 'invertedCommands': this.paddle.inverted = false; break;
      case 'multiball': this.trimToOneBall(); break;
      case 'bullets': this.bulletsActive = false; this.bulletGroup.clear(true, true); break;
      case 'magnet': this.magnetActive = false; break;
    }
    this.activePowerUp = null;
    EventBus.emit('powerup-cleared', type);
  }

  private spawnMultiball(): void {
    const source = this.balls().find((b) => !b.stuck) ?? this.balls()[0];
    if (!source) return;
    const speed = source.targetSpeed;
    const make = (vx: number, vy: number) => {
      const b = new Ball(this, source.x, source.y);
      b.stuck = false;
      b.setVelocity(vx, vy);
      b.baseSpeed = source.baseSpeed;
      b.speedMul = source.speedMul;
      b.normalizeSpeed();
      this.ballGroup.add(b);
    };
    const vy = -Math.abs(source.body.velocity.y) || -speed;
    make(-speed * 0.5, vy);
    make(speed * 0.5, vy);
  }

  private trimToOneBall(): void {
    const balls = this.balls();
    for (let i = balls.length - 1; i >= 1; i--) balls[i].destroy();
  }

  // --- Game loop -----------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.phase !== 'playing') return;
    const dt = delta / 1000;

    let dir = 0;
    if (this.cursors.left.isDown) dir -= 1;
    if (this.cursors.right.isDown) dir += 1;
    if (this.paddle.inverted) dir *= -1;
    if (dir !== 0) {
      this.paddle.x += dir * PADDLE_SPEED * this.paddle.speedMultiplier * dt;
      this.paddle.clampToField();
    }

    // Track smoothed paddle velocity (covers both keyboard and pointer moves)
    // for bounce english.
    if (dt > 0) {
      const instV = (this.paddle.x - this.prevPaddleX) / dt;
      this.paddleVelX = Phaser.Math.Linear(this.paddleVelX, instV, 0.4);
    }
    this.prevPaddleX = this.paddle.x;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.onActionPress();
    }
    // Shooting reflects current input each frame (no latched state).
    this.shooting = this.bulletsActive
      && (this.cursors.space.isDown || this.cursors.up.isDown || this.pointerDown);

    const balls = this.balls();
    let anyStuck = false;
    for (const ball of balls) {
      if (ball.stuck) {
        ball.followPaddle(this.paddle);
        anyStuck = true;
      } else if (ball.y - ball.radius > GAME_HEIGHT) {
        ball.destroy();
      }
    }

    if (anyStuck && this.time.now >= this.serveDeadline) this.launchStuckBalls();

    this.updateServeText(anyStuck);
    this.updateAimArrow(anyStuck);

    if (this.balls().length === 0) {
      this.loseLife();
      return;
    }

    if (this.bulletsActive && this.shooting && this.time.now - this.lastShootTime > SHOOT_INTERVAL) {
      this.shoot();
    }

    this.powerupGroup.getChildren().forEach((c) => {
      const pu = c as PowerUp;
      if (pu.y - pu.displayHeight / 2 > GAME_HEIGHT) pu.destroy();
    });
    this.bulletGroup.getChildren().forEach((c) => {
      const b = c as Bullet;
      if (b.y + b.displayHeight / 2 < WALL_TOP) b.destroy();
    });
  }

  private updateServeText(anyStuck: boolean): void {
    if (anyStuck && !this.magnetActive && Number.isFinite(this.serveDeadline)) {
      const remaining = Math.max(1, Math.ceil((this.serveDeadline - this.time.now) / 1000));
      this.serveText.setText(String(remaining)).setVisible(true);
      this.serveText.setPosition(this.paddle.x, this.paddle.y - 60);
    } else {
      this.serveText.setVisible(false);
    }
  }

  /** Oscillating aim arrow shown while the ball is magnet-stuck to the paddle. */
  private updateAimArrow(anyStuck: boolean): void {
    const show = this.magnetActive && anyStuck;
    this.aimArrow.setVisible(show);
    if (!show) return;
    this.aimAngle += 0.02 * this.aimDir;
    if (this.aimAngle > Math.PI / 4 || this.aimAngle < -Math.PI / 4) this.aimDir *= -1;
    this.aimArrow.setPosition(this.paddle.x, this.paddle.y - this.paddle.displayHeight / 2 - 4);
    this.aimArrow.setRotation(this.aimAngle);
  }

  private onActionPress(): void {
    if (this.balls().some((b) => b.stuck)) {
      this.launchStuckBalls();
    }
  }

  private launchStuckBalls(): void {
    const angle = this.magnetActive ? this.aimAngle : undefined;
    for (const ball of this.balls()) {
      if (ball.stuck) ball.launch(angle, this.paddleVelX);
    }
    this.aimArrow.setVisible(false);
    this.serveText.setVisible(false);
    if (this.magnetActive) this.clearActivePowerUp(); // also flips magnetActive off
  }

  private shoot(): void {
    this.lastShootTime = this.time.now;
    const left = this.paddle.x - this.paddle.displayWidth / 2 + 4;
    const right = this.paddle.x + this.paddle.displayWidth / 2 - 4;
    const y = this.paddle.y - this.paddle.displayHeight;
    this.bulletGroup.add(new Bullet(this, left, y));
    this.bulletGroup.add(new Bullet(this, right, y));
  }

  private loseLife(): void {
    this.lives--;
    EventBus.emit('lives-changed', this.lives);
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.clearActivePowerUp();
      this.paddle.resetState();
      this.bulletsActive = false;
      announce(`Ball lost. ${this.lives} lives remaining.`);
      this.serveBall();
    }
  }

  // --- End states ----------------------------------------------------------

  private gameOver(): void {
    this.phase = 'over';
    const isNewHighScore = commitHighScore(this.score);
    EventBus.emit('game-over', { score: this.score, highScore: getHighScore(), isNewHighScore });
    announce(`Game over. Score ${this.score}.${isNewHighScore ? ' New high score!' : ''}`);
  }

  private levelWon(): void {
    this.phase = 'over';
    this.score += this.lives * 50;
    EventBus.emit('score-changed', this.score);
    const isNewHighScore = commitHighScore(this.score);
    EventBus.emit('level-won', { score: this.score, highScore: getHighScore(), isNewHighScore });
    announce(`Level complete! Score ${this.score}.${isNewHighScore ? ' New high score!' : ''}`);
  }

  private pauseGame(): void {
    if (this.phase !== 'playing') return;
    EventBus.emit('paused');
    this.scene.pause();
  }

  private resumeGame(): void {
    this.scene.resume();
    EventBus.emit('resumed');
  }

  private quitToMenu(): void {
    this.scene.resume();
    this.clearActivePowerUp();
    this.ballGroup.clear(true, true);
    this.brickGroup.clear(true, true);
    this.powerupGroup.clear(true, true);
    this.bulletGroup.clear(true, true);
    this.serveText.setVisible(false);
    this.phase = 'idle';
  }

  // --- Helpers -------------------------------------------------------------

  private balls(): Ball[] {
    return this.ballGroup.getChildren() as Ball[];
  }

  private createStarfield(): void {
    const colors = [0x4a90d9, 0xff5555, 0x55ff55, 0xffffff, 0xffffff];
    for (let i = 0; i < 70; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(1, 2),
        Phaser.Utils.Array.GetRandom(colors),
      ).setDepth(-10).setAlpha(Phaser.Math.FloatBetween(0.2, 0.8));
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.4),
        duration: Phaser.Math.Between(800, 2200),
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
