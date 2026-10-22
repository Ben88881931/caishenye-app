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

test("horizontal scroll region swipes in the center keep the same page", async ({ page }) => {
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
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "pick3", after: "pick3" });
});

test("13-line center pages do not change from horizontal swipes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("windowmult"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("13线规律中心");
  });

  const result = await page.locator("#view .wm-card").first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + Math.min(120, rect.width / 2);
    const y = rect.top + 20;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 93,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    const before = document.body.dataset.page;
    element.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 90));
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "windowmult", after: "windowmult" });
});

test("13-line center subtabs are fixed and cannot swipe like pages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("windowmult"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("13线规律中心");
  });

  const state = await page.locator("#view .wm-view-tabs").evaluate((strip) => {
    const before = {
      page: document.body.dataset.page,
      activeView: strip.querySelector(".is-active")?.getAttribute("data-wm-view"),
    };
    const tabs = [...strip.querySelectorAll(".wm-view-tab")];
    const firstTop = tabs[0].getBoundingClientRect().top;
    const wraps = tabs.some((tab) => Math.abs(tab.getBoundingClientRect().top - firstTop) > 2);
    const rect = strip.getBoundingClientRect();
    const startX = rect.right - 6;
    const y = rect.top + rect.height / 2;
    const pointer = (type, clientX) => new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 96,
      pointerType: "touch",
      button: 0,
      clientX,
      clientY: y,
    });
    strip.dispatchEvent(pointer("pointerdown", startX));
    document.documentElement.dispatchEvent(pointer("pointermove", startX - 120));
    document.documentElement.dispatchEvent(pointer("pointerup", startX - 120));
    return {
      ...before,
      pageAfter: document.body.dataset.page,
      activeViewAfter: strip.querySelector(".is-active")?.getAttribute("data-wm-view"),
      horizontalOverflow: strip.scrollWidth - strip.clientWidth,
      wraps,
    };
  });

  expect(state).toEqual({
    page: "windowmult",
    activeView: "overview",
    pageAfter: "windowmult",
    activeViewAfter: "overview",
    horizontalOverflow: 0,
    wraps: true,
  });
});

test("long right swipe on the first page does not open the directory", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("pick3"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("测试窗口记录");
  });

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
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "pick3", after: "pick3" });
});

test("long right swipe on a later page returns one page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("betexec"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement && view.innerText.includes("今日规划");
  });

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
    return { before, after: document.body.dataset.page };
  });

  expect(result).toEqual({ before: "betexec", after: "pick3" });
});

test("daily report ranks all 13 lines by the combined analysis score", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("dailyreport"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement &&
      view.innerText.includes("每日最终报告") &&
      view.querySelectorAll("[data-daily-report-row]").length === 13;
  });

  await expect(page.locator("[data-daily-report-row]")).toHaveCount(13);
  await expect(page.locator("[data-daily-report-card]")).toHaveCount(13);
  await expect(page.locator("[data-weight-model]")).toHaveCount(2);

  const cardLayout = await page.locator("[data-daily-report-strip]").evaluate((strip) => {
    const card = strip.querySelector("[data-daily-report-card]");
    const rect = card.getBoundingClientRect();
    return {
      cardWidth: rect.width,
      stripWidth: strip.clientWidth,
      scrollable: strip.scrollWidth > strip.clientWidth,
    };
  });
  expect(cardLayout.cardWidth).toBeLessThanOrEqual(300);
  expect(cardLayout.cardWidth).toBeLessThan(cardLayout.stripWidth);
  expect(cardLayout.scrollable).toBe(true);

  const scores = await page.locator("[data-daily-report-row]").evaluateAll((rows) => (
    rows.map((row) => Number(row.getAttribute("data-report-score")))
  ));
  expect(scores.every((score, index) => index === 0 || scores[index - 1] >= score)).toBe(true);
});

test("daily reports synthesize every analysis section for all 13 lines", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("dailyreport"));
  });
  await page.reload();
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll("[data-daily-report-card]");
    return cards.length === 13;
  });

  const required = ["conclusion", "reason", "window", "recent", "longterm", "formula", "risk"];
  const report = await page.locator("[data-daily-report-card]").evaluateAll((cards, sectionNames) => {
    return cards.map((card) => {
      const sections = sectionNames.map((name) => {
        const node = card.querySelector(`[data-report-section="${name}"]`);
        return { name, present: Boolean(node), text: node?.innerText?.trim() || "" };
      });
      const advice = card.querySelector("[data-report-advice]");
      return {
        id: card.getAttribute("data-line-id"),
        advice: advice?.innerText?.trim() || "",
        sections,
      };
    });
  }, required);

  expect(report).toHaveLength(13);
  for (const card of report) {
    expect(card.id).toBeTruthy();
    expect(card.advice.length).toBeGreaterThan(4);
    for (const section of card.sections) {
      expect(section.present, `${card.id} missing ${section.name}`).toBe(true);
      expect(section.text.length, `${card.id} empty ${section.name}`).toBeGreaterThan(8);
    }
  }

  const rows = page.locator("[data-daily-report-row]");
  await expect(rows.locator("[data-report-advice]")).toHaveCount(13);
  await expect(rows.locator("[data-report-reason]")).toHaveCount(13);
});

test("vertical wheel over a horizontal report strip scrolls the page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("v2_current_tab", JSON.stringify("dailyreport"));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("[data-daily-report-card]").length === 13);

  const strip = page.locator("[data-daily-report-strip]");
  await strip.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await strip.hover();
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => window.scrollY);

  expect(after).toBeGreaterThan(before);
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
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement &&
      view.innerText.includes("单期对错") &&
      view.querySelectorAll(".prob-single-period-strip").length === 3;
  });

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
  await page.waitForFunction(() => {
    const view = document.querySelector("#view");
    return view instanceof HTMLElement &&
      view.querySelectorAll(".prob-single-period-strip").length === 3 &&
      view.querySelectorAll(".prob-snapshot-strip").length > 0;
  });

  const selectors = [
    ".prob-test-strip",
    ".prob-single-period-strip",
    ".prob-snapshot-strip",
  ];
  for (const selector of selectors) {
    const touchAction = await page.locator(selector).first().evaluate((element) => (
      getComputedStyle(element).touchAction
    ));
    expect(touchAction.split(/\s+/)).toEqual(expect.arrayContaining(["pan-x", "pan-y"]));
  }
});

