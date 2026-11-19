import { Game, clamp } from "./engine.js";
import { THEMES } from "./levels.js";
import { Renderer } from "./render.js";
import { Sound } from "./audio.js";
import { PUNCH } from "./combat.js";
const $ = (id) => document.getElementById(id),
  KEY = "console-hunt-v1";
const fresh = () => ({
  unlocked: 0,
  stars: [0, 0, 0, 0, 0],
  coins: [0, 0, 0, 0, 0],
  won: false,
  sound: true,
  vibrate: true,
});
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw) return fresh();
    const s = fresh();
    s.unlocked = clamp(Number.isInteger(raw.unlocked) ? raw.unlocked : 0, 0, 5);
    s.stars = s.stars.map((_, i) => clamp(Number(raw.stars?.[i]) || 0, 0, 3));
    s.coins = s.coins.map((_, i) => clamp(Number(raw.coins?.[i]) || 0, 0, 200));
    s.won = raw.won === true;
    s.sound = raw.sound !== false;
    s.vibrate = raw.vibrate !== false;
    return s;
  } catch {
    return fresh();
  }
}
let save = loadSave(),
  game = null,
  renderer = null,
  screen = "menu",
  input = {
    left: false,
    right: false,
    jump: false,
    dash: false,
    attack: false,
  },
  last = 0,
  accumulator = 0,
  toastTimer = 0,
  lastHud = "",
  lastBlockHint = -100;
