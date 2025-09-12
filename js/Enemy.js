/**
 * Enemy class for managing boss/enemy sprite, animations, and behavior
 */
export class Enemy {
  constructor(scene, x = 3000, y = 400) {
    this.scene = scene;
    
    // Enemy states
    this.state = 'idle'; // 'idle', 'aggro', 'swinging'
    this.isAggro = false;
    this.aggroRange = 500; // Increased from 200 to 500 pixels
    this.attackRange = 80; // Distance in pixels for swing attack
    
    // Enemy properties
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 420; // Movement speed when aggro (slightly slower than player's run speed of 480)
    this.attackCooldown = 3000; // Time between attacks in ms
    this.lastAttackTime = 0;
    this.isSwinging = false;
    
    // Animation and visual properties
    this.scale = 1.0;
    this.depth = 6; // Above terrain but below UI elements
    
  // References
  this.golfBall = null; // Will be set by scene
  this.player = null; // Will be set by scene
  this.terrain = null; // Will be set by scene
  this.fireballSound = null; // Will be set by scene
    
    // Create enemy sprite
    this.sprite = scene.add.sprite(x, y, "enemy1_standing");
    
    // Set sprite properties
    this.sprite.setOrigin(0.5, 1); // Bottom-center origin so enemy sits on ground
    this.sprite.setScale(this.scale);
    this.sprite.setDepth(this.depth);
    
    // Enable physics for collision detection
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setSize(60, 80); // Collision box
    this.sprite.body.setOffset(0, -80); // Offset to align with sprite bottom
    
    // Disable gravity for enemy since they follow terrain
    this.sprite.body.setGravityY(-100); // Counteract world gravity
    
    // Enemy doesn't move initially
    this.sprite.body.setImmovable(true);
    
    // Start with idle animation
    this.sprite.play('enemy_idle', true);
    
    // Aggro indicator
    this.aggroIndicator = null;
    this.createAggroIndicator();
  }


  // Create aggro indicator (red exclamation mark)
  createAggroIndicator() {
    this.aggroIndicator = this.scene.add.text(
      this.sprite.x, 
      this.sprite.y - 120, 
      '!', 
      {
        fontSize: '32px',
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 3,
        fontFamily: 'Arial'
      }
    );
    this.aggroIndicator.setOrigin(0.5, 0.5);
    this.aggroIndicator.setDepth(this.depth + 1);
    this.aggroIndicator.setVisible(false);
  }

  // Set references to other game objects
  setGolfBall(golfBall) {
    this.golfBall = golfBall;
  }

  setPlayer(player) {
    this.player = player;
  }

  setTerrain(terrain) {
    this.terrain = terrain;
  }

  setFireballSound(fireballSound) {
    this.fireballSound = fireballSound;
  }
  
  setBossfightSound(bossfightSound) {
    this.bossfightSound = bossfightSound;
  }
  
  // Check if player is in front of the enemy (for swing hit detection)
  isPlayerInFrontOfEnemy() {
    if (!this.player) return false;
    
    const enemyX = this.sprite.x;
    const playerX = this.player.sprite.x;
    const enemyY = this.sprite.y;
    const playerY = this.player.sprite.y;
    
    // Check if player is within a reasonable Y range (not too far above/below)
    const verticalDistance = Math.abs(playerY - enemyY);
    if (verticalDistance > 100) return false;
    
    // Check if player is in front of enemy (considering enemy's facing direction)
    // For simplicity, we'll check if player is within a cone in front of enemy
    const horizontalDistance = Math.abs(playerX - enemyX);
    
    // Player is in front if they're within reasonable horizontal and vertical distance
    return horizontalDistance <= 200 && verticalDistance <= 100;
  }

