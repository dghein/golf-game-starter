/**
 * Player class for managing golfer sprite, animations, and movement
 */
import { courseManager } from './CourseManager.js';

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
    this.isDown = false; // Track if player is stunned/knocked down
    this.isInBoatMode = false; // Track if player is in boat sprite mode
    
    // Dash properties
    this.dashSpeed = 800; // Speed of dash movement
    this.dashDistance = 200; // Distance to dash (in pixels) - increased from 120
    this.dashCooldown = 2000; // Cooldown between dashes (2 seconds)
    this.lastDashTime = 0; // Last time dash was used
    this.isDashing = false; // Track if currently dashing
    
    // Health properties
    this.maxHealth = 100; // Maximum health
    this.currentHealth = 100; // Current health
    this.healthBar = null; // Health bar UI element
    this.healthBarBackground = null; // Health bar background
    this.hitCount = 0; // Track number of hits for game over transparency
    this.holeStartScore = 0; // Track score at start of hole for restart
    
    // Ball inventory properties (enabled on all holes)
    this.ballCount = 0; // Number of golf balls in inventory
    this.maxBalls = 10; // Maximum number of balls player can carry
    this.ballInventoryUI = null; // UI element for ball count display
    
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
    
    // Create health bar UI
    this.createHealthBar();
    
    // Create ball inventory UI
    this.createBallInventoryUI();
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

  // Create health bar UI
  createHealthBar() {
    const barWidth = 100;
    const barHeight = 8;
    const barX = 20; // Position from left edge
    const barY = this.scene.cameras.main.height - 30; // Position from bottom edge (30px from bottom)
    
    // Create health bar background (red)
    this.healthBarBackground = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0xff0000, 0.8);
    this.healthBarBackground.setOrigin(0, 0);
    this.healthBarBackground.setScrollFactor(0); // Don't scroll with camera
    this.healthBarBackground.setDepth(1000); // High depth to appear on top
    
    // Create health bar foreground (green)
    this.healthBar = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x00ff00, 1.0);
    this.healthBar.setOrigin(0, 0);
    this.healthBar.setScrollFactor(0); // Don't scroll with camera
    this.healthBar.setDepth(1001); // Higher depth than background
    
    // Add health text label
    this.healthText = this.scene.add.text(barX, barY - 15, 'Health', {
      fontSize: '12px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.healthText.setOrigin(0, 0);
    this.healthText.setScrollFactor(0);
    this.healthText.setDepth(1002);
    
    // Update health bar to show current health
    this.updateHealthBar();
  }

  // Create ball inventory UI
  createBallInventoryUI() {
    const textX = 20; // Position from left edge
    const textY = this.scene.cameras.main.height - 60; // Position above health bar
    
    // Add ball count text label
    this.ballCountText = this.scene.add.text(textX, textY, 'Balls: 0', {
      fontSize: '16px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    this.ballCountText.setOrigin(0, 0);
    this.ballCountText.setScrollFactor(0);
    this.ballCountText.setDepth(1002);
    
    // Update ball inventory to show current count
    this.updateBallInventoryUI();
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
  
  // Switch to damaged sprite during knockback
  setDamagedSprite() {
    this.sprite.setTexture("golfer_damaged");
    // Preserve the current flip state
    const wasFlipped = this.sprite.flipX;
    this.sprite.flipX = wasFlipped;
    
    // Stop any current animations
    this.sprite.anims.stop();
  }
  
  // Restore normal sprite after knockback
  restoreNormalSprite() {
    this.sprite.setTexture("golfer_walking_0");
    // Preserve the current flip state
    const wasFlipped = this.sprite.flipX;
    this.sprite.flipX = wasFlipped;
  }
  
  // Set player to down state (stunned)
  setDownState() {
    this.isDown = true;
    this.sprite.setTexture("golfer_down");
    // Preserve the current flip state
    const wasFlipped = this.sprite.flipX;
    this.sprite.flipX = wasFlipped;
    
    // Completely stop all movement and physics
    this.sprite.body.setVelocityX(0); // Stop horizontal movement
    this.sprite.body.setVelocityY(0); // Stop vertical movement
    this.sprite.body.setGravityY(-100); // Counteract gravity
    this.sprite.body.setImmovable(true); // Make completely immovable
    
    // Stop any animations
    this.sprite.anims.stop();
  }
  
  // Get up from down state
  getUp() {
    this.isDown = false;
    
    // Restore normal physics
    this.sprite.body.setImmovable(false); // Allow movement again
    this.sprite.body.setGravityY(-100); // Restore normal gravity
    
    this.restoreNormalSprite();
  }
  
  // Switch to boat sprite when in water
  setBoatSprite() {
    this.isInBoatMode = true;
    this.sprite.setTexture("golfer_boat");
    // Preserve the current flip state
    const wasFlipped = this.sprite.flipX;
    this.sprite.flipX = wasFlipped;
    
    // Stop any current animations
    this.sprite.anims.stop();
  }
  
  // Return to normal sprite when leaving water
  setNormalSprite() {
    this.isInBoatMode = false;
    this.sprite.setTexture("golfer_walking_0");
    // Preserve the current flip state
    const wasFlipped = this.sprite.flipX;
    this.sprite.flipX = wasFlipped;
  }

  // Update player movement and animations based on input
  update(keys) {
    // Skip normal movement if player is knocked back or down
    if (this.isKnockedBack || this.isDown) {
      return;
    }
    
    // Handle dash input
    if (Phaser.Input.Keyboard.JustDown(keys.e)) {
      this.dash();
      return; // Skip normal movement during dash
    }
    
    // Skip normal movement if currently dashing
    if (this.isDashing) {
      return;
    }
    
    // Update terrain following first (but not during dashing)
    this.updateTerrainPosition();
    
    // Check for water detection and manage swimming sound
    this.updateWaterDetection();
    
    // Check for ball collection
    this.checkBallCollection();
    
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
      
      // Play animation only if not in boat mode
      if (!this.isInBoatMode) {
      this.sprite.play("walk", true);
      }
      
      if (this.isRunning) {
        this.showSpeedLines(-1); // Moving left
      } else {
        this.hideSpeedLines();
      }
    } else if (keys.right.isDown) {
      this.sprite.setVelocityX(currentSpeed);
      this.sprite.flipX = false;
      
      // Play animation only if not in boat mode
      if (!this.isInBoatMode) {
      this.sprite.play("walk", true);
      }
      
      if (this.isRunning) {
        this.showSpeedLines(1); // Moving right
      } else {
        this.hideSpeedLines();
      }
    } else {
      this.sprite.setVelocityX(0);
      
      // Stop animation only if not in boat mode
      if (!this.isInBoatMode) {
      this.sprite.anims.stop();
      }
      
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
    if (!this.terrain || this.isDashing) return; // Skip terrain following during dash

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
    if (!this.terrain || !this.swimmingSound || this.isDashing) {
      if (!this.isDashing) {
      console.log('Water detection skipped: terrain or swimmingSound not available');
      }
      return;
    }

    const playerX = this.sprite.x;
    const playerY = this.sprite.y;

    // Check if player is in water using the same method as the golf ball
    const wasInWater = this.isInWater;
    this.isInWater = this.terrain.isBallInWater ? this.terrain.isBallInWater(playerX, playerY) : false;

    // Handle swimming sound and sprite changes based on water state changes
    if (this.isInWater && !wasInWater) {
      // Player entered water - start swimming sound and switch to boat sprite
      if (!this.swimmingSound.isPlaying) {
        this.swimmingSound.play();
        console.log('Player entered water - swimming sound started');
      }
      this.setBoatSprite();
      console.log('Player switched to boat sprite');
    } else if (!this.isInWater && wasInWater) {
      // Player exited water - stop swimming sound and return to normal sprite
      if (this.swimmingSound.isPlaying) {
        this.swimmingSound.stop();
        console.log('Player exited water - swimming sound stopped');
      }
      this.setNormalSprite();
      console.log('Player returned to normal sprite');
    }
  }

  // Dash method - quick movement in facing direction
  dash() {
    const currentTime = this.scene.time.now;
    
    console.log(`Dash attempt - Current time: ${currentTime}, Last dash: ${this.lastDashTime}, Cooldown: ${this.dashCooldown}`);
    console.log(`Dash state - isKnockedBack: ${this.isKnockedBack}, isDown: ${this.isDown}, isDashing: ${this.isDashing}`);
    
    // Check if dash is on cooldown or player is in invalid state
    if (currentTime - this.lastDashTime < this.dashCooldown || 
        this.isKnockedBack || 
        this.isDown || 
        this.isDashing) {
      console.log('Dash blocked - on cooldown or invalid state');
      return;
    }
    
    // Determine dash direction based on current facing direction
    let dashDirection = 1; // Default to right
    if (this.sprite.flipX) {
      dashDirection = -1; // Facing left
    }
    
    // Calculate dash target position
    const dashTargetX = this.sprite.x + (dashDirection * this.dashDistance);
    
    // Set dashing state
    this.isDashing = true;
    this.lastDashTime = currentTime;
    
    // Apply dash velocity
    this.sprite.body.setVelocityX(dashDirection * this.dashSpeed);
    
    // Calculate dash duration in milliseconds
    const dashDuration = (this.dashDistance / this.dashSpeed) * 1000;
    console.log(`Dash started - Direction: ${dashDirection > 0 ? 'right' : 'left'}, Duration: ${dashDuration}ms`);
    
    // Stop dash after reaching target distance
    this.scene.time.delayedCall(dashDuration, () => {
      this.isDashing = false;
      // Stop horizontal movement
      this.sprite.body.setVelocityX(0);
      console.log('Dash completed - isDashing reset to false');
    });
    
    console.log(`Player dashed ${dashDirection > 0 ? 'right' : 'left'} for ${this.dashDistance} pixels`);
  }

  // Update health bar visual display
  updateHealthBar() {
    if (!this.healthBar) return;
    
    const healthPercentage = this.currentHealth / this.maxHealth;
    const barWidth = 100; // Same as createHealthBar width
    const currentWidth = barWidth * healthPercentage;
    
    // Update health bar width
    this.healthBar.setDisplaySize(currentWidth, 8);
    
    // Change color based on health level
    if (healthPercentage > 0.6) {
      this.healthBar.setFillStyle(0x00ff00); // Green
    } else if (healthPercentage > 0.3) {
      this.healthBar.setFillStyle(0xffff00); // Yellow
    } else {
      this.healthBar.setFillStyle(0xff0000); // Red
    }
    
    // Update health text
    if (this.healthText) {
      this.healthText.setText(`Health: ${Math.round(this.currentHealth)}/${this.maxHealth}`);
    }
  }

  // Update ball inventory visual display
  updateBallInventoryUI() {
    if (!this.ballCountText) return;
    
    // Update ball count text
    this.ballCountText.setText(`Balls: ${this.ballCount}`);
  }

  // Take damage from enemy hits
  takeDamage(damageAmount) {
    this.currentHealth = Math.max(0, this.currentHealth - damageAmount);
    this.hitCount++; // Increment hit count for game over transparency
    this.updateHealthBar();
    
    // Drop 3 golf balls when taking damage
    this.dropGolfBalls(3);
    
    console.log(`Player took ${damageAmount} damage. Health: ${this.currentHealth}/${this.maxHealth}. Hit count: ${this.hitCount}`);
    
    // Check if player is defeated
    if (this.currentHealth <= 0) {
      this.handleDefeat();
    }
  }

  // Handle player defeat
  handleDefeat() {
    console.log('Player defeated!');
    
    // Stop all movement immediately
    this.sprite.body.setVelocityX(0);
    this.sprite.body.setVelocityY(0);
    
    // Stop bossfight music if it's playing
    if (this.scene && this.scene.bossfightSound && this.scene.bossfightSound.isPlaying) {
      this.scene.bossfightSound.stop();
      console.log('Bossfight music stopped on game over');
    }
    
    // Set player to down state (no movement)
    this.isDown = true;
    this.setDownState();
    
    // Create game over message
    this.createGameOverMessage();
  }

  // Create game over message UI
  createGameOverMessage() {
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    // Calculate transparency based on hit count (more hits = darker overlay)
    // Start at 0.3 (30% opacity) and increase by 0.1 per hit, max 0.8 (80% opacity)
    const baseOpacity = 0.3;
    const opacityIncrease = Math.min(this.hitCount * 0.1, 0.5); // Max additional 50% opacity
    const finalOpacity = Math.min(baseOpacity + opacityIncrease, 0.8); // Cap at 80% opacity
    
    console.log(`Game over overlay opacity: ${finalOpacity} (hit count: ${this.hitCount})`);
    
    // Create semi-transparent overlay with dynamic opacity
    this.gameOverOverlay = this.scene.add.rectangle(centerX, centerY, this.scene.cameras.main.width, this.scene.cameras.main.height, 0x000000, finalOpacity);
    this.gameOverOverlay.setScrollFactor(0);
    this.gameOverOverlay.setDepth(2000);
    
    // Create game over text
    this.gameOverText = this.scene.add.text(centerX, centerY - 50, 'GAME OVER', {
      fontSize: '48px',
      fill: '#ff0000',
      stroke: '#ffffff',
      strokeThickness: 4,
      fontFamily: 'Arial',
      align: 'center'
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setScrollFactor(0);
    this.gameOverText.setDepth(2001);
    
    // Create restart instruction
    this.restartText = this.scene.add.text(centerX, centerY + 20, 'Press ESC to restart from current hole', {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial',
      align: 'center'
    });
    this.restartText.setOrigin(0.5);
    this.restartText.setScrollFactor(0);
    this.restartText.setDepth(2002);
  }

  // Remove game over message
  removeGameOverMessage() {
    if (this.gameOverOverlay) {
      this.gameOverOverlay.destroy();
      this.gameOverOverlay = null;
    }
    if (this.gameOverText) {
      this.gameOverText.destroy();
      this.gameOverText = null;
    }
    if (this.restartText) {
      this.restartText.destroy();
      this.restartText = null;
    }
  }

  // Heal player (for future use)
  heal(healAmount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + healAmount);
    this.updateHealthBar();
    console.log(`Player healed ${healAmount}. Health: ${this.currentHealth}/${this.maxHealth}`);
  }

  // Save score at start of hole
  saveHoleStartScore() {
    if (this.scene && courseManager) {
      // Save the total course score (sum of all completed holes)
      this.holeStartScore = courseManager.getTotalScore();
      console.log(`Hole start score saved: ${this.holeStartScore} strokes (total course score)`);
    }
  }

  // Reset player state (for game restart)
  resetPlayerState() {
    this.currentHealth = this.maxHealth;
    this.hitCount = 0;
    this.isDown = false;
    this.isKnockedBack = false;
    this.isDashing = false;
    this.updateHealthBar();
    
    // Restore course score to hole start score
    if (courseManager && this.holeStartScore >= 0) {
      // Reset the current hole's score in course manager
      const currentHole = courseManager.getCurrentHole();
      courseManager.scores[currentHole - 1] = 0; // Reset current hole score
      
      // Recalculate total score
      courseManager.totalScore = courseManager.scores.reduce((sum, score) => sum + score, 0);
      
      console.log(`Course score restored to hole start: ${this.holeStartScore} strokes`);
    }
    
    console.log('Player state reset for restart');
  }

  // Drop golf balls when taking damage
  dropGolfBalls(count) {
    if (!this.scene || !this.scene.droppedBalls) {
      console.log('Cannot drop balls - scene or droppedBalls array not available');
      return;
    }
    
    const playerX = this.sprite.x;
    const playerY = this.sprite.y;
    
    for (let i = 0; i < count; i++) {
      // Calculate scatter positions around the player
      const angle = (i / count) * Math.PI * 2; // Distribute evenly in a circle
      const distance = 80 + Math.random() * 60; // Random distance between 80-140 pixels (increased from 50-80)
      
      const dropX = playerX + Math.cos(angle) * distance;
      const dropY = playerY + Math.sin(angle) * distance - 30; // Drop slightly above player
      
      // Create dropped ball
      const droppedBall = new this.scene.DroppedBall(this.scene, dropX, dropY);
      
      // Add some random velocity to make balls scatter more
      const scatterVelX = (Math.random() - 0.5) * 400; // Increased from 200
      const scatterVelY = -Math.random() * 150 - 80; // Always scatter upward, increased from 100-150
      droppedBall.sprite.body.setVelocity(scatterVelX, scatterVelY);
      
      // Add to scene's dropped balls array
      this.scene.droppedBalls.push(droppedBall);
      
      console.log(`Dropped ball ${i + 1} at x=${Math.round(dropX)}, y=${Math.round(dropY)}`);
    }
  }

  // Add balls to inventory
  addBalls(count) {
    const oldCount = this.ballCount;
    this.ballCount = Math.min(this.maxBalls, this.ballCount + count);
    const addedCount = this.ballCount - oldCount;
    
    this.updateBallInventoryUI();
    
    if (addedCount > 0) {
      console.log(`Added ${addedCount} balls to inventory. Total: ${this.ballCount}/${this.maxBalls}`);
    }
    
    return addedCount;
  }

  // Use a ball from inventory (for shooting)
  useBall() {
    if (this.ballCount > 0) {
      this.ballCount--;
      this.updateBallInventoryUI();
      console.log(`Used 1 ball. Remaining: ${this.ballCount}/${this.maxBalls}`);
      return true;
    } else {
      console.log('No balls available!');
      return false;
    }
  }

  // Check if player can collect nearby dropped balls
  checkBallCollection() {
    if (!this.scene || !this.scene.droppedBalls) {
      return;
    }
    
    
    // Check each dropped ball for collection
    for (let i = this.scene.droppedBalls.length - 1; i >= 0; i--) {
      const droppedBall = this.scene.droppedBalls[i];
      
      if (droppedBall.isPlayerInRange(this)) {
        // Always collect the ball (even if inventory is full)
        droppedBall.collect();
        // Remove from array
        this.scene.droppedBalls.splice(i, 1);
        
        // Try to add ball to inventory (will be capped at maxBalls)
        this.addBalls(1);
        
        console.log(`Collected dropped ball! Total balls: ${this.ballCount}/${this.maxBalls}`);
      }
    }
  }
}
