import Hole1Scene from './scenes/GameScene.js'; // Will be renamed to Hole1Scene.js
import Hole2Scene from './scenes/Hole2Scene.js';
import { courseManager } from './CourseManager.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#4CAF50',
  scene: [Hole1Scene, Hole2Scene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 100 },
      // debug: true,
    },
  },
};

const game = new Phaser.Game(config);

// Global console functions for debugging/testing
window.switchToHole = function(holeNumber) {
  if (courseManager.gotoHole(holeNumber)) {
    const sceneName = courseManager.getCurrentSceneName();
    
    // Check if the scene exists
    const sceneExists = game.scene.scenes.find(scene => scene.sys.config === sceneName);
    
    if (sceneExists) {
      // Stop current scene and start the target scene
      const currentScene = game.scene.getScene('Hole1Scene') || game.scene.getScene('Hole2Scene');
      if (currentScene && currentScene.scene.isActive()) {
        currentScene.scene.start(sceneName);
      } else {
        // If no active scene, just start the target scene
        game.scene.start(sceneName);
      }
      console.log(`Switched to ${sceneName}`);
    } else {
      // Scene doesn't exist, fall back to available scenes
      if (holeNumber === 1) {
        game.scene.start('Hole1Scene');
        console.log('Switched to Hole1Scene');
      } else if (holeNumber === 2) {
        game.scene.start('Hole2Scene');
        console.log('Switched to Hole2Scene');
      } else {
        console.warn(`Scene ${sceneName} not implemented yet. Only Hole 1 and Hole 2 are available.`);
        console.log('Available scenes: Hole1Scene, Hole2Scene');
      }
    }
  }
};

window.listHoles = function() {
  console.log('Available holes:');
  for (let i = 1; i <= courseManager.getTotalHoles(); i++) {
    const par = courseManager.getParForHole(i);
    const yardage = courseManager.getYardageForHole(i);
    const score = courseManager.getScoreForHole(i);
    const completed = score > 0 ? `(${score} strokes)` : '(not completed)';
    console.log(`Hole ${i}: Par ${par}, ${yardage} yards ${completed}`);
  }
  console.log(`\nCurrent hole: ${courseManager.getCurrentHole()}`);
  console.log('Usage: switchToHole(holeNumber) - e.g., switchToHole(2)');
};

window.resetCourse = function() {
  courseManager.reset();
  game.scene.start('Hole1Scene');
  console.log('Course reset and returned to Hole 1');
};

// Show available console commands
console.log('🏌️ Golf Game Console Commands:');
console.log('- switchToHole(number): Switch to specific hole (1-18)');
console.log('- listHoles(): Show all holes and their info');
console.log('- resetCourse(): Reset course and go back to hole 1');
console.log('Example: switchToHole(2)');
