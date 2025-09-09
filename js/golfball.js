/**
 * Golf Ball class for managing golf ball physics and behavior
 */
export class GolfBall {
  constructor(scene, x = 200, y = 630) {
    this.scene = scene;
    this.hitRecently = false;
    
    // Create golf ball as a simple white circle
    this.sprite = scene.add.circle(x, y, 12, 0xffffff);
    this.sprite.setStrokeStyle(2, 0x000000); // Black outline
    
    // Enable physics on the circle
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCircle(12); // Set collision area as circle
    
    // Set physics properties for realistic golf ball behavior
    this.sprite.body.setBounce(0.7); // Good bounce for realistic behavior
    this.sprite.body.setDrag(30); // Air resistance (less drag for better flight)
    this.sprite.body.setMaxVelocity(600, 900); // Limit max speed
    this.sprite.body.setFriction(0.98); // Ground friction for rolling
    this.sprite.body.setGravityY(500); // Enable gravity for the ball only
    
    // Enable collision with world bounds
    this.sprite.body.setCollideWorldBounds(true);
  }

  // Get ball position
  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Get ball body for physics interactions
  get body() {
    return this.sprite.body;
  }

  // Apply ground friction when ball is rolling
  applyGroundFriction() {
    // If ball is on the ground (touching bottom world bound), apply rolling friction
    if (this.sprite.body.touching.down) {
      const horizontalVel = this.sprite.body.velocity.x;
      
      // Apply rolling friction only to horizontal movement
      if (Math.abs(horizontalVel) > 0) {
        const friction = 0.95; // Rolling friction
        this.sprite.body.setVelocityX(horizontalVel * friction);
        
        // Stop the ball if it's moving very slowly (under 15 pixels/second)
        if (Math.abs(horizontalVel) < 15) {
          this.sprite.body.setVelocityX(0);
        }
      }
    }
  }

  // Check if player can hit the ball and handle the hit
  checkHit(player) {
    // Calculate distance between player and ball
    const distance = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.sprite.x, this.sprite.y
    );

    // If player is close enough and swing animation is playing
    if (distance < 80 && player.anims.currentAnim?.key === 'swing') {
      // Only hit the ball if it hasn't been hit recently
      if (!this.hitRecently) {
        this.hit(player);
        this.hitRecently = true;
        
        // Reset the hit flag after a short delay
        this.scene.time.delayedCall(500, () => {
          this.hitRecently = false;
        });
      }
    }
  }

  // Hit the ball with realistic golf physics
  hit(player) {
    // Calculate hit direction based on player facing direction
    const hitDirection = player.flipX ? -1 : 1;
    
    // Launch the ball with realistic golf physics
    const launchVelocityX = hitDirection * 400; // Horizontal speed
    const launchVelocityY = -1000; // Upward speed (negative is up)
    
    this.sprite.body.setVelocity(launchVelocityX, launchVelocityY);
    
    console.log("Ball hit! Flying through the air...");
  }

  // Reset ball to a specific position
  reset(x = 200, y = 630) {
    this.sprite.setPosition(x, y);
    this.sprite.body.setVelocity(0, 0);
    this.hitRecently = false;
  }

  // Check if ball is moving
  isMoving() {
    const vel = this.sprite.body.velocity;
    return Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1;
  }

  // Get ball velocity
  getVelocity() {
    return {
      x: this.sprite.body.velocity.x,
      y: this.sprite.body.velocity.y
    };
  }

  // Set ball velocity
  setVelocity(x, y) {
    this.sprite.body.setVelocity(x, y);
  }
}