const sound = new Sound();
sound.enabled = save.sound;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    toast("השמירה אינה זמינה בדפדפן הזה. אפשר להמשיך לשחק.");
  }
}
function totalCoins() {
  return save.coins.reduce((a, b) => a + b, 0);
}
function clearInput() {
  Object.keys(input).forEach((k) => (input[k] = false));
  document
    .querySelectorAll("[data-control]")
    .forEach((b) => b.classList.remove("pressed"));
}
function toast(text, duration = 3300) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), duration);
}
function setSoundIcon() {
  const enabled = sound.enabled;
  $("sound-menu").innerHTML =
    `<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4Z"/>${enabled ? '<path d="M17 8q5 4 0 8m3-11q7 7 0 14"/>' : '<path d="m17 9 5 6m0-6-5 6"/>'}</svg>`;
  $("sound-menu").setAttribute(
    "aria-label",
    enabled ? "השתקת צלילים" : "הפעלת צלילים",
  );
  $("sound-menu").setAttribute("aria-pressed", String(enabled));
}
function showOverlay(title, kicker, content, actions) {
  clearInput();
  $("overlay-title").textContent = title;
  $("overlay-kicker").textContent = kicker;
  $("overlay-content").replaceChildren();
  if (typeof content === "string") $("overlay-content").innerHTML = content;
  else $("overlay-content").append(content);
  $("overlay-actions").replaceChildren();
  for (const action of actions) {
    const b = document.createElement("button");
    b.className = `button ${action.secondary ? "secondary" : "primary"}`;
    b.textContent = action.label;
    b.onclick = action.fn;
    $("overlay-actions").append(b);
  }
  $("overlay").hidden = false;
  $("overlay").querySelector(".sheet").scrollTop = 0;
  $("controls").hidden = true;
  setTimeout(
    () =>
      $("overlay-actions")
        .querySelector("button")
        ?.focus({ preventScroll: true }),
    0,
  );
}
function closeOverlay() {
  $("overlay").hidden = true;
  clearInput();
  accumulator = 0;
  last = 0;
}
function menu() {
  screen = "menu";
  game = null;
  document.body.classList.remove("boss");
  closeOverlay();
  $("menu").hidden = false;
  $("hud").hidden = true;
  $("boss-hud").hidden = true;
  $("controls").hidden = true;
  $("toast").classList.remove("show");
  $("start").querySelector("span").textContent = save.won
    ? "לעוד סיבוב?"
    : save.unlocked > 0
      ? "להמשיך במצוד"
      : "יוצאים לדרך";
}
function startLevel(index) {
  sound.unlock();
  closeOverlay();
  game = new Game(index);
  screen = "playing";
  renderer.reset();
  $("menu").hidden = true;
  $("hud").hidden = false;
  $("controls").hidden = false;
  $("boss-hud").hidden = index !== 5;
  document.body.classList.toggle("boss", index === 5);
  $("level-name").textContent = THEMES[index].name;
  $("level-number").textContent =
    index === 5 ? "הקרב האחרון" : `שלב ${index + 1} מתוך 5`;
  toast(THEMES[index].tip, index === 5 ? 6500 : 4300);
  lastHud = "";
  lastBlockHint = -100;
  updateHud();
}
function resume() {
  closeOverlay();
  screen = "playing";
  $("controls").hidden = false;
  sound.unlock();
}
function pause() {
  if (screen !== "playing") return;
  screen = "paused";
  sound.nextNote = 0;
  const content = document.createElement("div");
  content.innerHTML =
    "<p>הקונסולות לא הולכות לשום מקום.<br>קחו רגע, אנחנו מחכים.</p>";
  for (const [label, key] of [
    ["צלילים ומוזיקה", "sound"],
    ["רטט בנגיעות", "vibrate"],
  ]) {
    const b = document.createElement("button");
    b.className = "setting-button";
    const refresh = () => {
      b.innerHTML = `<span>${label}</span><strong>${save[key] ? "פועל" : "כבוי"}</strong>`;
      b.setAttribute("aria-pressed", String(save[key]));
    };
    refresh();
    b.onclick = () => {
      save[key] = !save[key];
      if (key === "sound") {
        sound.enabled = save.sound;
        sound.unlock();
        setSoundIcon();
      }
      persist();
      refresh();
    };
    content.append(b);
  }
  showOverlay("רגע לנשום", "המצוד בהפסקה", content, [
    { label: "חוזרים למצוד", fn: resume },
    {
      label: "להתחיל את השלב מחדש",
      secondary: true,
      fn: () => startLevel(game.level.index),
    },
    { label: "חזרה להתחלה", secondary: true, fn: menu },
  ]);
}
function showHelp() {
  screen = "help";
  showOverlay(
    "שתי אצבעות, וזה שלכם",
    "איך משחקים?",
    `<ul class="help-list"><li><b>↔</b><span>מחזיקים את החצים כדי לרוץ שמאלה או ימינה.</span></li><li><b>↑</b><span>נוגעים בקפיצה. נגיעה נוספת באוויר נותנת קפיצה כפולה.</span></li><li><b>ϟ</b><span>דאש נותן זינוק מהיר — וגם מעיף את השומרים מהדרך.</span></li><li><b>אגרוף</b><span>נוגעים כדי לתת אגרוף. מחזיקים לרצף מכות, גם בתנועה או באוויר.</span></li><li><b>♥</b><span>אוספים קונסולות, נזהרים מקוצים, ותופסים דגל כדי לשמור נקודת חזרה.</span></li></ul><p>על שומרים אפשר לקפוץ מלמעלה.<br>מול הבוס, מתחמקים מהמתקפה — ואז מתקרבים ונותנים אגרוף כשהוא מסוחרר.</p>`,
    [
      {
        label: "הבנתי, יוצאים לדרך",
        fn: () => startLevel(save.won ? 0 : save.unlocked),
      },
      { label: "חזרה", secondary: true, fn: menu },
    ],
  );
}
function showLevels() {
  screen = "levels";
  const list = document.createElement("div");
  list.className = "level-list";
  THEMES.forEach((theme, index) => {
    const b = document.createElement("button");
    b.className = "level-row";
    b.disabled = index > save.unlocked;
    b.innerHTML = `<span class="index">${index === 5 ? "♛" : index + 1}</span><span><strong>${theme.name}</strong><small>${theme.place}${index > save.unlocked ? " · נפתח בהמשך" : ""}</small></span><em>${index === 5 ? (save.won ? "★" : "") : "★".repeat(save.stars[index]) + "☆".repeat(3 - save.stars[index])}</em>`;
    b.onclick = () => startLevel(index);
    list.append(b);
  });
  showOverlay("לאן ממשיכים?", "מפת המצוד", list, [
    { label: "חזרה להתחלה", fn: menu },
  ]);
}
function results(won = false) {
  screen = "result";
  const index = game.level.index;
  if (won) {
    save.won = true;
    save.unlocked = 5;
    persist();
    showOverlay(
      "הקונסולות שלנו!",
      "המצוד הושלם",
      `<div class="result-stars">✦ ♛ ✦</div><p>חמישה שלבים, בוס גדול אחד,<br>והרבה קונסולות שחזרו הביתה.</p><div class="result-score"><b>${totalCoins()}</b> קונסולות באוסף</div><p>מלך הקונסולות? עכשיו הוא רק המלך של המחסן הריק.</p>`,
      [
        { label: "לשתף את הניצחון", fn: share },
        { label: "למפת השלבים", secondary: true, fn: showLevels },
        { label: "עוד מצוד מההתחלה", secondary: true, fn: () => startLevel(0) },
      ],
    );
    return;
  }
  const stars = game.stars();
  save.unlocked = Math.max(save.unlocked, index + 1);
  save.stars[index] = Math.max(save.stars[index], stars);
  save.coins[index] = Math.max(save.coins[index], game.collected);
  persist();
  showOverlay(
    index === 4 ? "מצאנו את המחסן!" : "יש עוד מקום בתיק",
    `שלב ${index + 1} הושלם`,
    `<div class="result-stars">${"★".repeat(stars) + "☆".repeat(3 - stars)}</div><div class="result-score"><b>${game.collected}</b> מתוך ${game.level.coins.length} קונסולות</div><p>${index === 4 ? "אבל מישהו שומר על הקונסולות האחרונות.<br>הגיע הזמן לפגוש את מלך הקונסולות." : stars === 3 ? "איזה ניקיון. כמעט לא נשארה קונסולה מאחור!" : "יופי של שלל. אפשר להמשיך — או לחזור בשביל מה שפספסנו."}</p>`,
    [
      {
        label: index === 4 ? "מוכנים לבוס" : "לשלב הבא",
        fn: () => startLevel(index + 1),
      },
      {
        label: "עוד סיבוב בשלב הזה",
        secondary: true,
        fn: () => startLevel(index),
      },
      { label: "למפת השלבים", secondary: true, fn: showLevels },
    ],
  );
}
function failed() {
  screen = "failed";
  showOverlay(
    "עוד ניסיון קטן",
    "זה קורה גם לציידים הכי טובים",
    `<p>הפעם הקונסולות ניצחו.<br>עכשיו כבר מכירים את הדרך — מנסים שוב?</p><div class="result-score">אספתם <b>${game.collected}</b> קונסולות בניסיון הזה.</div>`,
    [
      { label: "ברור. מנסים שוב", fn: () => startLevel(game.level.index) },
      { label: "למפת השלבים", secondary: true, fn: showLevels },
    ],
  );
}
async function share() {
  const url = location.href.split("?")[0];
  if (navigator.share) {
    try {
      await navigator.share({
        title: "מצוד אחר הקונסולה",
        text: `ניצחתי את מלך הקונסולות ואספתי ${totalCoins()} קונסולות. עכשיו תורך!`,
        url,
      });
    } catch (e) {
      if (e.name !== "AbortError") toast("אפשר להעתיק את הקישור משורת הכתובת.");
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      toast("הקישור הועתק. עכשיו תור החברים.");
    } catch {
      toast("אפשר להעתיק את הקישור משורת הכתובת.");
    }
  }
}
function handleEvents() {
  for (const e of game.drain()) {
    sound.play(e.type);
    if (e.type === "hurt") {
      renderer.shake = 5;
      if (save.vibrate) navigator.vibrate?.(35);
    }
    if (e.type === "coin" && game.collected === 1 && game.level.index === 0)
      toast("הראשונה בתיק! עכשיו לחפש את השאר.", 2500);
    if (e.type === "checkpoint")
      toast("נקודת חזרה נשמרה. אפשר לקחת קצת סיכונים.", 2500);
    if (e.type === "heart") toast("עוד לב. ממשיכים!", 1800);
    if (e.type === "spring") toast("בדיוק בשביל זה יש קפיצים.", 1800);
    if (e.type === "punchHit" && save.vibrate) navigator.vibrate?.(12);
    if (e.type === "punchBlocked" && game.time - lastBlockHint > 1.5) {
      lastBlockHint = game.time;
      toast("הוא מגן על עצמו. נותנים אגרוף כשהוא מסוחרר!", 1800);
    }
    if (e.type === "bossWarn")
      toast(
        {
          slam: "הוא קופץ! זזים מהסימון ואז קופצים מעל הגלים.",
          throw: "הוא זורק קונסולות! מתכוננים לקפוץ מעליהן.",
          charge: "הוא מסתער! קפיצה כפולה מעליו!",
        }[e.attack],
        2000,
      );
    if (e.type === "bossStun") {
      renderer.shake = e.attack === "throw" ? 0 : 7;
      toast("עכשיו! מתקרבים ונותנים אגרוף!", 2300);
    }
    if (e.type === "bossHit") {
      renderer.shake = 4;
      if (save.vibrate) navigator.vibrate?.(20);
      if (game.boss.hp > 0)
        toast("זה עבד! נשארו עוד " + game.boss.hp + " פגיעות.", 1800);
    }
    if (e.type === "complete") results();
    if (e.type === "won") {
      const defeatedGame = game;
      screen = "victory";
      clearInput();
      $("controls").hidden = true;
      toast("מלך הקונסולות נכנע. המחסן שלנו!", 1500);
      setTimeout(() => {
        if (game === defeatedGame && screen === "victory") results(true);
      }, 650);
    }
    if (e.type === "failed") failed();
  }
}
function updateHud() {
  if (!game) return;
  const p = game.player,
    state = `${p.hp}:${game.collected}:${game.level.index}`;
  if (state !== lastHud) {
    $("health").textContent =
      "♥".repeat(Math.max(0, p.hp)) + "♡".repeat(Math.max(0, 3 - p.hp));
    $("health").setAttribute("aria-label", `${p.hp} לבבות`);
    $("coin-count").textContent = game.collected;
    $("coin-total").textContent = game.boss
      ? ""
      : `/ ${game.level.coins.length}`;
    lastHud = state;
  }
  $("progress-fill").style.width =
    `${clamp((p.x / (game.level.length - 120)) * 100, 0, 100)}%`;
  $("dash-ready").style.height = `${(p.dashCooldown / 1.1) * 100}%`;
  $("attack-ready").style.height =
    `${(p.attackCooldown / PUNCH.cooldown) * 100}%`;
  if (game.boss) {
    $("boss-health").style.width = `${(game.boss.hp / game.boss.maxHp) * 100}%`;
    const b = game.boss;
    const activity =
      b.reaction > 0
        ? "פגיעה!"
        : b.state === "warn"
          ? {
              slam: "קפיצה מתקרבת!",
              throw: "קונסולות בדרך!",
              charge: "הסתערות — קפיצה כפולה!",
            }[b.attack]
          : {
              wait: "מתכונן למתקפה",
              jump: "להתרחק ממקום הנחיתה",
              throw: "לקפוץ מעל הקונסולות",
              charge: "לקפוץ מעליו!",
              stunned: "מסוחרר — עכשיו תוקפים!",
              defeated: "המחסן שלנו!",
            }[b.state];
    if ($("boss-action").textContent !== activity)
      $("boss-action").textContent = activity;
  }
}
function loop(ms) {
  const dt = last ? Math.min((ms - last) / 1000, 0.1) : 0;
  last = ms;
  if (screen === "playing" && game) {
    accumulator += dt;
    while (accumulator >= 1 / 120 && screen === "playing") {
      game.step(1 / 120, input);
      handleEvents();
      accumulator -= 1 / 120;
    }
    sound.music(ms / 1000, !!game.boss);
    updateHud();
  }
  if (renderer) {
    if (game) renderer.draw(game, dt);
    else renderer.home(ms / 1000);
  }
  requestAnimationFrame(loop);
}
const pointers = new Map();
document.querySelectorAll("[data-control]").forEach((button) => {
  button.addEventListener("pointerdown", (e) => {
    if (screen !== "playing") return;
    e.preventDefault();
    sound.unlock();
    button.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, button.dataset.control);
    input[button.dataset.control] = true;
    button.classList.add("pressed");
  });
  const release = (e) => {
    const key = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (key && !Array.from(pointers.values()).includes(key)) {
      input[key] = false;
      button.classList.remove("pressed");
    }
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("contextmenu", (e) => e.preventDefault());
});
$("pause").onclick = pause;
$("start").onclick = () => startLevel(save.won ? 0 : save.unlocked);
$("levels-button").onclick = showLevels;
$("help-button").onclick = showHelp;
$("sound-menu").onclick = () => {
  sound.unlock();
  sound.enabled = !sound.enabled;
  save.sound = sound.enabled;
  persist();
  setSoundIcon();
  if (sound.enabled) sound.play("coin");
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (screen === "playing") pause();
    clearInput();
    pointers.clear();
  }
});
window.addEventListener("blur", () => {
  if (screen === "playing") pause();
  clearInput();
  pointers.clear();
});
window.addEventListener("resize", () => {
  renderer?.resize();
});
setSoundIcon();
async function boot() {
  try {
    const ad = new Image(),
      heroArt = new Image(),
      bossArt = new Image(),
      punchArt = new Image();
    ad.src = "assets/level-1-ad.png";
    heroArt.src = "assets/hero-animation.png";
    bossArt.src = "assets/boss-animation.png";
    punchArt.src = "assets/hero-punch.png";
    await Promise.all([
      ad.decode(),
      heroArt.decode(),
      bossArt.decode(),
      punchArt.decode(),
      document.fonts.ready,
    ]);
    renderer = new Renderer($("world"), ad, heroArt, bossArt, punchArt);
    menu();
    $("loading").hidden = true;
    requestAnimationFrame(loop);
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost")
      window.__gameTest = {
        get game() {
          return game;
        },
        get input() {
          return input;
        },
        get screen() {
          return screen;
        },
        get animation() {
          return renderer.heroAnimator.pose;
        },
        get bossAnimation() {
          return renderer.bossPose;
        },
        start: startLevel,
        pause,
        resume,
        menu,
        get save() {
          return save;
        },
        events: handleEvents,
      };
    if ("serviceWorker" in navigator && location.protocol === "https:")
      navigator.serviceWorker
        .register("sw.js?v=7", { updateViaCache: "none" })
        .catch(() => {});
  } catch {
    $("loading").innerHTML =
      '<strong>הציורים עוד בדרך.</strong><span>בדקו את החיבור ונסו שוב.</span><button class="button primary" style="width:220px">טעינה מחדש</button>';
    $("loading").querySelector("button").onclick = () => location.reload();
  }
}
boot();
