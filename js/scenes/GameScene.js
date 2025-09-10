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
    this.load.audio("putt", "assets/sounds/putt.mp3");
    this.load.audio("swoosh", "assets/sounds/swoosh.mp3");
    this.load.audio("splash", "assets/sounds/splash.mp3");
    this.load.audio("clap", "assets/sounds/clap.mp3");
    
    // Debug: Log when clap sound is loaded
    this.load.on('filecomplete-audio-clap', () => {
      console.log('Clap sound file loaded successfully');
    });
  }

  create() {
    // Set world bounds for expanded golf hole, with extra space above for ball flight
    this.physics.world.setBounds(0, -1000, 15000, 1650); // Extended width for expanded water and fairway
    
    // Enable gravity for realistic falling
    // this.physics.world.gravity.y = 500; // Gravity pulls objects down
    
    // Create repeating sky background across the entire course
    this.add.tileSprite(0, 0, 15000, 600, "sky").setOrigin(0, 0);

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

    // Create and set hit sounds for the golf ball
    this.hitSound = this.sound.add("hit", { volume: 0.5 });
    this.puttSound = this.sound.add("putt", { volume: 0.4 });
    this.swooshSound = this.sound.add("swoosh", { volume: 0.6 });
    this.golfBall.setHitSound(this.hitSound);
    this.golfBall.setPuttSound(this.puttSound);
    this.golfBall.setSwooshSound(this.swooshSound);
    
    // Create and set splash sound for water hazard
    this.splashSound = this.sound.add("splash", { volume: 0.7 });
    this.golfBall.setSplashSound(this.splashSound);
    
    // Create and set clap sound for hole completion
    this.clapSound = this.sound.add("clap", { volume: 0.8 });
    console.log('Clap sound created:', this.clapSound);
    this.golfBall.setClapSound(this.clapSound);
    console.log('Clap sound set on golf ball');
    
    // Set up camera switching callback
    this.golfBall.setOnBallHitCallback(() => {
      this.switchCameraToBall();
      this.incrementShotCounter();
    });
    
    // Set up water penalty callback
    this.golfBall.setOnWaterPenaltyCallback(() => {
      this.incrementShotCounter(); // Add penalty stroke
      console.log('Water penalty! Adding penalty stroke.');
    });

    // Create club manager
    this.clubManager = new ClubManager();

    // Create wind system
    this.windSystem = new WindSystem(this);
    this.golfBall.setWindSystem(this.windSystem);

    // Set up camera to follow the player initially
    this.cameras.main.startFollow(this.player.sprite);
    
    // Set camera bounds to cover the full golf course (keep camera on ground level)
    this.cameras.main.setBounds(0, 0, 15000, 650);
    
    // Camera management state
    this.cameraFollowingBall = false;
    this.ballWasMoving = false;
    
    // Shot counter
    this.shotCount = 0;

    // Create UI elements for club display
    this.createClubUI();
    
    // Create distance tracking UI
    this.createDistanceUI();
    
    // Create wind UI
    this.createWindUI();
    
    // Create shot counter UI
    this.createShotCounterUI();
    
    // Create distance to pin UI
    this.createDistanceToPinUI();
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
    this.clubText.setText(`Club: ${clubInfo.name}\n${clubInfo.description}`);
  }

  createDistanceUI() {
    // Distance display in top-right corner, positioned to leave room for pin distance
    this.distanceText = this.add.text(this.cameras.main.width - 275, 20, '', {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.distanceText.setOrigin(0, 0); // Left-aligned to grow rightward
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
      distanceText = `${currentDistance} yds`;
    } else if (lastDistance > 0) {
      // Show last completed shot distance
      distanceText = `${lastDistance} yds`;
    } else {
      // No shots taken yet
      distanceText = '0 yds';
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

  createShotCounterUI() {
    // Shot counter display in top-right corner, below wind
    this.shotCounterText = this.add.text(this.cameras.main.width - 20, 100, '', {
      fontSize: '20px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.shotCounterText.setOrigin(1, 0); // Right-aligned
    this.shotCounterText.setScrollFactor(0); // Keep UI fixed on screen
    this.updateShotCounterUI();
  }

  updateShotCounterUI() {
    this.shotCounterText.setText(`Shots: ${this.shotCount}`);
  }

  incrementShotCounter() {
    this.shotCount++;
    this.updateShotCounterUI();
    console.log(`Shot ${this.shotCount} taken`);
  }

  resetShotCounter() {
    this.shotCount = 0;
    this.updateShotCounterUI();
    console.log('Shot counter reset for new hole');
  }

  createDistanceToPinUI() {
    // Distance to pin display on same line as shot distance, to the right
    this.distanceToPinText = this.add.text(this.cameras.main.width - 20, 20, '', {
      fontSize: '24px', // Match shot distance font size
      fill: '#ffff00', // Yellow color to distinguish from other UI
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.distanceToPinText.setOrigin(1, 0); // Right-aligned
    this.distanceToPinText.setScrollFactor(0); // Keep UI fixed on screen
    this.updateDistanceToPinUI();
  }

  updateDistanceToPinUI() {
    const ballX = this.golfBall.x;
    const ballY = this.golfBall.y;
    const pinPosition = this.terrain.getPinPosition();
    
    // Calculate distance in pixels
    const distancePixels = Math.sqrt(
      Math.pow(pinPosition.x - ballX, 2) + 
      Math.pow(pinPosition.y - ballY, 2)
    );
    
    // Convert to yards (20 pixels per yard)
    const distanceYards = Math.round(distancePixels / 20);
    
    this.distanceToPinText.setText(`  |  Pin: ${distanceYards} yds`);
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
    
    if (Phaser.Input.Keyboard.JustDown(keys.four)) {
      this.clubManager.selectIron();
      this.updateClubUI();
      console.log('Switched to Iron');
    }
    
    // Handle manual camera switching
    if (Phaser.Input.Keyboard.JustDown(keys.c)) {
      if (this.cameraFollowingBall) {
        this.switchCameraToPlayer();
      } else {
        this.switchCameraToBall();
      }
    }
    
    // Handle shot counter reset
    if (Phaser.Input.Keyboard.JustDown(keys.r)) {
      this.resetShotCounter();
    }
    
    // Debug: Test clap sound with 'p' key
    if (Phaser.Input.Keyboard.JustDown(keys.p)) {
      console.log('Testing clap sound...');
      if (this.clapSound) {
        this.clapSound.play();
        console.log('Clap sound played manually');
      } else {
        console.log('Clap sound not available for manual test');
      }
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
    this.golfBall.updateDistance(this.game.loop.delta);
    this.updateDistanceUI();
    
    // Always check for ball stabilization (even when not tracking distance)
    this.golfBall.isStablyStopped(this.game.loop.delta);
    
    // Check for target circle collision (runs every frame)
    this.golfBall.checkTargetCircleCollision();
    
    // Update distance to pin
    this.updateDistanceToPinUI();
    
    // Handle camera switching between player and ball
    this.updateCameraFollow();
  }
  
  switchCameraToBall() {
    if (!this.cameraFollowingBall) {
      this.cameras.main.startFollow(this.golfBall.sprite);
      this.cameraFollowingBall = true;
      console.log('Camera switched to following ball');
    }
  }
  
  switchCameraToPlayer() {
    if (this.cameraFollowingBall) {
      this.cameras.main.startFollow(this.player.sprite);
      this.cameraFollowingBall = false;
      console.log('Camera switched back to following player');
    }
  }
  
  updateCameraFollow() {
    const ballIsMoving = this.golfBall.isMoving();
    const ballIsStablyStopped = this.golfBall.isStablyStopped(this.game.loop.delta);
    const playerIsMoving = this.player.isMoving();
    
    // Switch back to following player as soon as they start moving
    if (this.cameraFollowingBall && playerIsMoving) {
      this.switchCameraToPlayer();
    }
    // Also switch back to following player when ball is stably stopped (fallback)
    else if (this.cameraFollowingBall && ballIsStablyStopped) {
      this.switchCameraToPlayer();
    }
    
    // Track ball movement state for next frame
    this.ballWasMoving = ballIsMoving;
  }

}
