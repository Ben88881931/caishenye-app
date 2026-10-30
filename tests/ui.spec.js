const { spawn } = require("child_process");
const path = require("path");
const { test, expect } = require("@playwright/test");

const TAB_IDS = [
  "overview",
  "pick3",
  "formulas",
  "personalityforecast",
  "orderlog",
  "segments",
  "missorder",
  "windowmiss",
  "windowmiss2",
  "parity",
  "trend",
  "zodtrend",
  "zodwindow",
  "zodmonitor",
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
const TEST_PORT = Number(process.env.PORT || 4174);
const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${TEST_PORT}`;

async function openProbabilityView(page, view) {
  const tab = page.locator(`[data-model-detail-task="${view}"]`);
  await expect(tab).toHaveCount(1);
  await tab.click();
}

async function waitForProbabilityHistory(page) {
  await page.waitForFunction(() => {
    const strip = document.querySelector(".prob-single-period-strip");
    return document.querySelectorAll(".prob-single-period-strip").length === 3 &&
      strip instanceof HTMLElement &&
      strip.scrollWidth > strip.clientWidth + 1;
  });
}

test.beforeAll(async () => {
  server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, PORT: String(TEST_PORT) },
  });

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${TEST_BASE_URL}/`);
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
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (server.exitCode == null && server.signalCode == null) server.kill("SIGKILL");
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
        quickAccess: document.querySelectorAll("[data-page-quick-access]").length,
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
      result.quickAccess,
      tabId === "overview" ? "overview already has its own quick access" : `${tabId} missing shared quick access`,
    ).toBe(tabId === "overview" ? 0 : 1);
    expect(
      result.overflow,
      `${tabId} should not overflow the page viewport: ${JSON.stringify(result.offenders)}`,
    ).toBeLessThanOrEqual(1);
  }

  expect(runtimeErrors, `browser runtime errors:\n${runtimeErrors.join("\n")}`).toEqual([]);
});

test("personality forecast shows three independent horizons and a stable snapshot cycle", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("personalityforecast"));
  });
  await page.reload();

  await expect(page.locator("body")).toHaveAttribute("data-page", "personalityforecast");
  await expect(page.locator("[data-personality-forecast-page]")).toContainText("逐线三窗口性格预测");
  await expect(page.locator("[data-personality-forecast-top]")).toHaveCount(3);
  await expect(page.locator(".today-picks [data-personality-forecast-top].today-pick")).toHaveCount(3);
  const topCardStyles = await page.locator("[data-personality-forecast-top]").evaluateAll((cards) => (
    cards.map((card) => {
      const labelStyle = getComputedStyle(card.querySelector("b"));
      return {
        textAlign: getComputedStyle(card).textAlign,
        color: labelStyle.color,
        fontSize: Number.parseFloat(labelStyle.fontSize),
        top: card.getBoundingClientRect().top,
      };
    })
  ));
  expect(topCardStyles.every((item) => item.textAlign === "center")).toBe(true);
  expect(topCardStyles.every((item) => item.color === "rgb(29, 78, 216)")).toBe(true);
  expect(topCardStyles.every((item) => item.fontSize >= 21)).toBe(true);
  expect(new Set(topCardStyles.map((item) => Math.round(item.top))).size).toBe(1);
  await expect(page.locator("[data-personality-forecast-ranking] [data-line-id]")).toHaveCount(13);
  await expect(page.locator("[data-personality-forecast-horizon]")).toHaveCount(3);
  await expect(page.locator(".pf-cycle")).toContainText("结算旧快照");
  await expect(page.locator(".pf-cycle")).toContainText("全量重跑性格");
  await expect(page.locator(".pf-cycle")).toContainText("锁定下一期");
  await expect(page.locator(".pf-snapshot-strip .pf-snapshot-card")).not.toHaveCount(0);

  const ranking = await page.locator("[data-personality-forecast-ranking] [data-line-id]").evaluateAll((items) => (
    items.map((item) => ({
      rank: Number(item.getAttribute("data-personality-forecast-rank")),
      safe: Number(item.getAttribute("data-safe-count")),
      risk: Number(item.getAttribute("data-risk-count")),
    }))
  ));
  expect(ranking.map((item) => item.rank)).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
  expect(ranking.every((item, index) => (
    index === 0 ||
    ranking[index - 1].safe > item.safe ||
    (ranking[index - 1].safe === item.safe && ranking[index - 1].risk <= item.risk)
  ))).toBe(true);

  const line = page.locator('[data-personality-forecast-line="tail9"]');
  await line.click();
  await expect(line).toHaveClass(/is-active/);
  await expect(page.locator("[data-personality-forecast-horizon]")).toHaveCount(3);
});

test("single report history contains only unified single-period records", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("单期 · 历史");
  });

  const rows = page.locator(".prob-test-row");
  await expect(rows).toHaveCount(3);
  for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
    await expect(rows.nth(rowIndex).locator(".prob-single-period-strip")).toHaveCount(1);
    expect(await rows.nth(rowIndex).locator(".single-record-card").count()).toBeGreaterThan(0);
    await expect(rows.nth(rowIndex).locator(".window-record-card")).toHaveCount(0);
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
  await openProbabilityView(page, "snapshot");
  await page.waitForFunction(() => document.querySelectorAll(".prob-snapshot-card").length > 0);

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

test("model probability production status card sits below the single-period content", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
    localStorage.setItem("v2_prob_view", JSON.stringify("overview"));
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "pick3");

  const order = await page.evaluate(() => {
    const tabs = document.querySelector("[data-model-detail-tabs]");
    const panel = document.querySelector('[data-model-detail-panel="overview"]');
    const summary = document.querySelector(".prob-page-summary");
    if (!tabs || !panel || !summary) return null;
    const all = Array.from(document.querySelectorAll("*"));
    return {
      tabsBeforeSummary: all.indexOf(tabs) < all.indexOf(summary),
      panelBeforeSummary: all.indexOf(panel) < all.indexOf(summary),
    };
  });
  expect(order).toEqual({
    tabsBeforeSummary: true,
    panelBeforeSummary: true,
  });
});

