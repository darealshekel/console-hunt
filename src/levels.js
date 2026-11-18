export const THEMES = [
  {
    name: "יוצאים לדרך",
    place: "החוף",
    sky: "#f8f2e3",
    far: "#c8dcd0",
    hill: "#a2c3ad",
    soil: "#c7b38c",
    grass: "#819f78",
    accent: "#6faaa3",
    tip: "מתחילים בקטן. רצים ימינה ואוספים קונסולות.",
  },
  {
    name: "מעל הגגות",
    place: "העיר",
    sky: "#f5ebda",
    far: "#d9bf9c",
    hill: "#bba27c",
    soil: "#c79b7b",
    grass: "#a16a57",
    accent: "#e8986e",
    tip: "הדרך למעלה שווה בדיקה. יש שם עוד קונסולות.",
  },
  {
    name: "חולות בתנועה",
    place: "הדיונות",
    sky: "#f9edcd",
    far: "#e9d79b",
    hill: "#d6ba7d",
    soil: "#d0ac69",
    grass: "#ba9655",
    accent: "#cb8f4f",
    tip: "המשטחים זזים. תופסים קצב וקופצים איתם.",
  },
  {
    name: "משמרת לילה",
    place: "הנמל",
    sky: "#344f63",
    far: "#45697a",
    hill: "#537e87",
    soil: "#567377",
    grass: "#94b8ac",
    accent: "#e7ba6d",
    tip: "חשוך פה, אבל הקונסולות עדיין מנצנצות.",
  },
  {
    name: "איפה מחביאים הכול?",
    place: "המחסן",
    sky: "#eed9c7",
    far: "#ceb2a3",
    hill: "#af8b79",
    soil: "#a97c61",
    grass: "#725e51",
    accent: "#d37e5d",
    tip: "המחסן עמוס. קפיצה כפולה ודאש יוציאו אתכם מזה.",
  },
  {
    name: "מלך הקונסולות",
    place: "הקרב האחרון",
    sky: "#e8dce4",
    far: "#c8b4c4",
    hill: "#a78b9b",
    soil: "#b58d82",
    grass: "#7c656e",
    accent: "#c96c96",
    tip: "מחכים שהוא ינחת. כשהוא מסוחרר — קופצים עליו או עושים דאש!",
  },
];
const FLOORS = [
  [
    [0, 950],
    [1035, 820],
    [1940, 1000],
    [3060, 650],
  ],
  [
    [0, 700],
    [800, 670],
    [1570, 620],
    [2290, 650],
    [3050, 600],
  ],
  [
    [0, 620],
    [760, 600],
    [1500, 600],
    [2260, 550],
    [2970, 650],
  ],
  [
    [0, 650],
    [800, 450],
    [1420, 520],
    [2110, 470],
    [2780, 680],
  ],
  [
    [0, 540],
    [730, 470],
    [1390, 480],
    [2040, 450],
    [2660, 550],
    [3380, 520],
  ],
];
export function makeLevel(index) {
  if (!Number.isInteger(index) || index < 0 || index > 5)
    throw new RangeError("Invalid level");
  const level = {
    index,
    theme: THEMES[index],
    platforms: [],
    coins: [],
    enemies: [],
    spikes: [],
    springs: [],
    hearts: [],
    checkpoints: [],
    goal: null,
  };
  if (index === 5) {
    level.length = 1280;
    level.platforms = [{ id: 0, x: 0, y: 520, w: 1280, h: 300, ground: true }];
    level.checkpoints = [{ x: 120, y: 466 }];
    return level;
  }
  const floors = FLOORS[index];
  level.length = floors.at(-1)[0] + floors.at(-1)[1];
  const platform = (x, y, w, extra = {}) => {
    const p = {
      id: level.platforms.length,
      x,
      y,
      w,
      h: y === 520 ? 300 : 22,
      ...extra,
    };
    level.platforms.push(p);
    return p;
  };
  const coin = (x, y) =>
    level.coins.push({
      id: level.coins.length,
      x,
      y,
      w: 20,
      h: 28,
      taken: false,
    });
  floors.forEach(([x, w], i) => {
    platform(x, 520, w, { ground: true });
    if (i === 0 || i % 2 === 1) level.checkpoints.push({ x: x + 48, y: 466 });
    for (let cx = x + 150; cx < x + w - 60; cx += 120) coin(cx, 440);
    if (i > 0) {
      const previous = floors[i - 1],
        end = previous[0] + previous[1],
        gap = x - end;
      coin(end + gap / 2, 400);
    }
    if (i > 0 || index > 0) {
      const ex = x + Math.min(w - 155, 330);
      level.enemies.push({
        x: ex,
        y: 486,
        w: 36,
        h: 34,
        min: x + 100,
        max: x + w - 70,
        vx: -(36 + index * 12),
        alive: true,
      });
    }
    if (i > 0 && index > 0) {
      const sx = x + w - 140;
      level.spikes.push({ x: sx, y: 502, w: 40 + index * 4, h: 18 });
    }
    if (i % 2 === 1)
      level.hearts.push({ x: x + 90, y: 455, taken: false, w: 20, h: 20 });
    const upperX = x + Math.min(230, w * 0.3);
    platform(upperX, 418, Math.min(175, w * 0.34), { oneWay: true });
    for (let k = 0; k < 3; k++) coin(upperX + 20 + k * 48, 377);
    if (index >= 1 && i % 2 === 0) {
      platform(upperX + 185, 324, 130, { oneWay: true });
      coin(upperX + 230, 284);
    }
    if (index >= 2 && i > 0) {
      const previous = floors[i - 1],
        end = previous[0] + previous[1];
      platform(end - 5, 465, 85, {
        oneWay: true,
        moving: true,
        baseX: end - 5,
        range: 55 + index * 5,
        phase: i,
        speed: 1 + index * 0.15,
      });
    }
    if (index >= 2 && i % 2 === 0)
      level.springs.push({ x: x + w - 205, y: 503, w: 32, h: 17 });
  });
  level.goal = { x: level.length - 115, y: 520, w: 55, h: 98 };
  return level;
}
