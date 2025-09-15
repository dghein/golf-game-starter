/**
 * TitleScene - Main menu/title screen
 */
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  preload() {
    // Load assets for title screen
    this.load.image("sky", "assets/course/sky.png");
    this.load.image("logo", "assets/golfer/logo.png");
    this.load.audio("titlescreen", "assets/sounds/titlescreen.mp3");
  }

  create() {
    // Set camera size
    const { width, height } = this.cameras.main;
    
    // Create sky background
    this.add.tileSprite(0, 0, width, height, "sky").setOrigin(0, 0);
    
    // Create logo centered on screen
    const logo = this.add.image(width / 2, height / 2 - 50, "logo");
    logo.setOrigin(0.5, 0.5);
    logo.setScale(0.8); // Adjust scale as needed
    
    // Create "Press Enter" text
    const pressEnterText = this.add.text(width / 2, height / 2 + 175, 'Press Enter', {
      fontSize: '32px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'Arial',
      align: 'center'
    });
    pressEnterText.setOrigin(0.5, 0.5);
    
    // Add blinking effect to the text
    this.tweens.add({
      targets: pressEnterText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Power2'
    });
    
    // Set up keyboard input
    this.keys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });
    
    // Play title screen music
    this.titleMusic = this.sound.add("titlescreen", { loop: true, volume: 0.5 });
    this.titleMusic.play();
      }

  update() {
    // Check for Enter key press
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      // Stop title music before transitioning
      if (this.titleMusic && this.titleMusic.isPlaying) {
        this.titleMusic.stop();
      }
      this.scene.start('Hole1Scene');
    }
  }
}

export default TitleScene;
