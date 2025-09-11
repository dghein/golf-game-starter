/**
 * Bunker - Reusable sand trap/bunker system for golf holes
 * Can be positioned anywhere on the course with customizable width and depth
 */
export class Bunker {
  constructor(scene, options = {}) {
    this.scene = scene;
    
    // Default options
    this.startX = options.startX || 1000;
    this.width = options.width || 800; // Default 40 yards (800 pixels)
    this.endX = this.startX + this.width;
    this.level = options.level || 500; // Default bunker level
    this.baseHeight = options.baseHeight || 600;
    this.depth = options.depth || 30; // How deep the bunker is below terrain
    
    // Visual properties
    this.sandColor = options.sandColor || 0xD2B48C; // Tan/sand color
    this.darkSandColor = options.darkSandColor || 0xBC9A6A; // Darker sand for depth
    this.rimColor = options.rimColor || 0x8B7355; // Darker rim color
    this.rimThickness = options.rimThickness || 6;
    
    // Debug logging
    if (options.debug !== false) {
      this.logBunkerInfo();
    }
    
    // Create the bunker graphics
    this.createBunkerGraphics();
  }
  
  logBunkerInfo() {
    console.log('Bunker Created:');
    console.log('- Start:', this.startX, 'pixels (', this.startX/20, 'yards)');
    console.log('- End:', this.endX, 'pixels (', this.endX/20, 'yards)');
    console.log('- Width:', this.width, 'pixels (', this.width/20, 'yards)');
    console.log('- Level:', this.level, 'pixels');
    console.log('- Depth:', this.depth, 'pixels');
  }
  
  createBunkerGraphics() {
    console.log('Creating bunker graphics...');
    
    // Create bunker graphics with higher depth to appear on top
    this.bunkerGraphics = this.scene.add.graphics();
    this.bunkerGraphics.setDepth(10); // Ensure bunker appears above terrain
    
    // Draw main bunker area
    this.bunkerGraphics.fillStyle(this.sandColor);
    this.bunkerGraphics.fillRect(
      this.startX, 
      this.level, 
      this.width, 
      768 - this.level // Extend to bottom of screen
    );
    
    // Add darker sand layer for depth effect
    this.bunkerGraphics.fillStyle(this.darkSandColor);
    this.bunkerGraphics.fillRect(
      this.startX, 
      this.level + this.depth, 
      this.width, 
      768 - (this.level + this.depth)
    );
    
    // Add bunker rim (raised edge)
    this.bunkerGraphics.fillStyle(this.rimColor);
    this.bunkerGraphics.fillRect(
      this.startX, 
      this.level - this.rimThickness, 
      this.width, 
      this.rimThickness
    );
    
    // Add sand texture
    this.addSandTexture();
  }
  
  addSandTexture() {
    // Add sand texture/dots for visual appeal
    this.bunkerGraphics.fillStyle(0xF4E4BC, 0.4); // Light sand color with transparency
    
    // Add random sand grains
    for (let x = this.startX; x < this.endX; x += 15) {
      for (let y = this.level; y < 768; y += 20) {
        // Add small sand grains
        if (Math.random() > 0.7) { // 30% chance of grain
          const grainSize = Math.random() * 3 + 1; // 1-4 pixel grains
          this.bunkerGraphics.fillCircle(x + Math.random() * 10, y + Math.random() * 10, grainSize);
        }
      }
    }
    
    // Add sand ripples/lines
    this.bunkerGraphics.lineStyle(1, 0xE6D3A3, 0.3);
    for (let x = this.startX; x < this.endX; x += 30) {
      for (let y = this.level + 10; y < 768; y += 40) {
        // Add subtle sand ripple lines
        const rippleOffset = Math.sin((x + y) * 0.02) * 2;
        this.bunkerGraphics.lineBetween(
          x + rippleOffset, y,
          x + 15 + rippleOffset, y + 1
        );
      }
    }
  }
  
  // Check if ball is in this bunker
  isBallInBunker(ballX, ballY) {
    return ballX >= this.startX && 
           ballX <= this.endX && 
           ballY >= this.level - 20; // Trigger collision slightly above bunker surface
  }
  
  // Get bunker boundaries for terrain height calculations
  getBunkerBounds() {
    return {
      startX: this.startX,
      endX: this.endX,
      width: this.width,
      level: this.level,
      depth: this.depth
    };
  }
  
  // Destroy bunker graphics
  destroy() {
    if (this.bunkerGraphics) {
      this.bunkerGraphics.destroy();
    }
  }
}

/**
 * BunkerMixin - Mixin to add bunker functionality to terrain classes
 * Usage: Object.assign(TerrainClass.prototype, BunkerMixin);
 */
