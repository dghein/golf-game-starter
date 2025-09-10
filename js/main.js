import Hole1Scene from './scenes/GameScene.js'; // Will be renamed to Hole1Scene.js
import Hole2Scene from './scenes/Hole2Scene.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#4CAF50',
  scene: [Hole1Scene, Hole2Scene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 100 },
      // debug: true,
    },
  },
};

const game = new Phaser.Game(config);
