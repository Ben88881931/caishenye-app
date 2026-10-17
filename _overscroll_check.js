// 护栏：所有页面打开时锁死屏宽（整页不许左右晃），横向滚动只能发生在各自的滚动容器里
const { spawn } = require("child_process");
const path = require("path");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9997, HTTP = 8737;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const fails = [];
  const check = (ok, label, extra) => { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); };
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + path.join(process.cwd(), ".chrome-overscroll-" + Date.now()), "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let t = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); t = (l || []).find((x) => x.type === "page"); if (t) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); const pend = new Map(); let id = 0;
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (m, p) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  const groups = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('[data-directory-group]'),function(g){return g.dataset.directoryGroup;}))"));
  let pages = 0; const bad = [];
  for (const gid of groups) {
    await ev("var bk=document.querySelector('[data-directory=\"1\"]'); if(bk)bk.click(); true"); await sleep(420);
    await ev("var x=document.querySelector('[data-directory-group=\"" + gid + "\"]'); if(x)x.click(); true"); await sleep(500);
    const tabs = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('#tabs .tab[data-tab]'),function(b){return {id:b.dataset.tab,label:b.innerText.trim()};}).filter(function(t){return t.id!=='directory';}))"));
    for (const tb of tabs) {
      await ev("var b=document.querySelector('.tab[data-tab=\"" + tb.id + "\"]'); if(b)b.click(); true"); await sleep(1200);
      const m = JSON.parse(await ev("JSON.stringify({d:document.documentElement.scrollWidth-document.documentElement.clientWidth,b:document.body.scrollWidth-document.body.clientWidth})"));
      pages++;
      if (m.d > 1 || m.b > 1) bad.push(tb.label + "(" + m.d + "/" + m.b + "px)");
    }
  }
  check(bad.length === 0, "全部页面锁屏宽：整页横向溢出必须为0", pages + "页" + (bad.length ? " 溢出：" + bad.join(", ") : " 全部0"));
  await ev("var bk=document.querySelector('[data-directory=\"1\"]'); if(bk)bk.click(); true"); await sleep(420);
  await ev("var g=document.querySelector('[data-directory-group=\"recommend\"]'); if(g)g.click(); true"); await sleep(500);
  await ev("var b=document.querySelector('.tab[data-tab=\"betexec\"]'); if(b)b.click(); true"); await sleep(2000);
  const sc = await ev("(function(){var s=document.querySelector('#view .exec-line__scroll');if(!s)return 'none';s.scrollLeft=80;return String(Math.round(s.scrollLeft));})()");
  check(Number(sc) > 0, "页面锁宽后，内部横向滚动条仍然能滑（横向滚动只发生在容器里）", "scrollLeft=" + sc);
  await ev("var bk2=document.querySelector('[data-directory=\"1\"]'); if(bk2)bk2.click(); true"); await sleep(420);
  await ev("var g2=document.querySelector('[data-directory-group=\"miss\"]'); if(g2)g2.click(); true"); await sleep(500);
  await ev("var b2=document.querySelector('.tab[data-tab=\"windowmiss\"]'); if(b2)b2.click(); true"); await sleep(2000);
  const st = await ev("(function(){window.scrollTo(0,2000);var th=document.querySelector('#view .heatmap__table thead th');if(!th)return -999;return th.getBoundingClientRect().top;})()");
  check(Number(st) >= 0 && Number(st) < 400, "表头 sticky 未被锁宽破坏（滚到下面仍可见）", "top=" + st);
  ws.close(); chrome.kill(); server.kill(); await sleep(200);
  console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
  process.exit(fails.length ? 1 : 0);
})();
