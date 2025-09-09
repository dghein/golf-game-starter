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

  // Split swing into backswing (charging) and follow-through (release)
  scene.anims.create({
    key: "backswing",
    frames: [
      { key: "golfer_swing_0" }, // Hold the club up position
    ],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: "swing_followthrough",
    frames: [
      { key: "golfer_swing_1" }, // Complete the swing
    ],
    frameRate: 10,
    repeat: 0,
  });

  // Keep original swing animation for backward compatibility
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
