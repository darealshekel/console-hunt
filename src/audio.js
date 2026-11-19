export class Sound {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.nextNote = 0;
    this.noteIndex = 0;
  }
  unlock() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) this.ctx = new Context();
    }
    this.ctx?.resume().catch(() => {});
  }
  tone(
    frequency,
    duration = 0.1,
    type = "sine",
    gain = 0.035,
    delay = 0,
    to = null,
  ) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx,
      now = ctx.currentTime + delay,
      osc = ctx.createOscillator(),
      amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
  play(event) {
    switch (event) {
      case "punch":
        this.tone(370, 0.09, "triangle", 0.03, 0, 130);
        break;
      case "punchHit":
        this.tone(110, 0.11, "square", 0.035, 0, 65);
        break;
      case "punchBlocked":
        this.tone(720, 0.07, "triangle", 0.025, 0, 400);
        break;
      case "coin":
        this.tone(880, 0.1, "sine", 0.04);
        this.tone(1320, 0.13, "sine", 0.035, 0.07);
        break;
      case "jump":
        this.tone(260, 0.13, "triangle", 0.04, 0, 600);
        break;
      case "dash":
        this.tone(600, 0.14, "sawtooth", 0.018, 0, 100);
        break;
      case "hurt":
        this.tone(130, 0.22, "triangle", 0.06, 0, 65);
        break;
      case "enemy":
      case "bossHit":
        this.tone(190, 0.15, "square", 0.025, 0, 480);
        break;
      case "bossStun":
        this.tone(65, 0.35, "triangle", 0.08);
        break;
      case "bossWarn":
        this.tone(220, 0.15, "square", 0.025);
        this.tone(220, 0.15, "square", 0.025, 0.2);
        break;
      case "bossThrow":
        this.tone(520, 0.16, "triangle", 0.035, 0, 160);
        break;
      case "bossCharge":
        this.tone(100, 0.3, "sawtooth", 0.025, 0, 240);
        break;
      case "checkpoint":
      case "heart":
        this.tone(523, 0.15);
        this.tone(659, 0.2, "sine", 0.04, 0.1);
        break;
      case "spring":
        this.tone(170, 0.3, "triangle", 0.035, 0, 1000);
        break;
      case "complete":
      case "won":
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.3, "triangle", 0.05, i * 0.13),
        );
        break;
    }
  }
  music(time, boss = false) {
    if (!this.enabled || !this.ctx || time < this.nextNote) return;
    this.nextNote = time + 0.28;
    const notes = boss
      ? [147, 0, 220, 196, 147, 175, 220, 0]
      : [
          262, 330, 392, 0, 440, 392, 330, 294, 262, 0, 330, 392, 330, 294, 247,
          0,
        ];
    const n = notes[this.noteIndex++ % notes.length];
    if (n) this.tone(n, 0.22, "triangle", 0.014);
  }
}
