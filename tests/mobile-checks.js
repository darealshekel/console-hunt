async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const expect = (ok, msg) => {
    if (!ok) throw Error(msg);
  };
  const shot = (name) =>
    page.screenshot({ path: `output/playwright/${name}.png` });
  await page.goto("http://127.0.0.1:4175");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__gameTest);
  for (const [width, height, name] of [
    [375, 667, "small-phone-home"],
    [844, 390, "landscape-home"],
    [390, 844, "phone-home"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(120);
    const rect = await page.locator("#start").boundingBox();
    expect(
      rect.y >= 0 && rect.y + rect.height <= height,
      `${name}: start button clipped`,
    );
    expect(
      await page.locator("#desktop-gate").isHidden(),
      `${name}: mobile incorrectly blocked`,
    );
    await shot(name);
  }
  await page.getByRole("button", { name: "איך משחקים?", exact: true }).tap();
  expect(
    await page
      .getByRole("heading", { name: "שתי אצבעות, וזה שלכם" })
      .isVisible(),
    "help missing",
  );
  await page.getByRole("button", { name: "הבנתי, יוצאים לדרך" }).tap();
  const cdp = await page.context().newCDPSession(page);
  const point = async (selector, id) => {
    const r = await page.locator(selector).boundingBox();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, id };
  };
  const right = await point("[data-control=right]", 1),
    jump = await point("[data-control=jump]", 2);
  const x = await page.evaluate(() => __gameTest.game.player.x);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [right],
  });
  await page.waitForTimeout(350);
  expect(
    await page.evaluate((x) => __gameTest.game.player.x > x + 30, x),
    "held touch does not move",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [right, jump],
  });
  await page.waitForTimeout(180);
  expect(
    await page.evaluate(
      () =>
        __gameTest.input.right &&
        __gameTest.input.jump &&
        __gameTest.game.player.y < 460,
    ),
    "two-finger running jump failed",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => Object.values(__gameTest.input).every((v) => !v)),
    "touch release stuck",
  );
  await page.getByRole("button", { name: "השהיית המשחק" }).tap();
  const paused = await page.evaluate(() => __gameTest.game.time);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate((t) => __gameTest.game.time === t, paused),
    "pause failed",
  );
  await page.getByRole("button", { name: "צלילים ומוזיקה פועל" }).tap();
  await shot("phone-pause");
  await page.getByRole("button", { name: "חוזרים למצוד" }).tap();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [right],
  });
  await page.waitForTimeout(420);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(600);
  await shot("phone-billboard");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(250);
  await shot("landscape-game");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect(
    await page.evaluate(() => __gameTest.screen === "paused"),
    "backgrounding did not pause",
  );
  await page.getByRole("button", { name: "חזרה להתחלה", exact: true }).tap();
  await page.getByRole("button", { name: "מפת השלבים", exact: true }).tap();
  expect(
    (await page.locator(".level-row:disabled").count()) === 5,
    "locked levels available",
  );
  await shot("landscape-levels");
  await page.setViewportSize({ width: 390, height: 844 });
  // Collision fixtures check UI/persistence; full course traversal is tested separately without teleporting.
  await page.evaluate(() => {
    __gameTest.start(0);
    const g = __gameTest.game;
    g.player.x = g.level.goal.x;
    g.player.y = 466;
  });
  await page.waitForFunction(() => __gameTest.screen === "result");
  await shot("phone-stage-cleared");
  expect(
    await page.evaluate(() => __gameTest.save.unlocked === 1),
    "completion failed to unlock stage two",
  );
  await page.reload();
  await page.waitForFunction(() => window.__gameTest);
  expect(
    await page
      .getByRole("button", { name: "להמשיך במצוד", exact: true })
      .isVisible(),
    "saved progress not restored",
  );
  await page.getByRole("button", { name: "להמשיך במצוד", exact: true }).tap();
  expect(
    await page.evaluate(() => __gameTest.game.level.index === 1),
    "resume selected wrong level",
  );
  await page.evaluate(() => {
    __gameTest.start(5);
    __gameTest.game.player.x = 650;
  });
  await page.waitForTimeout(1200);
  await shot("phone-boss");
  await page.evaluate(() => {
    const g = __gameTest.game,
      b = g.boss,
      p = g.player;
    b.hp = 1;
    b.state = "stunned";
    b.timer = 3;
    b.invulnerable = 0;
    b.x = p.x + 10;
    b.y = 390;
    p.dash = 0.18;
    p.face = 1;
    p.invulnerable = 1;
  });
  await page.waitForFunction(() => __gameTest.screen === "result");
  expect(
    await page.getByRole("heading", { name: "הקונסולות שלנו!" }).isVisible(),
    "boss victory missing",
  );
  expect(
    await page.evaluate(() => __gameTest.save.won),
    "boss victory not saved",
  );
  await shot("phone-victory");
  const desktop = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false,
      isMobile: false,
    });
  const tab = await desktop.newPage();
  await tab.goto("http://127.0.0.1:4175");
  await tab.locator("#desktop-gate").waitFor({ state: "visible" });
  await tab.screenshot({ path: "output/playwright/desktop-gate.png" });
  await desktop.close();
  expect(errors.length === 0, errors.join("\n"));
  return {
    passed: 15,
    consoleErrors: errors,
    mobileViewports: ["375×667", "390×844", "844×390"],
    realMultitouch: true,
    desktopGate: true,
  };
}