test("dynamic probability cards move with their horizontal strips", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const checkStrip = async (strip) => {
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
  };
  await checkStrip(page.locator(".prob-single-period-strip").first());

  await openProbabilityView(page, "snapshot");
  await page.waitForFunction(() => document.querySelectorAll(".prob-snapshot-card").length > 0);
  await checkStrip(page.locator("[data-prob-snapshot-strip]").first());
});

async function swipeHorizontalScrollbar(page, side) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await page.waitForFunction(() => {
    const strip = document.querySelector(".prob-single-period-strip");
    return strip instanceof HTMLElement && strip.scrollWidth > strip.clientWidth + 1;
  });

  const strip = page.locator(".prob-single-period-strip").first();
  await strip.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });

  return strip.evaluate((element, edgeSide) => {
    const before = document.body.dataset.page;
    const rect = element.getBoundingClientRect();
    const startX = edgeSide === "left"
      ? 30
      : edgeSide === "right"
        ? window.innerWidth - 30
        : Math.min(window.innerWidth * 0.5, window.innerWidth - 57);
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
    document.documentElement.dispatchEvent(pointer("pointerup", startX - 90));
    return { before, after: document.body.dataset.page };
  }, side);
}

test("horizontal scrollbar swipes in the middle stay on the same page", async ({ page }) => {
  const result = await swipeHorizontalScrollbar(page, "center");
  expect(result).toEqual({ before: "pick3", after: "pick3" });
});

test("horizontal scrollbar left edge swipes advance the page", async ({ page }) => {
  const result = await swipeHorizontalScrollbar(page, "left");
  expect(result).toEqual({ before: "pick3", after: "formulas" });
});

test("horizontal scrollbar swipes from the right screen edge advance the page", async ({ page }) => {
  const result = await swipeHorizontalScrollbar(page, "right");
  expect(result).toEqual({ before: "pick3", after: "formulas" });
});

test("left-bottom one-hand scrollbar-edge swipe flips pages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const result = await page.locator(".prob-single-period-strip").first().evaluate((element) => {
    const before = document.body.dataset.page;
    const startX = 30;
    const y = window.innerHeight * 0.76;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 97,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 60));
    document.documentElement.dispatchEvent(pointer("pointerup", startX - 60));
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "pick3", after: "formulas" });
});

test("bottom-center swipes inside a horizontal scroll region never flip pages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const result = await page.locator(".prob-single-period-strip").first().evaluate((element) => {
    const before = document.body.dataset.page;
    const startX = window.innerWidth * 0.5;
    const y = window.innerHeight * 0.76;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 98,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 90));
    document.documentElement.dispatchEvent(pointer("pointerup", startX - 90));
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "pick3", after: "pick3" });
});

test("horizontal scroll region swipes in the center keep the same page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const strip = page.locator(".prob-single-period-strip").first();
  const result = await strip.evaluate((element) => {
    element.scrollLeft = 0;
    const card = element.firstElementChild;
    const rect = element.getBoundingClientRect();
    const startX = rect.left + 120;
    const y = rect.top + 20;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 92,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    const before = document.body.dataset.page;
    card.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 90));
    document.documentElement.dispatchEvent(pointer("pointerup", startX - 90));
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "pick3", after: "pick3" });
});

test("full-screen content swipes flip navigation pages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const swipe = (distance, pointerId, vertical = 0) => page.locator("#view .panel").first().evaluate((element, settings) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + Math.min(120, rect.width / 2);
    const y = rect.top + 20;
    const pointer = (type, clientX, clientY) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: settings.pointerId,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY,
    });
    const before = document.body.dataset.page;
    element.dispatchEvent(pointer("pointerdown", startX, y));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - settings.distance, y + settings.vertical));
    document.documentElement.dispatchEvent(pointer("pointerup", startX - settings.distance, y + settings.vertical));
    return { before, after: document.body.dataset.page };
  }, { distance, pointerId, vertical });

  expect(await swipe(40, 99)).toEqual({ before: "pick3", after: "pick3" });
  expect(await swipe(0, 100, 80)).toEqual({ before: "pick3", after: "pick3" });
  expect(await swipe(60, 101)).toEqual({ before: "pick3", after: "formulas" });
});

test("a page swipe still commits when the touch system omits pointerup", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);
  await page.locator("#view .panel").first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + Math.min(120, rect.width / 2);
    const y = rect.top + 20;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 101,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 60));
  });
  await page.waitForFunction(() => document.body.dataset.page === "formulas");
  expect(await page.evaluate(() => document.body.dataset.page)).toBe("formulas");
});

test("a short touch swipe commits once when the browser cancels the pointer stream", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);
  const result = await page.locator("#view .panel").first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + Math.min(120, rect.width / 2);
    const y = rect.top + 20;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 102,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    const before = document.body.dataset.page;
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 40));
    document.documentElement.dispatchEvent(pointer("pointercancel", startX - 40));
    return { before, after: document.body.dataset.page };
  });
  expect(result).toEqual({ before: "pick3", after: "formulas" });
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => document.body.dataset.page)).toBe("formulas");
});

test("window omission and hit strips start with the current live state", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("windowmiss"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-window-miss-task]").length === 2);
  await page.locator('[data-window-miss-task="chain"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".trend-run-strip").length === 26);

  const strips = page.locator(".trend-run-strip");
  await expect(strips).toHaveCount(26);
  const liveStates = page.locator("[data-wm-live-state]");
  await expect(liveStates).toHaveCount(26);
  for (let index = 0; index < 26; index++) {
    const strip = strips.nth(index);
    await expect(strip.locator("[data-wm-live-state]").first()).toHaveCount(1);
    await expect(strip.locator("[data-wm-live-state]").first()).toHaveText(/进\d|等尾\d/);
  }
});

