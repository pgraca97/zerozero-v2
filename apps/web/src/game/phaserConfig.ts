import Phaser from 'phaser';
import { BG_COLOR, GAME_HEIGHT, GAME_WIDTH } from './config';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { Game } from './scenes/Game';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BG_COLOR,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      // 120Hz fixed step: at MAX_BALL_SPEED (720 px/s) the small ball (12px)
      // moves a full body-length per 60Hz step — halving the step kills the
      // tunnel-through-brick risk without CCD.
      arcade: { gravity: { x: 0, y: 0 }, fps: 120, debug: false },
    },
    render: { pixelArt: true, antialias: false },
    scene: [Boot, Preload, Game],
  };
}
