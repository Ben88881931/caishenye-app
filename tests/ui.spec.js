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
