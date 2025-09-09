import { createGolferAnimations } from "../animations.js";
import { setupWASD } from "../controls.js";
import { GolfBall } from "../golfball.js";
import { Player } from "../player.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("sky", "assets/course/sky.png");
    for (let i = 0; i < 2; i++) {
      this.load.image(
        `golfer_walking_${i}`,
        `assets/golfer/golfer_walking_${i}.png`
      );
    }
    for (let i = 0; i < 2; i++) {
      this.load.image(
        `golfer_swing_${i}`,
        `assets/golfer/golfer_swing_${i}.png`
      );
    }
  }

  create() {
    // Set world bounds larger than screen for scrolling, with extra space above for ball flight
    this.physics.world.setBounds(0, -1000, 5000, 1650); // Extended 1000px above screen
    
    // Enable gravity for realistic falling
    // this.physics.world.gravity.y = 500; // Gravity pulls objects down
    
    // Create repeating sky background
    this.add.tileSprite(0, 0, 5000, 600, "sky").setOrigin(0, 0);

    // Create animations
    createGolferAnimations(this);

    // Setup WASD controls
    this.keys = setupWASD(this);

    // Create player
    this.player = new Player(this);

    // Create golf ball
    this.golfBall = new GolfBall(this);

    // Set up camera to follow the player
    this.cameras.main.startFollow(this.player.sprite);
    
    // Set camera bounds (keep camera on ground level, don't follow ball into sky)
    this.cameras.main.setBounds(0, 0, 5000, 650);
  }

  update() {
    const keys = this.keys;

    // Update player movement and animations
    this.player.update(keys);

    // Check if player is trying to hit the ball
    if (keys.space.isDown) {
      this.golfBall.checkHit(this.player);
    }

    // Apply ground friction when ball is rolling
    this.golfBall.applyGroundFriction();
  }

}
