import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#4CAF50',
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 100 },
      // debug: true,
    },
  },
};

const game = new Phaser.Game(config);
