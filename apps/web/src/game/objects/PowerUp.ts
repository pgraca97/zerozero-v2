import Phaser from 'phaser';
import type { PowerUpType } from '../types';
import { POWERUP_SIZE, POWER_UP_FALL_SPEED, powerUpKey } from '../config';

export class PowerUp extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  readonly puType: PowerUpType;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, powerUpKey(type));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.puType = type;
    this.body.allowGravity = false;
    this.setDisplaySize(POWERUP_SIZE, POWERUP_SIZE);
    this.setVelocityY(POWER_UP_FALL_SPEED);
  }
}
