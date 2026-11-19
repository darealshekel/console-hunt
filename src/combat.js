const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
export const PUNCH = {
  duration: 0.3,
  cooldown: 0.38,
  activeFrom: 0.08,
  activeUntil: 0.17,
};

export function punchHitbox(p) {
  if (p.attackTime < PUNCH.activeFrom || p.attackTime >= PUNCH.activeUntil)
    return null;
  return {
    x: p.attackFace > 0 ? p.x + p.w - 4 : p.x - 30,
    y: p.y - 3,
    w: 34,
    h: 42,
  };
}

// Lock each telegraph once. Rendering and attack motion consume this same plan.
export function planBossAttack(b, p, arenaLength) {
  const fromX = b.x,
    floorY = 520 - b.h,
    face = b.face;
  if (b.attack === "slam") {
    const toX = clamp(p.x + p.w / 2 - b.w / 2, 50, arenaLength - 180);
    return {
      attack: "slam",
      face,
      fromX,
      toX,
      floorY,
      duration: 0.8,
      height: 136,
      zone: { x: toX, y: floorY, w: b.w, h: b.h },
      waveSpeed: 175 + b.phase * 25,
      waveLife: 3,
    };
  }
  if (b.attack === "charge") {
    const speed = b.phase === 2 ? 510 : 450,
      toX = clamp(fromX + face * speed * 0.85, 50, arenaLength - 180);
    return {
      attack: "charge",
      face,
      fromX,
      toX,
      floorY,
      speed,
      duration: Math.abs(toX - fromX) / speed,
      zone: {
        x: Math.min(fromX, toX),
        y: floorY,
        w: Math.abs(toX - fromX) + b.w,
        h: b.h,
      },
    };
  }
  const speed = b.phase === 2 ? 340 : 310,
    gravity = 380;
  const w = 24,
    h = 30,
    x = fromX + b.w / 2 + face * 88 - w / 2,
    y = b.y + 37 - h / 2;
  const flight = clamp(Math.abs(p.x + p.w / 2 - (x + w / 2)) / speed, 0.3, 1.5);
  const vy = clamp(
    (p.y + p.h / 2 - (y + h / 2) - 0.5 * gravity * flight * flight) / flight,
    -300,
    140,
  );
  return {
    attack: "throw",
    face,
    fromX,
    floorY,
    projectile: {
      kind: "console",
      x,
      y,
      w,
      h,
      vx: face * speed,
      vy,
      gravity,
      life: 3,
    },
  };
}

export function bossJumpPosition(plan, elapsed) {
  const u = clamp(elapsed / plan.duration, 0, 1);
  return {
    x: plan.fromX + (plan.toX - plan.fromX) * u,
    y: plan.floorY - 4 * plan.height * u * (1 - u),
    vx: (plan.toX - plan.fromX) / plan.duration,
    vy: (4 * plan.height * (2 * u - 1)) / plan.duration,
  };
}
export function bossChargePosition(plan, elapsed) {
  return clamp(
    plan.fromX + plan.face * plan.speed * elapsed,
    Math.min(plan.fromX, plan.toX),
    Math.max(plan.fromX, plan.toX),
  );
}
export function projectilePosition(projectile, time) {
  return {
    x: projectile.x + projectile.vx * time,
    y:
      projectile.y +
      projectile.vy * time +
      0.5 * (projectile.gravity || 0) * time * time,
  };
}
export function projectilePreview(projectile) {
  const points = [];
  const gravity = projectile.gravity || 0,
    fall = 520 - projectile.h - projectile.y;
  const impactTime =
    gravity > 0
      ? (-projectile.vy + Math.sqrt(projectile.vy ** 2 + 2 * gravity * fall)) /
        gravity
      : projectile.vy > 0
        ? fall / projectile.vy
        : projectile.life;
  const endTime = Math.min(projectile.life, Math.max(0, impactTime));
  for (let t = 0; t < endTime; t += 1 / 60) {
    const point = projectilePosition(projectile, t);
    points.push({
      x: point.x + projectile.w / 2,
      y: point.y + projectile.h / 2,
    });
  }
  const end = projectilePosition(projectile, endTime);
  points.push({ x: end.x + projectile.w / 2, y: end.y + projectile.h / 2 });
  return points;
}
