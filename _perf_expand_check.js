// 验证“显示全部”按钮真的把完整记录渲染回来
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9441, HTTP = 8181;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-expand-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + userDir, "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((t) => t.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0; const errs = [];
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails || {}).text || "exception"); });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }

  const fails = [];
  function check(ok, label, extra) { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); }

  async function open(group, tab) {
    await ev("var b=document.querySelector('[data-directory=\"1\"]'); if(b)b.click(); true"); await sleep(350);
    await ev("document.querySelector('[data-directory-group=\"" + group + "\"]').click(); true"); await sleep(400);
    await ev("document.querySelector('.tab[data-tab=\"" + tab + "\"]').click(); true"); await sleep(900);
  }

  // 1) 号码走势：默认截断 → 点“显示全部”恢复全年
  await open("trends", "numtrend");
  const rowsBefore = await ev("document.querySelectorAll('#view tbody tr').length");
  const btn = await ev("!!document.querySelector('[data-perf-more]')");
  await ev("var b=document.querySelector('[data-perf-more]'); if(b)b.click(); true"); await sleep(1200);
  const rowsAfter = await ev("document.querySelectorAll('#view tbody tr').length");
  check(btn === true && rowsBefore <= 61 && rowsAfter > rowsBefore, "号码走势：默认只渲染最近60期，点“显示全部”恢复全年", rowsBefore + " → " + rowsAfter);

  // 2) 遗漏热图
  await open("miss", "trend");
  const tBefore = await ev("document.querySelectorAll('#view .heatmap__table tbody tr').length");
  await ev("var b=document.querySelector('[data-perf-more]'); if(b)b.click(); true"); await sleep(1200);
  const tAfter = await ev("document.querySelectorAll('#view .heatmap__table tbody tr').length");
  check(tBefore <= 61 && tAfter > tBefore, "遗漏热图：默认最近60期，可展开全年", tBefore + " → " + tAfter);

  // 3) 双号追热逐期记录
  await open("recommend", "pick3");
  const rBefore = await ev("document.querySelectorAll('#view .record').length");
  await ev("var b=document.querySelector('[data-perf-more]'); if(b)b.click(); true"); await sleep(1500);
  const rAfter = await ev("document.querySelectorAll('#view .record').length");
  check(rBefore <= 61 && rAfter > rBefore, "双号追热逐期记录：默认最近60期，可展开全部", rBefore + " → " + rAfter);

  // 4) 切走再切回，展开状态自动复位（省内存）
  await open("recommend", "formulas");
  await open("recommend", "pick3");
  const rReset = await ev("document.querySelectorAll('#view .record').length");
  check(rReset <= 61, "切页后自动回到精简渲染", String(rReset));

  // 5) 展开按钮文案
  const txt = await ev("(document.querySelector('[data-perf-more]')||{}).innerText || ''");
  check(/显示全部/.test(txt), "展开按钮文案可读", txt.trim());

  check(errs.length === 0, "无 console 报错", errs.slice(0, 3).join(","));
  console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
})();
