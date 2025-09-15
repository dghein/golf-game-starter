import { createGolferAnimations } from "../animations.js";
import { setupWASD } from "../controls.js";
import { GolfBall } from "../golfball.js";
import { Player } from "../player.js";
import { ClubManager, CLUB_TYPES } from "../clubs.js";
import { WindSystem } from "../wind.js";
import { Hole3Terrain } from "../Hole3Terrain.js";
import { courseManager } from "../CourseManager.js";
import { Enemy } from "../Enemy.js";

export default class Hole3Scene extends Phaser.Scene {
  constructor() {
    super("Hole3Scene");
  }

  preload() {
    this.load.image("sky", "assets/course/sky.png");
    this.load.image("flag", "assets/course/flag.png");
    this.load.image("enemy1_standing", "assets/enemies/enemy1_standing.png");
    this.load.image("enemy1_walking1", "assets/enemies/enemy1_walking1.png");
    this.load.image("enemy1_walking2", "assets/enemies/enemy1_walking2.png");
    this.load.image("enemy1_swing1", "assets/enemies/enemy1_swing1.png");
    this.load.image("enemy1_swing2", "assets/enemies/enemy1_swing2.png");
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
    this.load.image("golfer_boat", "assets/golfer/golfer_boat.png");
    this.load.image("golfer_damaged", "assets/golfer/golfer_damaged.png");
    this.load.image("golfer_down", "assets/golfer/golfer_down.png");
    // Load sound effects
    this.load.audio("hit", "assets/sounds/hit.mp3");
    this.load.audio("putt", "assets/sounds/putt.mp3");
    this.load.audio("swoosh", "assets/sounds/swoosh.mp3");
    this.load.audio("splash", "assets/sounds/splash.mp3");
    this.load.audio("clap", "assets/sounds/clap.mp3");
    this.load.audio("cheer", "assets/sounds/cheer.mp3");
    this.load.audio("swimming", "assets/sounds/swimming.mp3");
    this.load.audio("bounce", "assets/sounds/bounce.mp3");
    this.load.audio("background", "assets/sounds/background.mp3");
    this.load.audio("fireball", "assets/sounds/fireball.mp3");
    this.load.audio("bossfight", "assets/sounds/bossfight1.mp3");
  }

