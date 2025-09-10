/**
 * Golf Ball class for managing golf ball physics and behavior
 */
export class GolfBall {
  constructor(scene, x = 200, y = 630) {
    this.scene = scene;
    this.hitRecently = false;
    this.swooshPlayed = false;
    
    // Distance tracking
    this.startX = x;
    this.startY = y;
    this.currentDistance = 0;
    this.lastShotDistance = 0;
    this.isTracking = false;
    
    // Stable stopping detection
    this.stableStopTimer = 0;
    this.stableStopThreshold = 1000; // 1 second of stability required
    this.lastPosition = { x: x, y: y };
    this.positionStableCount = 0;
    
    // Ball stabilization
    this.isStabilized = false;
    this.stabilizedPosition = { x: x, y: y };
    
    // Hole completion state
    this.holeCompleted = false;
    
    // Backspin properties
    this.hasBackspin = false;
    this.backspinApplied = false;
    
    // Wind effect properties
    this.windSystem = null; // Will be set by GameScene
    
    // Terrain properties
    this.terrain = null; // Will be set by GameScene
    this.groundRadius = 12; // Ball radius for ground collision
    
    // Sound properties
    this.hitSound = null; // Will be set by GameScene
    this.puttSound = null; // Will be set by GameScene
    this.swooshSound = null; // Will be set by GameScene
    this.splashSound = null; // Will be set by GameScene
    this.clapSound = null; // Will be set by GameScene
    
    // Camera callback properties
    this.onBallHitCallback = null; // Will be set by GameScene
    
    // Water hazard properties
    this.originalPosition = { x: x, y: y }; // Store original position for water penalty
    this.onWaterPenaltyCallback = null; // Will be set by GameScene
    
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
    this.sprite.body.setDrag(33); // Slightly reduced drag for better distance
    this.sprite.body.setMaxVelocity(1500, 950); // Moderate increase in max velocity
    this.sprite.body.setFriction(0.98); // Ground friction for rolling
    this.sprite.body.setGravityY(500); // Slightly reduced gravity for better flight
    
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

  // Set wind system reference
  setWindSystem(windSystem) {
    this.windSystem = windSystem;
  }

  // Set terrain system reference
  setTerrain(terrain) {
    this.terrain = terrain;
  }

  // Set hit sound reference
  setHitSound(hitSound) {
    this.hitSound = hitSound;
  }

  // Set putt sound reference
  setPuttSound(puttSound) {
    this.puttSound = puttSound;
  }

  // Set swoosh sound reference
  setSwooshSound(swooshSound) {
    this.swooshSound = swooshSound;
  }

  // Set splash sound reference
  setSplashSound(splashSound) {
    this.splashSound = splashSound;
  }

  // Set clap sound reference
  setClapSound(clapSound) {
    this.clapSound = clapSound;
  }

  // Set callback for when ball gets hit (for camera switching)
  setOnBallHitCallback(callback) {
    this.onBallHitCallback = callback;
  }

  // Set water penalty callback
  setOnWaterPenaltyCallback(callback) {
    this.onWaterPenaltyCallback = callback;
  }

  // Apply wind effects during flight
  applyWindEffects() {
    // Don't apply wind to stabilized balls
    if (this.isStabilized) {
      return;
    }
    
    // Only apply wind while ball is in the air
    if (!this.isOnTerrain() && this.windSystem) {
      const windEffect = this.windSystem.getWindEffect();
      const currentVel = this.sprite.body.velocity;
      
      // Apply moderate wind influence - reduced to prevent excessive distances
      // Wind effect is stronger when ball is higher/moving faster
      const ballSpeed = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
      const speedFactor = Math.min(ballSpeed / 500, 1.2); // Reduced speed factor
      const windInfluence = 0.015 * speedFactor; // Much reduced base influence
      
      this.sprite.body.setVelocity(
        currentVel.x + (windEffect.x * windInfluence),
        currentVel.y + (windEffect.y * windInfluence)
      );
    }
  }

  // Apply ground friction when ball is rolling
  applyGroundFriction(clubType = null) {
    // Don't apply friction to stabilized balls
    if (this.isStabilized) {
      return;
    }
    
    const vel = this.sprite.body.velocity;
    const horizontalVel = Math.abs(vel.x);
    
    // Don't apply friction when horizontal movement is very low - let ball stabilize
    if (horizontalVel < 12) {
      return;
    }
    
    // Check if ball is on terrain
    const isOnGround = this.isOnTerrain();
    
    if (isOnGround) {
      const horizontalVel = this.sprite.body.velocity.x;
      
      // Apply backspin effect immediately when ball hits ground
      if (this.hasBackspin && !this.backspinApplied) {
        // Apply strong reverse momentum for backspin effect
        const backspinForce = -horizontalVel * 0.8; // Reverse 80% of velocity
        this.sprite.body.setVelocityX(backspinForce);
        this.backspinApplied = true;
        console.log('Backspin applied! Ball rolling backwards...');
        return; // Skip normal friction on first backspin application
      }
      
      // Apply rolling friction only to horizontal movement
      if (Math.abs(horizontalVel) > 0) {
        // Different friction based on club type and terrain - much lower overall
        let friction = 0.985; // Much lower default friction for better rolling
        if (clubType === 'wedge') {
          friction = 0.92; // Reduced wedge friction (still higher than others but more reasonable)
        } else if (clubType === 'driver') {
          friction = 0.975; // Moderate friction for driver shots (realistic roll distance)
        } else if (clubType === 'iron') {
          friction = 0.88; // High friction for iron - minimal roll when landing
        } else if (clubType === 'putter') {
          friction = 0.999; // Minimal friction for putter shots (maximum rolling distance)
        }
        
        // Apply additional friction if on green (putting surface)
        if (this.terrain && this.terrain.isBallOnGreen(this.sprite.x)) {
          friction *= 0.95; // Slightly more friction on the green (reduced penalty)
        }
        
        this.sprite.body.setVelocityX(horizontalVel * friction);
        
        // Stop the ball if it's moving very slowly - lower thresholds for better rolling
        let stopThreshold = 8; // Much lower default threshold for better rolling
        if (clubType === 'driver') {
          stopThreshold = 10; // Moderate threshold for driver (realistic rolling distance)
        } else if (clubType === 'wedge') {
          stopThreshold = 12; // Higher threshold for wedge (stops sooner but still reasonable)
        } else if (clubType === 'iron') {
          stopThreshold = 15; // High threshold for iron - stops quickly with minimal roll
        } else if (clubType === 'putter') {
          stopThreshold = 2; // Minimum threshold for putter (allows maximum rolling distance)
        }
        
        if (Math.abs(horizontalVel) < stopThreshold) {
          this.sprite.body.setVelocityX(0);
        }
      }
    }
  }

  // Check if player can hit the ball and handle the hit
  checkHit(player, clubManager = null, keys = null) {
    // Calculate distance between player and ball
    const distance = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.sprite.x, this.sprite.y
    );

    // Check if player is swinging
    const isSwinging = player.anims.currentAnim?.key === 'swing' || player.anims.currentAnim?.key === 'swing_followthrough';
    
    // Reset swoosh flag when player stops swinging
    if (!isSwinging && this.swooshPlayed) {
      this.swooshPlayed = false;
    }
    
    if (isSwinging) {
      // If player is close enough to hit the ball
      if (distance < 80) {
        // Only hit the ball if it hasn't been hit recently
        if (!this.hitRecently) {
          const powerMultiplier = player.getCurrentPower();
          
          // Check for backspin (Ctrl + Wedge only)
          const isBackspin = keys && keys.ctrl.isDown && 
                            clubManager && clubManager.getCurrentClub() === 'wedge';
          
          this.hit(player, clubManager, powerMultiplier, isBackspin);
          this.hitRecently = true;
          
          // Prevent swoosh sound from playing during this swing since ball was hit
          this.swooshPlayed = true;
          
          // Reset the hit flag after a short delay
          this.scene.time.delayedCall(500, () => {
            this.hitRecently = false;
          });
        }
      } else {
        // Player is swinging but too far from ball - play swoosh sound once per swing
        // Only play swoosh if the ball wasn't hit recently (prevents swoosh when ball is hit)
        if (!this.hitRecently && !this.swooshPlayed) {
          if (this.swooshSound) {
            this.swooshSound.play();
          }
          this.swooshPlayed = true;
        }
      }
    }
  }