test("two-period window omission heatmap has its own page and live strips", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("windowmiss2"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-window-miss-panel='heat']").length === 1);
  await expect(page.locator(".panel--wmheat")).toHaveCount(1);
  await expect(page.locator("[data-wm-mode]")).toHaveCount(0);
  await expect(page.locator(".trend-run-strip")).toHaveCount(0);
  await page.locator('[data-window-miss-task="chain"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".trend-run-strip").length === 26);
  await expect(page.locator(".trend-run-strip")).toHaveCount(26);
  await expect(page.locator("[data-wm-live-state]")).toHaveCount(26);
  await expect(page.locator("#view")).toContainText("两期窗口（一个窗口最多2期）");
  const stripLayout = await page.locator(".trend-run-strip").first().evaluate((strip) => ({
    display: getComputedStyle(strip).display,
    scrollWidth: strip.scrollWidth,
    clientWidth: strip.clientWidth,
  }));
  expect(stripLayout.display).toBe("flex");
  expect(stripLayout.scrollWidth).toBeGreaterThan(stripLayout.clientWidth);
});

test("heatmap pages use the one-period, two-period, three-period names", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("windowmiss"));
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "windowmiss");
  await expect(page.locator("#view")).toContainText("三期热图");
  await expect(page.locator('.nav-subtabs .tab[data-tab="windowmiss"]')).toHaveText("三期热图");
  await page.evaluate(() => document.querySelector('.nav-subtabs .tab[data-tab="windowmiss2"]').click());
  await expect(page.locator("#view")).toContainText("两期热图");
  await expect(page.locator('.nav-subtabs .tab[data-tab="windowmiss2"]')).toHaveText("两期热图");
  await page.evaluate(() => document.querySelector('.nav-subtabs .tab[data-tab="trend"]').click());
  await expect(page.locator("#view")).toContainText("一期热图");
  await expect(page.locator('.nav-subtabs .tab[data-tab="trend"]')).toHaveText("一期热图");
});

test("two and three period heatmaps show waiting only before the tail reopens", async ({ page }) => {
  for (const tabId of ["windowmiss", "windowmiss2"]) {
    await page.goto("/");
    await page.evaluate((id) => {
      localStorage.setItem("v2_current_tab", JSON.stringify(id));
    }, tabId);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll(".panel--wmheat tbody tr:last-child [data-window-state]").length > 0);

    const latest = await page.evaluate(() => window.APP_DATA.d.length);
    const lastRow = page.locator(".panel--wmheat tbody tr:last-child").first();
    await expect(lastRow.locator("[data-window-state]")).toHaveCount(13);
    await expect(lastRow.locator('[data-window-state="wait"][data-window-pending-open="true"]')).toHaveCount(0);

    const states = await lastRow.locator("[data-window-state]").evaluateAll((cells) => (
      cells.map((cell) => ({
        state: cell.getAttribute("data-window-state"),
        ruleWait: cell.getAttribute("data-window-rule-wait"),
        start: Number(cell.getAttribute("data-window-start")),
        text: cell.innerText.trim(),
      }))
    ));
    const live = states.filter((cell) => cell.state === "live");
    const waiting = states.filter((cell) => cell.state === "wait");
    expect(live.length).toBeGreaterThan(0);
    expect(live.every((cell) => cell.text.startsWith("进"))).toBe(true);
    expect(live.some((cell) => cell.start === latest + 1)).toBe(true);
    expect(waiting.every((cell) => cell.ruleWait === "true")).toBe(true);
  }
});

test("long right swipe on the first page does not open the directory", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const result = await page.locator("#view .panel").first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + Math.min(120, rect.width / 2);
    const y = rect.top + 20;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 94,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    const before = document.body.dataset.page;
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX + 260));
    document.documentElement.dispatchEvent(pointer("pointerup", startX + 260));
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "pick3", after: "overview" });
});

test("long right swipe on a later page returns one navigation page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("formulas"));
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "formulas");

  const result = await page.locator("#view .panel").first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + Math.min(120, rect.width / 2);
    const y = rect.top + 20;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 95,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    const before = document.body.dataset.page;
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX + 260));
    document.documentElement.dispatchEvent(pointer("pointerup", startX + 260));
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "formulas", after: "pick3" });
});

test("removed execution route redirects to the unified window report", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("betexec"));
  });
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-page", "overview");
  await expect(page.locator("#view")).toContainText("三期窗口");
});

test("personality forecast keeps ranking separate from the locked target", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("personalityforecast"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-personality-forecast-ranking] [data-line-id]").length === 13);

  const modelState = await page.evaluate(() => {
    const model = window.APP_PERSONALITY_MODEL;
    const latest = window.APP_DATA.d[window.APP_DATA.d.length - 1];
    const locked = window.APP_PERSONALITY_SNAPSHOTS.records.find((record) => (
      !record.superseded &&
      Number(record.year) === Number(latest.y) &&
      Number(record.target) === Number(latest.p) + 1
    ));
    return {
      rankingRule: model.activeRankingRule,
      diagnosticTop3: model.diagnosticRanking.slice(0, 3).map((line) => line.id),
      lockedTop3: locked.top3,
      lockedVersion: locked.version,
      modelVersion: model.version,
    };
  });
  expect(modelState.rankingRule).toBe("legacy-until-diagnostic-snapshot-locked");
  expect(modelState.lockedVersion).not.toBe(modelState.modelVersion);
  await expect(page.locator("[data-personality-forecast-ranking] [data-line-id]")).toHaveCount(13);
  await expect(page.locator("[data-personality-forecast-page]")).toContainText("下期生效");
  await expect(page.locator(".pf-snapshot-card").first()).toContainText("第303期");
});

