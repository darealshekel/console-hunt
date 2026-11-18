export const BOSS_FRAMES = [
  { rect: [0, 0, 384, 341], anchor: [208, 295], face: 1 },
  { rect: [384, 0, 384, 341], anchor: [196, 299], face: 1 },
  { rect: [768, 0, 384, 341], anchor: [196, 300], face: 1 },
  { rect: [1152, 0, 384, 341], anchor: [190, 296], face: 1 },
  { rect: [0, 341, 384, 342], anchor: [190, 262], face: 1 },
  { rect: [384, 341, 384, 342], anchor: [193, 283], face: 1 },
  { rect: [768, 341, 384, 342], anchor: [185, 283], face: 1 },
  { rect: [1152, 341, 384, 342], anchor: [202, 283], face: -1 },
  { rect: [0, 683, 384, 341], anchor: [204, 272], face: 1 },
  { rect: [384, 683, 384, 341], anchor: [193, 275], face: -1 },
  { rect: [768, 683, 384, 341], anchor: [187, 273], face: -1 },
  { rect: [1152, 683, 384, 341], anchor: [198, 274], face: 1 },
];

export function bossPose(b, time, reduced = false) {
  const pose = { state: b.state, frame: 0, bob: 0, tilt: 0, scaleY: 1 };
  if (b.hp <= 0 || b.state === "defeated") pose.frame = 11;
  else if (b.reaction > 0) {
    pose.state = "hurt";
    pose.frame = 8;
    pose.tilt = -0.05;
  } else if (b.state === "warn")
    pose.frame = { slam: 3, throw: 6, charge: 9 }[b.attack];
  else if (b.state === "jump") pose.frame = 4;
  else if (b.state === "throw") pose.frame = b.release > 0 ? 7 : 6;
  else if (b.state === "charge") {
    pose.frame = Math.floor(time * 11) % 2 ? 10 : 9;
    if (!reduced) pose.bob = -Math.abs(Math.sin(time * 22)) * 2;
  } else if (b.state === "stunned") pose.frame = 5;
  else if (Math.abs(b.vx) > 1) {
    pose.state = "walk";
    pose.frame = [0, 1, 0, 2][Math.floor(time * 7) % 4];
    if (!reduced) {
      pose.bob = -Math.abs(Math.sin(time * 19)) * 1.8;
      pose.tilt = Math.sin(time * 19) * 0.015;
    }
  } else if (!reduced) pose.scaleY = 1 + Math.sin(time * 2) * 0.01;
  return pose;
}
