import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/engine.js";
import { HeroAnimator } from "../src/hero-animation.js";
import { projectilePreview } from "../src/combat.js";
const tick = (g, input = {}, count = 1) => {
  for (let i = 0; i < count; i++) g.step(1 / 120, input);
};
const enemy = (x) => ({
  x,
  y: 486,
  w: 36,
  h: 34,
  vx: 0,
  min: x,
  max: x,
  alive: true,
});

test("punch has windup, hits only in front and within reach, and counts one hit", () => {
  for (const face of [-1, 1]) {
    const g = new Game();
    tick(g, {}, 2);
    g.player.face = face;
    const front = enemy(face === 1 ? 140 : 35),
      behind = enemy(face === 1 ? 35 : 140),
      far = enemy(face === 1 ? 230 : 0);
    g.level.enemies = [front, behind, far];
    tick(g, { attack: true }, 5);
    assert.ok(front.alive, "windup cannot deal damage");
    tick(g, { attack: true }, 20);
    assert.equal(front.alive, false);
    assert.ok(behind.alive);
    assert.ok(far.alive);
    assert.equal(g.drain().filter((e) => e.type === "punchHit").length, 1);
  }
});
test("held punches respect cooldown, animate four phases, and do not stop a running jump", () => {
  const g = new Game(),
    anim = new HeroAnimator(),
    poses = new Set();
  tick(g, {}, 2);
  anim.update(g.player, g.time);
  for (let i = 0; i < 120; i++) {
    tick(g, { attack: true, right: true, jump: i < 30 });
    const a = anim.update(g.player, g.time);
    if (a.state === "punch") poses.add(a.frame);
  }
  assert.equal(poses.size, 4);
  assert.ok(g.player.x > 300);
  assert.equal(g.drain().filter((e) => e.type === "punch").length, 3);
  tick(g, {}, 60);
  assert.equal(g.player.attackTime, -1);
  assert.equal(g.player.attackCooldown, 0);
});
test("punch damages a vulnerable boss once without bouncing the player; guarded boss blocks it", () => {
  for (const state of ["stunned", "wait"]) {
    const g = new Game(5);
    tick(g, {}, 2);
    g.player.x = 90;
    g.player.face = 1;
    Object.assign(g.boss, { x: 140, state, timer: 5, vx: 0, invulnerable: 0 });
    tick(g, { attack: true }, 35);
    assert.equal(g.boss.hp, state === "stunned" ? 5 : 6);
    assert.equal(g.player.y, 466);
    assert.equal(g.player.hp, 3);
    const events = g.drain();
    assert.equal(
      events.filter(
        (e) => e.type === (state === "stunned" ? "bossHit" : "punchBlocked"),
      ).length,
      1,
    );
  }
});
test("punch can deliver the final boss hit and finish the game", () => {
  const g = new Game(5);
  tick(g, {}, 2);
  g.player.x = 90;
  Object.assign(g.boss, {
    x: 140,
    state: "stunned",
    timer: 5,
    hp: 1,
    invulnerable: 0,
  });
  tick(g, { attack: true }, 30);
  assert.equal(g.mode, "won");
  assert.equal(g.boss.state, "defeated");
  assert.equal(g.drain().filter((e) => e.type === "won").length, 1);
});
test("slam lands in the marked rectangle even when the player moves after the warning", () => {
  for (const playerX of [0, 620, 1240]) {
    const g = new Game(5);
    g.player.x = playerX;
    g.boss.timer = 0;
    tick(g);
    const plan = structuredClone(g.boss.plan);
    g.player.x = playerX < 600 ? 1200 : 20;
    for (let i = 0; i < 600 && g.boss.state !== "stunned"; i++) {
      g.player.invulnerable = 1;
      tick(g);
    }
    assert.equal(g.boss.state, "stunned");
    assert.equal(g.boss.x, plan.zone.x);
    assert.equal(g.boss.y, plan.zone.y);
    assert.equal(g.boss.w, plan.zone.w);
    assert.equal(g.boss.h, plan.zone.h);
    const waves = g.projectiles.filter((p) => p.kind === "wave");
    assert.equal(waves.length, 2);
    assert.ok(waves.every((p) => Math.abs(p.vx) === plan.waveSpeed));
  }
});
test("charge preview matches the complete traveled area in both phases and at walls", () => {
  for (const hp of [6, 3])
    for (const start of [60, 600, 1095])
      for (const target of [0, 1240]) {
        const g = new Game(5);
        g.player.x = target;
        Object.assign(g.boss, { x: start, hp, attackIndex: 2, timer: 0 });
        tick(g);
        const plan = g.boss.plan;
        g.player.x = target === 0 ? 1240 : 0;
        let left = plan.fromX,
          right = plan.fromX + g.boss.w;
        for (let i = 0; i < 500 && g.boss.state !== "stunned"; i++) {
          g.player.invulnerable = 1;
          tick(g);
          left = Math.min(left, g.boss.x);
          right = Math.max(right, g.boss.x + g.boss.w);
        }
        assert.equal(g.boss.x, plan.toX);
        assert.ok(Math.abs(left - plan.zone.x) < 1e-8);
        assert.ok(Math.abs(right - (plan.zone.x + plan.zone.w)) < 1e-8);
      }
});
test("both console speeds follow the displayed trajectory and keep the original aim", () => {
  for (const hp of [6, 3]) {
    const g = new Game(5);
    g.player.x = 360;
    Object.assign(g.boss, { hp, attackIndex: 1, timer: 0 });
    tick(g);
    const plan = structuredClone(g.boss.plan),
      preview = projectilePreview(plan.projectile);
    g.player.x = 1240;
    assert.ok(
      Math.abs(preview.at(-1).y + plan.projectile.h / 2 - 520) < 1e-8,
      "trajectory must end exactly on the ground",
    );
    while (!g.projectiles.some((p) => p.kind === "console")) {
      g.player.invulnerable = 1;
      tick(g);
    }
    const shot = g.projectiles.find((p) => p.kind === "console");
    // The projectile has already advanced one simulation step on its spawn frame.
    tick(g, {}, 59);
    assert.ok(Math.abs(shot.x + shot.w / 2 - preview[30].x) < 1e-8);
    assert.ok(Math.abs(shot.y + shot.h / 2 - preview[30].y) < 1e-8);
    assert.equal(Math.abs(shot.vx), hp === 3 ? 340 : 310);
  }
});
