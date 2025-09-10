# Water Hazard System Guide

This guide explains how to add water hazards to any golf hole using the reusable water hazard system.

## Quick Start

### Method 1: Using the Mixin (Recommended)

```javascript
import { WaterHazardMixin } from './WaterHazard.js';

export class YourTerrainClass {
  constructor(scene) {
    // ... your terrain setup ...
    
    // Initialize water hazard system
    this.initWaterHazards();
    
    // ... generate terrain ...
    
    // Add water hazards
    this.addWaterHazard({
      startX: 1500,        // Position in pixels
      width: 1000,         // Width in pixels (50 yards)
      level: this.baseHeight - 100
    });
  }
}

// Apply the mixin to add water hazard functionality
Object.assign(YourTerrainClass.prototype, WaterHazardMixin);
```

### Method 2: Using Presets

```javascript
import { WaterHazardPresets } from './WaterHazard.js';

// In your terrain constructor:
const waterHazard = WaterHazardPresets.largeLake(this.scene, 1500);
```

### Method 3: Direct Instantiation

```javascript
import { WaterHazard } from './WaterHazard.js';

// Create a custom water hazard
const myWater = new WaterHazard(this.scene, {
  startX: 2000,
  width: 1500,  // 75 yards
  level: 500
});
```

## Common Water Hazard Widths

- **Creek**: 10 yards (200 pixels)
- **Small Pond**: 25 yards (500 pixels)  
- **Medium Lake**: 50 yards (1000 pixels)
- **Large Lake**: 100 yards (2000 pixels)
- **River**: 15-30 yards (300-600 pixels)

## Configuration Options

```javascript
this.addWaterHazard({
  startX: 1500,              // X position where water starts (required)
  width: 1000,               // Width in pixels (required)
  level: 500,                // Y level of water surface (optional, auto-calculated)
  waterColor: 0x1976D2,      // Deep water color (optional)
  surfaceColor: 0x42A5F5,    // Surface water color (optional)
  surfaceThickness: 8,       // Surface layer thickness (optional)
  debug: true                // Show debug console logs (optional)
});
```

## Positioning Examples

### Water Before Green
```javascript
// 50-yard water hazard ending 25 pixels before green
const waterStartX = this.greenStartX - 1000 - 25;
this.addWaterHazard({
  startX: waterStartX,
  width: 1000  // 50 yards
});
```

### Water After Tee
```javascript
// 30-yard water hazard starting 100 yards from tee
this.addWaterHazard({
  startX: 100 * 20 + 200,  // 100 yards from start + ball position
  width: 600               // 30 yards
});
```

### Multiple Water Hazards
```javascript
// Add multiple water hazards to the same hole
this.addWaterHazard({ startX: 800, width: 400 });   // Creek at 40 yards
this.addWaterHazard({ startX: 2500, width: 1000 }); // Lake at 125 yards
```

## Integration with Terrain

### Update getHeightAtX() method:
```javascript
getHeightAtX(x) {
  // ... existing terrain logic ...
  
  // Check for water hazards
  const waterAdjustment = this.getWaterHeightAdjustment(x);
  if (waterAdjustment > 0) {
    const hazard = this.waterHazards.find(h => x >= h.startX && x <= h.endX);
    return hazard ? hazard.level + 100 : this.baseHeight + 100;
  }
  
  // ... continue with normal terrain height calculation ...
}
```

### Don't forget cleanup:
```javascript
destroy() {
  if (this.terrainGraphics) {
    this.terrainGraphics.destroy();
  }
  this.destroyWaterHazards(); // Clean up water hazards
}
```

## Available Presets

```javascript
import { WaterHazardPresets } from './WaterHazard.js';

// Small pond (25 yards)
WaterHazardPresets.smallPond(scene, startX);

// Medium lake (50 yards)
WaterHazardPresets.mediumLake(scene, startX);

// Large lake (100 yards) - like Hole 2
WaterHazardPresets.largeLake(scene, startX);

// Creek (10 yards)
WaterHazardPresets.creek(scene, startX);

// Custom width
WaterHazardPresets.custom(scene, startX, 75); // 75 yards wide
```

## Example: Adding Water to Existing Hole

To add a 60-yard water hazard to an existing hole:

```javascript
// In your terrain constructor, after terrain generation:
this.initWaterHazards();

// Add 60-yard water hazard 80 yards before the green
const waterStartX = this.greenStartX - (60 * 20) - (20 * 20); // 60y water + 20y buffer
this.addWaterHazard({
  startX: waterStartX,
  width: 60 * 20  // 60 yards in pixels
});
```

The system handles all the visual rendering, ball physics, and collision detection automatically!
