/**
 * Hole3Terrain - Simple terrain for Hole 3: Basic terrain with green near the end
 */
export class Hole3Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 6000; // 300 yards total (300 * 20 = 6000 pixels)
    this.baseHeight = 600; // Base ground level
    this.heightMap = [];
    this.terrainGraphics = null;
    this.segments = 300; // Segments for 300-yard hole
    
    // Green properties - positioned near the end
    this.greenWidth = 400; // Standard green size
    this.greenStartX = 5000; // 250 yards from start (250 * 20 = 5000)
    this.greenEndX = this.greenStartX + this.greenWidth;
    this.greenHeight = 20; // Slight elevation above surrounding terrain
    this.greenSlopeWidth = 200; // Gentle slopes
    
    // Pin/hole position (center of green)
    this.pinX = this.greenStartX + (this.greenWidth / 2);
    this.pinY = this.baseHeight - this.greenHeight;
    
    // Generate the terrain height map
    this.generateTerrain();
    
    // Smooth the terrain for more natural curves
    this.smoothTerrain();
    
    // Create visual representation
    this.createTerrainGraphics();
    
    // Add green overlay
    this.addGreenOverlay();
  }

  generateTerrain() {
    // Create a height map using gentle sine waves for smooth rolling hills
    const segmentWidth = this.width / this.segments;
    
    for (let i = 0; i <= this.segments; i++) {
      const x = i * segmentWidth;
      
      // Base terrain with gentle rolling hills
      const wave1 = Math.sin(x * 0.0006) * 40;  // Large smooth rolling hills
      const wave2 = Math.sin(x * 0.0012) * 20;  // Medium smooth hills
      
      // Calculate base height
      let height = this.baseHeight - (wave1 + wave2);
      
      // Add green elevation
      height = this.applyGreenElevation(x, height);
      
      this.heightMap.push({
        x: x,
        y: Math.max(height, 200), // Allow terrain to go higher
        isGreen: this.isInGreenArea(x)
      });
    }
  }

  smoothTerrain() {
    // Apply smoothing passes for smooth terrain
    const smoothingPasses = 3;
    
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
        
        this.heightMap[i].y = (prevY * 0.3 + currentY * 0.4 + nextY * 0.3);
      }
    }
  }

  applyGreenElevation(x, baseHeight) {
    // Create elevated green with smooth slopes
    if (this.isInGreenComplex(x)) {
      if (this.isInGreenArea(x)) {
        // Flat green surface
        return this.baseHeight - this.greenHeight;
      } else if (this.isInGreenSlope(x)) {
        // Smooth slope up to green
        const slopeProgress = this.getGreenSlopeProgress(x);
        return this.baseHeight - (this.greenHeight * slopeProgress);
      }
    }
    return baseHeight;
  }

  isInGreenArea(x) {
    return x >= this.greenStartX && x <= this.greenEndX;
  }

  isInGreenSlope(x) {
    const slopeStart = this.greenStartX - this.greenSlopeWidth;
    const slopeEnd = this.greenEndX + this.greenSlopeWidth;
    return x >= slopeStart && x <= slopeEnd && !this.isInGreenArea(x);
  }

  isInGreenComplex(x) {
    return this.isInGreenArea(x) || this.isInGreenSlope(x);
  }

  getGreenSlopeProgress(x) {
    if (x < this.greenStartX) {
      // Approaching green from left
      const slopeStart = this.greenStartX - this.greenSlopeWidth;
      return Math.max(0, (x - slopeStart) / this.greenSlopeWidth);
    } else {
      // Leaving green to right
      const slopeEnd = this.greenEndX + this.greenSlopeWidth;
      return Math.max(0, (slopeEnd - x) / this.greenSlopeWidth);
    }
  }

  createTerrainGraphics() {
    // Create terrain graphics
    this.terrainGraphics = this.scene.add.graphics();
    this.terrainGraphics.setDepth(1); // Ensure terrain appears below green
    
    // Start the path
    this.terrainGraphics.beginPath();
    
    // Move to bottom left
    this.terrainGraphics.moveTo(0, 768);
    
    // Draw terrain line from left to right
    this.heightMap.forEach((point, index) => {
      if (index === 0) {
        this.terrainGraphics.lineTo(point.x, point.y);
      } else {
        this.terrainGraphics.lineTo(point.x, point.y);
      }
    });
    
    // Close the path
    this.terrainGraphics.lineTo(this.width, 768);
    this.terrainGraphics.lineTo(0, 768);
    this.terrainGraphics.closePath();
    
    // Fill with base grass color
    this.terrainGraphics.fillStyle(0x4CAF50); // Green grass color
    this.terrainGraphics.fillPath();
    
    // Add outline
    this.terrainGraphics.lineStyle(2, 0x388E3C); // Darker green outline
    this.terrainGraphics.strokePath();
  }

  addGreenOverlay() {
    // Create a separate path for the green area
    const greenGraphics = this.scene.add.graphics();
    greenGraphics.setDepth(2); // Green appears above terrain
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

  getHeightAtX(x) {
    // Find the closest height map points
    const segmentWidth = this.width / this.segments;
    const segmentIndex = Math.floor(x / segmentWidth);
    
    if (segmentIndex < 0) {
      return this.heightMap[0].y;
    }
    if (segmentIndex >= this.heightMap.length - 1) {
      return this.heightMap[this.heightMap.length - 1].y;
    }
    
    // Interpolate between the two closest points
    const point1 = this.heightMap[segmentIndex];
    const point2 = this.heightMap[segmentIndex + 1];
    
    const t = (x - point1.x) / (point2.x - point1.x);
    return point1.y + (point2.y - point1.y) * t;
  }

  getSlopeAtX(x) {
    const sampleDistance = 50;
    const height1 = this.getHeightAtX(x - sampleDistance);
    const height2 = this.getHeightAtX(x + sampleDistance);
    return (height2 - height1) / (sampleDistance * 2);
  }

  isBallInWater(ballX, ballY) {
    // No water hazards on this basic hole
    return false;
  }

  isBallInBunker(ballX, ballY) {
    // No bunkers on this basic hole
    return false;
  }

  isBallInTargetCircle(ballX, ballY) {
    // Calculate center of the green
    const centerX = this.greenStartX + (this.greenWidth / 2);
    const centerY = this.getHeightAtX(centerX);
    
    const distanceToCenter = Math.sqrt(
      Math.pow(ballX - centerX, 2) + 
      Math.pow(ballY - centerY, 2)
    );
    
    // Debug: Log when ball is close to target
    if (distanceToCenter <= 50) {
      console.log(`Ball distance to hole: ${Math.round(distanceToCenter)} pixels (need <= 30)`);
    }
    
    // Target area is 30 pixel radius
    return distanceToCenter <= 30;
  }

  isBallOnGreen(ballX, ballY) {
    return ballX >= this.greenStartX && ballX <= this.greenEndX;
  }

  getPinPosition() {
    return { x: this.pinX, y: this.pinY };
  }

  getDistanceToPin(ballX, ballY) {
    const distance = Math.sqrt(
      Math.pow(ballX - this.pinX, 2) + Math.pow(ballY - this.pinY, 2)
    );
    return Math.round(distance / 20); // Convert pixels to yards (20 pixels = 1 yard)
  }
}