test("every personality forecast line exposes three independent window stages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("personalityforecast"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-personality-forecast-ranking] [data-line-id]").length === 13);

  const model = await page.evaluate(() => ({
    lines: window.APP_PERSONALITY_MODEL.lines.map((line) => ({
      id: line.id,
      stages: ["one", "two", "three"].map((key) => line.current.diagnosticByHorizon[key].stage),
      rare: line.current.diagnostic.rareCount,
    })),
    diagnostic: window.APP_PERSONALITY_MODEL.diagnosticRanking.map((line) => line.id),
  }));
  expect(model.lines).toHaveLength(13);
  expect(model.lines.every((line) => line.stages.length === 3)).toBe(true);
  expect(model.lines.every((line) => line.stages.every((stage) => ["safe", "rebound", "risk", "unseen"].includes(stage)))).toBe(true);
  expect(model.diagnostic).toHaveLength(13);

  const first = page.locator("[data-personality-forecast-line]").first();
  await first.click();
  await expect(page.locator("[data-personality-forecast-horizon]")).toHaveCount(3);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  expect(width).toBeLessThanOrEqual(viewport + 1);
});

test("dynamic probability ranks have independent single-period hit records", async ({ page }) => {
  await page.goto("/");
  const snapshots = await page.evaluate(async () => {
    const response = await fetch("probability_snapshots.json");
    return response.json();
  });
  const currentRecord = snapshots.records.find((record) => !record.settled);
  const settledRecord = snapshots.records.find((record) => (
    Number(record.target) === Number(currentRecord.basedOn)
  ));
  expect(currentRecord).toBeTruthy();
  expect(settledRecord).toBeTruthy();

  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await waitForProbabilityHistory(page);

  const strips = page.locator(".prob-single-period-strip");
  await expect(strips).toHaveCount(3);
  const expected = currentRecord.top3.map((pick, index) => {
    const hit = settledRecord.actualTails.includes(Number(settledRecord.top3[index].tail));
    return {
      rank: String(index),
      tail: `尾${pick.tail}`,
      settledTail: `尾${settledRecord.top3[index].tail}`,
      settledClass: hit ? "is-hit" : "is-miss",
      settledText: hit ? "中" : "错",
    };
  });
  const expectedCount = Number(currentRecord.target);

  for (let index = 0; index < expected.length; index++) {
    const strip = strips.nth(index);
    const item = expected[index];
    const chips = strip.locator(".prob-single-period-chip");
    await expect(strip).toHaveAttribute("data-prob-single-rank", item.rank);
    await expect(chips).toHaveCount(expectedCount);
    await expect(chips.first()).toHaveClass(/is-pending/);
    await expect(chips.first()).toContainText(`第${currentRecord.target}期`);
    await expect(chips.first()).toContainText(item.tail);
    await expect(chips.first()).toContainText("待开奖");
    await expect(chips.nth(1)).toHaveClass(new RegExp(item.settledClass));
    await expect(chips.nth(1)).toContainText(`第${settledRecord.target}期`);
    await expect(chips.nth(1)).toContainText(item.settledTail);
    await expect(chips.nth(1)).toContainText(item.settledText);

    const periods = await chips.evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.period)));
    expect(periods[0]).toBe(Number(currentRecord.target));
    expect(periods[1]).toBe(Number(settledRecord.target));
    expect(periods[periods.length - 1]).toBe(1);
    expect(periods.every((period, periodIndex) => (
      periodIndex === 0 || period === periods[periodIndex - 1] - 1
    ))).toBe(true);
  }
});

test("horizontal record strips preserve vertical page panning", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await openProbabilityView(page, "history");
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.querySelectorAll(".prob-single-period-strip").length === 3;
  });

  for (const selector of [
    ".prob-single-period-strip",
    ".prob-single-period-strip",
  ]) {
    const touchAction = await page.locator(selector).first().evaluate((element) => (
      getComputedStyle(element).touchAction
    ));
    expect(touchAction.split(/\s+/)).toEqual(expect.arrayContaining(["pan-x", "pan-y"]));
  }

  await openProbabilityView(page, "snapshot");
  await page.waitForFunction(() => document.querySelectorAll(".prob-snapshot-strip").length > 0);
  const touchAction = await page.locator(".prob-snapshot-strip").first().evaluate((element) => (
    getComputedStyle(element).touchAction
  ));
  expect(touchAction.split(/\s+/)).toEqual(expect.arrayContaining(["pan-x", "pan-y"]));
});

test("left thumb drawer replaces the permanent top navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-nav-handle]")).toBeVisible();
  await expect(page.locator("[data-nav-drawer]")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".appbar .tabs")).toHaveCount(0);

  const layout = await page.locator("[data-nav-drawer]").evaluate((drawer) => {
    const rect = drawer.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewport: window.innerWidth,
    };
  });
  expect(layout.right).toBeLessThanOrEqual(0);
  expect(layout.width).toBeGreaterThan(250);
  expect(layout.width).toBeLessThan(layout.viewport);
});

