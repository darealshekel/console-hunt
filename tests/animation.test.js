import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/engine.js";
import { HeroAnimator } from "../src/hero-animation.js";
import { bossPose } from "../src/boss-animation.js";

test("run cycle follows traveled distance, stops on release, and freezes while paused", () => {
  const g = new Game(),
    anim = new HeroAnimator(),
    frames = new Set();
  for (let i = 0; i < 100; i++) {
    g.step(1 / 120, { right: true });
    const pose = anim.update(g.player, g.time);
    if (pose.state === "run") frames.add(pose.frame);
  }
  assert.equal(frames.size, 6);
  const before = anim.pose;
  assert.equal(anim.update(g.player, g.time), before);
  for (let i = 0; i < 15; i++) {
    g.step(1 / 120, {});
    anim.update(g.player, g.time);
  }
  assert.equal(g.player.vx, 0);
  assert.equal(anim.pose.state, "idle");
  g.player.vx = 275;
  assert.equal(
    anim.update(g.player, g.time + 1 / 60).state,
    "idle",
    "blocked character must not run in place",
  );
});

test("a normal jump animates takeoff, ascent, apex, falling, and landing without delaying input", () => {
  const g = new Game(),
    anim = new HeroAnimator(),
    states = new Set(),
    frames = new Set();
  g.step(1 / 120, {});
  anim.update(g.player, g.time);
  const start = g.player.y;
  for (let i = 0; i < 160; i++) {
    g.step(1 / 120, { jump: i < 90 });
    const pose = anim.update(g.player, g.time);
    states.add(pose.state);
    frames.add(pose.frame);
    if (i === 0)
      assert.ok(
        g.player.y < start,
        "jump must begin on the first simulation step",
      );
  }
  for (const state of ["jump", "apex", "fall", "land", "idle"])
    assert.ok(states.has(state), state);
  for (const frame of [2, 3, 10, 11])
    assert.ok(frames.has(frame), `missing pose ${frame}`);
});

test("boss animation distinguishes warnings, attacks, damage, recovery, and defeat", () => {
  const b = new Game(5).boss;
  for (const [attack, frame] of [
    ["slam", 3],
    ["throw", 6],
    ["charge", 9],
  ]) {
    b.state = "warn";
    b.attack = attack;
    assert.equal(bossPose(b, 0).frame, frame);
  }
  b.state = "throw";
  b.release = 0.1;
  assert.equal(bossPose(b, 0).frame, 7);
  b.release = 0;
  assert.equal(bossPose(b, 0).frame, 6);
  b.state = "jump";
  assert.equal(bossPose(b, 0).frame, 4);
  b.state = "stunned";
  assert.equal(bossPose(b, 0).frame, 5);
  b.reaction = 0.3;
  assert.equal(bossPose(b, 0).state, "hurt");
  b.hp = 0;
  assert.equal(bossPose(b, 0).frame, 11);
});

test("boss cycles all three attacks, telegraphs them, emits damaging projectiles, and recovers", () => {
  const g = new Game(5),
    warnings = [],
    recovered = new Set();
  let thrown = 0,
    charge = false;
  for (let i = 0; i < 120 * 24; i++) {
    g.player.invulnerable = 1;
    g.step(1 / 120, {});
    for (const e of g.drain()) {
      if (e.type === "bossWarn") warnings.push(e.attack);
      if (e.type === "bossStun") recovered.add(e.attack);
      if (e.type === "bossThrow") thrown++;
    }
    if (g.boss.state === "warn") assert.ok(g.boss.vx === 0);
    if (g.boss.state === "charge") {
      charge = true;
      assert.equal(Math.abs(g.boss.vx), 450);
    }
  }
  assert.deepEqual(warnings.slice(0, 3), ["slam", "throw", "charge"]);
  assert.equal(recovered.size, 3);
  assert.ok(thrown >= 2);
  assert.ok(charge);
  g.player.invulnerable = 0;
  const hp = g.player.hp;
  g.projectiles = [
    {
      kind: "console",
      x: g.player.x,
      y: g.player.y,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      life: 1,
    },
  ];
  g.step(1 / 120, {});
  assert.equal(g.player.hp, hp - 1);
});

test("second boss phase throws three consoles and charges faster", () => {
  const g = new Game(5);
  g.boss.hp = 3;
  g.boss.attackIndex = 1;
  g.boss.timer = 0;
  let shots = 0,
    charging = false;
  for (let i = 0; i < 120 * 9; i++) {
    g.player.invulnerable = 1;
    g.step(1 / 120, {});
    shots += g.drain().filter((e) => e.type === "bossThrow").length;
    if (g.boss.state === "charge") {
      charging = true;
      assert.equal(Math.abs(g.boss.vx), 510);
      break;
    }
  }
  assert.equal(shots, 3);
  assert.ok(charging);
});
