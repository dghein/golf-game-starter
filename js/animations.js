export function createGolferAnimations(scene) {
  scene.anims.create({
    key: "walk",
    frames: [
      { key: "golfer_walking_0" },
      { key: "golfer_walking_1" },
    ],
    frameRate: 10,
    repeat: -1,
  });

  scene.anims.create({
    key: "swing",
    frames: [
      { key: "golfer_swing_0" },
      { key: "golfer_swing_1" },
    ],
    frameRate: 10,
    repeat: 0,
  });

  // scene.anims.create({
  //   key: "static",
  //   frames: [
  //     { key: "golfer_static_0" },
  //   ],
  //   frameRate: 10,
  //   repeat: -1,
  // });
}