  // Update enemy behavior
  update() {
    // Update terrain following
    this.updateTerrainPosition();
    
    // Update aggro indicator position
    this.updateAggroIndicator();
    
    // Check for aggro conditions
    this.checkAggro();
    
    // Handle different states
    switch (this.state) {
      case 'idle':
        this.handleIdleState();
        break;
      case 'aggro':
        this.handleAggroState();
        break;
      case 'swinging':
        this.handleSwingingState();
        break;
    }
  }

  // Update enemy position to follow terrain
  updateTerrainPosition() {
    if (!this.terrain) return;

    const currentX = this.sprite.x;
    const terrainHeight = this.terrain.getHeightAtX(currentX);
    const targetY = terrainHeight; // Enemy sits on terrain surface
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


  // Update aggro indicator position
  updateAggroIndicator() {
    if (this.aggroIndicator) {
      this.aggroIndicator.setPosition(this.sprite.x, this.sprite.y - 120);
    }
  }

  // Check if golf ball is within aggro range
  checkAggro() {
    // Check if hole is completed - if so, pursue player instead of ball
    if (this.golfBall && this.golfBall.holeCompleted) {
      this.checkPlayerAggro();
      return;
    }
    
    if (!this.golfBall) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.golfBall.x, this.golfBall.y
    );

    // Check if ball is within aggro range (regardless of ball state)
    if (distance <= this.aggroRange) {
      if (!this.isAggro) {
        this.enterAggroState();
      }
    }
    // Once aggro, stay aggro - no exit condition!
    // The enemy will pursue the ball relentlessly until it's defeated or the hole is completed
  }
  
  // Check aggro against player (after hole completion)
  checkPlayerAggro() {
    if (!this.player) return;
    
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.player.sprite.x, this.player.sprite.y
    );
    