  // Hit the ball with realistic golf physics
  hit(player, clubManager = null, powerMultiplier = 1.0, hasBackspin = false) {
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
    
    // Add realistic shot variation (±5-10% depending on club)
    const variationRange = clubProps.name === 'Driver' ? 0.08 : // ±8% for driver
                          clubProps.name === 'Iron' ? 0.04 :    // ±4% for iron (most accurate)
                          clubProps.name === 'Wedge' ? 0.05 :   // ±5% for wedge (more precise)
                          0.06; // ±6% for putter
    
    const powerVariation = 1 + (Math.random() - 0.5) * 2 * variationRange;
    const angleVariation = 1 + (Math.random() - 0.5) * 2 * (variationRange * 0.5); // Less angle variation
    
    // Calculate launch velocities with variation
    const launchVelocityX = hitDirection * clubProps.horizontalPower * totalPowerMultiplier * powerVariation;
    const launchVelocityY = clubProps.canFly ? clubProps.launchAngle * totalPowerMultiplier * angleVariation : 0;
    
    // Unstabilize the ball before applying new velocity
    this.unstabilizeBall();
    
    this.sprite.body.setVelocity(launchVelocityX, launchVelocityY);
    
    // Play appropriate sound effect based on club type
    if (clubManager && clubManager.getCurrentClub() === 'putter') {
      // Play putt sound for putter
      if (this.puttSound) {
        this.puttSound.play();
      }
    } else {
      // Play regular hit sound for all other clubs
      if (this.hitSound) {
        this.hitSound.play();
      }
    }
    
    // Trigger camera switch callback
    if (this.onBallHitCallback) {
      this.onBallHitCallback();
    }
    
    // Set backspin properties
    this.hasBackspin = hasBackspin;
    this.backspinApplied = false;
    
    // Reduce bounce for backspin shots
    if (hasBackspin) {
      this.sprite.body.setBounce(0.2); // Much less bouncy for backspin shots
    } else {
      this.sprite.body.setBounce(0.7); // Normal bounce for regular shots
    }
    
    // Start distance tracking
    this.startDistanceTracking();
    
    const powerPercent = Math.round(powerMultiplier * 100);
    const backspinText = hasBackspin ? ' with BACKSPIN' : '';
    console.log(`Ball hit with ${clubProps.name} at ${powerPercent}% power${backspinText}! ${clubProps.canFly ? 'Flying through the air' : 'Rolling on the ground'}...`);
  }

