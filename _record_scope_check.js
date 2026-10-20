#!/usr/bin/env node
// 护栏：滚动记录/窗口记录只能显示最近一年（当年），不能把往年累积进来
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9463, HTTP = 8203;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-scope-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + userDir, "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((t) => t.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0;
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  const fails = [];
  const check = (ok, label, extra) => { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); };
  await ev("document.querySelector('[data-directory-group=\"recommend\"]').click(); true"); await sleep(500);
  await ev("var dt=document.querySelector('[data-directory-tab=\"betexec\"]'); if(dt)dt.click(); true"); await sleep(400);
  // 下注执行表（执行提示/资金调度已并入本页）：记录头部“已结算 N 窗”必须是当年窗数，不是五六年累积
  await ev("document.querySelector('.tab[data-tab=\"betexec\"]').click(); true"); await sleep(2200);
  const betCounts = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#view .panel'), function (p) {
    var m = p.innerText.match(/对错滚动记录 · [^\\n]*? · 已结算 (\\d+) 窗/);
    return m ? Number(m[1]) : null;
  }).filter(function (x) { return x != null; }))`));
  const betMax = betCounts.length ? Math.max(...betCounts) : 0;
  check(betCounts.length >= 10 && betMax <= 400, "下注执行表：每条线已结算窗数=当年（≤400）", "最大 " + betMax + " 窗 / 共 " + betCounts.length + " 条");
  console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
})();
