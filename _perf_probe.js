// 找出某页里最占 DOM 的区块
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9439, HTTP = 8179;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const tab = process.argv[2] || "pick3";
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-probe-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + userDir, "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((t) => t.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0;
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  await ev("document.querySelector('[data-directory-group=\"recommend\"]').click(); true"); await sleep(500);
  await ev("document.querySelector('.tab[data-tab=\"" + tab + "\"]').click(); true"); await sleep(2500);
  const out = await ev(`JSON.stringify([].map.call(document.querySelectorAll('#view > *'), function (el, i) {
    var n = el.getElementsByTagName('*').length;
    var title = (el.querySelector('.section__title') || {}).innerText || el.className || el.tagName;
    return { i: i, n: n, title: String(title).slice(0, 40) };
  }).sort(function (a, b) { return b.n - a.n; }).slice(0, 12))`);
  JSON.parse(out).forEach((r) => console.log(String(r.n).padStart(7) + "  " + r.title));
  const deep = await ev(`(function () {
    var host = null, best = 0;
    [].forEach.call(document.querySelectorAll('#view > *'), function (el) {
      var n = el.getElementsByTagName('*').length;
      if (n > best) { best = n; host = el; }
    });
    if (!host) return '[]';
    var rows = [].map.call(host.children, function (c) {
      return { n: c.getElementsByTagName('*').length, tag: c.tagName, cls: String(c.className).slice(0, 30), txt: String(c.innerText || '').replace(/\\s+/g, ' ').slice(0, 40) };
    }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    return JSON.stringify(rows);
  })()`);
  console.log('--- 最大区块内部');
  JSON.parse(deep).forEach((r) => console.log(String(r.n).padStart(7) + "  " + r.tag + "." + r.cls + "  " + r.txt));
  console.log("总计 " + await ev("document.querySelector('#view').getElementsByTagName('*').length"));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