test("top header is one flat page list without category controls", async ({ page }) => {
  await page.goto("/");

  const topNav = page.locator("[data-top-nav]");
  await expect(topNav).toBeVisible();
  await expect(page.locator("[data-top-group]")).toHaveCount(0);
  await expect(page.locator("[data-top-context]")).toHaveCount(0);
  expect(await page.locator("[data-top-tab]").count()).toBe(TAB_IDS.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await page.locator("[data-nav-handle]").click();
  await expect(page.locator("[data-nav-group]")).toHaveCount(0);
  expect(await page.locator("#tabs [data-tab]").count()).toBe(TAB_IDS.length);
  const drawerLayout = await page.locator("#tabs .nav-subtabs").evaluate((list) => {
    const tabs = [...list.querySelectorAll("[data-tab]")];
    return {
      direction: window.getComputedStyle(list).flexDirection,
      topDeltas: tabs.slice(1, 6).map((tab, index) => (
        tab.getBoundingClientRect().top - tabs[index].getBoundingClientRect().top
      )),
      widths: tabs.slice(0, 3).map((tab) => tab.getBoundingClientRect().width),
    };
  });
  expect(drawerLayout.direction).toBe("column");
  expect(drawerLayout.topDeltas.every((delta) => delta > 0)).toBe(true);
  expect(drawerLayout.widths.every((width) => width > 240)).toBe(true);
});

test("flat top page tabs switch pages directly", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-top-tab]")).toHaveCount(TAB_IDS.length);
  await page.locator('[data-top-tab="pick3"]').click();

  await expect(page.locator("body")).toHaveAttribute("data-page", "pick3");
  await expect(page.locator("#pageTitle")).toHaveText("模型概率");
  await expect(page.locator('[data-top-tab="pick3"]')).toHaveClass(/is-active/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth) + 1);
});

test("long press on a top second-level tab opens numeric order adjustment", async ({ page }) => {
  await page.goto("/");

  const tab = page.locator('[data-top-tab="personalityforecast"]');
  await tab.scrollIntoViewIfNeeded();
  const box = await tab.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(520);
  await page.mouse.up();

  const dialog = page.locator("[data-nav-sort-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-nav-sort-position]")).toHaveValue("4");
  await expect(dialog).toContainText("13线三期监控");
  await expect(dialog.locator("[data-nav-sort-group]")).toHaveCount(0);
  expect(await page.evaluate(() => (
    document.activeElement?.hasAttribute("data-nav-sort-position") || false
  ))).toBe(false);
});

test("drawer handle opens from a quick tap without holding", async ({ page }) => {
  await page.goto("/");

  const handle = page.locator("[data-nav-handle]");
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("body")).toHaveClass(/nav-drawer-open/, { timeout: 350 });
});

test("drawer opens, closes, and auto-closes after choosing a page", async ({ page }) => {
  await page.goto("/");

  await page.locator("[data-nav-handle]").click();
  await expect(page.locator("body")).toHaveClass(/nav-drawer-open/);
  await expect(page.locator("[data-nav-drawer]")).toHaveAttribute("aria-hidden", "false");

  await page.locator(".nav-drawer__close").click();
  await expect(page.locator("body")).not.toHaveClass(/nav-drawer-open/);
  await expect(page.locator("[data-nav-drawer]")).toHaveAttribute("aria-hidden", "true");

  await page.locator("[data-nav-handle]").click();
  await page.locator('[data-tab="personalityforecast"]').click();

  await expect(page.locator("body")).toHaveAttribute("data-page", "personalityforecast");
  await expect(page.locator("body")).not.toHaveClass(/nav-drawer-open/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("v2_current_tab")))).toBe("personalityforecast");
});

test("hidden navigation handle can be restored from the left edge", async ({ page }) => {
  await page.goto("/");

  await page.locator("[data-nav-handle]").click();
  await page.locator("[data-nav-hide]").click();
  await expect(page.locator("body")).toHaveClass(/nav-handle-hidden/);
  await expect(page.locator("[data-nav-handle]")).toBeHidden();

  const edgeStyle = await page.locator("[data-nav-edge]").evaluate((element) => ({
    opacity: Number(window.getComputedStyle(element).opacity),
    pointerEvents: window.getComputedStyle(element).pointerEvents,
  }));
  expect(edgeStyle.opacity).toBeGreaterThan(0.4);
  expect(edgeStyle.pointerEvents).toBe("auto");

  await page.locator("[data-nav-edge]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const pointer = (type, x) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 81,
      pointerType: "touch",
      button: 0,
      clientX: x,
      clientY: y,
    });
    element.dispatchEvent(pointer("pointerdown", rect.left + 2));
    element.dispatchEvent(pointer("pointermove", rect.left + 42));
    element.dispatchEvent(pointer("pointerup", rect.left + 42));
  });
  await expect(page.locator("body")).toHaveClass(/nav-drawer-open/);
  await expect(page.locator("[data-nav-show]")).toBeVisible();
  await page.locator("[data-nav-show]").click();

  await expect(page.locator("body")).not.toHaveClass(/nav-handle-hidden/);
  await expect(page.locator("[data-nav-handle]")).toBeVisible();
});

test("hidden edge handle can be dragged vertically and remembers its position", async ({ page }) => {
  await page.goto("/");

  await page.locator("[data-nav-handle]").click();
  await page.locator("[data-nav-hide]").click();
  const edge = page.locator("[data-nav-edge]");
  const drag = await edge.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const before = Number.parseFloat(window.getComputedStyle(element).top);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const pointer = (type, clientY) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 82,
      pointerType: "touch",
      button: 0,
      clientX: x,
      clientY,
    });
    element.dispatchEvent(pointer("pointerdown", y));
    element.dispatchEvent(pointer("pointermove", y - 120));
    element.dispatchEvent(pointer("pointerup", y - 120));
    return {
      before,
      after: Number.parseFloat(window.getComputedStyle(element).top),
    };
  });
  const movedTop = drag.after;
  expect(movedTop).toBeLessThan(drag.before - 80);
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains("nav-handle-hidden"));
  const reloadedTop = await page.locator("[data-nav-edge]").evaluate((element) => (
    Number.parseFloat(window.getComputedStyle(element).top)
  ));
  expect(Math.abs(reloadedTop - movedTop)).toBeLessThanOrEqual(2);
});

test("navigation handle remembers its vertical position", async ({ page }) => {
  await page.goto("/");

  const handle = page.locator("[data-nav-handle]");
  const start = await handle.boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2, start.y - 150, { steps: 8 });
  await page.mouse.up();

  const savedTop = await page.evaluate(() => Number(localStorage.getItem("v2_nav_handle_top")));
  expect(savedTop).toBeGreaterThan(100);
  await page.reload();
  const reloaded = await page.locator("[data-nav-handle]").evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).top)
  ));
  expect(Math.abs(reloaded - savedTop)).toBeLessThanOrEqual(2);
});

