/**
 * WaterHazard - Reusable water hazard system for golf holes
 * Can be positioned anywhere on the course with customizable width
 */
export class WaterHazard {
  constructor(scene, options = {}) {
    this.scene = scene;
    
    // Default options
    this.startX = options.startX || 1000;
    this.width = options.width || 1000; // Default 50 yards (1000 pixels)
    this.endX = this.startX + this.width;
    this.level = options.level || 500; // Default water level
    this.baseHeight = options.baseHeight || 600;
    
    // Visual properties
    this.waterColor = options.waterColor || 0x1976D2; // Deep blue
    this.surfaceColor = options.surfaceColor || 0x42A5F5; // Light blue
    this.surfaceThickness = options.surfaceThickness || 8;
    
    // Debug logging
    if (options.debug !== false) {
      this.logWaterInfo();
    }
    
    // Create the water graphics
    this.createWaterGraphics();
  }
  
  logWaterInfo() {
    console.log('Water Hazard Created:');
    console.log('- Start:', this.startX, 'pixels (', this.startX/20, 'yards)');
    console.log('- End:', this.endX, 'pixels (', this.endX/20, 'yards)');
    console.log('- Width:', this.width, 'pixels (', this.width/20, 'yards)');
    console.log('- Level:', this.level, 'pixels');
  }
  
  createWaterGraphics() {
    console.log('Creating water hazard graphics...');
    
    // Create water hazard graphics with higher depth to appear on top
    this.waterGraphics = this.scene.add.graphics();
    this.waterGraphics.setDepth(10); // Ensure water appears above terrain
    this.waterGraphics.fillStyle(this.waterColor);
    
    console.log('Drawing water rectangle:', this.startX, this.level, this.width, 768 - this.level);
    
    // Draw main water body
    this.waterGraphics.fillRect(
      this.startX, 
      this.level, 
      this.width, 
      768 - this.level // Extend to bottom of screen
    );
    
    // Add water surface with lighter blue
    this.waterGraphics.fillStyle(this.surfaceColor);
    this.waterGraphics.fillRect(
      this.startX, 
      this.level, 
      this.width, 
      this.surfaceThickness
    );
    
    // Add water texture/ripples
    this.addWaterTexture();
  }
  
  addWaterTexture() {
    // Add some water texture/ripples for visual appeal
    this.waterGraphics.lineStyle(1, 0x64B5F6, 0.3);
    
    for (let x = this.startX; x < this.endX; x += 40) {
      for (let y = this.level + 10; y < 768; y += 30) {
        // Add small wavy lines to simulate water movement
        const waveOffset = Math.sin((x + y) * 0.01) * 3;
        this.waterGraphics.lineBetween(
          x + waveOffset, y,
          x + 20 + waveOffset, y + 2
        );
      }
    }
  }
  
  // Check if ball is in this water hazard
  isBallInWater(ballX, ballY) {
    return ballX >= this.startX && 
           ballX <= this.endX && 
           ballY >= this.level - 20; // Trigger collision slightly above water surface
  }
  
  // Get water boundaries for terrain height calculations
  getWaterBounds() {
    return {
      startX: this.startX,
      endX: this.endX,
      width: this.width,
      level: this.level
    };
  }
  
  // Destroy water graphics
  destroy() {
    if (this.waterGraphics) {
      this.waterGraphics.destroy();
    }
  }
}

/**
 * WaterHazardMixin - Mixin to add water hazard functionality to terrain classes
 * Usage: Object.assign(TerrainClass.prototype, WaterHazardMixin);
 */
