// 逐页性能实测：点击→画面稳定耗时、DOM 节点数、HTML 体积、长任务
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9437, HTTP = 8177;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }

const MEASURE_JS = [
  "(function(){",
  " var t0 = performance.now();",
  " var el = document.querySelector(window.__sel);",
  " if (!el) return Promise.resolve({ error: 'no element' });",
  " return new Promise(function (resolve) {",
  "   var done = false;",
  "   function finish(extra) {",
  "     if (done) return; done = true;",
  "     requestAnimationFrame(function () { requestAnimationFrame(function () {",
  "       var v = document.getElementById('view');",
  "       var out = { ms: Math.round(performance.now() - t0), nodes: v.getElementsByTagName('*').length, html: v.innerHTML.length };",
  "       if (extra) out.timeout = true;",
  "       resolve(out);",
  "     }); });",
  "   }",
  "   var mo = new MutationObserver(function () {",
  "     if (window.__settle) clearTimeout(window.__settle);",
  "     window.__settle = setTimeout(function () { mo.disconnect(); finish(false); }, 80);",
  "   });",
  "   mo.observe(document.getElementById('view'), { childList: true, subtree: true });",
  "   el.click();",
  "   setTimeout(function () { mo.disconnect(); finish(true); }, 8000);",
  " });",
  "})()"
].join("\n");

(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-perf-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + userDir, "--window-size=393,852", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((t) => t.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0;
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  await ev("window.__long = 0; new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if(e.duration > window.__long) window.__long = e.duration; }); }).observe({entryTypes:['longtask']}); true");

  async function measure(label, sel) {
    await ev("window.__long = 0; window.__sel = " + JSON.stringify(sel) + "; true");
    const out = await ev(MEASURE_JS);
    out.label = label; out.longTask = await ev("Math.round(window.__long)");
    return out;
  }

  const groups = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('.directory-card'),function(e){return e.dataset.directoryGroup}))"));
  const rows = [];
  for (const g of groups) {
    await ev("var b=document.querySelector('[data-directory=\"1\"]'); if(b)b.click(); true"); await sleep(400);
    await ev("document.querySelector('[data-directory-group=\"" + g + "\"]').click(); true"); await sleep(500);
    const tabs = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('.tab[data-tab]'),function(e){return e.dataset.tab}))"));
    for (const t of tabs) { rows.push(await measure(t, '.tab[data-tab="' + t + '"]')); await sleep(150); }
  }
  rows.sort((a, b) => (b.ms || 0) - (a.ms || 0));
  console.log("页面".padEnd(14) + "耗时ms".padStart(8) + "节点数".padStart(9) + "HTML字节".padStart(10) + "长任务".padStart(8));
  rows.forEach((r) => console.log(String(r.label).padEnd(14) + String(r.ms).padStart(8) + String(r.nodes).padStart(9) + String(r.html).padStart(10) + String(r.longTask).padStart(8)));
  console.log("合计 " + rows.reduce((a, r) => a + (r.ms || 0), 0) + "ms · 最慢 " + rows[0].label + " " + rows[0].ms + "ms · 最大节点数 " + Math.max.apply(null, rows.map((r) => r.nodes || 0)) + " · 最大长任务 " + Math.max.apply(null, rows.map((r) => r.longTask || 0)) + "ms");
  fs.writeFileSync("_perf_result.json", JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