    // Check if player is within aggro range
    if (distance <= this.aggroRange) {
      if (!this.isAggro) {
        this.enterAggroState();
      }
    }
  }

  // Enter aggro state
  enterAggroState() {
    this.isAggro = true;
    this.state = 'aggro';
    
    // Play bossfight music when entering aggro state
    try {
      // Stop any existing bossfight music first, then play
      if (this.bossfightSound) {
        this.bossfightSound.stop();
        this.bossfightSound.play();
      }
      
      // Also try playing from scene as backup
      if (this.scene && this.scene.bossfightSound) {
        this.scene.bossfightSound.stop();
        this.scene.bossfightSound.play();
      }
    } catch (error) {
      console.error('Error playing bossfight music:', error);
    }
    
    // Flash red briefly when initially aggroing
    this.sprite.setTint(0xff6666);
    this.scene.tweens.add({
      targets: this.sprite,
      tint: 0xffffff, // Return to normal color
      duration: 500,
      ease: 'Power2'
    });
    
    // Show exclamation mark briefly
    this.aggroIndicator.setVisible(true);
    this.scene.tweens.add({
      targets: this.aggroIndicator,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Power2',
      onComplete: () => {
        // Hide exclamation mark after brief flash
        this.aggroIndicator.setVisible(false);
        this.aggroIndicator.setScale(1);
      }
    });
  }

  // Exit aggro state
  exitAggroState() {
    this.isAggro = false;
    this.state = 'idle';
    
    // Hide aggro indicator
    this.aggroIndicator.setVisible(false);
    
    // Stop aggro indicator animation
    this.scene.tweens.killTweensOf(this.aggroIndicator);
    this.aggroIndicator.setScale(1);
    
    // Ensure sprite is back to normal color (in case it wasn't already)
    this.sprite.clearTint();
  }

  // Handle idle state
  handleIdleState() {
    // Enemy just stands there menacingly
    this.sprite.body.setVelocityX(0);
    this.sprite.play('enemy_idle', true);
  }

  // Handle aggro state
  handleAggroState() {
    // After hole completion, pursue player instead of ball
    if (this.golfBall && this.golfBall.holeCompleted) {
      this.handlePlayerPursuit();
      return;
    }
    
    if (!this.golfBall) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.golfBall.x, this.golfBall.y
    );

    // Check if close enough to attack
    if (distance <= this.attackRange) {
      this.performSwingAttack();
    } else {
      // Move towards the golf ball
      const direction = this.golfBall.x > this.sprite.x ? 1 : -1;
      this.sprite.body.setVelocityX(direction * this.speed);
      
      // Flip sprite to face the ball and play walking animation
      this.sprite.flipX = direction < 0;
      this.sprite.play('enemy_walk', true);
    }
  }
  
  // Handle pursuit of player (after hole completion)
  handlePlayerPursuit() {
    if (!this.player) return;
    
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.player.sprite.x, this.player.sprite.y
    );
    
    // Check if close enough to attack player
    if (distance <= this.attackRange) {
      this.performPlayerAttack();
    } else {
      // Move towards the player
      const direction = this.player.sprite.x > this.sprite.x ? 1 : -1;
      this.sprite.body.setVelocityX(direction * this.speed);
      
      // Flip sprite to face the player and play walking animation
      this.sprite.flipX = direction < 0;
      this.sprite.play('enemy_walk', true);
    }
  }
  
  // Attack the player directly (after hole completion)
  performPlayerAttack() {
    const currentTime = this.scene.time.now;
    
    // Check attack cooldown
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      return;
    }
    
    this.lastAttackTime = currentTime;
    this.state = 'swinging';
    
    // Play swing animation
    this.sprite.play('enemy_swing', true);
    
    // When animation completes, stun the player
    this.sprite.once('animationcomplete', () => {
      this.stunPlayer();
      this.state = 'aggro'; // Return to aggro state
    });
  }
  
  // Stun the player directly
  stunPlayer() {
    if (!this.player) return;
    
    // Calculate knockback direction (away from enemy)
    const direction = this.player.sprite.x > this.sprite.x ? 1 : -1;
    
    // Apply horizontal knockback along terrain
    const knockbackPower = 800; // Horizontal knockback power
    
    // Enable knockback mode to prevent normal movement from interfering
    this.player.enableKnockbackMode();
    
    // Switch to damaged sprite
    this.player.setDamagedSprite();
    
    // Apply horizontal knockback (no vertical component)
    this.player.sprite.body.setVelocityX(direction * knockbackPower);
    this.player.sprite.body.setVelocityY(0); // No vertical movement
    
    // Play fireball sound when hitting player
    if (this.scene && this.scene.fireballSound) {
      console.log('Playing fireball sound for player hit (from scene)');
      this.scene.fireballSound.play();
      // Add screen shake effect
      this.scene.cameras.main.shake(300, 0.01);
    } else if (this.fireballSound) {
      console.log('Playing fireball sound for player hit (from enemy)');
      this.fireballSound.play();
      // Add screen shake effect
      this.scene.cameras.main.shake(300, 0.01);
    } else {
      console.log('Fireball sound not available for player hit');
    }
    
    // Deal damage to player
    const damageAmount = 15; // 15% health damage per hit
    this.player.takeDamage(damageAmount);
    
    // Restore normal state after 2 seconds
    this.scene.time.delayedCall(2000, () => {
      this.player.disableKnockbackMode();
      this.player.restoreNormalSprite();
    });
  }

  // Handle swinging state
  handleSwingingState() {
    // Stop movement while swinging
    this.sprite.body.setVelocityX(0);
    
    // Check if swing animation is complete
    if (!this.isSwinging) {
      this.state = 'aggro'; // Return to aggro state
    }
  }

  // Perform swing attack
  performSwingAttack() {
    const currentTime = this.scene.time.now;
    
    // Check attack cooldown
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      return;
    }

    this.lastAttackTime = currentTime;
    this.isSwinging = true;
    this.state = 'swinging';
    
    // Stop movement
    this.sprite.body.setVelocityX(0);
    
    // Face the ball
    const direction = this.golfBall.x > this.sprite.x ? 1 : -1;
    this.sprite.flipX = direction < 0;
    
    // Play swing animation
    this.sprite.play('enemy_swing', true);
    
    // Listen for animation complete
    this.sprite.once('animationcomplete', (anim) => {
      if (anim.key === 'enemy_swing') {
        this.isSwinging = false;
        this.hitBallWithInsanePower(direction);
      }
    });
  }

  // Hit the ball with insane power
  hitBallWithInsanePower(direction) {
    if (!this.golfBall) return;
    
    // Calculate distance to ball
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.golfBall.x, this.golfBall.y
    );
    
    // Only hit if ball is still in range
    if (distance <= this.attackRange) {
      // INSANE power - much stronger than player
      const insanePower = 3500; // Increased from 2500 - MASSIVE power increase
      const launchAngle = -1500; // Increased from -1200 - Much stronger upward angle
      
      // Add some randomness to make it unpredictable
      const powerVariation = 0.9 + Math.random() * 0.2; // 90-110% power variation
      const angleVariation = 0.95 + Math.random() * 0.1; // 95-105% angle variation
      
      const finalPower = insanePower * powerVariation;
      const finalAngle = launchAngle * angleVariation;
      
      // Unstabilize the ball before applying new velocity
      this.golfBall.unstabilizeBall();
      
      // Mark ball as hit by enemy to prevent hole completion
      this.golfBall.hitByEnemy = true;
      
      // Apply insane hit
      this.golfBall.setVelocity(
        direction * finalPower,
        finalAngle
      );
      
      // Play fireball sound effect from scene
      if (this.scene && this.scene.fireballSound) {
        this.scene.fireballSound.play();
        // Add screen shake effect
        this.scene.cameras.main.shake(300, 0.01);
      } else if (this.fireballSound) {
        this.fireballSound.play();
        // Add screen shake effect
        this.scene.cameras.main.shake(300, 0.01);
      }
      
      // Check if player is close enough to be knocked back
      if (this.player) {
        const playerDistance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          this.player.sprite.x, this.player.sprite.y
        );
        
        console.log(`Enemy hit ball - Player distance: ${Math.round(playerDistance)} pixels`);
        
        // If player is close enough, stun them
        if (playerDistance <= 200) {
          // Simply stun the player in place
          this.player.enableKnockbackMode();
          this.player.setDamagedSprite();
          
          // Deal damage to player (less damage when hit by ball vs direct hit)
          const damageAmount = 10; // 10% health damage when hit by ball
          this.player.takeDamage(damageAmount);
          
          // Stun for 2 seconds, then get up
          this.scene.time.delayedCall(2000, () => {
            this.player.disableKnockbackMode();
            this.player.restoreNormalSprite();
          });
          
          console.log(`Player stunned by enemy hit! Distance: ${Math.round(playerDistance)} pixels`);
        } else {
          console.log(`Player too far for stun: ${Math.round(playerDistance)} pixels`);
        }
      } else {
        console.log('No player reference available for knockback');
      }
    }
  }

  // Take damage
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    
    // Show damage effect
    this.scene.tweens.add({
      targets: this.sprite,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });

    // Check if enemy is defeated
    if (this.health <= 0) {
      this.defeat();
    }
  }

  // Defeat the enemy
  defeat() {
    // Play defeat animation
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // Remove enemy from scene
        this.sprite.destroy();
        if (this.aggroIndicator) this.aggroIndicator.destroy();
      }
    });
  }

  // Get enemy position
  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  // Get enemy sprite for collision detection
  getSprite() {
    return this.sprite;
  }

  // Check if enemy is alive
  isAlive() {
    return this.health > 0;
  }

  // Check if enemy is in aggro state
  isInAggro() {
    return this.isAggro;
  }

  // Set enemy position
  setPosition(x, y) {
    this.sprite.setPosition(x, y);
  }

  // Get distance to golf ball
  getDistanceToBall() {
    if (!this.golfBall) return Infinity;
    
    return Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.golfBall.x, this.golfBall.y
    );
  }
}
