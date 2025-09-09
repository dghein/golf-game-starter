/**
 * Golf Ball class for managing golf ball physics and behavior
 */
export class GolfBall {
  constructor(scene, x = 200, y = 630) {
    this.scene = scene;
    this.hitRecently = false;
    
    // Distance tracking
    this.startX = x;
    this.startY = y;
    this.currentDistance = 0;
    this.lastShotDistance = 0;
    this.isTracking = false;
    
    // Conversion: More pixels per yard for finer granularity
    // 20 pixels per yard means 200 yards = 4000 pixels
    this.pixelsPerYard = 20;
    
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
  checkHit(player, clubManager = null) {
    // Calculate distance between player and ball
    const distance = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.sprite.x, this.sprite.y
    );

    // If player is close enough and swing follow-through animation is playing
    if (distance < 80 && (player.anims.currentAnim?.key === 'swing' || player.anims.currentAnim?.key === 'swing_followthrough')) {
      // Only hit the ball if it hasn't been hit recently
      if (!this.hitRecently) {
        const powerMultiplier = player.getCurrentPower();
        this.hit(player, clubManager, powerMultiplier);
        this.hitRecently = true;
        
        // Reset the hit flag after a short delay
        this.scene.time.delayedCall(500, () => {
          this.hitRecently = false;
        });
      }
    }
  }

  // Hit the ball with realistic golf physics
  hit(player, clubManager = null, powerMultiplier = 1.0) {
    // Calculate hit direction based on player facing direction
    const hitDirection = player.flipX ? -1 : 1;
    
    // Get club properties or use default driver settings
    let clubProps = {
      horizontalPower: 400,
      launchAngle: -1000,
      power: 1.0,
      canFly: true,
      name: 'Driver'
    };
    
    if (clubManager) {
      clubProps = clubManager.getCurrentClubProperties();
    }
    
    // Apply power multiplier from charging system
    const totalPowerMultiplier = clubProps.power * powerMultiplier;
    
    // Calculate launch velocities based on club and charged power
    const launchVelocityX = hitDirection * clubProps.horizontalPower * totalPowerMultiplier;
    const launchVelocityY = clubProps.canFly ? clubProps.launchAngle * totalPowerMultiplier : 0;
    
    this.sprite.body.setVelocity(launchVelocityX, launchVelocityY);
    
    // Start distance tracking
    this.startDistanceTracking();
    
    const powerPercent = Math.round(powerMultiplier * 100);
    console.log(`Ball hit with ${clubProps.name} at ${powerPercent}% power! ${clubProps.canFly ? 'Flying through the air' : 'Rolling on the ground'}...`);
  }

  // Reset ball to a specific position
  reset(x = 200, y = 630) {
    this.sprite.setPosition(x, y);
    this.sprite.body.setVelocity(0, 0);
    this.hitRecently = false;
    
    // Reset distance tracking
    this.startX = x;
    this.startY = y;
    this.currentDistance = 0;
    this.isTracking = false;
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

  // Start tracking distance for current shot
  startDistanceTracking() {
    this.startX = this.sprite.x;
    this.startY = this.sprite.y;
    this.currentDistance = 0;
    this.isTracking = true;
  }

  // Update distance tracking (call this in game loop)
  updateDistance() {
    if (!this.isTracking) return;

    // Calculate distance from starting position
    const distanceX = this.sprite.x - this.startX;
    const distanceY = this.sprite.y - this.startY;
    this.currentDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Stop tracking if ball has stopped moving
    if (!this.isMoving() && this.currentDistance > 0) {
      this.stopDistanceTracking();
    }
  }

  // Stop distance tracking and save final distance
  stopDistanceTracking() {
    if (this.isTracking) {
      this.lastShotDistance = this.currentDistance;
      this.isTracking = false;
      const yards = this.pixelsToYards(this.lastShotDistance);
      const pixels = Math.round(this.lastShotDistance);
      console.log(`Shot completed! Distance: ${yards} yards (${pixels} pixels)`);
    }
  }

  // Convert pixels to yards
  pixelsToYards(pixels) {
    return Math.round(pixels / this.pixelsPerYard);
  }

  // Get current shot distance in yards
  getCurrentDistance() {
    return this.pixelsToYards(this.currentDistance);
  }

  // Get last completed shot distance in yards
  getLastShotDistance() {
    return this.pixelsToYards(this.lastShotDistance);
  }

  // Get current shot distance in pixels (for debugging)
  getCurrentDistancePixels() {
    return Math.round(this.currentDistance);
  }

  // Get last shot distance in pixels (for debugging)
  getLastShotDistancePixels() {
    return Math.round(this.lastShotDistance);
  }

  // Check if currently tracking distance
  isTrackingDistance() {
    return this.isTracking;
  }
}