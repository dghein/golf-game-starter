import { createGolferAnimations } from "../animations.js";
import { setupWASD } from "../controls.js";
import { GolfBall } from "../golfball.js";
import { Player } from "../player.js";
import { ClubManager, CLUB_TYPES } from "../clubs.js";
import { WindSystem } from "../wind.js";
import { Terrain } from "../terrain.js";

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
    // Load sound effects
    this.load.audio("hit", "assets/sounds/hit.mp3");
  }

  create() {
    // Set world bounds much larger for a big golf course, with extra space above for ball flight
    this.physics.world.setBounds(0, -1000, 20000, 1650); // Extended to 20,000px wide
    
    // Enable gravity for realistic falling
    // this.physics.world.gravity.y = 500; // Gravity pulls objects down
    
    // Create repeating sky background across the entire course
    this.add.tileSprite(0, 0, 20000, 600, "sky").setOrigin(0, 0);

    // Create terrain system with green
    this.terrain = new Terrain(this);

    // Create animations
    createGolferAnimations(this);

    // Setup WASD controls
    this.keys = setupWASD(this);

    // Create player at terrain height
    const startX = 100;
    const startY = this.terrain.getHeightAtX(startX) - 30; // 30px above terrain
    this.player = new Player(this, startX, startY);
    this.player.setTerrain(this.terrain);

    // Create golf ball at terrain height
    const ballStartX = 200;
    const ballStartY = this.terrain.getHeightAtX(ballStartX) - 15; // 15px above terrain
    this.golfBall = new GolfBall(this, ballStartX, ballStartY);
    this.golfBall.setTerrain(this.terrain);

    // Create and set hit sound for the golf ball
    this.hitSound = this.sound.add("hit", { volume: 0.5 });
    this.golfBall.setHitSound(this.hitSound);

    // Create club manager
    this.clubManager = new ClubManager();

    // Create wind system
    this.windSystem = new WindSystem(this);
    this.golfBall.setWindSystem(this.windSystem);

    // Set up camera to follow the player
    this.cameras.main.startFollow(this.player.sprite);
    
    // Set camera bounds to cover the full golf course (keep camera on ground level)
    this.cameras.main.setBounds(0, 0, 20000, 650);

    // Create UI elements for club display
    this.createClubUI();
    
    // Create distance tracking UI
    this.createDistanceUI();
    
    // Create wind UI
    this.createWindUI();
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
    // Smaller power meter that will follow the player
    const meterWidth = 100;
    const meterHeight = 12;
    
    // Power meter background
    this.powerMeterBg = this.add.rectangle(0, 0, meterWidth, meterHeight, 0x333333);
    this.powerMeterBg.setOrigin(0.5, 1); // Center horizontally, bottom aligned
    this.powerMeterBg.setStrokeStyle(2, 0xffffff);
    
    // Power meter fill
    this.powerMeterFill = this.add.rectangle(0, 0, 0, meterHeight - 4, 0x00ff00);
    this.powerMeterFill.setOrigin(0, 0.5); // Left aligned, center vertically
    
    // Power meter label (smaller text)
    this.powerMeterLabel = this.add.text(0, 0, '', {
      fontSize: '12px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      fontFamily: 'Arial'
    });
    this.powerMeterLabel.setOrigin(0.5, 1); // Center horizontally, bottom aligned
    
    // Initially hide power meter
    this.powerMeterBg.setVisible(false);
    this.powerMeterFill.setVisible(false);
    this.powerMeterLabel.setVisible(false);
  }

  updateClubUI() {
    const clubInfo = this.clubManager.getClubInfo();
    const backspinText = clubInfo.type === 'wedge' ? '\nHold CTRL while swinging for backspin' : '';
    this.clubText.setText(`Club: ${clubInfo.name}\n${clubInfo.description}\nPress 1: Driver | Press 2: Putter | Press 3: Wedge\nHold SHIFT to run${backspinText}`);
  }

  createDistanceUI() {
    // Distance display in top-right corner
    this.distanceText = this.add.text(this.cameras.main.width - 20, 20, '', {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.distanceText.setOrigin(1, 0); // Right-aligned
    this.distanceText.setScrollFactor(0); // Keep UI fixed on screen
    this.updateDistanceUI();
  }

  updateDistanceUI() {
    const currentDistance = this.golfBall.getCurrentDistance();
    const lastDistance = this.golfBall.getLastShotDistance();
    const isTracking = this.golfBall.isTrackingDistance();
    
    let distanceText = '';
    
    if (isTracking) {
      // Show current shot distance while ball is moving
      distanceText = `Current Shot: ${currentDistance} yds`;
    } else if (lastDistance > 0) {
      // Show last completed shot distance
      distanceText = `Last Shot: ${lastDistance} yds`;
    } else {
      // No shots taken yet
      distanceText = 'Distance: 0 yds';
    }
    
    this.distanceText.setText(distanceText);
  }

  createWindUI() {
    // Wind display in top-right corner, below distance
    this.windText = this.add.text(this.cameras.main.width - 20, 60, '', {
      fontSize: '20px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.windText.setOrigin(1, 0); // Right-aligned
    this.windText.setScrollFactor(0); // Keep UI fixed on screen
    this.updateWindUI();
  }

  updateWindUI() {
    const windInfo = this.windSystem.getWindInfo();
    this.windText.setText(`Wind: ${windInfo.speed} mph ${windInfo.compass}`);
  }

  updatePowerMeter() {
    const isCharging = this.player.chargingPower;
    const powerLevel = this.player.getPowerLevel();
    
    // Show/hide power meter based on charging state
    this.powerMeterBg.setVisible(isCharging);
    this.powerMeterFill.setVisible(isCharging);
    this.powerMeterLabel.setVisible(isCharging);
    
    if (isCharging) {
      // Position power meter above the player
      const playerX = this.player.x;
      const playerY = this.player.y;
      const offsetY = -60; // Distance above player
      
      // Update positions
      this.powerMeterBg.setPosition(playerX, playerY + offsetY);
      this.powerMeterFill.setPosition(playerX - 48, playerY + offsetY); // Left edge of meter
      this.powerMeterLabel.setPosition(playerX, playerY + offsetY - 20);
      
      // Update power meter fill width
      const maxWidth = 96; // meterWidth - 4 (for padding)
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
      
      // Update label with power percentage (shorter text for smaller meter)
      const powerPercent = Math.round(powerLevel * 100);
      this.powerMeterLabel.setText(`${powerPercent}%`);
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
    
    if (Phaser.Input.Keyboard.JustDown(keys.three)) {
      this.clubManager.selectWedge();
      this.updateClubUI();
      console.log('Switched to Wedge');
    }

    // Update player movement and animations
    this.player.update(keys);

    // Update power meter display
    this.updatePowerMeter();

    // Check if player is trying to hit the ball (only during swing animation)
    if (this.player.isSwinging()) {
      this.golfBall.checkHit(this.player, this.clubManager, keys);
    }

    // Update wind system
    this.windSystem.update(this.game.loop.delta);
    this.updateWindUI();

    // Update terrain physics for ball
    this.golfBall.updateTerrainPhysics();

    // Apply wind effects to ball during flight
    this.golfBall.applyWindEffects();

    // Apply ground friction when ball is rolling (pass current club for different friction)
    const currentClubType = this.clubManager.getCurrentClub();
    this.golfBall.applyGroundFriction(currentClubType);

    // Update distance tracking
    this.golfBall.updateDistance();
    this.updateDistanceUI();
  }

}
