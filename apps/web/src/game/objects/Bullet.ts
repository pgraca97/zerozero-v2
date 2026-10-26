import Phaser from 'phaser';
import { BULLET_H, BULLET_SPEED, BULLET_W, TEX } from '../config';

export class Bullet extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.bullet1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.setDisplaySize(BULLET_W, BULLET_H);
    this.setVelocityY(-BULLET_SPEED);
  }
}