  create() {
    
    // Set world bounds for Hole 3 (300 yards = 6000 pixels)
    this.physics.world.setBounds(0, -1000, 6000, 2500);
    
    // Create repeating sky background across the course
    this.add.tileSprite(0, 0, 6000, 600, "sky").setOrigin(0, 0);

    // Create custom terrain system for Hole 3
    this.terrain = new Hole3Terrain(this);

    // Create flag at hole position
    this.createFlag();

    // Create animations
    createGolferAnimations(this);
    
    // Create enemy walking animations
    this.createEnemyAnimations();

    // Setup WASD controls
    this.keys = setupWASD(this);

    // Create swimming sound early so it's available for player
    this.swimmingSound = this.sound.add("swimming", { volume: 0.6, loop: true });
    this.bounceSound = this.sound.add("bounce", { volume: 0.4 });
    
    // Create and start background music
    this.backgroundMusic = this.sound.add("background", { volume: 0.3, loop: true });
    this.backgroundMusic.play();

    // Create player at terrain height
    const startX = 100;
    const startY = this.terrain.getHeightAtX(startX) - 30; // 30px above terrain
    this.player = new Player(this, startX, startY);
    this.player.setTerrain(this.terrain);
    this.player.setSwimmingSound(this.swimmingSound);
    
    // Save score at start of hole for restart functionality
    this.player.saveHoleStartScore();
    
    // Set player depth to appear above terrain
    this.player.sprite.setDepth(5);

    // Create golf ball at terrain height
    const ballStartX = 200;
    const ballStartY = this.terrain.getHeightAtX(ballStartX) - 10; // 10px above terrain
    this.golfBall = new GolfBall(this, ballStartX, ballStartY);
    this.golfBall.setTerrain(this.terrain);
    
    // Set golf ball depth to appear above terrain
    this.golfBall.sprite.setDepth(5);

    // Create enemy in front of the green (after golf ball is created)
    this.createEnemy();

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
    this.golfBall.setBounceSound(this.bounceSound);
    
    // Create and set clap sound for hole completion
    this.clapSound = this.sound.add("clap", { volume: 0.8 });
    this.cheerSound = this.sound.add("cheer", { volume: 0.8 });
    this.golfBall.setClapSound(this.clapSound);
    this.golfBall.setCheerSound(this.cheerSound);
    
    // Create fireball sound for enemy attacks
    this.fireballSound = this.sound.add("fireball", { volume: 0.8 });
    this.bossfightSound = this.sound.add("bossfight", { volume: 0.6, loop: true });
    
    
    // Set up camera switching callback
    this.golfBall.setOnBallHitCallback(() => {
      this.switchCameraToBall();
      this.incrementShotCounter();
    });
    
    // Set up water penalty callback
    this.golfBall.setOnWaterPenaltyCallback(() => {
      this.incrementShotCounter(); // Add penalty stroke
    });
    
    // Set up hole completion callback
    this.golfBall.setOnHoleCompletedCallback(() => {
      this.completeHole();
    });

    // Create club manager
    this.clubManager = new ClubManager();

    // Create wind system
    this.windSystem = new WindSystem(this);
    this.golfBall.setWindSystem(this.windSystem);

    // Set up camera to follow the player initially
    this.cameras.main.startFollow(this.player.sprite);
    
    // Set camera bounds to cover the golf course
    this.cameras.main.setBounds(0, 0, 6000, 1000);
    
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
    
    // Create hole info UI
    this.holeInfoText = this.add.text(20, 80, '', {
      fontSize: '20px',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.holeInfoText.setScrollFactor(0);
    this.updateHoleInfoUI();
    
    // Create power meter UI
    this.createPowerMeter();
    this.updateClubUI();
  }

  updateClubUI() {
    const clubInfo = this.clubManager.getClubInfo();
    this.clubText.setText(`Club: ${clubInfo.name}\n${clubInfo.description}`);
  }

  updateHoleInfoUI() {
    const holeNumber = courseManager.getCurrentHole();
    const par = courseManager.getCurrentPar();
    const yardage = courseManager.getCurrentYardage();
    const scoreToPar = courseManager.getScoreRelativeToPar();
    
    // Always show score - use "E" for even par, +/- for others
    let scoreDisplay;
    if (scoreToPar === 0) {
      scoreDisplay = 'E';
    } else if (scoreToPar > 0) {
      scoreDisplay = `+${scoreToPar}`;
    } else {
      scoreDisplay = `${scoreToPar}`; // Already has negative sign
    }
    
    this.holeInfoText.setText(`Hole ${holeNumber} - Par ${par}, ${yardage}y | Total: ${scoreDisplay}`);
  }

  completeHole() {
    // Record score for this hole
    courseManager.recordScore(this.shotCount);
    
    // Show completion message
    this.showHoleCompletedMessage();
    
    // Advance to next hole after delay
    this.time.delayedCall(3000, () => {
      this.advanceToNextHole();
    });
  }

  showHoleCompletedMessage() {
    const par = courseManager.getCurrentPar();
    const strokes = this.shotCount;
    const scoreName = this.getScoreName(strokes, par);
    const isHoleInOne = strokes === 1;
    
    // Create completion message
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Declare celebrationText at function level for cleanup access
    let celebrationText = null;
    
    // Special styling for hole-in-one
    const textStyle = isHoleInOne ? {
      fontSize: '48px',
      fill: '#FFD700', // Gold color for hole-in-one
      stroke: '#FF0000', // Red stroke for extra emphasis
      strokeThickness: 6,
      fontFamily: 'Arial',
      align: 'center'
    } : {
      fontSize: '32px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial',
      align: 'center'
    };
    
    const messageText = isHoleInOne ? 
      `🎉 HOLE IN ONE! 🎉\nHole ${courseManager.getCurrentHole()} Complete!\n${strokes} stroke (Par ${par})\n${scoreName}` :
      `Hole ${courseManager.getCurrentHole()} Complete!\n${strokes} strokes (Par ${par})\n${scoreName}`;
    
    const completionText = this.add.text(centerX, centerY - 50, messageText, textStyle);
    completionText.setOrigin(0.5);
    completionText.setScrollFactor(0);
    completionText.setDepth(100); // Set high depth to appear on top of all game elements
    
    // Add celebration effects for hole-in-one
    if (isHoleInOne) {
      // Add pulsing effect
      this.tweens.add({
        targets: completionText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 500,
        yoyo: true,
        repeat: 5,
        ease: 'Power2'
      });
      
      // Add extra celebration text
      celebrationText = this.add.text(centerX, centerY + 20, 'INCREDIBLE SHOT!', {
        fontSize: '28px',
        fill: '#FFD700',
        stroke: '#FF0000',
        strokeThickness: 4,
        fontFamily: 'Arial',
        align: 'center'
      });
      celebrationText.setOrigin(0.5);
      celebrationText.setScrollFactor(0);
      celebrationText.setDepth(100);
      
      // Pulse the celebration text too
      this.tweens.add({
        targets: celebrationText,
        alpha: 0.3,
        duration: 300,
        yoyo: true,
        repeat: 8,
        ease: 'Power2'
      });
    }
    
    // Add "Next Hole" text
    const nextText = this.add.text(centerX, centerY + 80, 'Next hole in 3 seconds...', {
      fontSize: '24px',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    nextText.setOrigin(0.5);
    nextText.setScrollFactor(0);
    nextText.setDepth(100); // Set high depth to appear on top of all game elements
    
    // Remove completion message after 3 seconds
    this.time.delayedCall(3000, () => {
      completionText.destroy();
      if (isHoleInOne && celebrationText) {
        celebrationText.destroy();
      }
      nextText.destroy();
    });
  }

  getScoreName(strokes, par) {
    // Special case: Hole-in-one (1 stroke on any hole)
    if (strokes === 1) {
      return 'HOLE IN ONE! 🎉';
    }
    
    const diff = strokes - par;
    if (diff <= -4) return 'Condor!';
    if (diff === -3) return 'Albatross!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie!';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  }

  advanceToNextHole() {
    if (courseManager.nextHole()) {
      // Get next scene name
      const nextSceneName = courseManager.getCurrentSceneName();
      
      // Check if next scene exists, otherwise show completion
      if (this.scene.manager.scenes.find(scene => scene.sys.config === nextSceneName)) {
        this.scene.start(nextSceneName);
      } else {
        // For now, just restart Hole 1 (until we create more holes)
        this.scene.start('Hole1Scene');
      }
    } else {
      // Course complete!
      this.showCourseComplete();
    }
  }

  showCourseComplete() {
    // TODO: Show final scorecard and course completion screen
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

  updateWindUI() {
    const windInfo = this.windSystem.getWindInfo();
    this.windText.setText(`Wind: ${windInfo.speed} mph ${windInfo.compass}`);
  }

  updateShotCounterUI() {
    this.shotCounterText.setText(`Shots: ${this.shotCount}`);
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

  incrementShotCounter() {
    this.shotCount++;
    this.updateShotCounterUI();
    this.updateHoleInfoUI(); // Update hole info with new score
  }

  resetShotCounter() {
    this.shotCount = 0;
    this.updateShotCounterUI();
  }

  switchCameraToBall() {
    if (!this.cameraFollowingBall) {
      this.cameras.main.startFollow(this.golfBall.sprite);
      this.cameraFollowingBall = true;
    }
  }
  
  switchCameraToPlayer() {
    if (this.cameraFollowingBall) {
      this.cameras.main.startFollow(this.player.sprite);
      this.cameraFollowingBall = false;
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
    
    // Track ball movement state for next frame
    this.ballWasMoving = ballIsMoving;
  }
  
  update() {
    const keys = this.keys;

    // Handle restart on escape key
    if (Phaser.Input.Keyboard.JustDown(keys.esc)) {
      this.restartGame();
      return;
    }

    // Handle club switching
    if (Phaser.Input.Keyboard.JustDown(keys.one)) {
      this.clubManager.selectDriver();
      this.updateClubUI();
    }
    
    if (Phaser.Input.Keyboard.JustDown(keys.two)) {
      this.clubManager.selectPutter();
      this.updateClubUI();
    }
    
    if (Phaser.Input.Keyboard.JustDown(keys.three)) {
      this.clubManager.selectWedge();
      this.updateClubUI();
    }
    
    if (Phaser.Input.Keyboard.JustDown(keys.four)) {
      this.clubManager.selectIron();
      this.updateClubUI();
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
    
    // Debug: Test player knockback with 'k' key
    if (Phaser.Input.Keyboard.JustDown(keys.k)) {
      console.log('Testing player knockback...');
      if (this.enemy && this.player) {
        const distance = Phaser.Math.Distance.Between(
          this.enemy.sprite.x, this.enemy.sprite.y,
          this.player.sprite.x, this.player.sprite.y
        );
        console.log(`Player distance from enemy: ${Math.round(distance)} pixels`);
        
        if (distance <= 150) {
          // Simply stun the player in place
          this.player.enableKnockbackMode();
          this.player.setDamagedSprite();
          
          // Stun for 2 seconds, then get up
          this.time.delayedCall(2000, () => {
            this.player.disableKnockbackMode();
            this.player.restoreNormalSprite();
          });
          
          console.log('Player stunned by test hit!');
        } else {
          console.log('Player too far for test stun');
        }
      } else {
        console.log('Enemy or player not available for test');
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
    
    // Check for water collision (runs every frame)
    this.golfBall.checkWaterCollision();
    
    // Check for bunker collision (runs every frame)
    this.golfBall.checkBunkerCollision();
    
    // Check for target circle collision (runs every frame)
    this.golfBall.checkTargetCircleCollision();
    
    // Update distance to pin
    this.updateDistanceToPinUI();
    
    // Handle camera switching between player and ball
    this.updateCameraFollow();
    
    // Update enemy behavior
    if (this.enemy && this.enemy.isAlive()) {
      this.enemy.update();
    }
  }

  // Create flag at hole position
  createFlag() {
    const pinPosition = this.terrain.getPinPosition();
    
    // Get the terrain height at the pin position to place flag bottom on ground
    const terrainHeight = this.terrain.getHeightAtX(pinPosition.x);
    
    // Create flag sprite positioned 10 pixels below terrain level
    this.flag = this.add.sprite(pinPosition.x, terrainHeight + 10, "flag");
    
    // Set flag properties
    this.flag.setOrigin(0.5, 1); // Bottom-center origin so flag sits on ground
    this.flag.setDepth(10); // Above other game elements
    this.flag.setScale(0.8); // Slightly smaller for better proportion
  }

  // Create enemy in front of the green
  createEnemy() {
    // Position enemy in front of the green (green starts at x=5000)
    const enemyX = 4600; // 200 pixels before green starts
    const enemyY = this.terrain.getHeightAtX(enemyX) - 5; // Move down 5 pixels to sit on terrain
    
    // Create enemy
    this.enemy = new Enemy(this, enemyX, enemyY);
    
    // Set references to other game objects (they should be available now)
    this.enemy.setGolfBall(this.golfBall);
    this.enemy.setPlayer(this.player);
    this.enemy.setTerrain(this.terrain);
    this.enemy.setFireballSound(this.fireballSound);
    this.enemy.setBossfightSound(this.bossfightSound);
    
    // Set up collision between enemy and golf ball
    this.physics.add.collider(this.golfBall.sprite, this.enemy.sprite, this.handleBallEnemyCollision, null, this);
  }

  // Create enemy walking animations
  createEnemyAnimations() {
    // Enemy walking animation (right-facing)
    this.anims.create({
      key: 'enemy_walk',
      frames: [
        { key: 'enemy1_walking1' },
        { key: 'enemy1_walking2' }
      ],
      frameRate: 8, // Slower walking animation
      repeat: -1 // Loop indefinitely
    });
    
    // Enemy idle animation (standing)
    this.anims.create({
      key: 'enemy_idle',
      frames: [
        { key: 'enemy1_standing' }
      ],
      frameRate: 1,
      repeat: -1
    });
    
    // Enemy swing animation (right-facing)
    this.anims.create({
      key: 'enemy_swing',
      frames: [
        { key: 'enemy1_swing1' },
        { key: 'enemy1_swing2' }
      ],
      frameRate: 12, // Fast swing animation
      repeat: 0 // Play once
    });
  }

  // Handle collision between golf ball and enemy
  handleBallEnemyCollision(ballSprite, enemySprite) {
    // Calculate bounce direction based on ball's approach
    const ballVel = this.golfBall.getVelocity();
    const ballSpeed = Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y);
    
    // Only bounce if ball has significant speed
    if (ballSpeed > 50) {
      // Calculate bounce direction (away from enemy)
      const enemyX = enemySprite.x;
      const ballX = ballSprite.x;
      const direction = ballX > enemyX ? 1 : -1; // Bounce away from enemy
      
      // Apply bounce with reduced speed
      const bounceSpeed = ballSpeed * 0.6; // Reduce speed by 40%
      const bounceAngle = Math.random() * 0.5 - 0.25; // Random angle variation
      
      this.golfBall.setVelocity(
        direction * bounceSpeed * Math.cos(bounceAngle),
        -Math.abs(bounceSpeed * Math.sin(bounceAngle)) // Always bounce upward
      );
    }
  }

  // Restart game from current hole
  restartGame() {
    console.log('Restarting game from current hole (Hole 3)');
    
    // Stop all sounds to prevent layering
    if (this.bossfightSound && this.bossfightSound.isPlaying) {
      this.bossfightSound.stop();
      console.log('Bossfight music stopped on restart');
    }
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.stop();
      console.log('Background music stopped on restart');
    }
    
    // Remove game over message if it exists
    if (this.player && this.player.removeGameOverMessage) {
      this.player.removeGameOverMessage();
    }
    
    // Reset player state
    if (this.player && this.player.resetPlayerState) {
      this.player.resetPlayerState();
    }
    
    // Restart current scene (Hole 3)
    this.scene.restart();
  }
}
