import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";
const tick = (g, input = {}, n = 1) => {
  for (let i = 0; i < n; i++) g.step(1 / 120, input);
};

test("all five courses and the boss have valid, separate layouts", () => {
  const lengths = [];
  for (let i = 0; i < 6; i++) {
    const level = makeLevel(i);
    assert.ok(level.platforms.length);
    assert.ok(level.checkpoints.length);
    if (i < 5) {
      assert.ok(level.coins.length >= 35);
      assert.ok(level.goal.x < level.length);
      lengths.push(level.length);
    }
    for (const p of level.platforms) assert.ok(p.w > 0 && p.h > 0);
  }
  assert.equal(new Set(lengths).size, 5);
  assert.throws(() => makeLevel(9));
});
test("touch-hold movement accelerates, releases without ice-like sliding, and respects bounds", () => {
  const g = new Game();
  tick(g, {}, 3);
  const before = g.player.x;
  tick(g, { right: true }, 120);
  assert.ok(g.player.x > before + 200);
  tick(g, {}, 30);
  assert.equal(g.player.vx, 0);
  tick(g, { left: true }, 500);
  assert.ok(g.player.x >= 0);
});
test("jump needs a fresh press, double jump works, and third jump is blocked", () => {
  const g = new Game();
  tick(g, {}, 2);
  tick(g, { jump: true });
  assert.equal(g.player.jumps, 1);
  assert.ok(g.player.vy < 0);
  tick(g, { jump: true }, 8);
  assert.equal(g.player.jumps, 1);
  tick(g, {});
  tick(g, { jump: true });
  assert.equal(g.player.jumps, 2);
  tick(g, {});
  const v = g.player.vy;
  tick(g, { jump: true });
  assert.equal(g.player.jumps, 2);
  assert.ok(g.player.vy > v);
});
test("dash requires recharge and does not repeat while held", () => {
  const g = new Game();
  tick(g, { dash: true });
  assert.ok(g.player.dash > 0);
  tick(g, { dash: true }, 150);
  assert.equal(g.drain().filter((e) => e.type === "dash").length, 1);
  tick(g, {});
  tick(g, { dash: true });
  assert.equal(g.drain().filter((e) => e.type === "dash").length, 1);
});
test("collectibles count once and damage has invulnerability; falling uses checkpoint", () => {
  const g = new Game();
  g.player.x = 145;
  tick(g, {}, 10);
  assert.equal(g.collected, 1);
  tick(g, {}, 10);
  assert.equal(g.collected, 1);
  g.damage();
  g.damage();
  assert.equal(g.player.hp, 2);
  g.checkpoint = 1;
  g.player.y = 900;
  tick(g);
  assert.equal(g.player.hp, 1);
  assert.equal(g.player.x, g.level.checkpoints[1].x);
});
test("moving platform carries the player without injecting momentum", () => {
  const g = new Game(2),
    f = g.level.platforms.find((p) => p.moving);
  tick(g, {}, 1);
  g.player.x = f.x + 15;
  g.player.y = f.y - g.player.h;
  g.player.grounded = true;
  g.player.groundId = f.id;
  const offset = g.player.x - f.x;
  tick(g, {}, 30);
  assert.ok(Math.abs(g.player.x - f.x - offset) < 1);
  assert.equal(g.player.vx, 0);
});
test("boss telegraphs, lands, becomes vulnerable, and can be defeated", () => {
  const g = new Game(5),
    b = g.boss;
  g.player.x = 110;
  tick(g, {}, 220);
  assert.ok(["warn", "jump"].includes(b.state));
  for (let hits = 0; hits < 6; hits++) {
    for (let i = 0; i < 900 && b.state !== "stunned"; i++) {
      g.player.x = 30;
      g.player.invulnerable = 1;
      tick(g);
    }
    assert.equal(b.state, "stunned");
    b.invulnerable = 0;
    g.player.x = b.x + 35;
    g.player.y = b.y - g.player.h - 1;
    g.player.vy = 250;
    g.player.dash = 0;
    g.player.invulnerable = 1;
    tick(g, {}, 2);
    assert.equal(b.hp, 5 - hits);
    if (hits < 5) {
      tick(g, {}, 10);
      g.player.x = 30;
      while (b.state === "stunned" && g.mode === "playing") {
        g.player.invulnerable = 1;
        tick(g);
      }
    }
  }
  assert.equal(g.mode, "won");
  assert.ok(g.drain().some((e) => e.type === "won"));
});
test("all five courses can be completed through normal running and jumping", () => {
  for (let index = 0; index < 5; index++) {
    const g = new Game(index);
    let jumpPhase = 0;
    for (let frame = 0; frame < 120 * 150 && g.mode === "playing"; frame++) {
      const p = g.player,
        nearGoal = p.x > g.level.goal.x - 110;
      const dir = p.x > g.level.goal.x + 12 ? -1 : 1;
      const floor = g.level.platforms.find((f) => f.id === p.groundId);
      const edge = floor && floor.x + floor.w - (p.x + p.w) < 85;
      const threat = [
        ...g.level.spikes,
        ...g.level.enemies.filter((e) => e.alive),
      ].some((e) => e.x > p.x - 20 && e.x - p.x < 110);
      let jump = false;
      if (p.grounded) {
        if (jumpPhase !== 0) jumpPhase = 0;
        else if (!nearGoal && (edge || threat)) {
          jump = true;
          jumpPhase = 1;
        }
      } else if (jumpPhase === 1) {
        if (p.vy > -80) jumpPhase = 2;
        else jump = true;
      } else if (jumpPhase === 2) {
        jump = true;
        jumpPhase = 3;
      } else if (jumpPhase === 3) jump = true;
      tick(g, { right: dir === 1, left: dir === -1, jump });
    }
    assert.equal(
      g.mode,
      "complete",
      `level ${index + 1}: x=${g.player.x}, hp=${g.player.hp}, state=${g.mode}`,
    );
    assert.ok(g.collected > 5);
    assert.ok(g.stars() >= 1);
  }
});