export const WaterHazardMixin = {
  // Initialize water hazards array
  initWaterHazards() {
    this.waterHazards = [];
  },
  
  // Add a water hazard with custom positioning and width
  addWaterHazard(options = {}) {
    if (!this.waterHazards) {
      this.initWaterHazards();
    }
    
    // Set default position relative to green if not specified
    if (!options.startX && this.greenStartX) {
      const defaultWidth = options.width || 1000; // 50 yards default
      options.startX = this.greenStartX - defaultWidth - 50; // Position before green
    }
    
    // Set default level relative to base height
    if (!options.level && this.baseHeight) {
      options.level = this.baseHeight - 100; // 100 pixels above base terrain
    }
    
    const waterHazard = new WaterHazard(this.scene, options);
    this.waterHazards.push(waterHazard);
    
    return waterHazard;
  },
  
  // Check if ball is in any water hazard
  isBallInWater(ballX, ballY) {
    if (!this.waterHazards) return false;
    
    return this.waterHazards.some(hazard => hazard.isBallInWater(ballX, ballY));
  },
  
  // Get height adjustment for water hazards (makes ball sink)
  getWaterHeightAdjustment(x) {
    if (!this.waterHazards) return 0;
    
    for (let hazard of this.waterHazards) {
      if (x >= hazard.startX && x <= hazard.endX) {
        return 100; // Return height adjustment to make ball sink
      }
    }
    return 0;
  },
  
  // Destroy all water hazards
  destroyWaterHazards() {
    if (this.waterHazards) {
      this.waterHazards.forEach(hazard => hazard.destroy());
      this.waterHazards = [];
    }
  },

  // Compatibility methods for golf ball repositioning
  // Get the first water hazard's start position (for ball drop positioning)
  get waterStartX() {
    if (!this.waterHazards || this.waterHazards.length === 0) return null;
    return this.waterHazards[0].startX;
  },

  // Get the first water hazard's end position
  get waterEndX() {
    if (!this.waterHazards || this.waterHazards.length === 0) return null;
    return this.waterHazards[0].endX;
  },

  // Get the first water hazard's level
  get waterLevel() {
    if (!this.waterHazards || this.waterHazards.length === 0) return null;
    return this.waterHazards[0].level;
  },

  // Find appropriate drop position for ball after water penalty
  findWaterDropPosition(ballX, ballY, approachDirection = 'right') {
    if (!this.waterHazards || this.waterHazards.length === 0) {
      // Fallback to original position if no water hazards
      return { x: 200, y: this.getTerrainHeightAtX ? this.getTerrainHeightAtX(200) - 15 : 600 };
    }

    // Find which water hazard the ball is in
    const hazard = this.waterHazards.find(h => 
      ballX >= h.startX && ballX <= h.endX
    );

    if (!hazard) {
      // Ball not in any hazard, use first hazard as reference
      const firstHazard = this.waterHazards[0];
      const dropX = firstHazard.startX - 250; // 12.5 yards before water for better visibility
      const dropY = this.getTerrainHeightAtX ? this.getTerrainHeightAtX(dropX) - 15 : 600;
      return { x: Math.max(200, dropX), y: dropY }; // Don't go behind tee
    }

    // Drop ball 12.5 yards away from water hazard for better visibility
    const dropDistance = 250; // 12.5 yards in pixels (12.5 * 20)
    let dropX;

    // Determine which side of water to drop on based on APPROACH DIRECTION
    if (approachDirection === 'right') {
      // Ball was moving left to right - drop on the LEFT side of water (before water)
      dropX = hazard.startX - dropDistance;
    } else {
      // Ball was moving right to left - drop on the RIGHT side of water (after water)
      dropX = hazard.endX + dropDistance;
    }

    // Ensure drop position is reasonable
    dropX = Math.max(200, dropX); // Don't go behind tee
    if (this.greenStartX) {
      dropX = Math.min(this.greenStartX - 100, dropX); // Don't go past green
    }

    const dropY = this.getTerrainHeightAtX ? this.getTerrainHeightAtX(dropX) - 15 : 600;
    
    console.log('Water drop position calculated:', {
      ballX, ballY, 
      approachDirection,
      hazardStart: hazard.startX, hazardEnd: hazard.endX,
      dropX, dropY,
      dropDistance: '12.5 yards',
      dropSide: approachDirection === 'right' ? 'left_of_water' : 'right_of_water'
    });

    return { x: dropX, y: dropY };
  }
};

/**
 * Helper function to create water hazards with common configurations
 */
export const WaterHazardPresets = {
  // Small pond (25 yards wide)
  smallPond: (scene, startX) => new WaterHazard(scene, {
    startX: startX,
    width: 500, // 25 yards
    level: scene.baseHeight ? scene.baseHeight - 80 : 520
  }),
  
  // Medium lake (50 yards wide) 
  mediumLake: (scene, startX) => new WaterHazard(scene, {
    startX: startX,
    width: 1000, // 50 yards
    level: scene.baseHeight ? scene.baseHeight - 100 : 500
  }),
  
  // Large lake (100 yards wide) - like Hole 2
  largeLake: (scene, startX) => new WaterHazard(scene, {
    startX: startX,
    width: 2000, // 100 yards
    level: scene.baseHeight ? scene.baseHeight - 100 : 500
  }),
  
  // Creek (10 yards wide)
  creek: (scene, startX) => new WaterHazard(scene, {
    startX: startX,
    width: 200, // 10 yards
    level: scene.baseHeight ? scene.baseHeight - 60 : 540,
    surfaceThickness: 4 // Thinner surface for creek
  }),
  
  // Custom width water hazard
  custom: (scene, startX, widthInYards) => new WaterHazard(scene, {
    startX: startX,
    width: widthInYards * 20, // Convert yards to pixels
    level: scene.baseHeight ? scene.baseHeight - 100 : 500
  })
};
