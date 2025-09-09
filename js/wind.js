/**
 * Wind system for golf game
 */

export class WindSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Wind properties
    this.windSpeed = 0; // Miles per hour (0-15)
    this.windDirection = 0; // Degrees (0 = right, 90 = up, 180 = left, 270 = down)
    this.maxWindSpeed = 15; // Maximum wind speed in mph
    
    // Wind fluctuation properties
    this.windChangeTimer = 0;
    this.windChangeInterval = 3000; // Change wind every 3 seconds
    this.windChangeAmount = 2; // Max change per interval
    
    // Initialize with random wind
    this.generateRandomWind();
  }

  // Generate initial random wind
  generateRandomWind() {
    this.windSpeed = Math.random() * this.maxWindSpeed;
    this.windDirection = Math.random() * 360;
  }

  // Update wind over time
  update(deltaTime) {
    this.windChangeTimer += deltaTime;
    
    if (this.windChangeTimer >= this.windChangeInterval) {
      this.fluctuateWind();
      this.windChangeTimer = 0;
    }
  }

  // Gradually change wind speed and direction
  fluctuateWind() {
    // Change wind speed slightly
    const speedChange = (Math.random() - 0.5) * this.windChangeAmount;
    this.windSpeed = Math.max(0, Math.min(this.maxWindSpeed, this.windSpeed + speedChange));
    
    // Change wind direction slightly
    const directionChange = (Math.random() - 0.5) * 30; // Up to 15 degrees change
    this.windDirection = (this.windDirection + directionChange + 360) % 360;
  }

  // Get wind effect on ball velocity
  getWindEffect() {
    // Convert wind direction to radians
    const windRadians = (this.windDirection * Math.PI) / 180;
    
    // Calculate wind force components
    const windForceX = Math.cos(windRadians) * this.windSpeed;
    const windForceY = Math.sin(windRadians) * this.windSpeed;
    
    // Convert mph to pixels/frame (approximate conversion for game)
    const windMultiplier = 2; // Adjust this to make wind more/less effective
    
    return {
      x: windForceX * windMultiplier,
      y: -windForceY * windMultiplier // Negative because Y increases downward in Phaser
    };
  }

  // Get wind speed in mph
  getWindSpeed() {
    return Math.round(this.windSpeed * 10) / 10; // Round to 1 decimal
  }

  // Get wind direction in degrees
  getWindDirection() {
    return Math.round(this.windDirection);
  }

  // Get wind direction as compass direction
  getCompassDirection() {
    const directions = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
    const index = Math.round(this.windDirection / 45) % 8;
    return directions[index];
  }

  // Get wind info for UI display
  getWindInfo() {
    return {
      speed: this.getWindSpeed(),
      direction: this.getWindDirection(),
      compass: this.getCompassDirection()
    };
  }
}
