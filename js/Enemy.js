/**
 * Enemy class for managing boss/enemy sprite, animations, and behavior
 */
export class Enemy {
  constructor(scene, x = 3000, y = 400) {
    this.scene = scene;
    
    // Enemy states
    this.state = 'idle'; // 'idle', 'aggro', 'attacking'
    this.isAggro = false;
    this.aggroRange = 200; // Distance in pixels to detect golf ball
    this.attackRange = 100; // Distance in pixels for attack
    
    // Enemy properties
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 80; // Movement speed when aggro
    this.attackDamage = 25;
    this.attackCooldown = 2000; // Time between attacks in ms
    this.lastAttackTime = 0;
    
    // Animation and visual properties
    this.scale = 1.0;
    this.depth = 6; // Above terrain but below UI elements
    
    // References
    this.golfBall = null; // Will be set by scene
    this.player = null; // Will be set by scene
    this.terrain = null; // Will be set by scene
    
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
    
    // Health bar properties
    this.healthBar = null;
    this.healthBarBg = null;
    this.createHealthBar();
    
    // Aggro indicator
    this.aggroIndicator = null;
    this.createAggroIndicator();
    
    console.log(`Enemy created at position: x=${x}, y=${y}`);
  }

  // Create health bar above enemy
  createHealthBar() {
    const barWidth = 80;
    const barHeight = 8;
    const offsetY = -100; // Above enemy
    
    // Health bar background
    this.healthBarBg = this.scene.add.rectangle(
      this.sprite.x, 
      this.sprite.y + offsetY, 
      barWidth, 
      barHeight, 
      0x333333
    );
    this.healthBarBg.setOrigin(0.5, 0.5);
    this.healthBarBg.setDepth(this.depth + 1);
    this.healthBarBg.setStrokeStyle(1, 0xffffff);
    
    // Health bar fill
    this.healthBar = this.scene.add.rectangle(
      this.sprite.x, 
      this.sprite.y + offsetY, 
      barWidth, 
      barHeight, 
      0x00ff00
    );
    this.healthBar.setOrigin(0.5, 0.5);
    this.healthBar.setDepth(this.depth + 1);
    
    // Initially hide health bar
    this.healthBar.setVisible(false);
    this.healthBarBg.setVisible(false);
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

  // Update enemy behavior
  update() {
    // Update terrain following
    this.updateTerrainPosition();
    
    // Update health bar position
    this.updateHealthBar();
    
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
      case 'attacking':
        this.handleAttackingState();
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

  // Update health bar position
  updateHealthBar() {
    if (this.healthBar && this.healthBarBg) {
      const offsetY = -100; // Above enemy
      this.healthBar.setPosition(this.sprite.x, this.sprite.y + offsetY);
      this.healthBarBg.setPosition(this.sprite.x, this.sprite.y + offsetY);
      
      // Update health bar width based on current health
      const healthPercent = this.health / this.maxHealth;
      const maxWidth = 80;
      const currentWidth = maxWidth * healthPercent;
      this.healthBar.width = currentWidth;
      
      // Change color based on health
      if (healthPercent > 0.6) {
        this.healthBar.setFillStyle(0x00ff00); // Green
      } else if (healthPercent > 0.3) {
        this.healthBar.setFillStyle(0xffff00); // Yellow
      } else {
        this.healthBar.setFillStyle(0xff0000); // Red
      }
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
    if (!this.golfBall) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.golfBall.x, this.golfBall.y
    );

    // Check if ball is within aggro range and not stabilized
    if (distance <= this.aggroRange && !this.golfBall.isStabilized) {
      if (!this.isAggro) {
        this.enterAggroState();
      }
    } else if (distance > this.aggroRange * 1.5) {
      // Exit aggro if ball moves far away
      if (this.isAggro) {
        this.exitAggroState();
      }
    }
  }

  // Enter aggro state
  enterAggroState() {
    this.isAggro = true;
    this.state = 'aggro';
    
    // Show health bar and aggro indicator
    this.healthBar.setVisible(true);
    this.healthBarBg.setVisible(true);
    this.aggroIndicator.setVisible(true);
    
    // Add pulsing effect to aggro indicator
    this.scene.tweens.add({
      targets: this.aggroIndicator,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Power2'
    });
    
    // Add red tint to enemy sprite
    this.sprite.setTint(0xff6666);
    
    console.log('Enemy entered AGGRO state!');
  }

  // Exit aggro state
  exitAggroState() {
    this.isAggro = false;
    this.state = 'idle';
    
    // Hide health bar and aggro indicator
    this.healthBar.setVisible(false);
    this.healthBarBg.setVisible(false);
    this.aggroIndicator.setVisible(false);
    
    // Stop aggro indicator animation
    this.scene.tweens.killTweensOf(this.aggroIndicator);
    this.aggroIndicator.setScale(1);
    
    // Remove red tint from enemy sprite
    this.sprite.clearTint();
    
    console.log('Enemy returned to IDLE state');
  }

  // Handle idle state
  handleIdleState() {
    // Enemy just stands there menacingly
    this.sprite.body.setVelocityX(0);
  }

  // Handle aggro state
  handleAggroState() {
    if (!this.golfBall) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.golfBall.x, this.golfBall.y
    );

    // Move towards the golf ball
    const direction = this.golfBall.x > this.sprite.x ? 1 : -1;
    this.sprite.body.setVelocityX(direction * this.speed);
    
    // Flip sprite to face the ball
    this.sprite.flipX = direction < 0;

    // Check if close enough to attack
    if (distance <= this.attackRange) {
      this.state = 'attacking';
      this.attack();
    }
  }

  // Handle attacking state
  handleAttackingState() {
    // Stop movement while attacking
    this.sprite.body.setVelocityX(0);
    
    // Return to aggro state after attack cooldown
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastAttackTime >= this.attackCooldown) {
      this.state = 'aggro';
    }
  }

  // Perform attack
  attack() {
    const currentTime = this.scene.time.now;
    
    // Check attack cooldown
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      return;
    }

    this.lastAttackTime = currentTime;
    
    // Attack animation effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        this.sprite.setScale(this.scale);
      }
    });

    // Check if golf ball is still in range for damage
    if (this.golfBall) {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        this.golfBall.x, this.golfBall.y
      );

      if (distance <= this.attackRange) {
        // Deal damage to golf ball (or player)
        this.dealDamage();
      }
    }

    console.log('Enemy attacked!');
  }

  // Deal damage (placeholder for now)
  dealDamage() {
    // For now, just log the attack
    // Later this could affect the golf ball's trajectory or player health
    console.log(`Enemy dealt ${this.attackDamage} damage!`);
    
    // Could add effects like:
    // - Push the golf ball away
    // - Reduce player health
    // - Add visual effects
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

    console.log(`Enemy took ${damage} damage! Health: ${this.health}/${this.maxHealth}`);

    // Check if enemy is defeated
    if (this.health <= 0) {
      this.defeat();
    }
  }

  // Defeat the enemy
  defeat() {
    console.log('Enemy defeated!');
    
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
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
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
