/**
 * Terrain system for generating and managing hilly golf course terrain with green
 */
export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 20000; // Match the world width
    this.baseHeight = 600; // Base ground level
    this.heightMap = [];
    this.terrainGraphics = null;
    this.segments = 600; // Increased segments for smoother curves
    
    // Green properties
    this.greenWidth = 1024; // Approximately screen width
    this.greenStartX = this.width - this.greenWidth - 500; // Position near end
    this.greenEndX = this.greenStartX + this.greenWidth;
    this.greenHeight = 25; // Reduced elevation for easier putting (was 50)
    this.greenSlopeWidth = 300; // Wider, gentler slopes (was 200)
    
    // Generate the terrain height map
    this.generateTerrain();
    
    // Smooth the terrain for more natural curves
    this.smoothTerrain();
    
    // Create visual representation
    this.createTerrainGraphics();
  }

  generateTerrain() {
    // Create a height map using gentle sine waves for smooth rolling hills
    const segmentWidth = this.width / this.segments;
    
    for (let i = 0; i <= this.segments; i++) {
      const x = i * segmentWidth;
      
      // Base terrain with only large, smooth rolling hills
      const wave1 = Math.sin(x * 0.0004) * 60;  // Large smooth rolling hills
      const wave2 = Math.sin(x * 0.0008) * 30;  // Medium smooth hills
      // Removed small undulations completely for ultra-smooth terrain
      
      // No random variation for perfectly smooth terrain
      const randomVariation = 0; // Completely removed random variation
      
      // Calculate base height
      let height = this.baseHeight - (wave1 + wave2 + randomVariation);
      
      // Add green elevation
      height = this.applyGreenElevation(x, height);
      
      this.heightMap.push({
        x: x,
        y: Math.max(height, 450), // Ensure terrain doesn't go too high (min y = 450)
        isGreen: this.isInGreenArea(x)
      });
    }
  }

  smoothTerrain() {
    // Apply many smoothing passes for ultra-smooth terrain to eliminate ball vibration
    const smoothingPasses = 6; // Increased to 6 passes for maximum smoothness
    
    for (let pass = 0; pass < smoothingPasses; pass++) {
      for (let i = 1; i < this.heightMap.length - 1; i++) {
        // Skip smoothing in the green area to preserve its elevation
        if (this.isInGreenComplex(this.heightMap[i].x)) {
          continue;
        }
        
        // Average with neighboring points for smoothing
        const prevY = this.heightMap[i - 1].y;
        const currentY = this.heightMap[i].y;
        const nextY = this.heightMap[i + 1].y;
        
        // Very aggressive smoothing to eliminate all jaggedness
        this.heightMap[i].y = (prevY * 0.35 + currentY * 0.3 + nextY * 0.35);
      }
    }
    
    // Multiple passes with wider smoothing windows for ultra-smooth terrain
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 2; i < this.heightMap.length - 2; i++) {
        if (this.isInGreenComplex(this.heightMap[i].x)) {
          continue;
        }
        
        // 5-point smoothing for perfectly smooth terrain
        const y1 = this.heightMap[i - 2].y;
        const y2 = this.heightMap[i - 1].y;
        const y3 = this.heightMap[i].y;
        const y4 = this.heightMap[i + 1].y;
        const y5 = this.heightMap[i + 2].y;
        
        this.heightMap[i].y = (y1 * 0.1 + y2 * 0.25 + y3 * 0.3 + y4 * 0.25 + y5 * 0.1);
      }
    }
    
    // Final 7-point ultra-smoothing pass for glass-smooth terrain
    for (let i = 3; i < this.heightMap.length - 3; i++) {
      if (this.isInGreenComplex(this.heightMap[i].x)) {
        continue;
      }
      
      // 7-point smoothing for absolutely smooth terrain
      const y1 = this.heightMap[i - 3].y;
      const y2 = this.heightMap[i - 2].y;
      const y3 = this.heightMap[i - 1].y;
      const y4 = this.heightMap[i].y;
      const y5 = this.heightMap[i + 1].y;
      const y6 = this.heightMap[i + 2].y;
      const y7 = this.heightMap[i + 3].y;
      
      this.heightMap[i].y = (y1 * 0.05 + y2 * 0.1 + y3 * 0.2 + y4 * 0.3 + y5 * 0.2 + y6 * 0.1 + y7 * 0.05);
    }
  }

  applyGreenElevation(x, baseHeight) {
    // Check if we're in the green area or its slopes
    const leftSlopeStart = this.greenStartX - this.greenSlopeWidth;
    const rightSlopeEnd = this.greenEndX + this.greenSlopeWidth;
    
    if (x >= leftSlopeStart && x <= rightSlopeEnd) {
      let elevationMultiplier = 0;
      
      if (x >= leftSlopeStart && x < this.greenStartX) {
        // Left slope - gradual rise to green
        const progress = (x - leftSlopeStart) / this.greenSlopeWidth;
        elevationMultiplier = this.smoothStep(progress);
      } else if (x >= this.greenStartX && x <= this.greenEndX) {
        // On the green - create a flat surface with minimal variation
        // Add very slight undulation to prevent completely flat (boring) putting
        const greenProgress = (x - this.greenStartX) / this.greenWidth;
        const subtleUndulation = Math.sin(greenProgress * Math.PI * 2) * 0.05; // Very subtle wave
        elevationMultiplier = 1.0 + subtleUndulation;
      } else if (x > this.greenEndX && x <= rightSlopeEnd) {
        // Right slope - gradual descent from green
        const progress = 1 - ((x - this.greenEndX) / this.greenSlopeWidth);
        elevationMultiplier = this.smoothStep(progress);
      }
      
      return baseHeight - (this.greenHeight * elevationMultiplier);
    }
    
    return baseHeight;
  }

  // Smooth step function for natural elevation transitions
  smoothStep(t) {
    return t * t * (3 - 2 * t);
  }

  // Check if x coordinate is in the green area (not including slopes)
  isInGreenArea(x) {
    return x >= this.greenStartX && x <= this.greenEndX;
  }

  // Check if x coordinate is in the green or slope area
  isInGreenComplex(x) {
    const leftSlopeStart = this.greenStartX - this.greenSlopeWidth;
    const rightSlopeEnd = this.greenEndX + this.greenSlopeWidth;
    return x >= leftSlopeStart && x <= rightSlopeEnd;
  }

  createTerrainGraphics() {
    this.terrainGraphics = this.scene.add.graphics();
    
    // Start the path
    this.terrainGraphics.beginPath();
    
    // Move to bottom left
    this.terrainGraphics.moveTo(0, 768);
    
    // Draw terrain line from left to right
    this.heightMap.forEach((point, index) => {
      if (index === 0) {
        this.terrainGraphics.lineTo(point.x, point.y);
      } else {
        // Use straight lines between points (Phaser doesn't have quadraticCurveTo)
        this.terrainGraphics.lineTo(point.x, point.y);
      }
    });
    
    // Close the path at bottom right
    this.terrainGraphics.lineTo(this.width, 768);
    this.terrainGraphics.lineTo(0, 768);
    this.terrainGraphics.closePath();
    
    // Fill with base grass color
    this.terrainGraphics.fillStyle(0x4CAF50); // Green grass color
    this.terrainGraphics.fillPath();
    
    // Add green area overlay
    this.addGreenOverlay();
    
    // Add outline
    this.terrainGraphics.lineStyle(2, 0x388E3C); // Darker green outline
    this.terrainGraphics.strokePath();
    
    // Add texture details
    this.addTerrainDetails();
  }

  addGreenOverlay() {
    // Create a separate path for the green area
    const greenGraphics = this.scene.add.graphics();
    greenGraphics.fillStyle(0x2E7D32); // Darker green for the putting green
    
    // Find green area points
    const greenPoints = this.heightMap.filter(point => 
      this.isInGreenComplex(point.x)
    );
    
    if (greenPoints.length > 0) {
      greenGraphics.beginPath();
      
      // Start from bottom of green area
      greenGraphics.moveTo(greenPoints[0].x, 768);
      
      // Draw green surface
      greenPoints.forEach((point, index) => {
        if (index === 0) {
          greenGraphics.lineTo(point.x, point.y);
        } else {
          // Use straight lines between points
          greenGraphics.lineTo(point.x, point.y);
        }
      });
      
      // Close the green area
      const lastPoint = greenPoints[greenPoints.length - 1];
      greenGraphics.lineTo(lastPoint.x, 768);
      greenGraphics.lineTo(greenPoints[0].x, 768);
      greenGraphics.closePath();
      greenGraphics.fillPath();
      
      // Add green texture
      this.addGreenTexture(greenGraphics, greenPoints);
    }
  }

  addGreenTexture(graphics, greenPoints) {
    // Add putting green texture lines
    graphics.lineStyle(1, 0x1B5E20, 0.4); // Even darker green for texture
    
    const startX = greenPoints[0].x;
    const endX = greenPoints[greenPoints.length - 1].x;
    
    // Add horizontal mowing lines
    for (let x = startX; x < endX; x += 30) {
      const height1 = this.getHeightAtX(x);
      const height2 = this.getHeightAtX(x + 25);
      graphics.lineBetween(x, height1, x + 25, height2);
    }
    
    // Add some circular patterns typical of putting greens
    const centerX = (startX + endX) / 2;
    const centerY = this.getHeightAtX(centerX);
    
    for (let radius = 20; radius <= 80; radius += 20) {
      graphics.lineStyle(1, 0x1B5E20, 0.2);
      graphics.strokeCircle(centerX, centerY, radius);
    }
  }

  addTerrainDetails() {
    // Add some grass texture lines for regular terrain
    this.terrainGraphics.lineStyle(1, 0x66BB6A, 0.3);
    
    for (let i = 0; i < this.segments; i += 5) {
      const point = this.heightMap[i];
      if (point && !this.isInGreenComplex(point.x)) {
        // Draw small grass lines only on regular terrain
        for (let j = 0; j < 3; j++) {
          const grassX = point.x + (Math.random() - 0.5) * 40;
          const grassY = point.y;
          const grassHeight = Math.random() * 8 + 2;
          
          this.terrainGraphics.lineBetween(
            grassX, grassY,
            grassX + (Math.random() - 0.5) * 2, grassY - grassHeight
          );
        }
      }
    }
  }

  // Get terrain height at a specific x coordinate
  getHeightAtX(x) {
    // Clamp x to terrain bounds
    x = Math.max(0, Math.min(x, this.width));
    
    // Find the closest terrain points
    const segmentWidth = this.width / this.segments;
    const index = Math.floor(x / segmentWidth);
    
    // Handle edge cases
    if (index >= this.heightMap.length - 1) {
      return this.heightMap[this.heightMap.length - 1].y;
    }
    if (index < 0) {
      return this.heightMap[0].y;
    }
    
    // Interpolate between two points for smooth height
    const point1 = this.heightMap[index];
    const point2 = this.heightMap[index + 1];
    
    const localX = x - point1.x;
    const segmentLength = point2.x - point1.x;
    const ratio = segmentLength > 0 ? localX / segmentLength : 0;
    
    return point1.y + (point2.y - point1.y) * ratio;
  }

  // Get terrain slope at a specific x coordinate (for ball physics)
  getSlopeAtX(x) {
    const segmentWidth = this.width / this.segments;
    const index = Math.floor(x / segmentWidth);
    
    // Handle edge cases
    if (index >= this.heightMap.length - 1 || index < 0) {
      return 0;
    }
    
    const point1 = this.heightMap[index];
    const point2 = this.heightMap[index + 1];
    
    // Calculate slope as rise over run
    const rise = point2.y - point1.y;
    const run = point2.x - point1.x;
    
    return run !== 0 ? rise / run : 0;
  }

  // Get terrain normal vector at x (for physics calculations)
  getNormalAtX(x) {
    const slope = this.getSlopeAtX(x);
    
    // Convert slope to normal vector
    const length = Math.sqrt(1 + slope * slope);
    return {
      x: -slope / length,
      y: -1 / length
    };
  }

  // Check if a point is below the terrain (for collision detection)
  isPointBelowTerrain(x, y) {
    const terrainHeight = this.getHeightAtX(x);
    return y > terrainHeight;
  }

  // Get the distance from a point to the terrain surface
  getDistanceToTerrain(x, y) {
    const terrainHeight = this.getHeightAtX(x);
    return y - terrainHeight;
  }

  // Check if ball is on the green (for special physics/scoring)
  isBallOnGreen(x) {
    return this.isInGreenArea(x);
  }

  // Get green boundaries for UI/scoring purposes
  getGreenBounds() {
    return {
      startX: this.greenStartX,
      endX: this.greenEndX,
      centerX: (this.greenStartX + this.greenEndX) / 2,
      width: this.greenWidth
    };
  }

  // Update terrain graphics if needed (for dynamic terrain)
  update() {
    // Currently static terrain, but could be extended for dynamic changes
  }

  // Destroy terrain graphics
  destroy() {
    if (this.terrainGraphics) {
      this.terrainGraphics.destroy();
    }
  }
}