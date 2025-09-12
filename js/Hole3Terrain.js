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
    
    // Add bunker near the green
    this.addBunkerOverlay();
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

  addBunkerOverlay() {
    // Add bunker as integrated terrain area (brown/sand colored)
    const bunkerWidth = 400; // 20 yards wide
    const bunkerStartX = this.greenStartX - 300; // 150 pixels before green starts
    const bunkerEndX = bunkerStartX + bunkerWidth;
    
    // Create bunker area graphics
    const bunkerGraphics = this.scene.add.graphics();
    bunkerGraphics.setDepth(2); // Same depth as green overlay
    bunkerGraphics.fillStyle(0xD2B48C); // Tan/sand color
    
    // Find bunker area points from height map
    const bunkerPoints = this.heightMap.filter(point => 
      point.x >= bunkerStartX && point.x <= bunkerEndX
    );
    
    if (bunkerPoints.length > 0) {
      bunkerGraphics.beginPath();
      
      // Start from bottom of bunker area
      bunkerGraphics.moveTo(bunkerPoints[0].x, 768);
      
      // Draw bunker surface following terrain
      bunkerPoints.forEach((point, index) => {
        if (index === 0) {
          bunkerGraphics.lineTo(point.x, point.y);
        } else {
          bunkerGraphics.lineTo(point.x, point.y);
        }
      });
      
      // Close the bunker area
      const lastPoint = bunkerPoints[bunkerPoints.length - 1];
      bunkerGraphics.lineTo(lastPoint.x, 768);
      bunkerGraphics.lineTo(bunkerPoints[0].x, 768);
      bunkerGraphics.closePath();
      bunkerGraphics.fillPath();
      
      // Add bunker texture/sand details
      this.addBunkerTexture(bunkerGraphics, bunkerPoints);
    }
    
    // Store bunker area properties for collision detection
    this.bunkerStartX = bunkerStartX;
    this.bunkerEndX = bunkerEndX;
    this.bunkerLevel = bunkerPoints.length > 0 ? bunkerPoints[Math.floor(bunkerPoints.length / 2)].y : 600;
  }

  addBunkerTexture(graphics, bunkerPoints) {
    // Add subtle sand texture
    graphics.lineStyle(1, 0xBC9A6A, 0.3); // Darker sand color for texture
    
    // Draw random sand grain lines
    const lineSpacing = 12;
    const startY = Math.min(...bunkerPoints.map(p => p.y));
    const endY = Math.max(...bunkerPoints.map(p => p.y));
    
    for (let y = startY; y <= endY; y += lineSpacing) {
      // Find intersection points with bunker boundaries
      const intersections = [];
      for (let i = 0; i < bunkerPoints.length; i++) {
        const p1 = bunkerPoints[i];
        const p2 = bunkerPoints[(i + 1) % bunkerPoints.length];
        
        if ((p1.y <= y && p2.y >= y) || (p1.y >= y && p2.y <= y)) {
          const t = (y - p1.y) / (p2.y - p1.y);
          const x = p1.x + t * (p2.x - p1.x);
          intersections.push(x);
        }
      }
      
      if (intersections.length >= 2) {
        intersections.sort((a, b) => a - b);
        // Add some randomness to sand texture
        const randomOffset = (Math.random() - 0.5) * 4;
        graphics.moveTo(intersections[0] + randomOffset, y);
        graphics.lineTo(intersections[intersections.length - 1] + randomOffset, y);
      }
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
    // Check if ball is in the bunker near the green
    if (this.bunkerStartX && this.bunkerEndX) {
      return ballX >= this.bunkerStartX && 
             ballX <= this.bunkerEndX && 
             ballY >= this.bunkerLevel - 20; // Trigger collision slightly above bunker surface
    }
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
