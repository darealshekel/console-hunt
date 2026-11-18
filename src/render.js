import { clamp } from "./engine.js";
import { HERO_FRAMES, HeroAnimator } from "./hero-animation.js";
import { BOSS_FRAMES, bossPose } from "./boss-animation.js";
const INK = "#293e38",
  PAPER = "#f8f2e3";
const noise = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export class Renderer {
  constructor(canvas, ad, heroArt, bossArt) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ad = ad;
    this.heroArt = heroArt;
    this.bossArt = bossArt;
    this.heroAnimator = new HeroAnimator();
    this.camera = { x: 0, y: 0 };
    this.shake = 0;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
  }
  resize() {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.landscape = this.w > this.h;
    this.vw = this.landscape ? (this.w / this.h) * 480 : 390;
    this.vh = this.landscape ? 480 : (this.h / this.w) * 390;
  }
  reset() {
    this.heroAnimator.reset();
    this.camera.x = 0;
    this.camera.y = 520 - this.vh * 0.7;
  }
  line(points, color = INK, width = 1.6, closed = false, fill = null) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
    if (closed) c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.stroke();
  }
  ellipse(x, y, rx, ry, fill, stroke = null, width = 1.5) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  console(x, y, size = 28, rotation = 0) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.scale(size / 28, size / 28);
    this.ellipse(0, 16, 13, 2, "#243b3820");
    this.line(
      [
        [-5, -14],
        [5, -14],
        [7, 14],
        [-7, 14],
      ],
      INK,
      1.2,
      true,
      "#244c59",
    );
    this.line(
      [
        [-5, -15],
        [-14, -18],
        [-11, -3],
        [-12, 15],
        [-4, 14],
      ],
      INK,
      1.3,
      true,
      "#fffcf2",
    );
    this.line(
      [
        [5, -15],
        [12, -18],
        [11, -1],
        [14, 15],
        [5, 14],
      ],
      INK,
      1.3,
      true,
      "#f0f3e9",
    );
    this.line(
      [
        [-3, -10],
        [-3, 9],
      ],
      "#5aa9c7",
      1.5,
    );
    this.line(
      [
        [7, 6],
        [7, 10],
      ],
      "#6e7e7a",
      0.8,
    );
    c.restore();
  }
  star(x, y, r = 7, color = "#e2a541") {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        s = i % 2 ? r * 0.27 : r;
      pts.push([x + Math.cos(a) * s, y + Math.sin(a) * s]);
    }
    this.line(pts, color, 0.7, true, color);
  }
  animatedHero(x, feet, height, face, pose, alpha = 1) {
    const c = this.ctx,
      frame = HERO_FRAMES[pose.frame],
      scale = height / 314;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, feet + pose.bob);
    c.scale(face, 1);
    c.rotate(pose.tilt);
    c.scale(pose.scaleX, pose.scaleY);
    c.drawImage(
      this.heroArt,
      ...frame.rect,
      -frame.anchor[0] * scale,
      -frame.anchor[1] * scale,
      frame.rect[2] * scale,
      frame.rect[3] * scale,
    );
    c.restore();
  }
  animatedBoss(b, time) {
    const c = this.ctx,
      pose = bossPose(b, time, this.reduced),
      frame = BOSS_FRAMES[pose.frame],
      scale = 170 / 253;
    this.bossPose = pose;
    c.save();
    c.translate(b.x + b.w / 2, b.y + b.h + pose.bob);
    c.scale(b.face * frame.face, pose.scaleY);
    c.rotate(pose.tilt);
    c.globalAlpha = b.invulnerable > 0 && Math.sin(time * 35) > 0.3 ? 0.6 : 1;
    c.drawImage(
      this.bossArt,
      ...frame.rect,
      -frame.anchor[0] * scale,
      -frame.anchor[1] * scale,
      frame.rect[2] * scale,
      frame.rect[3] * scale,
    );
    c.restore();
  }
  cloud(x, y, s = 1, color = "#fffaf0b0") {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.beginPath();
    c.moveTo(-42, 12);
    c.bezierCurveTo(-68, 12, -65, -7, -42, -7);
    c.bezierCurveTo(-37, -35, -6, -36, 5, -17);
    c.bezierCurveTo(25, -33, 49, -17, 45, -1);
    c.bezierCurveTo(69, 1, 65, 17, 43, 17);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = "#687e6d30";
    c.lineWidth = 1.2;
    c.stroke();
    c.restore();
  }
  palm(x, y, s = 1) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    this.line(
      [
        [-5, 0],
        [-4, -36],
        [2, -73],
        [6, -105],
        [13, -108],
        [10, -70],
        [6, -33],
        [5, 0],
      ],
      "#6e7860",
      1.2,
      true,
      "#bbaa7d",
    );
    for (let n = 0; n < 7; n++)
      this.line(
        [
          [-2, -n * 13 - 5],
          [8, -n * 13 - 1],
        ],
        "#7c80634a",
        1,
      );
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI + 0.4 + j * 0.48;
      const end = [9 + Math.cos(a) * 64, -106 + Math.sin(a) * 32 + 18];
      const mid = [9 + Math.cos(a) * 33, -132 + Math.sin(a) * 20];
      this.line(
        [[9, -108], mid, end, [mid[0], mid[1] + 10]],
        "#647f67",
        1,
        true,
        j % 2 ? "#8eaa79" : "#a7b78d",
      );
      for (let k = 1; k < 5; k++) {
        const t = k / 5;
        this.line(
          [
            [
              9 + (end[0] - 9) * t,
              -108 + (end[1] + 108) * t - 14 * Math.sin(t * Math.PI),
            ],
            [9 + (end[0] - 9) * t - 4, -108 + (end[1] + 108) * t + 4],
          ],
          "#5b765e60",
          0.7,
        );
      }
    }
    this.ellipse(8, -103, 4, 5, "#9e8c66");
    c.restore();
  }
  cactus(x, y, s = 1) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.strokeStyle = "#7c9468";
    c.lineWidth = 12;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -61);
    c.moveTo(0, -23);
    c.lineTo(-20, -23);
    c.lineTo(-20, -42);
    c.moveTo(0, -35);
    c.lineTo(19, -35);
    c.lineTo(19, -57);
    c.stroke();
    this.line(
      [
        [-2, -55],
        [-2, -4],
      ],
      "#597553",
      1,
    );
    this.line(
      [
        [-22, -38],
        [-22, -26],
      ],
      "#597553",
      1,
    );
    c.restore();
  }
  building(x, y, w, h, color, seed) {
    this.line(
      [
        [x, y],
        [x + 1, y - h],
        [x + w * 0.65, y - h - 2],
        [x + w, y - h + 2],
        [x + w + 1, y],
      ],
      "#657d6d60",
      1,
      true,
      color,
    );
    for (let j = 0; j < Math.floor(h / 24) - 1; j++)
      for (let k = 0; k < Math.floor(w / 18) - 1; k++) {
        const xx = x + 8 + k * 18,
          yy = y - h + 12 + j * 24;
        this.line(
          [
            [xx, yy],
            [xx + 7, yy],
            [xx + 7, yy + 10],
            [xx, yy + 9],
          ],
          "#667b7038",
          0.7,
          true,
          noise(seed + j + k) > 0.5 ? "#f5dfae" : "#9eaa9470",
        );
      }
  }
  background(theme, index, time, cam = 0, w = this.vw, h = this.vh) {
    const c = this.ctx;
    c.fillStyle = theme.sky;
    c.fillRect(0, 0, w, h);
    const horizon = h * 0.65;
    if (index === 3) {
      this.ellipse(w * 0.77, 80, 27, 27, "#ecdeb0");
      this.ellipse(w * 0.77 - 12, 69, 25, 25, theme.sky);
      for (let i = 0; i < 30; i++)
        this.star(
          noise(i + 30) * w,
          35 + noise(i + 60) * h * 0.45,
          1.5 + noise(i) * 1.6,
          "#e9d7aa80",
        );
    } else {
      this.ellipse(
        w * 0.79,
        110,
        37,
        37,
        index === 5 ? "#e8b698" : "#e8c77955",
      );
      for (let j = 0; j < 4; j++) {
        const x =
          ((((j * 235 - cam * 0.08 + time * 1.4) % (w + 180)) + w + 180) %
            (w + 180)) -
          70;
        this.cloud(x, 75 + (j % 2) * 72, 0.6 + j * 0.09);
      }
    }
    for (let layer = 0; layer < 2; layer++) {
      c.beginPath();
      c.moveTo(-30, h);
      for (let x = -30; x <= w + 50; x += 24) {
        const y =
          horizon -
          layer * 23 +
          Math.sin((x + cam * (layer ? 0.15 : 0.07)) / 150 + layer * 2) * 30 +
          Math.sin((x + cam * 0.08) / 73) * 10;
        c.lineTo(x, y);
      }
      c.lineTo(w + 50, h);
      c.closePath();
      c.fillStyle = layer ? theme.hill : theme.far;
      c.globalAlpha = 0.47;
      c.fill();
      c.globalAlpha = 1;
    }
    const spacing = index === 0 ? 250 : index === 2 ? 250 : 145;
    for (
      let i = Math.floor((cam * 0.22) / spacing) - 1;
      i < Math.floor((cam * 0.22 + w) / spacing) + 2;
      i++
    ) {
      const x = i * spacing - cam * 0.22,
        y = horizon + 38;
      c.save();
      c.globalAlpha = 0.63;
      if (index === 0) this.palm(x + 75, y, 0.8 + noise(i + 70) * 0.3);
      else if (index === 1) {
        this.building(
          x,
          y,
          80 + noise(i) * 40,
          75 + noise(i + 7) * 110,
          noise(i) > 0.5 ? "#c7b495" : "#d8bf9e",
          i,
        );
        this.line(
          [
            [x - 4, y - 80],
            [x + 43, y - 111],
            [x + 87, y - 81],
          ],
          "#9e8b75",
          1,
          true,
          "#b19c81",
        );
      } else if (index === 2) this.cactus(x + 35, y, 0.9 + noise(i + 44) * 0.5);
      else if (index === 3) {
        this.building(x, y, 110, 40 + noise(i) * 40, "#6b8488", i);
        this.line(
          [
            [x + 20, y - 25],
            [x + 20, y - 150],
            [x + 120, y - 150],
            [x - 7, y - 125],
          ],
          "#8caaa8",
          2,
        );
        this.line(
          [
            [x + 107, y - 149],
            [x + 107, y - 80],
            [x + 113, y - 74],
          ],
          "#8caaa8",
          1,
        );
      } else if (index === 4) {
        for (let row = 0; row < 3; row++) {
          this.building(x + row * 5, y - row * 42, 80, 40, "#c1997d", i);
          this.line(
            [
              [x + 5, y - row * 42 - 33],
              [x + 72, y - row * 42 - 4],
            ],
            "#826c5350",
            1,
          );
        }
      } else {
        this.building(x, y, 96, 65 + noise(i) * 50, "#be9aab", i);
        this.console(x + 40, y - 80, 22);
      }
      c.restore();
    }
    if (index === 0 || index === 3) {
      c.fillStyle = index === 0 ? "#90b9b029" : "#598b9635";
      c.fillRect(0, horizon + 40, w, 55);
      for (let i = 0; i < 14; i++) {
        const x = (i * 67 - cam * 0.1) % (w + 100);
        this.line(
          [
            [x, horizon + 49 + (i % 4) * 10],
            [x + 25, horizon + 50 + (i % 4) * 10],
          ],
          "#f7f0db45",
          1,
        );
      }
    }
  }
  ground(f, theme, index) {
    const c = this.ctx,
      top = f.y;
    this.line(
      [
        [f.x, top + 1],
        [f.x + f.w * 0.3, top - 1],
        [f.x + f.w * 0.7, top + 1],
        [f.x + f.w, top],
        [f.x + f.w, top + f.h],
        [f.x, top + f.h],
      ],
      INK,
      1.4,
      true,
      theme.soil,
    );
    c.fillStyle = theme.grass;
    c.fillRect(f.x + 1, top + 1, f.w - 2, f.ground ? 9 : 6);
    if (f.ground) {
      for (let x = f.x + 7; x < f.x + f.w; x += 23) {
        const n = noise(x);
        this.line(
          [
            [x, top + 4],
            [x + 5, top - 4 - n * 3],
            [x + 9, top + 4],
          ],
          theme.grass,
          1.4,
        );
        this.line(
          [
            [x, top + 28 + n * 52],
            [x + 8, top + 24 + n * 52],
          ],
          "#786c4540",
          1,
        );
        if (index !== 3)
          this.line(
            [
              [x + 7, top + 90 + n * 40],
              [x + 11, top + 89 + n * 40],
            ],
            "#786c4528",
            1.5,
          );
      }
    } else {
      for (let x = f.x + 8; x < f.x + f.w - 5; x += 22)
        this.line(
          [
            [x, top + 9],
            [x + 8, top + 15],
          ],
          "#55473555",
          1,
        );
      if (f.moving) {
        this.line(
          [
            [f.x + 8, top + f.h + 3],
            [f.x + f.w - 8, top + f.h + 3],
          ],
          theme.accent,
          2,
        );
      }
    }
  }
  enemy(e, t) {
    const c = this.ctx,
      x = e.x + 18,
      y = e.y + 17 + Math.sin(t * 8) * 1.3;
    c.save();
    c.translate(x, y);
    this.ellipse(0, 15, 19, 4, "#263c3722");
    this.line(
      [
        [-20, 5],
        [-17, -10],
        [-8, -15],
        [9, -14],
        [18, -8],
        [21, 8],
        [12, 12],
        [6, 6],
        [-6, 6],
        [-12, 12],
      ],
      INK,
      1.8,
      true,
      "#8ba79e",
    );
    this.line(
      [
        [-13, -5],
        [-6, -5],
        [-9, -8],
        [-9, 0],
      ],
      INK,
      1.5,
    );
    this.ellipse(11, -5, 2, 2, "#ed9b71");
    this.line(
      [
        [-4, 0],
        [-1, -2],
        [3, -2],
        [6, 0],
      ],
      INK,
      1.5,
    );
    this.line(
      [
        [-12, 15],
        [-12 + Math.sin(t * 12) * 4, 19],
        [-17, 19],
      ],
      INK,
      2,
    );
    this.line(
      [
        [12, 15],
        [12 - Math.sin(t * 12) * 4, 19],
        [17, 19],
      ],
      INK,
      2,
    );
    c.restore();
  }
  checkpoint(cp, active) {
    this.line(
      [
        [cp.x + 10, 520],
        [cp.x + 10, 448],
      ],
      INK,
      2,
    );
    this.line(
      [
        [cp.x + 11, 449],
        [cp.x + 40, 454],
        [cp.x + 34, 469],
        [cp.x + 11, 466],
      ],
      INK,
      1,
      true,
      active ? "#f5bb62" : "#efe6d1",
    );
    if (active) this.star(cp.x + 23, 458, 5, "#657c60");
  }
  billboard() {
    const c = this.ctx,
      x = 320,
      y = 224,
      w = 176,
      h = (w * this.ad.height) / this.ad.width;
    for (const dx of [23, w - 23])
      this.line(
        [
          [x + dx - 4, y + h],
          [x + dx + 4, y + h],
          [x + dx + 6, 520],
          [x + dx - 5, 520],
        ],
        "#79684f",
        1.4,
        true,
        "#b29a74",
      );
    this.line(
      [
        [x - 8, y - 8],
        [x + w + 7, y - 6],
        [x + w + 9, y + h + 8],
        [x - 7, y + h + 10],
      ],
      INK,
      2,
      true,
      "#f9efd8",
    );
    c.drawImage(this.ad, x, y, w, h);
    for (const dx of [-3, w + 3])
      for (const dy of [-3, h + 3])
        this.ellipse(x + dx, y + dy, 1.3, 1.3, "#79684f");
  }
  gate(g, t) {
    const c = this.ctx;
    this.line(
      [
        [g.x, 520],
        [g.x, 432],
        [g.x + 58, 430],
        [g.x + 60, 520],
      ],
      INK,
      3,
    );
    c.fillStyle = "#f5ebcd";
    c.fillRect(g.x + 3, 433, 52, 85);
    this.line(
      [
        [g.x - 8, 425],
        [g.x + 30, 406],
        [g.x + 68, 426],
      ],
      INK,
      2,
      true,
      "#7fa495",
    );
    this.console(g.x + 28, 470 + Math.sin(t * 2) * 3, 29);
    this.star(g.x + 62, 444, 6, "#d19f4b");
    c.fillStyle = INK;
    c.font = "11px Rubik";
    c.textAlign = "center";
    c.direction = "rtl";
    c.fillText("ממשיכים!", g.x + 28, 503);
  }
  draw(game, dt) {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.scale(this.w / this.vw, this.h / this.vh);
    const p = game.player,
      L = game.level,
      t = game.time;
    const cx = clamp(p.x - this.vw * 0.32, 0, Math.max(0, L.length - this.vw)),
      cy = 520 - this.vh * 0.7 + Math.min(0, p.y - 250) * 0.3;
    this.camera.x += (cx - this.camera.x) * Math.min(1, dt * 6);
    this.camera.y += (cy - this.camera.y) * Math.min(1, dt * 5);
    this.background(L.theme, L.index, t, this.camera.x);
    c.save();
    if (this.shake > 0 && !this.reduced) {
      c.translate(
        Math.sin(t * 70) * this.shake,
        Math.cos(t * 63) * this.shake * 0.5,
      );
      this.shake = Math.max(0, this.shake - dt * 24);
    }
    c.translate(-this.camera.x, -this.camera.y);
    const visible = (x) =>
      x > this.camera.x - 160 && x < this.camera.x + this.vw + 180;
    if (L.index === 0 && visible(320)) this.billboard();
    for (const f of L.platforms)
      if (f.x + f.w > this.camera.x - 60 && f.x < this.camera.x + this.vw + 60)
        this.ground(f, L.theme, L.index);
    for (const s of L.spikes)
      if (visible(s.x)) {
        for (let x = s.x; x < s.x + s.w; x += 12)
          this.line(
            [
              [x, s.y + s.h],
              [x + 6, s.y],
              [x + 12, s.y + s.h],
            ],
            INK,
            1,
            true,
            "#b8beb0",
          );
      }
    for (const s of L.springs)
      if (visible(s.x)) {
        this.line(
          [
            [s.x, s.y + 14],
            [s.x + 26, s.y + 10],
            [s.x + 2, s.y + 6],
            [s.x + 28, s.y + 2],
          ],
          "#465f5a",
          2,
        );
        this.line(
          [
            [s.x - 2, s.y],
            [s.x + 32, s.y],
          ],
          "#d98a58",
          5,
        );
      }
    for (const coin of L.coins)
      if (!coin.taken && visible(coin.x)) {
        this.console(
          coin.x + 10,
          coin.y + 14 + Math.sin(t * 3 + coin.x * 0.02) * 3,
          22,
          Math.sin(t * 2 + coin.id) * 0.06,
        );
        if (coin.id % 4 === 0)
          this.star(coin.x + 23, coin.y + 5, 3 + Math.sin(t * 4) * 1.2);
      }
    for (const heart of L.hearts)
      if (!heart.taken && visible(heart.x)) {
        c.fillStyle = "#df7f65";
        c.font = "25px Rubik";
        c.textAlign = "center";
        c.fillText("♥", heart.x + 10, heart.y + 20 + Math.sin(t * 3) * 3);
      }
    L.checkpoints.forEach((cp, i) => {
      if (i && visible(cp.x)) this.checkpoint(cp, game.checkpoint >= i);
    });
    for (const e of L.enemies) if (e.alive && visible(e.x)) this.enemy(e, t);
    if (L.goal && visible(L.goal.x)) this.gate(L.goal, t);
    if (game.boss) {
      const b = game.boss;
      for (let i = 0; i < 7; i++)
        this.console(
          L.length - 125 + (i % 3) * 25,
          500 - Math.floor(i / 3) * 30,
          27,
          ((i % 3) - 1) * 0.2,
        );
      if (b.state === "warn") {
        c.save();
        c.globalAlpha = 0.3 + Math.sin(t * 15) * 0.12;
        c.fillStyle = "#e16659";
        if (b.attack === "charge") {
          const end = b.x + b.w / 2 + b.face * 330;
          c.fillRect(Math.min(b.x + b.w / 2, end), 509, 330, 10);
        } else c.fillRect(b.target - 15, 515, b.w + 30, 6);
        c.restore();
        this.line(
          [
            [b.target + 56, 469],
            [b.target + 56, 491],
          ],
          "#ba4d4a",
          3,
        );
        this.ellipse(b.target + 56, 501, 2.5, 2.5, "#ba4d4a");
      }
      this.ellipse(b.x + b.w / 2, 520, b.w * 0.6, 7, "#263c3723");
      this.animatedBoss(b, t);
      if (b.state === "stunned")
        for (let i = 0; i < 3; i++)
          this.star(
            b.x + 25 + i * 30,
            b.y - 22 + Math.sin(t * 5 + i) * 7,
            7,
            "#dcaa46",
          );
    }
    for (const v of game.projectiles) {
      if (v.kind === "wave") {
        this.line(
          [
            [v.x, v.y + v.h],
            [v.x + 8, v.y + 7],
            [v.x + 15, v.y],
            [v.x + 23, v.y + v.h],
          ],
          "#bb704f",
          2,
          true,
          "#dfb78688",
        );
      } else if (v.kind === "console") {
        this.console(v.x + v.w / 2, v.y + v.h / 2, 25, t * 8 * Math.sign(v.vx));
      } else {
        this.line(
          [
            [v.x, v.y],
            [v.x + 25, v.y],
            [v.x + 25, v.y + 25],
            [v.x, v.y + 25],
          ],
          INK,
          1,
          true,
          "#c0956c",
        );
        this.line(
          [
            [v.x + 12, v.y],
            [v.x + 12, v.y + 25],
          ],
          "#ead5ac",
          5,
        );
      }
    }
    this.ellipse(p.x + 14, p.y + p.h + 2, 17, 3, "#263c3723");
    if (p.dash > 0 && !this.reduced) {
      for (let i = 1; i < 4; i++)
        this.line(
          [
            [p.x - p.face * i * 17, p.y + 10 + i * 8],
            [p.x - p.face * (i * 17 + 20), p.y + 10 + i * 8],
          ],
          "#fff8e4",
          3 - i * 0.5,
        );
    }
    const pose = this.heroAnimator.update(p, t, this.reduced);
    this.animatedHero(
      p.x + p.w / 2,
      p.y + p.h,
      77,
      p.face,
      pose,
      p.invulnerable > 0 && Math.sin(t * 35) > 0 ? 0.35 : 1,
    );
    if (p.jumps === 2 && !p.grounded && p.vy < 0)
      this.ellipse(p.x + 14, p.y + 60, 16, 3, "#faf1d160");
    for (const particle of game.particles) {
      c.globalAlpha = Math.min(1, particle.life / 0.3);
      this.star(particle.x, particle.y, particle.size, particle.color);
    }
    c.globalAlpha = 1;
    c.restore();
  }
  home(time) {
    const c = this.ctx,
      w = this.w,
      h = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = PAPER;
    c.fillRect(0, 0, w, h);
    const land = this.landscape,
      x = land ? w * 0.25 : w * 0.54,
      ground = land ? h * 0.64 : h * 0.665,
      heroH = land ? h * 0.4 : clamp(h * 0.225, 135, 210),
      left = land ? 0 : 0,
      sw = land ? w * 0.48 : w;
    c.save();
    c.beginPath();
    c.rect(left, land ? h * 0.16 : h * 0.37, sw, land ? h * 0.52 : h * 0.36);
    c.clip();
    this.cloud(land ? sw * 0.35 : 30, ground - heroH + 30, 0.65, "#fffdf5");
    this.cloud(sw * 0.85, ground - heroH * 0.8, 0.7, "#fffdf5");
    this.line(
      [
        [-30, ground + 10],
        [sw * 0.16, ground - 21],
        [sw * 0.35, ground - 4],
        [sw * 0.61, ground - 26],
        [sw * 0.84, ground - 12],
        [sw + 30, ground + 12],
      ],
      "#b9c4a745",
      1,
      true,
      "#d9e0c675",
    );
    this.palm(sw * 0.15, ground, land ? 0.55 : 0.68);
    this.palm(sw * 0.88, ground + 2, land ? 0.72 : 0.86);
    this.line(
      [
        [sw * 0.1, ground + 9],
        [sw * 0.3, ground + 4],
        [sw * 0.5, ground + 8],
        [sw * 0.75, ground + 3],
        [sw * 0.92, ground + 9],
      ],
      "#8b9c7860",
      1.5,
    );
    this.ellipse(x, ground + 4, heroH * 0.32, 9, "#8d9e7025");
    const menuPhase = this.reduced ? 0 : (time * 1.8) % 1;
    this.animatedHero(x, ground, heroH, 1, {
      frame: 4 + Math.floor(menuPhase * 6),
      tilt: 0.03,
      scaleX: 1,
      scaleY: 1,
      bob: this.reduced ? 0 : -Math.abs(Math.sin(menuPhase * Math.PI * 2)) * 3,
    });
    const b = this.reduced ? 0 : Math.sin(time * 2) * 4;
    this.console(sw * 0.27, ground - heroH * 0.75 + b, land ? 26 : 29, -0.15);
    this.console(sw * 0.73, ground - heroH * 0.84 - b, land ? 28 : 32, 0.14);
    this.star(sw * 0.34, ground - heroH * 0.95, 8);
    this.star(sw * 0.78, ground - heroH * 0.49, 6, "#d9896b");
    for (let i = 0; i < 8; i++) {
      const xx = sw * 0.13 + i * sw * 0.11;
      this.line(
        [
          [xx, ground + 15],
          [xx + 6, ground + 14],
        ],
        "#8b9c7840",
        1,
      );
    }
    c.restore();
  }
}
