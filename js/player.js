/**
 * Player class for managing golfer sprite, animations, and movement
 */
export class Player {
  constructor(scene, x = 100, y = 630) {
    this.scene = scene;
    this.walkSpeed = 160;
    this.runSpeed = 480; // 3x walking speed
    this.isRunning = false;
    this.isSwingInProgress = false;
    this.isChargingPower = false;
    this.powerChargeStartTime = 0;
    this.currentPower = 0;
    this.minPower = 0.2; // Minimum power (20%)
    this.maxPower = 2.0; // Maximum power (200%)
    this.chargeTime = 2000; // Time in ms to reach max power
    this.speedLines = null; // Will hold speed lines effect
    this.terrain = null; // Reference to terrain system
    this.groundOffset = 60; // Distance above ground to maintain (adjusted for proper positioning)
    this.swimmingSound = null; // Reference to swimming sound
    this.isInWater = false; // Track if player is currently in water
    this.isKnockedBack = false; // Track if player is in knockback mode
    
    // Create player sprite
    this.sprite = scene.physics.add.sprite(x, y, "golfer_walking_0");
    
    // Keep player within world bounds (prevents falling off the world)
    this.sprite.setCollideWorldBounds(true);
    
    // Disable gravity for player since they follow terrain
    this.sprite.body.setGravityY(-100); // Counteract world gravity
    
    // Listen for animation complete events
    this.sprite.on('animationcomplete', (anim) => {
      if (anim.key === 'swing' || anim.key === 'swing_followthrough') {
        this.isSwingInProgress = false;
        // Return to walking animation to ensure clean state
        this.sprite.play('walk');
        console.log('Swing animation completed, returning to walk state');
      }
    });

    // Create speed lines effect (initially hidden)
    this.createSpeedLines();
  }

  // Create speed lines visual effect
  createSpeedLines() {
    this.speedLines = [];
    
    // Create horizontal speed lines of varying lengths
    const lineLengths = [40, 30, 35, 25, 45]; // Different lengths for variety
    
    for (let i = 0; i < 5; i++) {
      const line = this.scene.add.rectangle(0, 0, lineLengths[i], 2, 0xffffff, 0.8);
      line.setVisible(false);
      this.speedLines.push(line);
    }
  }

  // Get player position
  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Get player body for physics interactions
  get body() {
    return this.sprite.body;
  }

  // Get player flip state
  get flipX() {
    return this.sprite.flipX;
  }

  // Get player animations
  get anims() {
    return this.sprite.anims;
  }

  // Set terrain reference for height following
  setTerrain(terrain) {
    this.terrain = terrain;
  }

  // Set swimming sound reference
  setSwimmingSound(swimmingSound) {
    this.swimmingSound = swimmingSound;
  }
  
  // Enable knockback mode (disables normal movement)
  enableKnockbackMode() {
    this.isKnockedBack = true;
  }
  
  // Disable knockback mode (restores normal movement)
  disableKnockbackMode() {
    this.isKnockedBack = false;
  }

  // Update player movement and animations based on input
  update(keys) {
    // Skip normal movement if player is knocked back
    if (this.isKnockedBack) {
      return;
    }
    
    // Update terrain following first
    this.updateTerrainPosition();
    
    // Check for water detection and manage swimming sound
    this.updateWaterDetection();
    
    // Don't allow movement or other actions while swinging
    if (this.isSwingInProgress) {
      this.sprite.setVelocityX(0);
      this.hideSpeedLines();
      return;
    }

    // Handle power charging and swing
    if (keys.space.isDown) {
      if (!this.isChargingPower) {
        this.startPowerCharge();
      } else {
        this.updatePowerCharge();
      }
      this.hideSpeedLines();
      return;
    } else if (this.isChargingPower) {
      // Space was released, execute swing with current power
      this.executeSwing();
      return;
    }

    // Check if running (shift held)
    this.isRunning = keys.shift.isDown;
    const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;

    // Move the player left and right (only when not charging power)
    if (keys.left.isDown) {
      this.sprite.setVelocityX(-currentSpeed);
      this.sprite.flipX = true;
      this.sprite.play("walk", true);
      
      if (this.isRunning) {
        this.showSpeedLines(-1); // Moving left
      } else {
        this.hideSpeedLines();
      }
    } else if (keys.right.isDown) {
      this.sprite.setVelocityX(currentSpeed);
      this.sprite.flipX = false;
      this.sprite.play("walk", true);
      
      if (this.isRunning) {
        this.showSpeedLines(1); // Moving right
      } else {
        this.hideSpeedLines();
      }
    } else {
      this.sprite.setVelocityX(0);
      this.sprite.anims.stop();
      this.hideSpeedLines();
    }
  }

  // Start power charging
  startPowerCharge() {
    this.isChargingPower = true;
    this.powerChargeStartTime = this.scene.time.now;
    this.currentPower = this.minPower;
    this.sprite.setVelocityX(0); // Stop movement while charging
    
    // Start backswing animation (holding club up)
    this.sprite.play("backswing");
  }

  // Update power charge based on time held
  updatePowerCharge() {
    const elapsedTime = this.scene.time.now - this.powerChargeStartTime;
    const chargeProgress = Math.min(elapsedTime / this.chargeTime, 1.0);
    
    // Calculate power: start at minPower, go up to maxPower
    this.currentPower = this.minPower + (this.maxPower - this.minPower) * chargeProgress;
  }