test("today dashboard is compact and exposes the daily decision surface", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => document.body.dataset.page === "overview");

  await expect(page.locator("[data-today-dashboard]")).toBeVisible();
  const dashboardPickCount = await page.locator("[data-dashboard-pick]").count();
  expect(dashboardPickCount).toBeGreaterThanOrEqual(2);
  expect(dashboardPickCount).toBeLessThanOrEqual(3);
  await expect(page.locator("[data-dashboard-window-state]")).toHaveCount(13);
  await expect(page.locator("[data-dashboard-shortcut]")).toHaveCount(6);
  await page.locator('[data-window-report-task="history"]').click();
  await expect(page.locator("[data-plan-history-strip]")).toHaveCount(1);
  await expect(page.locator("[data-plan-history-card]").first()).toContainText("今日下注");
  await expect(page.locator("[data-plan-history-card]").first()).toContainText("总下注");
  await expect(page.locator("[data-plan-history-card]").nth(1)).toContainText("已开奖");
  await expect(page.locator("[data-plan-history-card]").nth(1)).toBeVisible();
  await expect(page.locator("[data-today-dashboard]")).toContainText("下一期");
  await expect(page.locator("[data-today-dashboard]")).toContainText("今日下注");
  await expect(page.locator("[data-today-dashboard]")).not.toContainText("页面说明 · 大白话版");

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(5000);
});

test("today execution shows robust candidates with their true ranking positions", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => document.body.dataset.page === "overview");

  const picks = page.locator("[data-dashboard-pick]");
  const pickCount = await picks.count();
  expect(pickCount).toBeGreaterThanOrEqual(2);
  expect(pickCount).toBeLessThanOrEqual(3);
  const rankLabels = await page.locator("[data-window-rank-item] b").allTextContents();
  const candidateRows = await picks.evaluateAll((cards) => cards.map((card) => ({
    basis: card.dataset.executionBasis,
    position: Number(card.dataset.rankingPosition),
    label: card.querySelector("b")?.textContent.trim() || "",
    text: card.innerText.replace(/\s+/g, " ").trim(),
  })));
  expect(candidateRows.every((row) => row.basis === "robust")).toBe(true);
  expect(candidateRows.every((row) => row.position >= 1 && row.position <= 13)).toBe(true);
  expect(candidateRows.map((row) => row.position)).toEqual(
    candidateRows.map((row) => row.position).slice().sort((a, b) => a - b),
  );
  expect(candidateRows.every((row) => rankLabels[row.position - 1] === row.label)).toBe(true);
  expect(candidateRows.every((row) => row.text.includes("稳健候选") && row.text.includes(`三期排名#${row.position}`))).toBe(true);

  const execution = await page.locator("[data-window-execution-card]").evaluateAll((cards) => (
    cards.map((card) => ({
      selected: card.dataset.executionSelected,
      amount: Number(card.dataset.executionAmount),
    }))
  ));
  expect(execution).toHaveLength(13);
  expect(execution.filter((row) => row.selected === "true")).toHaveLength(pickCount);
  expect(execution.filter((row) => row.selected === "true").every((row) => row.amount >= 0)).toBe(true);
  expect(execution.filter((row) => row.selected !== "true").every((row) => row.amount === 0)).toBe(true);
  await expect(page.locator("[data-window-execution-panel]")).toContainText(`${pickCount} / 13`);
  await expect(page.locator("[data-window-execution-panel]")).toContainText("是否下注由你决定");
});

test("model probability page shows one single candidate grid without duplicate today cards", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "pick3");

  await expect(page.getByRole("heading", { name: "今日单期概率候选", exact: true })).toBeVisible();
  await expect(page.locator("[data-today-candidate-grid]")).toHaveCount(1);
  await expect(page.locator("[data-today-plan-card]")).toHaveCount(0);
  const cards = page.locator(".model-pair-card");
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThanOrEqual(2);
  expect(cardCount).toBeLessThanOrEqual(3);
  for (let index = 0; index < cardCount; index++) {
    const card = cards.nth(index);
    await expect(card).toContainText(/[ABC]\d/);
    await expect(card).toContainText(/单期概率/);
    await expect(card).not.toContainText("三期窗口");
    await expect(card).not.toContainText("元");
  }
  await expect(page.locator("[data-single-probability-note]")).toContainText("不代表必出");
});

test("model probability header and today candidates use the same frozen snapshot", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "pick3");

  const expected = await page.evaluate(async () => {
    const response = await fetch("probability_snapshots.json");
    const data = await response.json();
    const record = data.records.find((row) => !row.settled) ||
      data.records.slice().sort((a, b) => Number(b.target) - Number(a.target))[0];
    return record.top3.map((row, index) => ["A", "B", "C"][index] + row.tail);
  });
  const header = await page.locator(".model-pair-card b").allTextContents();
  expect(header).toEqual(expected);
});

test("shared quick access appears on non-home pages and links directly", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "pick3");

  const quick = page.locator("[data-page-quick-access]");
  await expect(quick).toHaveCount(1);
  await expect(quick.locator("[data-quick-recent]")).not.toHaveCount(0);
  await expect(quick.locator("[data-quick-common]")).toHaveCount(6);

  await quick.locator('[data-quick-common][data-quick-tab="personalityforecast"]').click();
  await expect(page.locator("body")).toHaveAttribute("data-page", "personalityforecast");
  await expect(page.locator("[data-page-quick-access]")).toHaveCount(1);
  await expect(page.locator('[data-quick-recent][data-quick-tab="pick3"]')).toHaveCount(1);
});

