// Water hazard and bunker are now integrated directly into terrain

/**
 * Hole2Terrain - Custom terrain for Hole 2: 250 yards total, hole at 175 yards
 * Example of using integrated water hazard and bunker systems
 */
export class Hole2Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 5000; // Reduced width for 250-yard hole (250 * 20 = 5000 pixels)
    this.baseHeight = 600; // Base ground level
    this.heightMap = [];
    this.terrainGraphics = null;
    this.segments = 250; // Reduced segments for shorter course
    
    // Green properties - positioned at 175 yards from start
    this.greenWidth = 400; // Smaller green for shorter hole
    this.greenStartX = 3400; // 175 yards * 20 pixels/yard = 3500, minus half green width = 3300
    this.greenEndX = this.greenStartX + this.greenWidth;
    this.greenHeight = 20; // Elevation above surrounding terrain
    this.greenSlopeWidth = 200; // Gentler slopes
    
    // Pin/hole position (center of green at 175 yards)
    this.pinX = 3500; // Exactly 175 yards from start (175 * 20 = 3500)
    this.pinY = this.baseHeight - this.greenHeight; // Green is above base height
    
    // Water hazard is now integrated into terrain
    
    // Generate the terrain height map
    this.generateTerrain();
    
    // Smooth the terrain for more natural curves
    this.smoothTerrain();
    
    // Create visual representation first
    this.createTerrainGraphics();
    
    // Water hazard is now integrated into terrain via addWaterOverlay()
    
    // Add bunker as integrated terrain area
    this.addBunkerOverlay();
  }

  addWaterHazardAfterTerrain() {
    // Add 50-yard wide water hazard in front of green AFTER terrain is rendered
    const waterWidth = 1000; // 50 yards (reduced from 100 yards)
    const waterStartX = this.greenStartX - waterWidth - 100; // 50 yards before green, with 100px buffer
    const waterEndX = waterStartX + waterWidth;
    
    // Calculate water level based on terrain at that position
    const terrainHeightAtWater = this.getTerrainHeightAtX(waterStartX + (waterWidth / 2)); // Middle of water hazard
    
    console.log('Hole 2 Water Hazard Configuration:');
    console.log(`Green starts at: ${this.greenStartX} pixels (${this.greenStartX/20} yards)`);
    console.log(`Water starts at: ${waterStartX} pixels (${waterStartX/20} yards)`);
    console.log(`Water ends at: ${waterEndX} pixels (${waterEndX/20} yards)`);
    console.log(`Water width: ${waterWidth} pixels (${waterWidth/20} yards)`);
    console.log(`Water level: ${terrainHeightAtWater} pixels (flush with terrain)`);
    
    this.addWaterHazard({
      startX: waterStartX,
      width: waterWidth, // 50 yards (reduced from 100 yards)
      level: terrainHeightAtWater // Flush with terrain surface
    });
  }

  generateTerrain() {
    // Create a height map with flat elevated tee and dramatic downhill slope
    const segmentWidth = this.width / this.segments;
    
    // Terrain elevation parameters
    const teeElevation = 300; // Very high flat tee area (300 pixels above base)
    const teeFlatLength = 1000; // Flat tee area extends 50 yards (1000 pixels)
    const greenElevation = 20; // Green area (20 pixels above base - above water level)
    
    for (let i = 0; i <= this.segments; i++) {
      const x = i * segmentWidth;
      let height;
      
      if (x <= teeFlatLength) {
        // Flat elevated tee area - completely flat
        height = this.baseHeight - teeElevation;
      } else {
        // Dramatic downhill slope from end of flat tee to green
        const slopeStartX = teeFlatLength;
        const slopeLength = this.width - slopeStartX;
        const elevationDrop = teeElevation - greenElevation;
        const slopeProgress = (x - slopeStartX) / slopeLength;
        
        // Use a more dramatic curve for the downhill slope
        const dramaticCurve = Math.pow(slopeProgress, 0.7); // Steeper initial drop
        height = this.baseHeight - teeElevation + (elevationDrop * dramaticCurve);
        
        // Add minimal undulations only in the slope area
        const wave1 = Math.sin(x * 0.001) * 8;  // Very small waves
        height += wave1;
      }
      
      // Apply green elevation (green will be lower than surrounding terrain)
      height = this.applyGreenElevation(x, height);
      
      this.heightMap.push({
        x: x,
        y: Math.max(height, 200), // Allow for very high elevation
        isGreen: this.isInGreenArea(x)
      });
    }
  }

  smoothTerrain() {
    // Apply smoothing passes for smooth terrain
    const smoothingPasses = 4;
    
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
        
        // Smooth terrain
        this.heightMap[i].y = (prevY * 0.3 + currentY * 0.4 + nextY * 0.3);
      }
    }
  }

  applyGreenElevation(x, baseHeight) {
    // Check if we're in the green area or its slopes
    const leftSlopeStart = this.greenStartX - this.greenSlopeWidth;
    const rightSlopeEnd = this.greenEndX + this.greenSlopeWidth;
    
    if (x >= leftSlopeStart && x <= rightSlopeEnd) {
      let elevationMultiplier = 0;
      
      if (x >= leftSlopeStart && x < this.greenStartX) {
        // Left slope - gradual ascent to green (green is elevated)
        const progress = (x - leftSlopeStart) / this.greenSlopeWidth;
        elevationMultiplier = this.smoothStep(progress);
      } else if (x >= this.greenStartX && x <= this.greenEndX) {
        // On the green - completely flat surface (elevated above surrounding terrain)
        elevationMultiplier = 1.0;
      } else if (x > this.greenEndX && x <= rightSlopeEnd) {
        // Right slope - gradual descent from green
        const progress = 1 - ((x - this.greenEndX) / this.greenSlopeWidth);
        elevationMultiplier = this.smoothStep(progress);
      }
      
      // Green is above surrounding terrain (subtract from height)
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

  // Get pin position
  getPinPosition() {
    return {
      x: this.pinX,
      y: this.pinY
    };
  }

  // Check if ball is in water hazard (using mixin method)
  // Water collision detection is now integrated into this class

  // Check if ball is in the target circle area
  isBallInTargetCircle(ballX, ballY) {
    const centerX = this.pinX;
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

  // Get the center position of the target circle
  getTargetCircleCenter() {
    const centerX = this.pinX;
    const centerY = this.getHeightAtX(centerX);
    return { x: centerX, y: centerY };
  }

  createTerrainGraphics() {
    this.terrainGraphics = this.scene.add.graphics();
    this.terrainGraphics.setDepth(1); // Ensure terrain appears below water
    
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
    
    // Close the path at bottom right
    this.terrainGraphics.lineTo(this.width, 768);
    this.terrainGraphics.lineTo(0, 768);
    this.terrainGraphics.closePath();
    
    // Fill with base grass color
    this.terrainGraphics.fillStyle(0x4CAF50); // Green grass color
    this.terrainGraphics.fillPath();
    
    // Add green area overlay
    this.addGreenOverlay();
    
    // Add water area overlay (integrated into terrain)
    this.addWaterOverlay();
    
    // Add outline
    this.terrainGraphics.lineStyle(2, 0x388E3C); // Darker green outline
    this.terrainGraphics.strokePath();
    
    // Add texture details
    this.addTerrainDetails();
    
    // Water hazards are now integrated into terrain via addWaterOverlay()
  }

  addGreenOverlay() {
    // Create a separate path for the green area
    const greenGraphics = this.scene.add.graphics();
    greenGraphics.setDepth(2); // Green appears above terrain but below water
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
    for (let x = startX; x < endX; x += 20) {
      const height1 = this.getHeightAtX(x);
      const height2 = this.getHeightAtX(x + 15);
      graphics.lineBetween(x, height1, x + 15, height2);
    }
    
    // Add circular patterns for putting green
    const centerX = this.pinX;
    const centerY = this.getHeightAtX(centerX);
    
    for (let radius = 15; radius <= 60; radius += 15) {
      graphics.lineStyle(1, 0x1B5E20, 0.2);
      graphics.strokeCircle(centerX, centerY, radius);
    }
  }

  addWaterOverlay() {
    // Add water hazard as integrated terrain area (blue colored)
    const waterWidth = 1000; // 50 yards wide
    const waterStartX = this.greenStartX - waterWidth - 100; // 50 yards before green
    const waterEndX = waterStartX + waterWidth;
    
    // Create water area graphics
    const waterGraphics = this.scene.add.graphics();
    waterGraphics.setDepth(2); // Same depth as green overlay
    waterGraphics.fillStyle(0x1976D2); // Blue water color
    
    // Find water area points from height map
    const waterPoints = this.heightMap.filter(point => 
      point.x >= waterStartX && point.x <= waterEndX
    );
    
    if (waterPoints.length > 0) {
      waterGraphics.beginPath();
      
      // Start from bottom of water area
      waterGraphics.moveTo(waterPoints[0].x, 768);
      
      // Draw water surface following terrain
      waterPoints.forEach((point, index) => {
        if (index === 0) {
          waterGraphics.lineTo(point.x, point.y);
        } else {
          waterGraphics.lineTo(point.x, point.y);
        }
      });
      
      // Close the water area
      const lastPoint = waterPoints[waterPoints.length - 1];
      waterGraphics.lineTo(lastPoint.x, 768);
      waterGraphics.lineTo(waterPoints[0].x, 768);
      waterGraphics.closePath();
      waterGraphics.fillPath();
      
      // Add water texture/ripples
      this.addWaterTexture(waterGraphics, waterPoints);
    }
    
    // Store water area properties for collision detection
    this.waterStartX = waterStartX;
    this.waterEndX = waterEndX;
    this.waterLevel = waterPoints.length > 0 ? waterPoints[Math.floor(waterPoints.length / 2)].y : 600;
  }

  addBunkerOverlay() {
    // Add bunker as integrated terrain area (brown/sand colored)
    const bunkerWidth = 600; // 30 yards wide
    const bunkerStartX = this.greenEndX + 50; // 50 pixels after green ends
    const bunkerEndX = bunkerStartX + bunkerWidth;
    
    // Create bunker area graphics
    const bunkerGraphics = this.scene.add.graphics();
    bunkerGraphics.setDepth(2); // Same depth as green and water overlays
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

  addWaterTexture(graphics, waterPoints) {
    // Add subtle water ripples
    graphics.lineStyle(1, 0x0D47A1, 0.3); // Darker blue for ripples
    
    const startX = waterPoints[0].x;
    const endX = waterPoints[waterPoints.length - 1].x;
    
    // Add horizontal ripple lines
    for (let x = startX; x < endX; x += 40) {
      const height1 = this.getHeightAtX(x);
      const height2 = this.getHeightAtX(x + 30);
      
      graphics.moveTo(x, height1);
      graphics.lineTo(x + 30, height2);
    }
    
    graphics.strokePath();
  }

  addBunkerTexture(graphics, bunkerPoints) {
    // Add sand texture and details
    graphics.lineStyle(1, 0xBC9A6A, 0.4); // Darker sand color for texture
    
    const startX = bunkerPoints[0].x;
    const endX = bunkerPoints[bunkerPoints.length - 1].x;
    
    // Add sand grain texture
    for (let x = startX; x < endX; x += 20) {
      const height1 = this.getHeightAtX(x);
      const height2 = this.getHeightAtX(x + 15);
      
      graphics.moveTo(x, height1);
      graphics.lineTo(x + 15, height2);
    }
    
    // Add sand ripple lines
    graphics.lineStyle(1, 0xE6D3A3, 0.3); // Lighter sand color for ripples
    for (let x = startX; x < endX; x += 30) {
      const height = this.getHeightAtX(x);
      const rippleOffset = Math.sin(x * 0.01) * 2;
      graphics.lineBetween(x + rippleOffset, height + 5, x + 20 + rippleOffset, height + 6);
    }
    
    graphics.strokePath();
  }

  // Check if ball is in water hazard (integrated into terrain)
  isBallInWater(ballX, ballY) {
    if (!this.waterStartX || !this.waterEndX) return false;
    
    return ballX >= this.waterStartX && 
           ballX <= this.waterEndX && 
           ballY >= this.waterLevel - 20; // Trigger collision slightly above water surface
  }

  // Check if ball is in bunker (integrated into terrain)
  isBallInBunker(ballX, ballY) {
    if (!this.bunkerStartX || !this.bunkerEndX) return false;
    
    return ballX >= this.bunkerStartX && 
           ballX <= this.bunkerEndX && 
           ballY >= this.bunkerLevel - 20; // Trigger collision slightly above bunker surface
  }

  // Find water drop position for integrated water hazard
  findWaterDropPosition(ballX, ballY, approachDirection = 'right') {
    if (!this.waterStartX || !this.waterEndX) {
      // No water hazard - fallback position
      return { x: 200, y: this.getTerrainHeightAtX ? this.getTerrainHeightAtX(200) - 15 : 600 };
    }

    // Drop ball 12.5 yards away from water hazard
    const dropDistance = 250; // 12.5 yards in pixels (12.5 * 20)
    let dropX;

    // Determine which side of water to drop on based on approach direction
    if (approachDirection === 'right') {
      // Ball was moving left to right - drop on the LEFT side of water
      dropX = this.waterStartX - dropDistance;
    } else {
      // Ball was moving right to left - drop on the RIGHT side of water
      dropX = this.waterEndX + dropDistance;
    }

    // Ensure drop position is reasonable
    dropX = Math.max(200, dropX); // Don't go behind tee
    if (this.greenStartX) {
      dropX = Math.min(this.greenStartX - 100, dropX); // Don't go past green
    }

    const dropY = this.getTerrainHeightAtX ? this.getTerrainHeightAtX(dropX) - 15 : 600;
    
    console.log('Integrated water drop position calculated:', {
      ballX, ballY, 
      approachDirection,
      waterStart: this.waterStartX, waterEnd: this.waterEndX,
      dropX, dropY,
      dropDistance: '12.5 yards',
      dropSide: approachDirection === 'right' ? 'left_of_water' : 'right_of_water'
    });

    return { x: dropX, y: dropY };
  }

  addTerrainDetails() {
    // Add grass texture lines for regular terrain
    this.terrainGraphics.lineStyle(1, 0x66BB6A, 0.3);
    
    for (let i = 0; i < this.segments; i += 3) {
      const point = this.heightMap[i];
      if (point && !this.isInGreenComplex(point.x)) {
        // Draw small grass lines only on regular terrain
        for (let j = 0; j < 2; j++) {
          const grassX = point.x + (Math.random() - 0.5) * 30;
          const grassY = point.y;
          const grassHeight = Math.random() * 6 + 2;
          
          this.terrainGraphics.lineBetween(
            grassX, grassY,
            grassX + (Math.random() - 0.5) * 2, grassY - grassHeight
          );
        }
      }
    }
  }

  // Get terrain height at a specific x coordinate (including water effects)
  getHeightAtX(x) {
    // Clamp x to terrain bounds
    x = Math.max(0, Math.min(x, this.width));
    
    // Check if position is in water hazard - return much lower height so ball falls in
    if (this.waterStartX && this.waterEndX && x >= this.waterStartX && x <= this.waterEndX) {
      return this.waterLevel + 100; // Return height well below water surface so ball sinks
    }
    
    return this.getTerrainHeightAtX(x);
  }

  // Get actual terrain height without water interference
  getTerrainHeightAtX(x) {
    // Clamp x to terrain bounds
    x = Math.max(0, Math.min(x, this.width));
    
    // Find the closest terrain points
    const segmentWidth = this.width / this.segments;
    const index = Math.floor(x / segmentWidth);
    
    // Handle edge cases with better bounds checking
    if (index >= this.heightMap.length - 1) {
      return this.heightMap[this.heightMap.length - 1]?.y || this.baseHeight;
    }
    if (index < 0) {
      return this.heightMap[0]?.y || this.baseHeight;
    }
    
    // Get points with null checks
    const point1 = this.heightMap[index];
    const point2 = this.heightMap[index + 1];
    
    // Safety check for undefined points
    if (!point1 || !point2) {
      console.warn('Terrain point undefined at index:', index, 'x:', x);
      return this.baseHeight;
    }
    
    // Interpolate between two points for smooth height
    const localX = x - point1.x;
    const segmentLength = point2.x - point1.x;
    const ratio = segmentLength > 0 ? localX / segmentLength : 0;
    
    return point1.y + (point2.y - point1.y) * ratio;
  }

  // Get terrain slope at a specific x coordinate
  getSlopeAtX(x) {
    // Green area always has zero slope for stability
    if (this.isInGreenArea(x)) {
      return 0;
    }
    
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

  // Get terrain normal vector at x
  getNormalAtX(x) {
    const slope = this.getSlopeAtX(x);
    
    // Convert slope to normal vector
    const length = Math.sqrt(1 + slope * slope);
    return {
      x: -slope / length,
      y: -1 / length
    };
  }

  // Check if a point is below the terrain
  isPointBelowTerrain(x, y) {
    const terrainHeight = this.getHeightAtX(x);
    return y > terrainHeight;
  }

  // Get the distance from a point to the terrain surface
  getDistanceToTerrain(x, y) {
    const terrainHeight = this.getHeightAtX(x);
    return y - terrainHeight;
  }

  // Check if ball is on the green
  isBallOnGreen(x) {
    return this.isInGreenArea(x);
  }

  // Get green boundaries
  getGreenBounds() {
    return {
      startX: this.greenStartX,
      endX: this.greenEndX,
      centerX: this.pinX,
      width: this.greenWidth
    };
  }

  // Water hazard creation is now handled by the WaterHazard system

  // Update terrain graphics if needed
  update() {
    // Currently static terrain
  }

  // Destroy terrain graphics
  destroy() {
    if (this.terrainGraphics) {
      this.terrainGraphics.destroy();
    }
    // Water hazards are now integrated into terrain graphics
  }
}

// Water hazard and bunker functionality are now integrated directly into this class