  // Execute swing with charged power
  executeSwing() {
    this.isChargingPower = false;
    this.isSwingInProgress = true;
    
    // Play the follow-through animation to complete the swing
    this.sprite.play("swing_followthrough");
  }

  // Get current power level (0.0 to 1.0 for UI display)
  getPowerLevel() {
    if (!this.isChargingPower) return 0;
    return (this.currentPower - this.minPower) / (this.maxPower - this.minPower);
  }

  // Get current power multiplier for ball physics
  getCurrentPower() {
    return this.currentPower;
  }

  // Check if currently charging power
  get chargingPower() {
    return this.isChargingPower;
  }

  // Check if player is currently moving
  isMoving() {
    return Math.abs(this.sprite.body.velocity.x) > 0;
  }

  // Show speed lines effect
  showSpeedLines(direction) {
    if (!this.speedLines) return;

    this.speedLines.forEach((line, index) => {
      line.setVisible(true);
      
      // Position horizontal lines behind the player at different heights
      const baseOffsetX = direction * 50; // Base distance behind player
      const randomOffsetX = direction * (10 + Math.random() * 20); // Add some randomness
      const offsetY = -15 + (index * 8); // Vertical spacing between lines
      
      line.setPosition(
        this.sprite.x - baseOffsetX - randomOffsetX,
        this.sprite.y + offsetY
      );
      
      // Make lines fade in quickly and move horizontally away from player
      line.alpha = 0.9;
      this.scene.tweens.killTweensOf(line);
      this.scene.tweens.add({
        targets: line,
        x: line.x - (direction * 30), // Move further behind
        alpha: 0,
        duration: 150,
        ease: 'Power1',
        onComplete: () => {
          line.setVisible(false);
        }
      });
    });
  }

  // Hide speed lines effect
  hideSpeedLines() {
    if (!this.speedLines) return;
    
    this.speedLines.forEach(line => {
      line.setVisible(false);
      this.scene.tweens.killTweensOf(line);
    });
  }

  // Set player position
  setPosition(x, y) {
    this.sprite.setPosition(x, y);
  }

  // Set player velocity
  setVelocity(x, y) {
    this.sprite.body.setVelocity(x, y);
  }

  // Check if player is currently swinging
  isSwinging() {
    // Use both the animation state and the swing progress flag for reliability
    const currentAnim = this.sprite.anims.currentAnim?.key;
    const isAnimSwinging = currentAnim === 'swing' || currentAnim === 'swing_followthrough';
    
    // Return true only if both conditions are met
    return this.isSwingInProgress && isAnimSwinging;
  }

  // Check if player is currently walking
  isWalking() {
    return this.sprite.anims.currentAnim?.key === 'walk';
  }

  // Get player facing direction (-1 for left, 1 for right)
  getFacingDirection() {
    return this.sprite.flipX ? -1 : 1;
  }

  // Play specific animation
  playAnimation(animKey, ignoreIfPlaying = false) {
    this.sprite.play(animKey, ignoreIfPlaying);
  }

  // Stop current animation
  stopAnimation() {
    this.sprite.anims.stop();
  }

  // Set player speed
  setSpeed(speed) {
    this.speed = speed;
  }

  // Get current velocity
  getVelocity() {
    return {
      x: this.sprite.body.velocity.x,
      y: this.sprite.body.velocity.y
    };
  }

  // Check if player is moving
  isMoving() {
    const vel = this.sprite.body.velocity;
    return Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1;
  }

  // Update player position to follow terrain
  updateTerrainPosition() {
    if (!this.terrain) return;

    const currentX = this.sprite.x;
    const terrainHeight = this.terrain.getHeightAtX(currentX);
    const targetY = terrainHeight - this.groundOffset;
    const currentY = this.sprite.y;

    // Only adjust if difference is significant to prevent vibrating
    if (Math.abs(targetY - currentY) > 3) {
      // Use smooth interpolation instead of immediate positioning
      const adjustmentSpeed = 0.3;
      const newY = currentY + (targetY - currentY) * adjustmentSpeed;
      this.sprite.setY(newY);
      // Stop any vertical velocity to prevent bouncing
      this.sprite.body.setVelocityY(0);
    }
  }

  // Check if player is in water and manage swimming sound
  updateWaterDetection() {
    if (!this.terrain || !this.swimmingSound) {
      console.log('Water detection skipped: terrain or swimmingSound not available');
      return;
    }

    const playerX = this.sprite.x;
    const playerY = this.sprite.y;

    // Check if player is in water using the same method as the golf ball
    const wasInWater = this.isInWater;
    this.isInWater = this.terrain.isBallInWater ? this.terrain.isBallInWater(playerX, playerY) : false;

    // Handle swimming sound based on water state changes
    if (this.isInWater && !wasInWater) {
      // Player entered water - start swimming sound
      if (!this.swimmingSound.isPlaying) {
        this.swimmingSound.play();
        console.log('Player entered water - swimming sound started');
      }
    } else if (!this.isInWater && wasInWater) {
      // Player exited water - stop swimming sound
      if (this.swimmingSound.isPlaying) {
        this.swimmingSound.stop();
        console.log('Player exited water - swimming sound stopped');
      }
    }
  }
}
