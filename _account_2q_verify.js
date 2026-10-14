// 核对：两期方案的窗口必须是“两期窗口”（中了就开新窗 / 两期没中就结束等重开），不能套三期窗口
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9453, HTTP = 8193;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LINES = [["tail0", "尾0"], ["tail9", "尾9"], ["fixedD2", "追号码D2"], ["recD1", "追推荐D1"], ["recD2", "追推荐D2"]];
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-verify2-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + userDir, "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((t) => t.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0;
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  await ev("document.querySelector('[data-directory-group=\"recommend\"]').click(); true"); await sleep(500);
  await ev("document.querySelector('.tab[data-tab=\"betexec\"]').click(); true"); await sleep(1500);
  await ev("var b=document.querySelector('[data-bet-lines=\"all\"]'); if(b)b.click(); true"); await sleep(1500);

  // 展开某条线的滚动记录，读回所有窗口（起始期 + 每期状态）
  async function windowsOf(mode, lineId) {
    await ev("var b=document.querySelector('[data-bet-mode=\"" + mode + "\"]'); if(b)b.click(); true"); await sleep(1500);
    await ev("var b=document.querySelector('[data-perf-more=\"betexec:" + lineId + "\"]'); if(b)b.click(); true"); await sleep(1800);
    const raw = await ev(`(function () {
      var cards = [].map.call(document.querySelectorAll('#view .exec-line__scroll .exec-hist-card'), function (c) {
        return c.innerText.replace(/\\n+/g, '|');
      });
      return JSON.stringify(cards);
    })()`);
    // 卡片的顺序是“新→旧”，而页面一次只渲染被展开那条线，所以先取全部再按起始期排序
    return JSON.parse(raw).map((t) => {
      const m = /起始 第(\d+)期/.exec(t);
      const rows = [...t.matchAll(/第(\d)期\|第(\d+)期\|(尾\d|待定)\|(中|错|未记录|待开奖)\|(本方案不打|\d+元)/g)]
        .map((r) => ({ stage: Number(r[1]), period: Number(r[2]), tail: r[3], state: r[4], stake: r[5] }));
      return { start: m ? Number(m[1]) : 0, rows };
    }).sort((a, b) => a.start - b.start);
  }

  for (const [lineId, label] of LINES) {
    const two = await windowsOf("two", lineId);
    const three = await windowsOf("three", lineId);
    const key = (ws2) => ws2.map((w) => w.start + ":" + w.rows.filter((r) => r.state === "中" || r.state === "错").length + ":" + (w.rows.some((r) => r.state === "中") ? "中" : "错")).join(" ");
    console.log("=== " + label + " ===");
    console.log("  两期窗口 " + two.length + " 个: " + key(two).slice(0, 160));
    console.log("  三期窗口 " + three.length + " 个: " + key(three).slice(0, 160));
    const onlyTwo = two.filter((w) => !three.some((t) => t.start === w.start)).slice(0, 6).map((w) => w.start);
    const onlyThree = three.filter((w) => !two.some((t) => t.start === w.start)).slice(0, 6).map((w) => w.start);
    console.log("  只出现在两期的窗口起始期: " + (onlyTwo.join(",") || "-") + " ｜ 只出现在三期的: " + (onlyThree.join(",") || "-"));
  }
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
