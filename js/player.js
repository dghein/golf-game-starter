/**
 * Player class for managing golfer sprite, animations, and movement
 */
export class Player {
  constructor(scene, x = 100, y = 630) {
    this.scene = scene;
    this.speed = 160;
    
    // Create player sprite
    this.sprite = scene.physics.add.sprite(x, y, "golfer_walking_0");
    
    // Keep player within world bounds (prevents falling off the world)
    this.sprite.setCollideWorldBounds(true);
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
    // Move the player left and right
    if (keys.left.isDown) {
      this.sprite.setVelocityX(-this.speed);
      this.sprite.flipX = true;
      this.sprite.play("walk", true);
    } else if (keys.right.isDown) {
      this.sprite.setVelocityX(this.speed);
      this.sprite.flipX = false;
      this.sprite.play("walk", true);
    } else if (keys.space.isDown) {
      this.sprite.play("swing", true);
    } else {
      this.sprite.setVelocityX(0);
      this.sprite.anims.stop();
    }
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
    return this.sprite.anims.currentAnim?.key === 'swing';
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
