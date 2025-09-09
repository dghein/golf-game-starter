/**
 * Player class for managing golfer sprite, animations, and movement
 */
export class Player {
  constructor(scene, x = 100, y = 630) {
    this.scene = scene;
    this.speed = 160;
    this.isSwingInProgress = false;
    this.isChargingPower = false;
    this.powerChargeStartTime = 0;
    this.currentPower = 0;
    this.minPower = 0.2; // Minimum power (20%)
    this.maxPower = 2.0; // Maximum power (200%)
    this.chargeTime = 2000; // Time in ms to reach max power
    
    // Create player sprite
    this.sprite = scene.physics.add.sprite(x, y, "golfer_walking_0");
    
    // Keep player within world bounds (prevents falling off the world)
    this.sprite.setCollideWorldBounds(true);
    
    // Listen for animation complete events
    this.sprite.on('animationcomplete', (anim) => {
      if (anim.key === 'swing' || anim.key === 'swing_followthrough') {
        this.isSwingInProgress = false;
      }
    });
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

  // Update player movement and animations based on input
  update(keys) {
    // Don't allow movement or other actions while swinging
    if (this.isSwingInProgress) {
      this.sprite.setVelocityX(0);
      return;
    }

    // Handle power charging and swing
    if (keys.space.isDown) {
      if (!this.isChargingPower) {
        this.startPowerCharge();
      } else {
        this.updatePowerCharge();
      }
      return;
    } else if (this.isChargingPower) {
      // Space was released, execute swing with current power
      this.executeSwing();
      return;
    }

    // Move the player left and right (only when not charging power)
    if (keys.left.isDown) {
      this.sprite.setVelocityX(-this.speed);
      this.sprite.flipX = true;
      this.sprite.play("walk", true);
    } else if (keys.right.isDown) {
      this.sprite.setVelocityX(this.speed);
      this.sprite.flipX = false;
      this.sprite.play("walk", true);
    } else {
      this.sprite.setVelocityX(0);
      this.sprite.anims.stop();
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
    const currentAnim = this.sprite.anims.currentAnim?.key;
    return currentAnim === 'swing' || currentAnim === 'swing_followthrough';
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
}
