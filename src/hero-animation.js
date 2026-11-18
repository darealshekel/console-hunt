const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Full cells share one pixel scale. The feet anchors keep the run cycle grounded
// while preserving the lower silhouette of the landing and tucked jump poses.
export const HERO_FRAMES = [
  { rect: [0, 0, 384, 341], anchor: [214, 330] },
  { rect: [384, 0, 384, 341], anchor: [200, 330] },
  { rect: [768, 0, 384, 341], anchor: [185, 317] },
  { rect: [1152, 0, 384, 341], anchor: [170, 283] },
  { rect: [0, 341, 384, 342], anchor: [190, 321] },
  { rect: [384, 341, 384, 342], anchor: [187, 321] },
  { rect: [768, 341, 384, 342], anchor: [186, 320] },
  { rect: [1152, 341, 384, 342], anchor: [181, 319] },
  { rect: [0, 683, 384, 341], anchor: [196, 325] },
  { rect: [384, 683, 384, 341], anchor: [188, 325] },
  { rect: [768, 683, 384, 341], anchor: [188, 310] },
  { rect: [1152, 683, 384, 341], anchor: [174, 325] },
];

export class HeroAnimator {
  constructor() {
    this.reset();
  }
  reset() {
    this.previous = null;
    this.phase = 0;
    this.landing = 0;
    this.takeoff = 0;
    this.pose = {
      state: "idle",
      frame: 0,
      tilt: 0,
      scaleX: 1,
      scaleY: 1,
      bob: 0,
    };
  }
  update(p, time, reduced = false) {
    const prev = this.previous;
    const dt = prev ? Math.max(0, Math.min(time - prev.time, 0.1)) : 0;
    if (prev && dt === 0) return this.pose;
    this.landing = Math.max(0, this.landing - dt);
    this.takeoff = Math.max(0, this.takeoff - dt);
    const distance = prev ? Math.abs(p.x - prev.x) : 0;
    const moved = distance > 0.015 && distance < 80;
    if (p.grounded && moved) this.phase = (this.phase + distance / 110) % 1;
    if (prev && !prev.grounded && p.grounded && prev.vy > 90)
      this.landing = 0.1;
    if (prev && p.vy < -300 && (prev.grounded || p.jumps > prev.jumps)) {
      this.takeoff = 0.085;
      this.landing = 0;
    }
    const pose = {
      state: "idle",
      frame: Math.floor(time / 1.1) % 2,
      tilt: 0,
      scaleX: 1,
      scaleY: 1,
      bob: 0,
    };
    if (p.stun > 0) {
      pose.state = "hurt";
      pose.frame = 10;
      pose.tilt = -0.15;
    } else if (p.dash > 0) {
      pose.state = "dash";
      pose.frame = 3;
      pose.tilt = 0.15;
      pose.scaleX = 1.08;
      pose.scaleY = 0.94;
    } else if (!p.grounded) {
      if (p.vy < -80) {
        pose.state = "jump";
        pose.frame = this.takeoff > 0 ? 2 : 3;
      } else if (p.vy > 80) {
        pose.state = "fall";
        pose.frame = 10;
      } else {
        pose.state = "apex";
        pose.frame = 3;
      }
      pose.tilt = clamp((p.vx * p.face) / 5000, -0.06, 0.06);
    } else if (this.landing > 0) {
      pose.state = "land";
      pose.frame = 11;
    } else if (moved && Math.abs(p.vx) > 12) {
      pose.state = "run";
      pose.frame = 4 + Math.floor(this.phase * 6);
      const acceleration = prev && dt ? ((p.vx - prev.vx) * p.face) / dt : 0;
      pose.tilt = clamp(acceleration / 24000, -0.07, 0.08);
      if (!reduced)
        pose.bob = -Math.abs(Math.sin(this.phase * Math.PI * 2)) * 1.4;
    } else if (!reduced) {
      pose.scaleY = 1 + Math.sin(time * 2.8) * 0.008;
    }
    this.pose = pose;
    this.previous = {
      x: p.x,
      vx: p.vx,
      vy: p.vy,
      grounded: p.grounded,
      jumps: p.jumps,
      time,
    };
    return pose;
  }
}
