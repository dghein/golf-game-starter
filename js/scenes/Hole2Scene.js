import { createGolferAnimations } from "../animations.js";
import { setupWASD } from "../controls.js";
import { GolfBall } from "../golfball.js";
import { Player } from "../player.js";
import { ClubManager, CLUB_TYPES } from "../clubs.js";
import { WindSystem } from "../wind.js";
import { Terrain } from "../terrain.js";
import { courseManager } from "../CourseManager.js";

export default class Hole2Scene extends Phaser.Scene {
  constructor() {
    super("Hole2Scene");
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
    console.log(`Creating Hole ${courseManager.getCurrentHole()} - Par ${courseManager.getCurrentPar()}`);
    
    // Set world bounds for expanded golf hole, with extra space above for ball flight
    this.physics.world.setBounds(0, -1000, 15000, 1650); // Extended width for expanded water and fairway
    
    // Enable gravity for realistic falling
    // this.physics.world.gravity.y = 500; // Gravity pulls objects down
    
    // Create repeating sky background across the entire course
    this.add.tileSprite(0, 0, 15000, 600, "sky").setOrigin(0, 0);

    // Create terrain system with green (you can customize this for each hole)
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
    const ballStartY = this.terrain.getHeightAtX(ballStartX) - 10; // 10px above terrain (lowered by 5px)
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

  // Copy all the UI and game logic methods from Hole1Scene
  // (In a real implementation, you'd want to create a base HoleScene class)
  
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
    console.log(`Hole ${courseManager.getCurrentHole()} completed in ${this.shotCount} strokes!`);
    
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
    
    // Create completion message
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const completionText = this.add.text(centerX, centerY - 50, 
      `Hole ${courseManager.getCurrentHole()} Complete!\n${strokes} strokes (Par ${par})\n${scoreName}`, {
      fontSize: '32px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial',
      align: 'center'
    });
    completionText.setOrigin(0.5);
    completionText.setScrollFactor(0);
    
    // Add "Next Hole" text
    const nextText = this.add.text(centerX, centerY + 50, 'Next hole in 3 seconds...', {
      fontSize: '24px',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    nextText.setOrigin(0.5);
    nextText.setScrollFactor(0);
  }

  getScoreName(strokes, par) {
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
        console.log(`Scene ${nextSceneName} not found, restarting Hole 1`);
        this.scene.start('Hole1Scene');
      }
    } else {
      // Course complete!
      this.showCourseComplete();
    }
  }

  showCourseComplete() {
    console.log('Course Complete!');
    // TODO: Show final scorecard and course completion screen
  }

  // Minimal implementations of required methods
  createPowerMeter() { /* Same as Hole1Scene */ }
  createDistanceUI() { /* Same as Hole1Scene */ }
  createWindUI() { /* Same as Hole1Scene */ }
  createShotCounterUI() { /* Same as Hole1Scene */ }
  createDistanceToPinUI() { /* Same as Hole1Scene */ }
  updatePowerMeter() { /* Same as Hole1Scene */ }
  updateDistanceUI() { /* Same as Hole1Scene */ }
  updateWindUI() { /* Same as Hole1Scene */ }
  updateShotCounterUI() { /* Same as Hole1Scene */ }
  updateDistanceToPinUI() { /* Same as Hole1Scene */ }
  incrementShotCounter() { 
    this.shotCount++;
    this.updateShotCounterUI();
    this.updateHoleInfoUI();
  }
  resetShotCounter() { /* Same as Hole1Scene */ }
  switchCameraToBall() { /* Same as Hole1Scene */ }
  switchCameraToPlayer() { /* Same as Hole1Scene */ }
  updateCameraFollow() { /* Same as Hole1Scene */ }
  
  update() {
    // Minimal update loop - you'd copy the full update from Hole1Scene
    this.player.update(this.keys);
    if (this.player.isSwinging()) {
      this.golfBall.checkHit(this.player, this.clubManager, this.keys);
    }
    this.golfBall.updateTerrainPhysics();
    this.golfBall.applyWindEffects();
    this.golfBall.applyGroundFriction(this.clubManager.getCurrentClub());
    this.golfBall.updateDistance(this.game.loop.delta);
    this.golfBall.isStablyStopped(this.game.loop.delta);
    this.golfBall.checkTargetCircleCollision();
  }
}
