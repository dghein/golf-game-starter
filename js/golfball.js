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
    
    // Approach direction tracking for water drops
    this.previousPosition = { x: x, y: y };
    this.approachDirection = 'right'; // Default direction (left to right)
    
    // Bounce detection
    this.previousY = y;
    this.wasInAir = false;
    
    // Sound properties
    this.hitSound = null; // Will be set by GameScene
    this.puttSound = null; // Will be set by GameScene
    this.swooshSound = null; // Will be set by GameScene
    this.splashSound = null; // Will be set by GameScene
    this.bounceSound = null; // Will be set by GameScene
    this.clapSound = null; // Will be set by GameScene
    this.cheerSound = null; // Will be set by GameScene
    
    // Camera callback properties
    this.onBallHitCallback = null; // Will be set by GameScene
    
    // Water hazard properties
    this.originalPosition = { x: x, y: y }; // Store original position for water penalty
    this.onWaterPenaltyCallback = null; // Will be set by GameScene
    
    // Hole completion callback
    this.onHoleCompletedCallback = null; // Will be set by GameScene
    
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
    
    // Handle world bounds collision to prevent top collision bounce
    this.sprite.body.onWorldBounds = true;
    this.sprite.body.world.on('worldbounds', (event) => {
      if (event.body === this.sprite.body) {
        // If hitting the top boundary, don't bounce - let it continue
        if (event.position.y <= this.scene.physics.world.bounds.y) {
          event.body.setVelocityY(Math.abs(event.body.velocity.y)); // Continue downward
        }
      }
    });
    
    // Make resetBall command available globally for debugging
    window.resetBall = () => this.resetBall();
    
    console.log('Golf ball initialized. Use resetBall() in console to reset ball position.');
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

  // Set bounce sound reference
  setBounceSound(bounceSound) {
    this.bounceSound = bounceSound;
  }

  // Set clap sound reference
  setClapSound(clapSound) {
    this.clapSound = clapSound;
  }

  setCheerSound(cheerSound) {
    this.cheerSound = cheerSound;
  }

  // Set callback for when ball gets hit (for camera switching)
  setOnBallHitCallback(callback) {
    this.onBallHitCallback = callback;
  }

  // Set water penalty callback
  setOnWaterPenaltyCallback(callback) {
    this.onWaterPenaltyCallback = callback;
  }

  // Set hole completed callback
  setOnHoleCompletedCallback(callback) {
    this.onHoleCompletedCallback = callback;
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
    if (horizontalVel < 18) {
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
    if (horizontalVel < 15) {
      // Check if ball is on terrain before stabilizing
      if (this.terrain) {
        const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
        const ballBottom = this.sprite.y + this.groundRadius;
        
        // Check terrain slope - don't stabilize on steep slopes
        const slope = this.terrain.getSlopeAtX(this.sprite.x);
        const isOnSteepSlope = Math.abs(slope) > 0.15; // Higher threshold - only prevent stabilization on actually steep slopes
        
        // Debug logging for slope detection
        if (Math.abs(slope) > 0.02) {
          console.log(`Slope detection: slope=${slope.toFixed(3)}, isSteep=${isOnSteepSlope}, threshold=0.15`);
        }
        
        // Only stabilize if ball is close to terrain surface AND not on steep slope
        if (ballBottom >= terrainHeight - 8 && !isOnSteepSlope) {
          this.stabilizeBall();
          console.log(`Ball stabilized - horizontal movement stopped (hVel: ${Math.round(horizontalVel)}, vVel: ${Math.round(verticalVel)}, slope: ${slope.toFixed(3)})`);
          return true;
        } else if (isOnSteepSlope) {
          // On steep slopes, encourage ball to roll down instead of stabilizing
          this.encourageRollDown(slope);
          console.log(`Ball on steep slope - encouraging roll down (slope: ${slope.toFixed(3)}, hVel: ${Math.round(horizontalVel)})`);
        } else {
          console.log(`Ball not stabilized - floating above terrain (ball: ${Math.round(ballBottom)}, terrain: ${Math.round(terrainHeight)})`);
        }
      } else {
        // No terrain - stabilize normally
        this.stabilizeBall();
        console.log(`Ball stabilized - horizontal movement stopped (hVel: ${Math.round(horizontalVel)}, vVel: ${Math.round(verticalVel)})`);
        return true;
      }
    }
    
    // For balls with low horizontal movement, use timer-based approach
    if (horizontalVel < 15) {
      this.stableStopTimer += deltaTime;
      
      // Very short wait time when horizontal movement is low
      if (this.stableStopTimer >= 150) {
        // Check if ball is on terrain before stabilizing
        if (this.terrain) {
          const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
          const ballBottom = this.sprite.y + this.groundRadius;
          
          // Check terrain slope - don't stabilize on steep slopes
          const slope = this.terrain.getSlopeAtX(this.sprite.x);
          const isOnSteepSlope = Math.abs(slope) > 0.15; // Higher threshold - only prevent stabilization on actually steep slopes
          
          // Only stabilize if ball is close to terrain surface AND not on steep slope
          if (ballBottom >= terrainHeight - 5 && !isOnSteepSlope) {
            this.stabilizeBall();
            console.log(`Ball stabilized after brief wait - low horizontal movement (hVel: ${Math.round(horizontalVel)}, slope: ${slope.toFixed(3)})`);
            return true;
          } else if (isOnSteepSlope) {
            // On steep slopes, encourage ball to roll down instead of stabilizing
            this.encourageRollDown(slope);
            console.log(`Ball on steep slope - encouraging roll down (slope: ${slope.toFixed(3)}, hVel: ${Math.round(horizontalVel)})`);
          } else {
            console.log(`Ball not stabilized - still floating above terrain (ball: ${Math.round(ballBottom)}, terrain: ${Math.round(terrainHeight)})`);
          }
        } else {
          this.stabilizeBall();
          console.log(`Ball stabilized after brief wait - low horizontal movement (hVel: ${Math.round(horizontalVel)})`);
          return true;
        }
      }
    } else {
      // Reset timer if ball is still rolling horizontally
      this.stableStopTimer = 0;
    }
    
    return false;
  }
  
  // Stabilize the ball to stop all vibration
  stabilizeBall() {
    // Ensure ball is on terrain surface before stabilizing
    if (this.terrain) {
      const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
      const targetY = terrainHeight - this.groundRadius;
      
      // Always adjust ball to terrain surface, whether above or below
      if (Math.abs(this.sprite.y - targetY) > 2) {
        this.sprite.setY(targetY);
        console.log(`Ball adjusted to terrain surface before stabilizing: ${Math.round(targetY)} (was: ${Math.round(this.sprite.y)})`);
      }
    }
    
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
      
      // Play celebration sound FIRST before doing anything else
      // Check if this is a hole-in-one (1 stroke) to play appropriate sound
      const isHoleInOne = this.scene.shotCount === 1;
      
      if (isHoleInOne && this.cheerSound) {
        console.log('Playing cheer sound for hole-in-one...');
        this.cheerSound.play();
      } else if (this.clapSound) {
        console.log('Playing clap sound...');
        this.clapSound.play();
      } else {
        console.log('No celebration sound available!');
      }
      
      // Stop the ball immediately
      this.sprite.body.setVelocity(0, 0);
      this.stopDistanceTracking();
      
      // Delay making ball invisible to ensure sound plays
      this.scene.time.delayedCall(100, () => {
        this.sprite.setVisible(false);
        console.log('Ball made invisible after delay');
      });
      
      // Trigger hole completed callback
      if (this.onHoleCompletedCallback) {
        this.onHoleCompletedCallback();
      }
      
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
      
      // Ensure ball is properly positioned on terrain surface
      if (this.terrain) {
        const terrainHeight = this.terrain.getHeightAtX(dropPosition.x);
        const correctY = terrainHeight - this.groundRadius;
        this.sprite.setY(correctY);
        console.log(`Water drop: positioned at x=${Math.round(dropPosition.x)}, y=${Math.round(correctY)} (terrain height: ${Math.round(terrainHeight)})`);
      }
      
      // Stabilize the ball after water drop to prevent falling through
      this.stabilizeBall();
      
      // Call penalty callback to add stroke
      if (this.onWaterPenaltyCallback) {
        this.onWaterPenaltyCallback();
      }
      
      // Reset ball state
      this.unstabilizeBall();
    }
  }

  // Check if ball has landed in bunker
  checkBunkerCollision() {
    if (this.terrain && this.terrain.isBallInBunker && this.terrain.isBallInBunker(this.sprite.x, this.sprite.y)) {
      console.log('Ball landed in bunker! Ball will be harder to hit from sand...');
      
      // Apply sand physics - reduce ball speed but keep it playable
      // Different clubs have different effectiveness in sand
      let horizontalReduction = 0.6; // Default 40% reduction
      let verticalReduction = 0.5;  // Default 50% reduction
      
      // Get current club type for bunker-specific physics
      const currentClub = this.scene.clubManager ? this.scene.clubManager.getCurrentClub() : 'driver';
      
      switch (currentClub) {
        case 'wedge':
          // Wedge is best in sand - least reduction
          horizontalReduction = 0.8; // Only 20% reduction
          verticalReduction = 0.7;   // Only 30% reduction
          console.log('Wedge in bunker - minimal sand penalty');
          break;
        case 'iron':
          // Iron is decent in sand
          horizontalReduction = 0.7; // 30% reduction
          verticalReduction = 0.6;   // 40% reduction
          console.log('Iron in bunker - moderate sand penalty');
          break;
        case 'putter':
          // Putter struggles in sand
          horizontalReduction = 0.5; // 50% reduction
          verticalReduction = 0.4;   // 60% reduction
          console.log('Putter in bunker - significant sand penalty');
          break;
        case 'driver':
        default:
          // Driver is worst in sand - most reduction
          horizontalReduction = 0.4; // 60% reduction
          verticalReduction = 0.3;   // 70% reduction
          console.log('Driver in bunker - maximum sand penalty');
          break;
      }
      
      this.sprite.body.setVelocity(
        this.sprite.body.velocity.x * horizontalReduction,
        this.sprite.body.velocity.y * verticalReduction
      );
      
      // Mark ball as being in bunker for different physics
      this.inBunker = true;
      
      console.log(`Ball physics adjusted for sand trap (${currentClub}): ${Math.round((1-horizontalReduction)*100)}% horizontal reduction, ${Math.round((1-verticalReduction)*100)}% vertical reduction`);
    } else if (this.inBunker) {
      // Ball has left the bunker
      this.inBunker = false;
      console.log('Ball has left the bunker');
    }
  }

  // Find a safe position to drop the ball near the water hazard
  findWaterDropPosition() {
    if (!this.terrain) {
      return { x: this.originalPosition.x, y: this.originalPosition.y };
    }
    
    // Use the terrain's water hazard system for drop positioning
    if (this.terrain.findWaterDropPosition) {
      return this.terrain.findWaterDropPosition(this.sprite.x, this.sprite.y, this.approachDirection);
    }
    
    // Fallback to old logic if terrain doesn't have new method
    const dropX = this.terrain.waterStartX - 250; // 12.5 yards before water starts for better visibility
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

  // Update approach direction tracking
  updateApproachDirection() {
    const currentX = this.sprite.x;
    const previousX = this.previousPosition.x;
    
    // Only update direction if ball has moved significantly
    if (Math.abs(currentX - previousX) > 5) {
      if (currentX > previousX) {
        this.approachDirection = 'right'; // Moving left to right
      } else {
        this.approachDirection = 'left'; // Moving right to left
      }
      
      // Update previous position
      this.previousPosition.x = currentX;
      this.previousPosition.y = this.sprite.y;
    }
  }

  // Update ball position to interact with terrain
  updateTerrainPhysics() {
    if (!this.terrain) return;
    
    // Update approach direction tracking
    this.updateApproachDirection();
    
    // Don't apply terrain physics to stabilized balls
    if (this.isStabilized) {
      // Keep the ball exactly where it was stabilized
      this.sprite.setPosition(this.stabilizedPosition.x, this.stabilizedPosition.y);
      this.sprite.body.setVelocity(0, 0);
      return;
    }

    const currentVel = this.sprite.body.velocity;
    const horizontalVel = Math.abs(currentVel.x);
    
    // Check for bounce sound when ball hits terrain
    this.checkBounceSound();
    
    // Don't apply terrain physics when horizontal movement is low - let ball stabilize
    // But always check for fall-through prevention
    if (horizontalVel < 20) {
      // Still check if ball is falling through terrain
      const ballBottom = this.sprite.y + this.groundRadius;
      const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
      
      if (ballBottom > terrainHeight + 10) {
        // Ball is falling through - force it back to surface
        const correctY = terrainHeight - this.groundRadius;
        this.sprite.setY(correctY);
        this.sprite.body.setVelocityY(0);
        console.log(`Fall-through prevention: corrected ball position to y=${Math.round(correctY)}`);
      }
      return;
    }

    const ballBottom = this.sprite.y + this.groundRadius;
    const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
    
    // Apply terrain physics if ball is significantly below terrain
    // and not flying upward (to allow proper ball flight)
    // Use much larger threshold for steep slopes to prevent falling through
    const slope = this.terrain.getSlopeAtX(this.sprite.x);
    const isOnSteepSlope = Math.abs(slope) > 0.1; // Much steeper threshold
    const isOnVerySteepSlope = Math.abs(slope) > 0.5; // Extremely steep slopes
    const collisionThreshold = isOnVerySteepSlope ? 50 : isOnSteepSlope ? 30 : 5; // Much larger threshold for steep slopes
    
    // Debug logging for steep slopes
    if (Math.abs(slope) > 0.3) {
      console.log(`STEEP SLOPE DETECTED: x=${Math.round(this.sprite.x)}, slope=${slope.toFixed(3)}, ballBottom=${Math.round(ballBottom)}, terrainHeight=${Math.round(terrainHeight)}, threshold=${collisionThreshold}`);
    }
    
    // Always apply terrain physics if ball is below terrain, regardless of velocity
    if (ballBottom > terrainHeight + collisionThreshold) {
      // Calculate target position
      const targetY = terrainHeight - this.groundRadius;
      const currentY = this.sprite.y;
      const yDifference = targetY - currentY;
      
      // Different behavior based on slope steepness
      if (isOnVerySteepSlope) {
        // Very steep slopes: aggressive bounce and roll-back behavior
        this.sprite.setY(targetY); // Snap to terrain surface
        
        // Apply realistic bounce physics based on slope angle
        const slopeAngle = Math.atan(Math.abs(slope));
        const bounceFactor = Math.sin(slopeAngle) * 0.8; // Stronger bounce for more roll-back
        
        // Bounce the ball off the slope - more aggressive bouncing
        if (currentVel.y > 30) { // Lower threshold for bouncing
          this.sprite.body.setVelocityY(currentVel.y * -bounceFactor);
          console.log(`STEEP SLOPE BOUNCE: slope=${slope.toFixed(3)}, bounceFactor=${bounceFactor.toFixed(2)}`);
        }
        
        // Much stronger horizontal force to encourage roll-back
        const slopeForce = slope * 35; // Increased from 20 to 35 for more roll-back
        this.sprite.body.setVelocityX(currentVel.x + slopeForce);
        
        // Add extra downward force to make uphill movement harder
        if (slope > 0) { // Going uphill
          this.sprite.body.setVelocityY(currentVel.y + Math.abs(slope) * 15); // Extra downward force
          console.log(`UPHILL RESISTANCE: Added ${Math.abs(slope) * 15} downward force`);
        }
        
      } else if (isOnSteepSlope) {
        // Moderate steep slopes: more challenging with stronger slope influence
        const adjustmentSpeed = 0.5;
        const newY = currentY + yDifference * adjustmentSpeed;
        this.sprite.setY(newY);
        
        // Apply stronger slope forces for more roll-back
        const slopeForce = slope * 25; // Increased from 15 to 25
        this.sprite.body.setVelocityX(currentVel.x + slopeForce);
        
        // More aggressive vertical velocity reduction
        this.sprite.body.setVelocityY(currentVel.y * 0.4); // Reduced from 0.6 to 0.4
        
        // Add uphill resistance for moderate slopes too
        if (slope > 0) { // Going uphill
          this.sprite.body.setVelocityY(currentVel.y + Math.abs(slope) * 8); // Extra downward force
        }
        
      } else {
        // Normal terrain: gentle adjustment
        if (Math.abs(yDifference) > 5) {
          const adjustmentSpeed = 0.3;
          const newY = currentY + yDifference * adjustmentSpeed;
          this.sprite.setY(newY);
          
          // Only apply bounce if ball is falling very fast
          if (currentVel.y > 200) {
            this.sprite.body.setVelocityY(currentVel.y * -0.3);
          } else {
            this.sprite.body.setVelocityY(currentVel.y * 0.7);
          }
        }
      }
      
      console.log(`TERRAIN PHYSICS: slope=${slope.toFixed(3)}, yDiff=${Math.round(yDifference)}, isVerySteep=${isOnVerySteepSlope}, isSteep=${isOnSteepSlope}`);
    }
    
    // Note: Removed continuous surface enforcement for steep slopes
    // Steep slopes should allow bouncing and rolling behavior, not forced stabilization
    
    // Enhanced slope influence system for realistic ball rolling
    // Apply slope forces to rolling balls (not stabilized or flying)
    if (!this.isStabilized && Math.abs(currentVel.y) < 50) {
      const slope = this.terrain.getSlopeAtX(this.sprite.x);
      
      // Apply slope forces based on steepness
      if (Math.abs(slope) > 0.01) {
        // Calculate slope force - positive slope pushes ball right, negative pushes left
        // Make slope force much stronger for very steep slopes to encourage roll-back
        const slopeForce = slope * (Math.abs(slope) > 0.5 ? 45 : Math.abs(slope) > 0.1 ? 30 : 8); // Much stronger force for roll-back
        
        // Apply horizontal force based on slope
        this.sprite.body.setVelocityX(currentVel.x + slopeForce);
        
        // Add vertical component for all slopes, much stronger for steeper ones
        const verticalForce = Math.abs(slope) * (Math.abs(slope) > 0.5 ? 12 : Math.abs(slope) > 0.1 ? 8 : 2);
        if (slope > 0) {
          // Uphill - much stronger resistance to make it harder to go up
          this.sprite.body.setVelocityY(currentVel.y - verticalForce * 1.5); // Extra resistance uphill
        } else {
          // Downhill - add downward velocity (ball speeds up going down)
          this.sprite.body.setVelocityY(currentVel.y + verticalForce);
        }
        
        // More aggressive minimum velocity enforcement for roll-back
        if (Math.abs(slope) > 0.2 && Math.abs(currentVel.x) < 30) {
          const minVelocity = slope > 0 ? 35 : -35; // Higher minimum velocity for more roll-back
          this.sprite.body.setVelocityX(minVelocity);
          console.log(`MINIMUM VELOCITY ENFORCED: slope=${slope.toFixed(3)}, minVel=${minVelocity}`);
        }
        
        // Add momentum-based resistance - slower balls roll back more easily
        const ballSpeed = Math.abs(currentVel.x);
        if (slope > 0 && ballSpeed < 100) { // Going uphill and slow
          const resistanceFactor = (100 - ballSpeed) / 100; // Higher resistance for slower balls
          this.sprite.body.setVelocityX(currentVel.x * (1 - resistanceFactor * 0.3));
          console.log(`MOMENTUM RESISTANCE: slow ball uphill, resistance=${resistanceFactor.toFixed(2)}`);
        }
        
        // Force roll-back for very slow balls on steep uphill slopes
        if (slope > 0.3 && ballSpeed < 50) {
          // Almost guarantee roll-back for slow balls on steep slopes
          this.sprite.body.setVelocityX(-Math.abs(slope) * 40); // Force backward movement
          console.log(`FORCED ROLL-BACK: very slow ball on steep uphill, forced backward velocity`);
        }
        
        console.log(`Slope physics applied: slope=${slope.toFixed(3)}, force=${slopeForce.toFixed(2)}, vForce=${verticalForce.toFixed(2)}`);
      }
    }
  }
  
  // Reset ball position for debugging - places ball near player on terrain
  resetBall() {
    if (!this.scene || !this.scene.player || !this.terrain) {
      console.log('Cannot reset ball - missing scene, player, or terrain');
      return;
    }
    
    // Get player position
    const playerX = this.scene.player.sprite.x;
    const playerY = this.scene.player.sprite.y;
    
    // Place ball slightly ahead of player (to the right)
    const ballX = playerX + 100; // 100 pixels ahead of player
    const terrainHeight = this.terrain.getHeightAtX(ballX);
    const ballY = terrainHeight - this.groundRadius; // On terrain surface
    
    // Reset ball position
    this.sprite.setPosition(ballX, ballY);
    
    // Stop all movement
    this.sprite.body.setVelocity(0, 0);
    
    // Unstabilize ball so it can be hit again
    this.unstabilizeBall();
    
    // Reset distance tracking
    this.currentDistance = 0;
    this.stableStopTimer = 0;
    this.positionStableCount = 0;
    
    console.log(`Ball reset to position: x=${Math.round(ballX)}, y=${Math.round(ballY)} (terrain height: ${Math.round(terrainHeight)})`);
  }
  
  // Check for bounce sound when ball hits terrain
  checkBounceSound() {
    if (!this.terrain || !this.bounceSound) return;
    
    const currentY = this.sprite.y;
    const ballBottom = currentY + this.groundRadius;
    const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
    
    // Check if ball is touching or very close to terrain
    const isOnGround = ballBottom >= terrainHeight - 5 && ballBottom <= terrainHeight + 5;
    
    // Check if ball was previously in air and now on ground (bounce)
    if (isOnGround && this.wasInAir) {
      // Play bounce sound with volume based on impact speed
      const impactSpeed = Math.abs(this.sprite.body.velocity.y);
      const volume = Math.min(0.8, Math.max(0.2, impactSpeed / 200)); // Scale volume with impact speed
      
      this.bounceSound.play({ volume: volume });
      console.log(`Bounce sound played - impact speed: ${Math.round(impactSpeed)}, volume: ${volume.toFixed(2)}`);
    }
    
    // Update bounce detection state
    this.wasInAir = !isOnGround;
    this.previousY = currentY;
  }
  
  // Prevent ball from falling through terrain - emergency safety check
  preventFallThrough() {
    if (!this.terrain || this.isStabilized) return;
    
    const ballBottom = this.sprite.y + this.groundRadius;
    const terrainHeight = this.terrain.getHeightAtX(this.sprite.x);
    
    // If ball is significantly below terrain, force it back up
    if (ballBottom > terrainHeight + 15) {
      const correctY = terrainHeight - this.groundRadius;
      this.sprite.setY(correctY);
      this.sprite.body.setVelocityY(0);
      console.log(`EMERGENCY: Ball falling through terrain! Corrected to y=${Math.round(correctY)}`);
    }
  }
  
  // Encourage ball to roll down steep slopes instead of stabilizing
  encourageRollDown(slope) {
    if (this.isStabilized) return;
    
    const currentVel = this.sprite.body.velocity;
    const ballSpeed = Math.abs(currentVel.x);
    
    // If ball is moving very slowly, give it a push down the slope
    if (ballSpeed < 20) {
      // Calculate roll-down force based on slope steepness
      const rollForce = slope * 30; // Strong force to encourage rolling
      this.sprite.body.setVelocityX(currentVel.x + rollForce);
      
      // Add some downward velocity to help with gravity
      this.sprite.body.setVelocityY(currentVel.y + Math.abs(slope) * 5);
      
      console.log(`Roll-down force applied: slope=${slope.toFixed(3)}, force=${rollForce.toFixed(2)}, speed=${Math.round(ballSpeed)}`);
    }
  }
}