  // Reset ball to a specific position
  reset(x = 200, y = null) {
    // If no y provided, use terrain height
    if (y === null && this.terrain) {
      y = this.terrain.getHeightAtX(x) - this.groundRadius;
    } else if (y === null) {
      y = 630; // Fallback to original default
    }
    
    this.sprite.setPosition(x, y);
    this.sprite.body.setVelocity(0, 0);
    this.hitRecently = false;
    
    // Reset distance tracking
    this.startX = x;
    this.startY = y;
    this.currentDistance = 0;
    this.isTracking = false;
    
    // Reset stable stop detection
    this.stableStopTimer = 0;
    this.positionStableCount = 0;
    this.lastPosition = { x: x, y: y };
    
    // Reset stabilization
    this.unstabilizeBall();
    
    // Reset backspin state and bounce
    this.hasBackspin = false;
    this.backspinApplied = false;
    this.sprite.body.setBounce(0.7); // Reset to normal bounce
    
    // Reset hole completion state
    this.holeCompleted = false;
  }

  // Check if ball is moving (original method for backward compatibility)
  isMoving() {
    const vel = this.sprite.body.velocity;
    return Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1;
  }
  
  // More stable method to check if ball has truly stopped
  isStablyStopped(deltaTime) {
    // If ball is already stabilized, don't run checks - just return true
    if (this.isStabilized) {
      return true;
    }
    
    const vel = this.sprite.body.velocity;
    
    // If ball is flying high (Y velocity > 100), skip stabilization checks entirely
    if (Math.abs(vel.y) > 100) {
      // Reset timers since ball is clearly in flight
      this.stableStopTimer = 0;
      this.positionStableCount = 0;
      return false;
    }
    
    // Focus on HORIZONTAL movement - that's what matters for a stopped golf ball
    const horizontalVel = Math.abs(vel.x);
    const verticalVel = Math.abs(vel.y);
    
    // IMMEDIATE stabilization when horizontal movement stops
    if (horizontalVel < 8) {
      // Ball has essentially stopped rolling - stabilize immediately
      this.stabilizeBall();
      console.log(`Ball stabilized - horizontal movement stopped (hVel: ${Math.round(horizontalVel)}, vVel: ${Math.round(verticalVel)})`);
      return true;
    }
    
    // For balls with low horizontal movement, use timer-based approach
    if (horizontalVel < 15) {
      this.stableStopTimer += deltaTime;
      
      // Very short wait time when horizontal movement is low
      if (this.stableStopTimer >= 150) {
        this.stabilizeBall();
        console.log(`Ball stabilized after brief wait - low horizontal movement (hVel: ${Math.round(horizontalVel)})`);
        return true;
      }
    } else {
      // Reset timer if ball is still rolling horizontally
      this.stableStopTimer = 0;
    }
    
    return false;
  }
  