export const BunkerMixin = {
  // Initialize bunkers array
  initBunkers() {
    this.bunkers = [];
  },
  
  // Add a bunker with custom positioning and width
  addBunker(options = {}) {
    if (!this.bunkers) {
      this.initBunkers();
    }
    
    // Set default position relative to green if not specified
    if (!options.startX && this.greenEndX) {
      const defaultWidth = options.width || 800; // 40 yards default
      options.startX = this.greenEndX + 50; // Position after green
    }
    
    // Set default level relative to base height
    if (!options.level && this.baseHeight) {
      options.level = this.baseHeight - 50; // 50 pixels above base terrain
    }
    
    const bunker = new Bunker(this.scene, options);
    this.bunkers.push(bunker);
    
    return bunker;
  },
  
  // Check if ball is in any bunker
  isBallInBunker(ballX, ballY) {
    if (!this.bunkers) return false;
    
    return this.bunkers.some(bunker => bunker.isBallInBunker(ballX, ballY));
  },
  
  // Get height adjustment for bunkers (makes ball sink slightly)
  getBunkerHeightAdjustment(x) {
    if (!this.bunkers) return 0;
    
    for (let bunker of this.bunkers) {
      if (x >= bunker.startX && x <= bunker.endX) {
        return 20; // Return height adjustment to make ball sink slightly into sand
      }
    }
    return 0;
  },
  
  // Destroy all bunkers
  destroyBunkers() {
    if (this.bunkers) {
      this.bunkers.forEach(bunker => bunker.destroy());
      this.bunkers = [];
    }
  },

  // Compatibility methods for golf ball repositioning
  // Get the first bunker's start position (for ball drop positioning)
  get bunkerStartX() {
    if (!this.bunkers || this.bunkers.length === 0) return null;
    return this.bunkers[0].startX;
  },

  // Get the first bunker's end position
  get bunkerEndX() {
    if (!this.bunkers || this.bunkers.length === 0) return null;
    return this.bunkers[0].endX;
  },

  // Get the first bunker's level
  get bunkerLevel() {
    if (!this.bunkers || this.bunkers.length === 0) return null;
    return this.bunkers[0].level;
  },

  // Find appropriate drop position for ball after bunker penalty
  findBunkerDropPosition(ballX, ballY, approachDirection = 'right') {
    if (!this.bunkers || this.bunkers.length === 0) {
      // Fallback to original position if no bunkers
      return { x: 200, y: this.getTerrainHeightAtX ? this.getTerrainHeightAtX(200) - 15 : 600 };
    }

    // Find which bunker the ball is in
    const bunker = this.bunkers.find(b => 
      ballX >= b.startX && ballX <= b.endX
    );

    if (!bunker) {
      // Ball not in any bunker, use first bunker as reference
      const firstBunker = this.bunkers[0];
      const dropX = firstBunker.startX - 250; // 12.5 yards before bunker
      const dropY = this.getTerrainHeightAtX ? this.getTerrainHeightAtX(dropX) - 15 : 600;
      return { x: Math.max(200, dropX), y: dropY }; // Don't go behind tee
    }

    // Drop ball 12.5 yards away from bunker for better visibility
    const dropDistance = 250; // 12.5 yards in pixels (12.5 * 20)
    let dropX;

    // Determine which side of bunker to drop on based on APPROACH DIRECTION
    if (approachDirection === 'right') {
      // Ball was moving left to right - drop on the LEFT side of bunker (before bunker)
      dropX = bunker.startX - dropDistance;
    } else {
      // Ball was moving right to left - drop on the RIGHT side of bunker (after bunker)
      dropX = bunker.endX + dropDistance;
    }

    // Ensure drop position is reasonable
    dropX = Math.max(200, dropX); // Don't go behind tee
    if (this.greenStartX) {
      dropX = Math.min(this.greenStartX - 100, dropX); // Don't go past green
    }

    const dropY = this.getTerrainHeightAtX ? this.getTerrainHeightAtX(dropX) - 15 : 600;
    
    console.log('Bunker drop position calculated:', {
      ballX, ballY, 
      approachDirection,
      bunkerStart: bunker.startX, bunkerEnd: bunker.endX,
      dropX, dropY,
      dropDistance: '12.5 yards',
      dropSide: approachDirection === 'right' ? 'left_of_bunker' : 'right_of_bunker'
    });

    return { x: dropX, y: dropY };
  }
};

/**
 * Helper function to create bunkers with common configurations
 */
export const BunkerPresets = {
  // Small bunker (20 yards wide)
  smallBunker: (scene, startX) => new Bunker(scene, {
    startX: startX,
    width: 400, // 20 yards
    level: scene.baseHeight ? scene.baseHeight - 40 : 560,
    depth: 20
  }),
  
  // Medium bunker (40 yards wide) 
  mediumBunker: (scene, startX) => new Bunker(scene, {
    startX: startX,
    width: 800, // 40 yards
    level: scene.baseHeight ? scene.baseHeight - 50 : 550,
    depth: 30
  }),
  
  // Large bunker (60 yards wide)
  largeBunker: (scene, startX) => new Bunker(scene, {
    startX: startX,
    width: 1200, // 60 yards
    level: scene.baseHeight ? scene.baseHeight - 60 : 540,
    depth: 40
  }),
  
  // Greenside bunker (small, close to green)
  greensideBunker: (scene, startX) => new Bunker(scene, {
    startX: startX,
    width: 300, // 15 yards
    level: scene.baseHeight ? scene.baseHeight - 30 : 570,
    depth: 15,
    rimThickness: 4
  }),
  
  // Custom width bunker
  custom: (scene, startX, widthInYards) => new Bunker(scene, {
    startX: startX,
    width: widthInYards * 20, // Convert yards to pixels
    level: scene.baseHeight ? scene.baseHeight - 50 : 550,
    depth: 30
  })
};
