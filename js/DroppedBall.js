/**
 * DroppedBall class for managing collectible golf balls that drop when player takes damage
 */
export class DroppedBall {
  constructor(scene, x, y) {
    this.scene = scene;
    this.collected = false;
    
    // Create dropped ball as a smaller white circle
    this.sprite = scene.add.circle(x, y, 8, 0xffffff);
    this.sprite.setStrokeStyle(2, 0x000000); // Black outline
    
    // Enable physics for bouncing and landing
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCircle(8); // Set collision area as circle
    
    // Set physics properties for realistic bouncing
    this.sprite.body.setBounce(0.6); // Good bounce
    this.sprite.body.setDrag(50); // Higher drag than main ball
    this.sprite.body.setMaxVelocity(800, 600); // Lower max velocity
    this.sprite.body.setFriction(0.95); // Ground friction for rolling
    this.sprite.body.setGravityY(500); // Same gravity as main ball
    
    // Enable collision with world bounds
    this.sprite.body.setCollideWorldBounds(true);
    
    // Set depth to appear above terrain but below main ball
    this.sprite.setDepth(4);
    
    // Add a subtle glow effect to make it more visible
    // Note: Circles don't support setTint, so we'll use a different approach
    this.sprite.setFillStyle(0xffffff); // White color
    
    // Add collection radius (larger than visual size for easier collection)
    this.collectionRadius = 40;
    
    console.log(`Dropped ball created at x=${Math.round(x)}, y=${Math.round(y)}`);
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
  
  // Check if player is close enough to collect this ball
  isPlayerInRange(player) {
    if (this.collected) return false;
    
    // Get positions
    const ballX = this.sprite.x;
    const ballY = this.sprite.y;
    const playerX = player.sprite.x;
    const playerY = player.sprite.y;
    
    // Calculate horizontal distance only (ignore Y-axis)
    const horizontalDistance = Math.abs(ballX - playerX);
    const inRange = horizontalDistance <= this.collectionRadius;
    
    return inRange;
  }
  
  // Collect this ball
  collect() {
    if (this.collected) return false;
    
    this.collected = true;
    
    // Play collect sound
    if (this.scene.collectSound) {
      this.scene.collectSound.play();
    }
    
    // Play collection effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.sprite.destroy();
      }
    });
    
    console.log('Dropped ball collected!');
    return true;
  }
  
  // Update ball physics to follow terrain
  update(terrain) {
    if (this.collected || !terrain) return;
    
    // Apply terrain physics similar to main golf ball
    const ballBottom = this.sprite.y + 8; // 8 is the radius
    const terrainHeight = terrain.getHeightAtX(this.sprite.x);
    
    // If ball is below terrain, bounce it up
    if (ballBottom > terrainHeight) {
      const targetY = terrainHeight - 8;
      this.sprite.setY(targetY);
      
      // Apply bounce if ball has downward velocity
      const vel = this.sprite.body.velocity;
      if (vel.y > 0) {
        this.sprite.body.setVelocityY(vel.y * -0.6); // Bounce with reduced energy
      }
    }
    
    // Apply ground friction when rolling
    const horizontalVel = Math.abs(this.sprite.body.velocity.x);
    if (horizontalVel > 5 && ballBottom >= terrainHeight - 5) {
      this.sprite.body.setVelocityX(this.sprite.body.velocity.x * 0.95);
      
      // Stop if moving very slowly
      if (horizontalVel < 8) {
        this.sprite.body.setVelocityX(0);
      }
    }
  }
  
  // Destroy the ball
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}
