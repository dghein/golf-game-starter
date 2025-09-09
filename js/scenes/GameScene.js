import { createGolferAnimations } from "../animations.js";
import { setupWASD } from "../controls.js";
import { GolfBall } from "../golfball.js";
import { Player } from "../player.js";
import { ClubManager, CLUB_TYPES } from "../clubs.js";

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

    // Create club manager
    this.clubManager = new ClubManager();

    // Set up camera to follow the player
    this.cameras.main.startFollow(this.player.sprite);
    
    // Set camera bounds (keep camera on ground level, don't follow ball into sky)
    this.cameras.main.setBounds(0, 0, 5000, 650);

    // Create UI elements for club display
    this.createClubUI();
  }

  createClubUI() {
    // Create a fixed UI container that doesn't move with camera
    this.clubText = this.add.text(20, 20, '', {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.clubText.setScrollFactor(0); // Keep UI fixed on screen
    
    // Create power meter UI
    this.createPowerMeter();
    this.updateClubUI();
  }

  createPowerMeter() {
    const meterWidth = 200;
    const meterHeight = 20;
    const meterX = 20;
    const meterY = 120;
    
    // Power meter background
    this.powerMeterBg = this.add.rectangle(meterX, meterY, meterWidth, meterHeight, 0x333333);
    this.powerMeterBg.setOrigin(0, 0);
    this.powerMeterBg.setScrollFactor(0);
    this.powerMeterBg.setStrokeStyle(2, 0xffffff);
    
    // Power meter fill
    this.powerMeterFill = this.add.rectangle(meterX + 2, meterY + 2, 0, meterHeight - 4, 0x00ff00);
    this.powerMeterFill.setOrigin(0, 0);
    this.powerMeterFill.setScrollFactor(0);
    
    // Power meter label
    this.powerMeterLabel = this.add.text(meterX, meterY - 25, 'Power: Hold SPACE to charge', {
      fontSize: '16px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      fontFamily: 'Arial'
    });
    this.powerMeterLabel.setScrollFactor(0);
    
    // Initially hide power meter
    this.powerMeterBg.setVisible(false);
    this.powerMeterFill.setVisible(false);
    this.powerMeterLabel.setVisible(false);
  }

  updateClubUI() {
    const clubInfo = this.clubManager.getClubInfo();
    this.clubText.setText(`Club: ${clubInfo.name}\n${clubInfo.description}\nPress 1: Driver | Press 2: Putter`);
  }

  updatePowerMeter() {
    const isCharging = this.player.chargingPower;
    const powerLevel = this.player.getPowerLevel();
    
    // Show/hide power meter based on charging state
    this.powerMeterBg.setVisible(isCharging);
    this.powerMeterFill.setVisible(isCharging);
    this.powerMeterLabel.setVisible(isCharging);
    
    if (isCharging) {
      // Update power meter fill width
      const maxWidth = 196; // meterWidth - 4 (for padding)
      const currentWidth = maxWidth * powerLevel;
      this.powerMeterFill.width = currentWidth;
      
      // Change color based on power level
      let color = 0x00ff00; // Green for low power
      if (powerLevel > 0.7) {
        color = 0xff0000; // Red for high power
      } else if (powerLevel > 0.4) {
        color = 0xffff00; // Yellow for medium power
      }
      this.powerMeterFill.setFillStyle(color);
      
      // Update label with power percentage
      const powerPercent = Math.round(powerLevel * 100);
      this.powerMeterLabel.setText(`Power: ${powerPercent}% - Release SPACE to swing!`);
    }
  }

  update() {
    const keys = this.keys;

    // Handle club switching
    if (Phaser.Input.Keyboard.JustDown(keys.one)) {
      this.clubManager.selectDriver();
      this.updateClubUI();
      console.log('Switched to Driver');
    }
    
    if (Phaser.Input.Keyboard.JustDown(keys.two)) {
      this.clubManager.selectPutter();
      this.updateClubUI();
      console.log('Switched to Putter');
    }

    // Update player movement and animations
    this.player.update(keys);

    // Update power meter display
    this.updatePowerMeter();

    // Check if player is trying to hit the ball (only during swing animation)
    if (this.player.isSwinging()) {
      this.golfBall.checkHit(this.player, this.clubManager);
    }

    // Apply ground friction when ball is rolling
    this.golfBall.applyGroundFriction();
  }

}