  // Stabilize the ball to stop all vibration
  stabilizeBall() {
    this.isStabilized = true;
    this.stabilizedPosition = { x: this.sprite.x, y: this.sprite.y };
    
    // Completely stop all movement
    this.sprite.body.setVelocity(0, 0);
    
    // Disable physics temporarily to prevent any forces from affecting the ball
    this.sprite.body.setImmovable(true);
    
    // Fix the ball at its current position
    this.sprite.setPosition(this.stabilizedPosition.x, this.stabilizedPosition.y);
  }
  
  // Unstabilize the ball (when it gets hit again)
  unstabilizeBall() {
    if (this.isStabilized) {
      this.isStabilized = false;
      this.sprite.body.setImmovable(false);
      console.log('Ball unstabilized - physics re-enabled');
    }
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
    
    // Reset stable stop detection
    this.stableStopTimer = 0;
    this.positionStableCount = 0;
    this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
    
    // Reset stabilization
    this.unstabilizeBall();
  }

  // Update distance tracking (call this in game loop)
  updateDistance(deltaTime = 16) {
    if (!this.isTracking) return;

    // Check for water hazard collision
    this.checkWaterCollision();

    // Calculate distance from starting position
    const distanceX = this.sprite.x - this.startX;
    const distanceY = this.sprite.y - this.startY;
    this.currentDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Stop tracking if ball has stably stopped
    if (this.isStablyStopped(deltaTime) && this.currentDistance > 0) {
      this.stopDistanceTracking();
    }
  }

  // Check if ball has entered the target circle area
  checkTargetCircleCollision() {
    // Don't check if hole already completed
    if (this.holeCompleted) {
      return;
    }
    
    if (this.terrain && this.terrain.isBallInTargetCircle(this.sprite.x, this.sprite.y)) {
      console.log('HOLE COMPLETED! Ball entered target circle and disappeared!');
      
      // Mark hole as completed to prevent multiple triggers
      this.holeCompleted = true;
      
      // Play celebration clap sound FIRST before doing anything else
      if (this.clapSound) {
        console.log('Playing clap sound...');
        this.clapSound.play();
      } else {
        console.log('Clap sound not available!');
      }
      
      // Stop the ball immediately
      this.sprite.body.setVelocity(0, 0);
      this.stopDistanceTracking();
      
      // Delay making ball invisible to ensure sound plays
      this.scene.time.delayedCall(100, () => {
        this.sprite.setVisible(false);
        console.log('Ball made invisible after delay');
      });
      
      // TODO: Add more celebration, score tracking, etc.
      
      return;
    }
  }

