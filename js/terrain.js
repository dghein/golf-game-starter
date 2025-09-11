/**
 * Terrain system for generating and managing hilly golf course terrain with green
 */
export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 15000; // Extended width to accommodate expanded water and additional fairway
    this.baseHeight = 600; // Base ground level
    this.heightMap = [];
    this.terrainGraphics = null;
    this.segments = 750; // Increased segments for smoother curves with extended width
    
    // Green properties
    this.greenWidth = 1024; // Approximately screen width
    this.greenStartX = 11800; // Position at reasonable distance (keep original 660-yard hole distance)
    this.greenEndX = this.greenStartX + this.greenWidth;
    this.greenHeight = 460; // Extremely elevated green - 60% of screen height (768 * 0.6 = 460)
    this.greenSlopeWidth = 500; // Wider slopes for dramatic elevation change
    
    // Pin/hole position (center of green)
    this.pinX = this.greenStartX + (this.greenWidth / 2);
    this.pinY = this.baseHeight - this.greenHeight;
    
    // Water hazard properties (behind the green at bottom of slope)
    // Water will be integrated into terrain graphics
    this.waterStartX = this.greenEndX + 200; // Start further back to reach bottom of slope
    this.waterWidth = 600; // Wider water hazard for dramatic effect
    this.waterEndX = this.waterStartX + this.waterWidth;
    
    // Generate the terrain height map
    this.generateTerrain();
    
    // Smooth the terrain for more natural curves
    this.smoothTerrain();
    
    // Create visual representation
    this.createTerrainGraphics();
    
    // Add water hazard as integrated terrain area
    this.addWaterOverlay();
    
    // Add bunker at 275 yards from start (275 * 20 = 5500 pixels)
    this.addBunkerOverlay();
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
        y: Math.max(height, 200), // Allow terrain to go much higher for elevated green (min y = 200)
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
        // On the green - completely flat surface for no ball vibration
        elevationMultiplier = 1.0; // Perfectly flat, no undulation
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

  // Get pin position
  getPinPosition() {
    return {
      x: this.pinX,
      y: this.pinY
    };
  }

  // Check if ball is in water hazard
  isBallInWater(ballX, ballY) {
    if (!this.waterStartX || !this.waterEndX) return false;
    
    // Check if ball is in water area horizontally
    const inWaterArea = ballX >= this.waterStartX && ballX <= this.waterEndX;
    
    if (!inWaterArea) return false;
    
    // For elevated green scenario, check if ball is at or below water level
    // Use a more generous collision zone since water is at bottom of slope
    return ballY >= this.waterLevel - 30; // More generous collision zone
  }

  // Check if ball is in bunker
  isBallInBunker(ballX, ballY) {
    if (!this.bunkerStartX || !this.bunkerEndX) return false;
    
    return ballX >= this.bunkerStartX && 
           ballX <= this.bunkerEndX && 
           ballY >= this.bunkerLevel - 20; // Trigger collision slightly above bunker surface
  }

  // Check if ball is in the target circle area (smallest circle)
  isBallInTargetCircle(ballX, ballY) {
    // Calculate center of the concentric circles (same as addGreenTexture method)
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
    
    // Target area is the smallest circle (increased to 30 pixel radius for easier testing)
    return distanceToCenter <= 30;
  }

  // Get the center position of the target circle
  getTargetCircleCenter() {
    const centerX = this.greenStartX + (this.greenWidth / 2);
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

  addWaterOverlay() {
    // Add water hazard as integrated terrain area (blue colored)
    const waterWidth = this.waterWidth; // Use the configured width
    const waterStartX = this.waterStartX; // Use the configured start position
    const waterEndX = this.waterEndX;
    
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
    // For elevated green, set water level to be slightly above the terrain at water position
    // This ensures balls rolling down the slope will hit the water
    const terrainAtWater = waterPoints.length > 0 ? waterPoints[Math.floor(waterPoints.length / 2)].y : 600;
    this.waterLevel = terrainAtWater - 10; // Set water 10 pixels above terrain for proper collision
    
    console.log(`Hole 1 Water Hazard Configuration:`);
    console.log(`Water starts at: ${waterStartX} pixels (${waterStartX/20} yards)`);
    console.log(`Water ends at: ${waterEndX} pixels (${waterEndX/20} yards)`);
    console.log(`Terrain height at water: ${terrainAtWater} pixels`);
    console.log(`Water level set to: ${this.waterLevel} pixels`);
  }

  addWaterTexture(graphics, waterPoints) {
    // Add water texture and ripples
    graphics.lineStyle(1, 0x42A5F5, 0.4); // Lighter blue for ripples
    
    const startX = waterPoints[0].x;
    const endX = waterPoints[waterPoints.length - 1].x;
    
    // Add water ripple lines
    for (let x = startX; x < endX; x += 25) {
      const height1 = this.getHeightAtX(x);
      const height2 = this.getHeightAtX(x + 20);
      
      graphics.moveTo(x, height1);
      graphics.lineTo(x + 20, height2);
    }
    
    // Add surface ripples
    graphics.lineStyle(1, 0x64B5F6, 0.3); // Even lighter blue for surface
    for (let x = startX; x < endX; x += 30) {
      const height = this.getHeightAtX(x);
      const rippleOffset = Math.sin(x * 0.01) * 3;
      graphics.lineBetween(x + rippleOffset, height + 2, x + 15 + rippleOffset, height + 3);
    }
    
    graphics.strokePath();
  }

  addBunkerOverlay() {
    // Add bunker as integrated terrain area (brown/sand colored)
    const bunkerWidth = 600; // 30 yards wide (reduced from 40 yards)
    const bunkerStartX = 5500; // 275 yards from start (275 * 20 = 5500 pixels)
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
    
    // Debug logging for green area
    if (x >= this.greenStartX - this.greenSlopeWidth && x <= this.greenEndX + this.greenSlopeWidth) {
      console.log(`TERRAIN HEIGHT DEBUG: x=${Math.round(x)}, inGreenComplex=${this.isInGreenComplex(x)}, inGreenArea=${this.isInGreenArea(x)}`);
    }
    
    // Check if position is in water hazard - return actual terrain height for proper collision
    if (x >= this.waterStartX && x <= this.waterEndX) {
      // Return the actual terrain height at this position, not a fake low height
      // The water collision detection will handle the water penalty
      const segmentWidth = this.width / this.segments;
      const index = Math.floor(x / segmentWidth);
      
      if (index >= this.heightMap.length - 1) {
        return this.heightMap[this.heightMap.length - 1].y;
      }
      if (index < 0) {
        return this.heightMap[0].y;
      }
      
      const point1 = this.heightMap[index];
      const point2 = this.heightMap[index + 1];
      const localX = x - point1.x;
      const segmentLength = point2.x - point1.x;
      const ratio = segmentLength > 0 ? localX / segmentLength : 0;
      
      return point1.y + (point2.y - point1.y) * ratio;
    }
    
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
    
    // Debug logging for steep slopes
    if (Math.abs(rise) > 50) {
      console.log(`SLOPE CALC DEBUG: x=${Math.round(point1.x)}, rise=${Math.round(rise)}, run=${Math.round(run)}, slope=${(rise/run).toFixed(3)}`);
    }
    
    // For very steep slopes (like the elevated green approach), use a larger sample
    if (Math.abs(rise) > 20 && run > 0) {
      // Look ahead further for steep terrain
      const lookAhead = Math.min(5, this.heightMap.length - index - 1);
      if (lookAhead > 1) {
        const farPoint = this.heightMap[index + lookAhead];
        const farRise = farPoint.y - point1.y;
        const farRun = farPoint.x - point1.x;
        return farRun !== 0 ? farRise / farRun : rise / run;
      }
    }
    
    // For extremely steep slopes (like green approach), use even larger sample
    if (Math.abs(rise) > 100 && run > 0) {
      const lookAhead = Math.min(10, this.heightMap.length - index - 1);
      if (lookAhead > 2) {
        const farPoint = this.heightMap[index + lookAhead];
        const farRise = farPoint.y - point1.y;
        const farRun = farPoint.x - point1.x;
        return farRun !== 0 ? farRise / farRun : rise / run;
      }
    }
    
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