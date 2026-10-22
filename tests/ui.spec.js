const { spawn } = require("child_process");
const path = require("path");
const { test, expect } = require("@playwright/test");

const TAB_IDS = [
  "directory",
  "overview",
  "pick3",
  "betexec",
  "formulas",
  "windowmult",
  "orderlog",
  "segments",
  "missorder",
  "windowmiss",
  "parity",
  "trend",
  "zodtrend",
  "zodwindow",
  "zodmonitor",
  "personality",
  "datarecord",
  "notes",
  "tails",
  "windowk",
  "zodrecords",
  "backtest",
  "numtrend",
  "numsearch",
];

let server;

test.beforeAll(async () => {
  server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    stdio: "ignore",
    windowsHide: true,
  });

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:4173/");
      if (response.ok) return;
    } catch {
      // The server may need a moment to bind on slower Windows machines.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("UI test server did not start");
});

test.afterAll(async () => {
  if (!server) return;
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
});

test("all pages render on a phone viewport without page-level overflow", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator("#latestPeriod")).not.toHaveText("-");

  const latestPeriod = await page.evaluate(() => {
    const periods = Object.keys(window.APP_DATA.raw).map(Number);
    return Math.max(...periods);
  });
  await expect(page.locator("#latestPeriod")).toHaveText(String(latestPeriod));

  for (const tabId of TAB_IDS) {
    await page.evaluate((id) => {
      localStorage.setItem("v2_current_tab", JSON.stringify(id));
    }, tabId);
    await page.reload();
    await page.waitForFunction(() => {
      const view = document.querySelector("#view");
      return view instanceof HTMLElement && view.innerText.trim().length > 0;
    });

    const result = await page.evaluate((id) => {
      const root = document.documentElement;
      window.scrollTo({ left: 100, top: window.scrollY, behavior: "auto" });
      const pageScrollX = window.scrollX;
      window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
      return {
        id,
        overflow: Math.max(root.scrollWidth - root.clientWidth, Math.abs(pageScrollX)),
        height: root.scrollHeight,
        textLength: document.querySelector("#view")?.innerText.trim().length || 0,
        offenders: Array.from(document.body.querySelectorAll("*"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              node: element.tagName.toLowerCase()
                + (element.id ? `#${element.id}` : "")
                + (typeof element.className === "string" && element.className
                  ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
                  : ""),
              right: Math.round(rect.right * 10) / 10,
              width: Math.round(rect.width * 10) / 10,
              position: style.position,
              parents: Array.from({ length: 4 })
                .reduce((nodes, _, index) => {
                  const parent = nodes[index]?.parentElement;
                  if (parent) nodes.push(parent);
                  return nodes;
                }, [element])
                .slice(1)
                .map((parent) => ({
                  node: parent.tagName.toLowerCase()
                    + (parent.id ? `#${parent.id}` : "")
                    + (typeof parent.className === "string" && parent.className
                      ? `.${parent.className.trim().split(/\s+/).slice(0, 3).join(".")}`
                      : ""),
                  overflowX: getComputedStyle(parent).overflowX,
                  clientWidth: parent.clientWidth,
                  scrollWidth: parent.scrollWidth,
                })),
            };
          })
          .filter((item) => item.width > 0 && item.right > window.innerWidth + 1 && item.position !== "fixed")
          .slice(0, 12),
      };
    }, tabId);

    expect(result.textLength, `${tabId} should not render an empty page`).toBeGreaterThan(0);
    expect(result.height, `${tabId} should not be a blank page`).toBeGreaterThan(150);
    expect(
      result.overflow,
      `${tabId} should not overflow the page viewport: ${JSON.stringify(result.offenders)}`,
    ).toBeLessThanOrEqual(1);
  }

  expect(runtimeErrors, `browser runtime errors:\n${runtimeErrors.join("\n")}`).toEqual([]);
});

