// 护栏：导航和简单表头使用长按拖动排序，不走上下箭头
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9491;
const HTTP = 8241;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return response.json();
}

async function main() {
  const failures = [];
  const check = (ok, label, extra) => {
    console.log(`${ok ? "PASS" : "FAIL"}: ${label}${extra ? ` [${extra}]` : ""}`);
    if (!ok) failures.push(label);
  };
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "ignore"
  });
  await sleep(1200);
  const userDir = path.join(process.cwd(), `.chrome-longpress-${Date.now()}`);
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${CDP}`,
    `--user-data-dir=${userDir}`,
    "--window-size=390,844",
    "about:blank"
  ], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJSON(`http://127.0.0.1:${CDP}/json/list`);
      target = (list || []).find((item) => item.type === "page");
      if (target && target.webSocketDebuggerUrl) break;
    } catch (error) {}
    await sleep(400);
  }
  if (!target) throw new Error("Chrome target unavailable");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let messageId = 0;
  ws.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      return;
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === "Runtime.exceptionThrown") {
      errors.push((message.params.exceptionDetails || {}).text || "exception");
    }
  });
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  const send = (method, params) => new Promise((resolve) => {
    const id = ++messageId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return response.result && response.result.result ? response.result.result.value : undefined;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 50; i++) {
      if (await evaluate(expression)) return true;
      await sleep(150);
    }
    return false;
  };
  const holdDrag = async (from, to) => {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from.x, y: from.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: from.x, y: from.y, button: "left", buttons: 1, clickCount: 1 });
    await sleep(620);
    for (let i = 1; i <= 6; i++) {
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: from.x + (to.x - from.x) * i / 6,
        y: from.y + (to.y - from.y) * i / 6,
        button: "left",
        buttons: 1
      });
      await sleep(35);
    }
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to.x, y: to.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(250);
  };
  const holdOnly = async (point) => {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
    await sleep(620);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(180);
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `http://127.0.0.1:${HTTP}/index.html` });
  await waitFor("!!document.querySelector('.directory-card')");
  await evaluate(`localStorage.setItem("v2_current_tab", JSON.stringify("missorder"));localStorage.setItem("v2_nav_group", JSON.stringify("miss"));localStorage.removeItem("v2_tab_order");localStorage.removeItem("v2_table_col_orders");location.reload();`);
  await waitFor("document.body.dataset.page === 'missorder' && document.querySelectorAll('[data-col-original]').length > 0");

  check(!(await evaluate("!!document.querySelector('.sort-btn, [data-group-move], [data-move-tab], [data-sort-toggle]')")), "导航不再显示排序箭头或下拉框");
  const tableBefore = await evaluate(`(function(){
    var ths = document.querySelectorAll('#view .heatmap__table th[data-col-original]');
    return { first: ths[1].getAttribute('data-col-original'), second: ths[2].getAttribute('data-col-original'), box1: ths[1].getBoundingClientRect().toJSON(), box2: ths[2].getBoundingClientRect().toJSON() };
  })()`);
  await holdDrag(
    { x: tableBefore.box1.x + tableBefore.box1.width / 2, y: tableBefore.box1.y + tableBefore.box1.height / 2 },
    { x: tableBefore.box2.x + tableBefore.box2.width * 0.85, y: tableBefore.box2.y + tableBefore.box2.height / 2 }
  );
  const tableAfter = await evaluate(`(function(){
    var ths = [...document.querySelectorAll('#view .heatmap__table th[data-col-original]')].map(function (th) { return Number(th.dataset.colOriginal); });
    var orders = JSON.parse(localStorage.getItem("v2_table_col_orders") || "{}");
    return { ths: ths, orders: orders };
  })()`);
  const tableOrder = Object.values(tableAfter.orders)[0] || [];
  check(tableAfter.ths[0] === 0 && tableAfter.ths[1] === 2 && tableAfter.ths[2] === 1, "长按表头可拖动列顺序", tableAfter.ths.join(","));
  check(tableOrder[0] === 0 && tableOrder[1] === 2 && tableOrder[2] === 1, "表头顺序写入本地保存");

  await evaluate(`location.reload()`);
  await waitFor("document.body.dataset.page === 'missorder' && document.querySelectorAll('[data-col-original]').length > 0");
  const tableReload = await evaluate(`[...document.querySelectorAll('#view .heatmap__table th[data-col-original]')].slice(0,3).map(function (th) { return Number(th.dataset.colOriginal); })`);
  check(tableReload[0] === 0 && tableReload[1] === 2 && tableReload[2] === 1, "刷新后表头顺序保留");

  const navBefore = await evaluate(`(function(){
    var tabs = document.querySelectorAll('.nav-subtabs .tab[data-tab]');
    return { ids: [tabs[0].dataset.tab, tabs[1].dataset.tab], box1: tabs[0].getBoundingClientRect().toJSON(), box2: tabs[1].getBoundingClientRect().toJSON() };
  })()`);
  await holdDrag(
    { x: navBefore.box1.x + navBefore.box1.width / 2, y: navBefore.box1.y + navBefore.box1.height / 2 },
    { x: navBefore.box2.x + navBefore.box2.width * 0.85, y: navBefore.box2.y + navBefore.box2.height / 2 }
  );
  const navAfter = await evaluate(`(function(){
    var tabs = [...document.querySelectorAll('.nav-subtabs .tab[data-tab]')].map(function (tab) { return tab.dataset.tab; });
    return { tabs: tabs, saved: JSON.parse(localStorage.getItem("v2_tab_order") || "[]"), page: document.body.dataset.page };
  })()`);
  check(navAfter.tabs[0] === navBefore.ids[1] && navAfter.tabs[1] === navBefore.ids[0], "长按导航可拖动排序", navAfter.tabs.slice(0,3).join(","));
  check(navAfter.saved.indexOf(navBefore.ids[1]) >= 0 && navAfter.saved.indexOf(navBefore.ids[1]) < navAfter.saved.indexOf(navBefore.ids[0]), "导航顺序写入本地保存");
  check(navAfter.page === "missorder", "拖动导航不会误切页面");

  const tabNumericBefore = await evaluate(`(function(){
    var tab = document.querySelector(".nav-subtabs .tab[data-tab]");
    var box = tab.getBoundingClientRect();
    return { id: tab.dataset.tab, page: document.body.dataset.page, point: { x: box.left + box.width / 2, y: box.top + box.height / 2 } };
  })()`);
  await holdOnly(tabNumericBefore.point);
  const tabDialog = await evaluate(`({
    open: !!document.querySelector("[data-nav-sort-dialog]"),
    hasPosition: !!document.querySelector("[data-nav-sort-position]"),
    hasGroup: !!document.querySelector("[data-nav-sort-group]")
  })`);
  check(tabDialog.open && tabDialog.hasPosition && tabDialog.hasGroup, "长按二级表头弹出顺位和跨类目输入");
  await evaluate(`(function(){
    var select = document.querySelector("[data-nav-sort-group]");
    var input = document.querySelector("[data-nav-sort-position]");
    select.value = "tools";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    input.value = "1";
    document.querySelector("[data-nav-sort-apply]").click();
  })()`);
  await sleep(300);
  const tabCross = await evaluate(`(function(){
    var map = JSON.parse(localStorage.getItem("v2_nav_page_groups") || "{}");
    var ids = [...document.querySelectorAll(".nav-subtabs .tab[data-tab]")].map(function (tab) { return tab.dataset.tab; });
    return { map: map, ids: ids, page: document.body.dataset.page };
  })()`);
  check(tabCross.map[tabNumericBefore.id] === "tools", "长按输入数字可跨类目移动页面", tabCross.map[tabNumericBefore.id]);
  check(tabCross.ids[0] === tabNumericBefore.id && tabCross.page === tabNumericBefore.page, "跨类目后按输入顺位排在首位且不误切页面", `moved=${tabNumericBefore.id}, before=${tabNumericBefore.page}, after=${tabCross.page}, ids=${tabCross.ids.slice(0,3).join(",")}`);

  await sleep(700);
  await evaluate(`document.querySelector('[data-directory="1"]').click()`);
  if (!(await waitFor("document.body.dataset.page === 'directory' && document.querySelectorAll('.nav-groups .nav-group-wrap').length > 1"))) throw new Error("Directory did not open for numeric sort test");
  const groupNumericBefore = await evaluate(`(function(){
    var wraps = document.querySelectorAll(".nav-groups .nav-group-wrap");
    var groups = [...document.querySelectorAll(".nav-groups .nav-group[data-nav-group]")].map(function (button) { return button.dataset.navGroup; });
    var box = wraps[0].getBoundingClientRect();
    return { groups: groups, point: { x: box.left + box.width / 2, y: box.top + box.height / 2 } };
  })()`);
  await holdOnly(groupNumericBefore.point);
  const groupDialog = await evaluate(`({
    open: !!document.querySelector("[data-nav-sort-dialog]"),
    hasPosition: !!document.querySelector("[data-nav-sort-position]"),
    hasGroup: !!document.querySelector("[data-nav-sort-group]")
  })`);
  check(groupDialog.open && groupDialog.hasPosition && !groupDialog.hasGroup, "长按一级表头弹出数字顺位输入");
  await evaluate(`(function(){ document.querySelector("[data-nav-sort-position]").value = "2"; document.querySelector("[data-nav-sort-apply]").click(); })()`);
  await sleep(300);
  const groupNumericAfter = await evaluate(`[...document.querySelectorAll(".nav-groups .nav-group[data-nav-group]")].map(function (button) { return button.dataset.navGroup; })`);
  check(groupNumericAfter[0] === groupNumericBefore.groups[1] && groupNumericAfter[1] === groupNumericBefore.groups[0], "一级表头输入数字后自动排序", groupNumericAfter.slice(0,3).join(","));

  await sleep(500);
  await evaluate(`document.querySelector('[data-directory="1"]').click()`);
  await waitFor("document.body.dataset.page === 'directory' && document.querySelectorAll('.nav-groups .nav-group-wrap').length > 1");
  const groupBefore = await evaluate(`(function(){
    var groups = document.querySelectorAll('.nav-groups .nav-group-wrap');
    return { ids: [groups[0].querySelector('[data-nav-group]').dataset.navGroup, groups[1].querySelector('[data-nav-group]').dataset.navGroup], box1: groups[0].getBoundingClientRect().toJSON(), box2: groups[1].getBoundingClientRect().toJSON() };
  })()`);
  await holdDrag(
    { x: groupBefore.box1.x + groupBefore.box1.width / 2, y: groupBefore.box1.y + groupBefore.box1.height / 2 },
    { x: groupBefore.box2.x + groupBefore.box2.width * 0.85, y: groupBefore.box2.y + groupBefore.box2.height / 2 }
  );
  const groupAfter = await evaluate(`(function(){
    var ids = [...document.querySelectorAll('.nav-groups .nav-group[data-nav-group]')].map(function (button) { return button.dataset.navGroup; });
    return { ids: ids, saved: JSON.parse(localStorage.getItem("v2_nav_group_order") || "[]") };
  })()`);
  check(groupAfter.ids[0] === groupBefore.ids[1] && groupAfter.ids[1] === groupBefore.ids[0], "长按一级导航可拖动排序", groupAfter.ids.slice(0,3).join(","));
  check(groupAfter.saved[0] === groupBefore.ids[1] && groupAfter.saved[1] === groupBefore.ids[0], "一级导航顺序写入本地保存");

  await sleep(500);
  await evaluate(`document.querySelector('[data-sort-reset]').click()`);
  await waitFor("!!document.querySelector('[data-col-original]')");
  const resetState = await evaluate(`({ tables: localStorage.getItem("v2_table_col_orders"), tabs: localStorage.getItem("v2_tab_order"), groups: localStorage.getItem("v2_nav_page_groups") })`);
  check(resetState.tables == null && resetState.tabs == null && resetState.groups == null, "恢复默认同时清除导航、跨类目和表头顺序");
  check(errors.length === 0, "控制台无报错", errors.join(" | "));

  await send("Browser.close", {});
  chrome.kill();
  server.kill();
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (error) {}
  console.log(`RESULT: ${failures.length ? "FAIL" : "ALL PASS"}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