test("personality forecast keeps the cycle, ranking and snapshot ledger on one page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("personalityforecast"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-personality-forecast-ranking] [data-line-id]").length === 13);

  await expect(page.locator(".pf-cycle")).toContainText("结算旧快照");
  await expect(page.locator(".pf-cycle")).toContainText("全量重跑性格");
  await expect(page.locator(".pf-cycle")).toContainText("锁定下一期");
  await expect(page.locator("[data-personality-forecast-ranking] [data-line-id]")).toHaveCount(13);
  await expect(page.locator(".pf-snapshot-strip .pf-snapshot-card")).not.toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(4000);
});

test("formula table assigns a tested personality formula to all 13 lines", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("formulas"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-formula-card]").length === 13);

  const review = await page.evaluate(async () => {
    const response = await fetch("personality_model.json");
    return (await response.json()).review;
  });
  expect(review).toBeTruthy();
  expect(review.policy).toMatchObject({
    maxPeriods: 30,
    maxDays: 30,
    trigger: "whichever-first",
  });
  expect(Date.parse(review.nextReviewAt)).toBeGreaterThan(Date.parse(review.lastReviewedAt));
  await expect(page.locator("[data-personality-review]")).toContainText("30期");
  await expect(page.locator("[data-personality-review]")).toContainText("30天");

  const plans = await page.locator("[data-formula-card]").evaluateAll((cards) => cards.map((card) => {
    const text = card.querySelector("summary small")?.textContent || "";
    const match = text.match(/第\s*([123])\s*期/);
    return {
      id: card.dataset.formulaCard,
      source: card.dataset.formulaSource || "",
      stage: match ? Number(match[1]) : null,
      text,
    };
  }));

  expect(plans).toHaveLength(13);
  expect(plans.every((plan) => [1, 2, 3].includes(plan.stage))).toBe(true);
  expect(plans.every((plan) => ["robust", "fallback-test-best"].includes(plan.source))).toBe(true);
  expect(plans.some((plan) => plan.source === "robust")).toBe(true);
  expect(plans.some((plan) => plan.source === "fallback-test-best")).toBe(true);
  expect(new Set(plans.map((plan) => plan.stage)).size).toBeGreaterThan(1);

  const probabilityPlans = plans.filter((plan) => ["prob1", "prob2", "prob3"].includes(plan.id));
  expect(probabilityPlans.every((plan) => [1, 2, 3].includes(plan.stage))).toBe(true);
  expect(plans.every((plan) => !plan.text.includes("用户指定正式建仓"))).toBe(true);

  const formulaExecution = await page.locator("[data-formula-card]").evaluateAll((cards) => (
    cards.map((card) => card.dataset.formulaExecution)
  ));
  const formulaExecutionCount = formulaExecution.filter((value) => value === "true").length;
  expect(formulaExecutionCount).toBeGreaterThanOrEqual(2);
  expect(formulaExecutionCount).toBeLessThanOrEqual(3);
  expect(formulaExecution.every((value) => value === "true" || value === "false")).toBe(true);
});

test("formula cards compare monthly and half-month activity and expose one drawing stage", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("formulas"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-formula-card]").length === 13);

  const cards = await page.locator("[data-formula-card]").evaluateAll((nodes) => nodes.map((card) => {
    const monthly = card.querySelector("[data-formula-monthly]");
    const halfMonth = card.querySelector("[data-formula-half-month]");
    return {
      id: card.dataset.formulaCard,
      stage: Number(card.dataset.formulaStage),
      monthRate: Number(card.dataset.formulaMonthRate),
      nextMonthRate: Number(card.dataset.formulaNextMonthRate),
      currentHalfRate: Number(card.dataset.formulaHalfRate),
      previousHalfRate: Number(card.dataset.formulaPreviousHalfRate),
      nextHalfRate: Number(card.dataset.formulaNextHalfRate),
      monthlyText: monthly?.textContent || "",
      halfMonthText: halfMonth?.textContent || "",
    };
  }));

  expect(cards).toHaveLength(13);
  for (const card of cards) {
    expect([1, 2, 3]).toContain(card.stage);
    expect(Number.isFinite(card.monthRate), `${card.id} monthly rate missing`).toBe(true);
    expect(Number.isFinite(card.nextMonthRate), `${card.id} next-month forecast missing`).toBe(true);
    expect(Number.isFinite(card.currentHalfRate), `${card.id} current half-month rate missing`).toBe(true);
    expect(Number.isFinite(card.previousHalfRate), `${card.id} previous half-month rate missing`).toBe(true);
    expect(Number.isFinite(card.nextHalfRate), `${card.id} next-half forecast missing`).toBe(true);
    expect(card.monthlyText).toContain("本月");
    expect(card.monthlyText).toContain("下月预计");
    expect(card.halfMonthText).toContain("半月");
    expect(card.halfMonthText).toContain("下一半月预计");
  }
});

test("two and three period heatmaps separate heat view from chain history", async ({ page }) => {
  for (const tabId of ["windowmiss2", "windowmiss"]) {
    await page.goto("/");
    await page.evaluate((id) => {
      localStorage.setItem("v2_current_tab", JSON.stringify(id));
      localStorage.removeItem("v2_window_miss_view");
      localStorage.removeItem("v2_window_miss2_view");
    }, tabId);
    await page.reload();
    await page.waitForFunction((id) => document.body.dataset.page === id, tabId);

    await expect(page.locator("[data-window-miss-task]")).toHaveCount(2);
    await expect(page.locator('[data-window-miss-task="heat"]')).toHaveClass(/is-active/);
    await expect(page.locator('[data-window-miss-panel="heat"]')).toBeVisible();
    await expect(page.locator('[data-window-miss-panel="chain"]')).toHaveCount(0);

    await page.locator('[data-window-miss-task="chain"]').click();
    await expect(page.locator('[data-window-miss-panel="chain"]')).toBeVisible();
    await expect(page.locator('[data-window-miss-panel="heat"]')).toHaveCount(0);
  }
});