test("dynamic probability page shows the current live window for all three ranks", async ({ page }) => {
  await page.goto("/");

  const latestPeriod = await page.evaluate(() => {
    const periods = Object.keys(window.APP_DATA.raw).map(Number);
    return Math.max(...periods);
  });
  const targetPeriod = latestPeriod + 1;

  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("测试窗口记录");
  });

  const snapshots = await page.evaluate(async () => {
    const response = await fetch("probability_snapshots.json");
    return response.json();
  });

  const liveWindows = page.locator("[data-prob-live-window]");
  await expect(liveWindows).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    const card = liveWindows.nth(index);
    const text = await card.innerText();
    const startMatch = text.match(/第(\d+)期起/);
    expect(startMatch, `window ${index + 1} should expose its start period`).not.toBeNull();
    const startPeriod = Number(startMatch[1]);
    const sourceSnapshot = snapshots.records.find((record) => Number(record.target) === startPeriod);
    expect(sourceSnapshot, `missing source snapshot for period ${startPeriod}`).toBeTruthy();
    const lockedTail = sourceSnapshot.top3[index].tail;

    await expect(card).toContainText(`第${startPeriod}期`);
    await expect(card).toContainText("当前窗口");
    await expect(card).toContainText(`锁尾${lockedTail}`);
    await expect(card).toContainText("待开奖");
  }
});
test("dynamic probability window cards expose three separate step cells", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("测试窗口记录");
  });

  const rows = page.locator(".prob-test-row");
  await expect(rows).toHaveCount(3);
  for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
    const cards = rows.nth(rowIndex).locator(".prob-test-card");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(3);
    for (let cardIndex = 0; cardIndex < Math.min(cardCount, 6); cardIndex++) {
      await expect(cards.nth(cardIndex).locator(".prob-window-step")).toHaveCount(3);
    }
  }
});

test("dynamic probability shows every saved ten-tail snapshot newest first", async ({ page }) => {
  await page.goto("/");

  const snapshots = await page.evaluate(async () => {
    const response = await fetch("probability_snapshots.json");
    return response.json();
  });

  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("每期10尾完整排序快照");
  });

  const expected = snapshots.records.slice().sort((a, b) => Number(b.target) - Number(a.target));
  const cards = page.locator("[data-prob-snapshot-strip] .prob-snapshot-card");
  await expect(cards).toHaveCount(expected.length);
  for (let index = 0; index < expected.length; index++) {
    const card = cards.nth(index);
    const record = expected[index];
    await expect(card).toContainText(`第${record.target}期`);
    await expect(card.locator(".prob-snapshot-tail")).toHaveCount(10);
    await expect(card.locator(".prob-snapshot-tail")).toHaveText(
      record.allTails.map((row) => `尾${row.tail}`),
    );
  }
});

test("dynamic probability cards move with their horizontal strips", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement &&
      view.innerText.includes("测试窗口记录") &&
      view.innerText.includes("每期10尾完整排序快照") &&
      view.querySelectorAll(".prob-snapshot-card").length > 0;
  });

  const strips = [
    page.locator(".prob-test-strip").first(),
    page.locator("[data-prob-snapshot-strip]").first(),
  ];
  for (const strip of strips) {
    await strip.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const geometry = await strip.evaluate((element) => {
      const stripRect = element.getBoundingClientRect();
      const cardRect = element.firstElementChild.getBoundingClientRect();
      return {
        scrollLeft: element.scrollLeft,
        stripLeft: stripRect.left,
        cardLeft: cardRect.left,
      };
    });
    expect(geometry.scrollLeft).toBeGreaterThan(0);
    expect(geometry.cardLeft).toBeLessThan(geometry.stripLeft - 100);
  }
});

async function swipeHorizontalScrollbar(page, fromRightEdge) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("测试窗口记录");
  });

  const strip = page.locator(".prob-test-strip").first();
  await strip.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });

  return strip.evaluate((element, rightEdge) => {
    const before = document.body.dataset.page;
    const rect = element.getBoundingClientRect();
    const startX = rightEdge ? rect.right - 6 : rect.left + rect.width * 0.5;
    const y = rect.top + element.clientHeight + 4;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 91,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 90));
    return { before, after: document.body.dataset.page };
  }, fromRightEdge);
}

test("horizontal scrollbar swipes in the middle stay on the same page", async ({ page }) => {
  const result = await swipeHorizontalScrollbar(page, false);
  expect(result).toEqual({ before: "pick3", after: "pick3" });
});

test("horizontal scrollbar swipes from the right screen edge advance the page", async ({ page }) => {
  const result = await swipeHorizontalScrollbar(page, true);
  expect(result).toEqual({ before: "pick3", after: "betexec" });
});

