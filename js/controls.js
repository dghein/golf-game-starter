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
    four: Phaser.Input.Keyboard.KeyCodes.FOUR,
    shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    c: Phaser.Input.Keyboard.KeyCodes.C,
    r: Phaser.Input.Keyboard.KeyCodes.R,
    p: Phaser.Input.Keyboard.KeyCodes.P,
    k: Phaser.Input.Keyboard.KeyCodes.K,
    e: Phaser.Input.Keyboard.KeyCodes.E,
    b: Phaser.Input.Keyboard.KeyCodes.B,
    d: Phaser.Input.Keyboard.KeyCodes.D,
    esc: Phaser.Input.Keyboard.KeyCodes.ESC,
  });
}
