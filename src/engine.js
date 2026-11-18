import { makeLevel } from "./levels.js";
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const approach = (a, b, step) =>
  a < b ? Math.min(a + step, b) : Math.max(a - step, b);
export class Game {
  constructor(index = 0) {
    this.load(index);
  }
  load(index) {
    this.level = makeLevel(index);
    this.time = 0;
    this.collected = 0;
    this.mode = "playing";
    this.events = [];
    this.particles = [];
    this.projectiles = [];
    this.checkpoint = 0;
    this.deaths = 0;
    this.jumpWasDown = false;
    this.dashWasDown = false;
    this.player = {
      x: 90,
      y: 466,
      w: 29,
      h: 54,
      vx: 0,
      vy: 0,
      face: 1,
      hp: 3,
      grounded: false,
      groundId: null,
      coyote: 0,
      jumpBuffer: 0,
      jumps: 0,
      invulnerable: 0,
      dash: 0,
      dashCooldown: 0,
      stun: 0,
    };
    this.boss =
      index === 5
        ? {
            x: 820,
            y: 366,
            w: 112,
            h: 154,
            hp: 6,
            maxHp: 6,
            state: "wait",
            timer: 1.8,
            vx: 0,
            vy: 0,
            invulnerable: 0,
            target: 820,
            phase: 1,
            attack: "slam",
            attackIndex: 0,
            face: -1,
            reaction: 0,
            release: 0,
            shots: 0,
            shotTimer: 0,
            targetY: 466,
          }
        : null;
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  drain() {
    return this.events.splice(0);
  }
  burst(x, y, color = "#eebd58", n = 10) {
    for (let i = 0; i < n; i++)
      this.particles.push({
        x,
        y,
        vx: Math.cos(i * 2.4) * 85,
        vy: -80 - (i % 4) * 25,
        life: 0.6 + (i % 3) * 0.12,
        maxLife: 0.85,
        color,
        size: 3 + (i % 3),
      });
  }
  damage(fall = false) {
    const p = this.player;
    if (this.mode !== "playing" || (!fall && p.invulnerable > 0)) return;
    p.hp--;
    this.emit("hurt");
    this.burst(p.x + 14, p.y + 24, "#df7c5a");
    if (p.hp <= 0) {
      this.mode = "failed";
      this.emit("failed");
      return;
    }
    p.invulnerable = 1.5;
    p.dash = 0;
    if (fall) {
      const cp = this.level.checkpoints[this.checkpoint];
      p.x = cp.x;
      p.y = cp.y;
      p.vx = 0;
      p.vy = 0;
      p.jumps = 0;
      p.grounded = false;
      this.deaths++;
      this.projectiles = [];
    } else {
      p.vx = -p.face * 140;
      p.vy = -290;
      p.stun = 0.18;
    }
  }
  step(dt, input = {}) {
    if (this.mode !== "playing") return;
    dt = clamp(dt, 0, 1 / 30);
    this.time += dt;
    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.stun = Math.max(0, p.stun - dt);
    for (const f of this.level.platforms) {
      if (!f.moving) continue;
      const old = f.x;
      f.x = f.baseX + Math.sin(this.time * f.speed + f.phase) * f.range;
      if (p.grounded && p.groundId === f.id) p.x += f.x - old;
    }
    p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (input.jump && !this.jumpWasDown) p.jumpBuffer = 0.13;
    if (!input.jump && this.jumpWasDown && p.vy < -260) p.vy *= 0.56;
    this.jumpWasDown = !!input.jump;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    if (input.dash && !this.dashWasDown && p.dashCooldown <= 0) {
      p.dash = 0.18;
      p.dashCooldown = 1.1;
      p.vx = p.face * 610;
      p.vy = Math.min(0, p.vy) * 0.3;
      this.emit("dash");
    }
    this.dashWasDown = !!input.dash;
    if (p.jumpBuffer > 0 && (p.coyote > 0 || p.jumps < 2)) {
      const first = p.coyote > 0 || p.jumps === 0;
      p.vy = first ? -650 : -590;
      p.jumps = first ? 1 : 2;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this.emit("jump");
      this.burst(p.x + 15, p.y + 54, "#f5e7c3", 5);
    }
    if (p.dash > 0) {
      p.dash = Math.max(0, p.dash - dt);
      p.vx = p.face * 610;
      if (p.dash > 0) p.vy = 0;
    } else {
      if (p.stun <= 0)
        p.vx = approach(
          p.vx,
          dir * 275,
          (dir ? (p.vx * dir < 0 ? 3800 : 2600) : 3200) * dt,
        );
      p.vy = Math.min(880, p.vy + 1750 * dt);
    }
    const oldY = p.y,
      oldX = p.x;
    p.x = clamp(p.x + p.vx * dt, 0, this.level.length - p.w);
    for (const f of this.level.platforms) {
      if (f.oneWay || !overlap(p, f)) continue;
      if (oldY + p.h <= f.y + 1) continue;
      if (p.vx > 0 && oldX + p.w <= f.x + 3) p.x = f.x - p.w;
      else if (p.vx < 0 && oldX >= f.x + f.w - 3) p.x = f.x + f.w;
    }
    p.y += p.vy * dt;
    p.grounded = false;
    p.groundId = null;
    for (const f of this.level.platforms) {
      if (p.x + p.w <= f.x || p.x >= f.x + f.w) continue;
      if (p.vy >= 0 && oldY + p.h <= f.y + 3 && p.y + p.h >= f.y) {
        p.y = f.y - p.h;
        p.vy = 0;
        p.grounded = true;
        p.groundId = f.id;
        p.jumps = 0;
      } else if (
        !f.oneWay &&
        p.vy < 0 &&
        oldY >= f.y + f.h &&
        p.y <= f.y + f.h
      ) {
        p.y = f.y + f.h;
        p.vy = 0;
      }
    }
    for (const s of this.level.springs)
      if (p.vy >= 0 && overlap(p, s)) {
        p.vy = -900;
        p.jumps = 1;
        p.grounded = false;
        this.emit("spring");
      }
    for (const c of this.level.coins)
      if (
        !c.taken &&
        overlap({ x: p.x - 9, y: p.y - 5, w: p.w + 18, h: p.h + 10 }, c)
      ) {
        c.taken = true;
        this.collected++;
        this.burst(c.x + 10, c.y + 14);
        this.emit("coin");
      }
    for (const h of this.level.hearts)
      if (!h.taken && overlap(p, h) && p.hp < 3) {
        h.taken = true;
        p.hp++;
        this.emit("heart");
        this.burst(h.x, h.y, "#eb8869");
      }
    for (const s of this.level.spikes) if (overlap(p, s)) this.damage();
    for (const e of this.level.enemies) {
      if (!e.alive) continue;
      e.x += e.vx * dt;
      if (e.x < e.min) {
        e.x = e.min;
        e.vx = Math.abs(e.vx);
      }
      if (e.x > e.max) {
        e.x = e.max;
        e.vx = -Math.abs(e.vx);
      }
      if (overlap(p, e)) {
        if (p.dash > 0 || (p.vy > 0 && oldY + p.h <= e.y + 14)) {
          e.alive = false;
          this.burst(e.x + 18, e.y, "#95b2a4");
          if (p.dash <= 0) {
            p.vy = -420;
            p.jumps = 1;
          }
          this.emit("enemy");
        } else this.damage();
      }
    }
    if (p.y > 820) this.damage(true);
    this.level.checkpoints.forEach((cp, i) => {
      if (i > this.checkpoint && p.x >= cp.x && p.grounded) {
        this.checkpoint = i;
        this.emit("checkpoint");
      }
    });
    if (this.boss) this.updateBoss(dt, oldY);
    for (const v of this.projectiles) {
      v.life -= dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      if (v.kind === "box") v.vy += 1100 * dt;
      if (v.kind === "console") v.vy += 380 * dt;
      if (v.life > 0 && overlap(p, v)) {
        this.damage();
        v.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter((v) => v.life > 0 && v.y < 800);
    for (const v of this.particles) {
      v.life -= dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.vy += 280 * dt;
    }
    this.particles = this.particles.filter((v) => v.life > 0);
    const goal = this.level.goal;
    if (
      goal &&
      overlap(p, { x: goal.x, y: goal.y - goal.h, w: goal.w, h: goal.h })
    ) {
      this.mode = "complete";
      this.emit("complete");
    }
  }
  recoverBoss(duration) {
    const b = this.boss;
    b.state = "stunned";
    b.timer = duration;
    b.vx = 0;
    b.vy = 0;
    b.y = 520 - b.h;
    this.emit("bossStun", { attack: b.attack });
  }
  throwConsole() {
    const b = this.boss;
    const x = b.x + b.w / 2 + b.face * 65,
      y = b.y + 58;
    const flight = clamp(Math.abs(b.target + 42 - x) / 310, 0.3, 1.5);
    const vy = clamp(
      (b.targetY - y - 0.5 * 380 * flight * flight) / flight,
      -300,
      140,
    );
    this.projectiles.push({
      kind: "console",
      x,
      y,
      w: 24,
      h: 30,
      vx: b.face * (b.phase === 2 ? 340 : 310),
      vy,
      life: 3,
    });
    b.release = 0.17;
    this.emit("bossThrow");
  }
  updateBoss(dt, oldY) {
    const b = this.boss,
      p = this.player;
    if (b.hp <= 0) return;
    b.timer -= dt;
    b.invulnerable = Math.max(0, b.invulnerable - dt);
    b.reaction = Math.max(0, b.reaction - dt);
    b.release = Math.max(0, b.release - dt);
    b.phase = b.hp <= 3 ? 2 : 1;
    if (b.state === "wait") {
      const distance = p.x + p.w / 2 - (b.x + b.w / 2);
      if (Math.abs(distance) > 8) b.face = Math.sign(distance);
      b.vx = Math.abs(distance) > 190 ? b.face * (b.phase === 2 ? 65 : 45) : 0;
      b.x = clamp(b.x + b.vx * dt, 50, this.level.length - 180);
      if (b.timer <= 0) {
        b.attack = ["slam", "throw", "charge"][b.attackIndex++ % 3];
        b.state = "warn";
        b.vx = 0;
        b.timer = b.attack === "throw" ? 0.8 : 0.95;
        b.target = clamp(p.x - 42, 100, this.level.length - 200);
        b.targetY = p.y + 24;
        this.emit("bossWarn", { attack: b.attack });
      }
    } else if (b.state === "warn" && b.timer <= 0) {
      if (b.attack === "slam") {
        b.state = "jump";
        b.vy = -700;
        b.vx = (b.target - b.x) / 0.8;
        b.timer = 2;
      } else if (b.attack === "throw") {
        b.state = "throw";
        b.timer = b.phase === 2 ? 0.85 : 0.65;
        b.shots = 0;
        b.shotTimer = 0;
      } else {
        b.state = "charge";
        b.timer = 0.85;
        b.vx = b.face * (b.phase === 2 ? 510 : 450);
        this.emit("bossCharge");
      }
    } else if (b.state === "jump") {
      b.x = clamp(b.x + b.vx * dt, 50, this.level.length - 180);
      b.y += b.vy * dt;
      b.vy += 1800 * dt;
      if (b.y >= 520 - b.h) {
        this.recoverBoss(b.phase === 2 ? 2.2 : 2.8);
        this.burst(b.x + 50, 520, "#d68d79", 18);
        for (const sign of [-1, 1])
          this.projectiles.push({
            kind: "wave",
            x: b.x + 56,
            y: 493,
            w: 25,
            h: 27,
            vx: sign * (175 + b.phase * 25),
            vy: 0,
            life: 3,
          });
        if (b.phase === 2)
          for (let i = 0; i < 3; i++)
            this.projectiles.push({
              kind: "box",
              x: clamp(p.x - 180 + i * 180, 20, 1220),
              y: -250 - i * 130,
              w: 25,
              h: 25,
              vx: 0,
              vy: 120,
              life: 4,
            });
      }
    } else if (b.state === "throw") {
      b.shotTimer -= dt;
      if (b.shotTimer <= 0 && b.shots < (b.phase === 2 ? 3 : 2)) {
        this.throwConsole();
        b.shots++;
        b.shotTimer = 0.22;
      }
      if (b.timer <= 0) this.recoverBoss(b.phase === 2 ? 1.6 : 1.9);
    } else if (b.state === "charge") {
      const nextX = b.x + b.vx * dt;
      b.x = clamp(nextX, 50, this.level.length - 180);
      if (b.timer <= 0 || nextX !== b.x) {
        this.recoverBoss(2.1);
        this.burst(b.x + b.w / 2, 514, "#d68d79", 16);
      }
    } else if (b.state === "stunned" && b.timer <= 0) {
      b.state = "wait";
      b.timer = b.phase === 2 ? 0.65 : 1.25;
    }
    if (overlap(p, b)) {
      if (
        b.state === "stunned" &&
        b.invulnerable <= 0 &&
        (p.dash > 0 || (p.vy > 0 && oldY + p.h <= b.y + 25))
      ) {
        b.hp--;
        b.invulnerable = 0.9;
        b.reaction = 0.3;
        b.x = clamp(b.x + p.face * 12, 50, this.level.length - 180);
        b.timer = Math.max(b.timer, 0.55);
        p.vy = -540;
        p.invulnerable = 1.1;
        p.jumps = 1;
        this.burst(b.x + 50, b.y, "#e9b653", 18);
        this.emit("bossHit");
        if (b.hp === 0) {
          b.state = "defeated";
          b.vx = 0;
          this.projectiles = [];
          this.mode = "won";
          this.emit("won");
        }
      } else if (b.invulnerable <= 0) this.damage();
    }
  }
  stars() {
    const ratio = this.level.coins.length
      ? this.collected / this.level.coins.length
      : 1;
    return ratio >= 0.85 ? 3 : ratio >= 0.5 ? 2 : 1;
  }
}