test("three period heatmap shows an amount only at the line formula's recommended stage", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("windowmiss"));
    localStorage.removeItem("v2_window_miss_view");
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.page === "windowmiss");

  const liveCells = await page.locator('[data-window-state="live"]').evaluateAll((cells) => cells.map((cell) => ({
    currentStage: Number(cell.dataset.windowCurrentStage),
    formulaStage: Number(cell.dataset.windowFormulaStage),
    amount: Number(cell.dataset.windowAmount),
    text: cell.innerText.replace(/\s+/g, " ").trim(),
  })));
  expect(liveCells.length).toBeGreaterThan(0);
  for (const cell of liveCells) {
    expect([1, 2, 3]).toContain(cell.formulaStage);
    if (cell.currentStage === cell.formulaStage) {
      expect(cell.amount).toBeGreaterThanOrEqual(0);
    } else {
      expect(cell.amount).toBe(0);
      expect(cell.text).toContain("0元");
    }
  }
});

test("heatmap task buttons never cover the number header", async ({ page }) => {
  for (const tabId of ["trend", "missorder", "windowmiss2", "windowmiss"]) {
    await page.goto("/");
    await page.evaluate((id) => {
      localStorage.setItem("v2_current_tab", JSON.stringify(id));
    }, tabId);
    await page.reload();
    await page.waitForFunction((id) => document.body.dataset.page === id, tabId);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const geometry = await page.evaluate(() => {
      const task = document.querySelector(".task-tabs");
      const header = document.querySelector(".heatmap__table thead th");
      const appbar = document.querySelector(".appbar");
      if (!task || !header || !appbar) return null;
      return {
        taskPosition: getComputedStyle(task).position,
        taskBottom: task.getBoundingClientRect().bottom,
        headerTop: header.getBoundingClientRect().top,
        appbarBottom: appbar.getBoundingClientRect().bottom,
      };
    });
    expect(geometry).toBeTruthy();
    expect(geometry.taskPosition).toBe("static");
    expect(geometry.taskBottom).toBeLessThanOrEqual(geometry.appbarBottom + 1);
    if (geometry.headerTop >= 0) {
      expect(geometry.headerTop).toBeGreaterThanOrEqual(geometry.appbarBottom - 1);
    }
    if (geometry.taskBottom > geometry.appbarBottom) {
      expect(geometry.headerTop).toBeGreaterThanOrEqual(geometry.taskBottom - 1);
    }
  }
});

test("one-period heatmap and miss ordering expose task tabs instead of one long page", async ({ page }) => {
  for (const tabId of ["trend", "missorder"]) {
    await page.goto("/");
    await page.evaluate((id) => {
      localStorage.setItem("v2_current_tab", JSON.stringify(id));
      localStorage.removeItem("v2_trend_view");
      localStorage.removeItem("v2_miss_order_view");
    }, tabId);
    await page.reload();
    await page.waitForFunction((id) => document.body.dataset.page === id, tabId);

    const tasks = page.locator("[data-flow-task]");
    expect(await tasks.count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('[data-flow-panel="heat"]')).toBeVisible();
    await expect(page.locator('[data-flow-panel="chain"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(3500);

    await page.locator('[data-flow-task="chain"]').click();
    await expect(page.locator('[data-flow-panel="chain"]')).toBeVisible();
    await expect(page.locator('[data-flow-panel="heat"]')).toHaveCount(0);
  }
});

test("personality snapshot ledger stays newest first and keeps settlement counts", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("personalityforecast"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".pf-snapshot-strip .pf-snapshot-card").length > 0);

  const periods = await page.locator(".pf-snapshot-strip .pf-snapshot-card__head b").evaluateAll((nodes) => (
    nodes.map((node) => Number(node.textContent.replace(/\D/g, "")))
  ));
  expect(periods.length).toBeGreaterThan(1);
  expect(periods).toEqual(periods.slice().sort((a, b) => b - a));
  await expect(page.locator(".pf-snapshot-strip .pf-snapshot-card").first()).toContainText("待结算");
  await expect(page.locator(".pf-snapshot-strip .pf-snapshot-card").last()).toContainText(/中\d+/);
  await expect(page.locator(".pf-snapshot-strip .pf-snapshot-card").last()).toContainText(/错\d+/);
});

test("personality forecast line controls meet mobile touch and type minimums", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("personalityforecast"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-personality-forecast-line]").length === 13);

  const controls = await page.locator("[data-personality-forecast-line]").evaluateAll((nodes) => (
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        height: rect.height,
        fontSize: Number(window.getComputedStyle(node).fontSize.replace("px", "")),
      };
    })
  ));
  expect(controls.every((item) => item.height >= 44)).toBe(true);
  expect(controls.every((item) => item.fontSize >= 12)).toBe(true);
});

test("three-period history loads in bounded batches", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("overview"));
    localStorage.setItem("v2_window_report_view", JSON.stringify("history"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-window-history-card]").length > 13);

  const count = await page.locator("[data-window-history-card]").count();
  expect(count).toBeLessThanOrEqual(80);
  await expect(page.locator("[data-window-history-more]")).toBeVisible();
  const yearButtons = page.locator("[data-window-history-year]");
  expect(await yearButtons.count()).toBeGreaterThanOrEqual(6);
  const lineButtons = page.locator("button[data-window-history-line]");
  expect(await lineButtons.count()).toBe(13);
  await page.locator('[data-window-history-line="tail4"]').click();
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll("[data-window-history-card]")];
    return cards.length > 0 && cards.every((card) => card.dataset.windowHistoryLine === "tail4");
  });
  await page.locator('[data-window-history-year="2025"]').click();
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll("[data-window-history-card]")];
    return cards.length > 0 && cards.every((card) => card.dataset.windowYear === "2025");
  });
});

