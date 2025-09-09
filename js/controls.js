export function setupWASD(scene) {
  return scene.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    ctrl: Phaser.Input.Keyboard.KeyCodes.CTRL,
    one: Phaser.Input.Keyboard.KeyCodes.ONE,
    two: Phaser.Input.Keyboard.KeyCodes.TWO,
    three: Phaser.Input.Keyboard.KeyCodes.THREE,
    shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  });
}