  // Check if ball has landed in water hazard
  checkWaterCollision() {
    if (this.terrain && this.terrain.isBallInWater(this.sprite.x, this.sprite.y)) {
      console.log('Ball landed in water! Applying penalty stroke...');
      
      // Play splash sound
      if (this.splashSound) {
        this.splashSound.play();
      }
      
      // Stop the ball immediately
      this.sprite.body.setVelocity(0, 0);
      this.stopDistanceTracking();
      
      // Find a safe drop position near the water hazard
      const dropPosition = this.findWaterDropPosition();
      this.sprite.setPosition(dropPosition.x, dropPosition.y);
      
      // Call penalty callback to add stroke
      if (this.onWaterPenaltyCallback) {
        this.onWaterPenaltyCallback();
      }
      
      // Reset ball state
      this.unstabilizeBall();
    }
  }

  // Find a safe position to drop the ball near the water hazard
  findWaterDropPosition() {
    if (!this.terrain) {
      return { x: this.originalPosition.x, y: this.originalPosition.y };
    }
    
    // Drop the ball just before the water hazard starts, on safe ground
    const dropX = this.terrain.waterStartX - 80; // 80 pixels before water starts
    const dropY = this.terrain.getHeightAtX(dropX) - this.groundRadius - 5; // On ground surface
    
    return { x: dropX, y: dropY };
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

  // Check if ball is on terrain
  isOnTerrain() {
    if (!this.terrain) return false;
    
    const ballBottom = this.sprite.y + this.groundRadius;
    const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
    
    return ballBottom >= terrainHeight;
  }

  // Update ball position to interact with terrain
  updateTerrainPhysics() {
    if (!this.terrain) return;
    
    // Don't apply terrain physics to stabilized balls
    if (this.isStabilized) {
      // Keep the ball exactly where it was stabilized
      this.sprite.setPosition(this.stabilizedPosition.x, this.stabilizedPosition.y);
      this.sprite.body.setVelocity(0, 0);
      return;
    }

    const currentVel = this.sprite.body.velocity;
    const horizontalVel = Math.abs(currentVel.x);
    
    // Don't apply terrain physics when horizontal movement is low - let ball stabilize
    if (horizontalVel < 12) {
      return;
    }

    const ballBottom = this.sprite.y + this.groundRadius;
    const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
    
    // Only apply terrain physics if ball is significantly below terrain
    // and not flying upward (to allow proper ball flight)
    if (ballBottom > terrainHeight + 8 && currentVel.y >= 0) {
      // Much more gentle positioning - only for major height differences
      const targetY = terrainHeight - this.groundRadius;
      const currentY = this.sprite.y;
      const yDifference = targetY - currentY;
      
      // Only adjust for very significant differences to eliminate vibration
      if (Math.abs(yDifference) > 10) {
        // Very gentle interpolation
        const adjustmentSpeed = 0.2;
        const newY = currentY + yDifference * adjustmentSpeed;
        this.sprite.setY(newY);
        
        // Only apply bounce if ball is falling very fast
        if (currentVel.y > 200) {
          // Very gentle bounce
          this.sprite.body.setVelocityY(currentVel.y * -0.3);
        } else {
          // Ball is rolling - just stop vertical movement gently
          this.sprite.body.setVelocityY(currentVel.y * 0.8);
        }
      }
    }
    
    // Completely separate, very gentle slope influence system
    // Don't apply slope forces to stabilized balls or balls that are very slow
    // Much more restrictive - only apply to balls moving at reasonable speed
    if (Math.abs(currentVel.x) < 150 && Math.abs(currentVel.x) > 50 && !this.isStabilized) {
      const slope = this.terrain.getSlopeAtX(this.sprite.x);
      if (Math.abs(slope) > 0.02) {
        // Very minimal slope influence
        const slopeForce = slope * 3; // Even further reduced force
        this.sprite.body.setVelocityX(currentVel.x + slopeForce);
      }
    }
  }
}