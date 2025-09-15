/**
 * ProjectileBall class for managing balls shot at enemies
 */
export class ProjectileBall {
  constructor(scene, x, y, direction) {
    this.scene = scene;
    this.direction = direction; // 1 for right, -1 for left
    this.speed = 1000; // Increased horizontal speed
    
    // Create projectile ball as a small white circle
    this.sprite = scene.add.graphics();
    this.sprite.fillStyle(0xffffff); // White color
    this.sprite.fillCircle(0, 0, 8); // Increased size from 6 to 8
    this.sprite.lineStyle(2, 0x000000); // Black outline
    this.sprite.strokeCircle(0, 0, 8); // Increased size from 6 to 8
    this.sprite.setPosition(x, y);
    
    // Enable physics
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCircle(8); // Increased collision radius
    
    // Set physics properties for horizontal travel
    this.sprite.body.setGravityY(0); // No gravity
    this.sprite.body.setVelocityX(direction * this.speed);
    this.sprite.body.setVelocityY(0); // No vertical movement
    
    // Set depth to appear above terrain but below UI
    this.sprite.setDepth(6);
    
    // Enable collision with world bounds for cleanup
    this.sprite.body.setCollideWorldBounds(true);
    
    console.log(`Projectile ball created at (${x}, ${y}) moving ${direction > 0 ? 'right' : 'left'}`);
  }
  
  // Check if projectile is off screen
  isOffScreen() {
    const bounds = this.scene.cameras.main.worldView;
    return this.sprite.x < bounds.x - 50 || this.sprite.x > bounds.x + bounds.width + 50;
  }
  
  // Destroy the projectile
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
  
  // Update projectile (check for cleanup)
  update() {
    if (this.isOffScreen()) {
      this.destroy();
      return false; // Signal for removal
    }
    return true; // Keep projectile
  }
}
