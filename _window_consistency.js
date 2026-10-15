// 同一条线在不同页面的“当前窗口”是否一致：执行提示 / 下注执行表 / 14线规律中心
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9455, HTTP = 8195;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-consist-" + Date.now());
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

  // 执行提示
  await ev("document.querySelector('.tab[data-tab=\"orderhint\"]').click(); true"); await sleep(1500);
  const hint = JSON.parse(await ev(`(function () {
    var out = {};
    var labels = [].map.call(document.querySelectorAll('#view .exec-line__label'), function (e) { return e.innerText.trim(); });
    var cards = [].map.call(document.querySelectorAll('#view .exec-window-card--current'), function (c) { return c.innerText.replace(/\\n+/g, '|'); });
    cards.forEach(function (t, i) {
      if (/等待开奖 · 等待尾/.test(t)) { out[labels[i]] = '等待重开'; return; }
      var start = (/窗口起始 第(\\d+)期/.exec(t) || [])[1];
      var rows = [...t.matchAll(/第(\\d)期\\|第(\\d+)期\\|(尾\\d|待定)\\|(中|错|未记录|待开奖)/g)];
      var done = rows.filter(function (r) { return r[4] === '中' || r[4] === '错'; }).length;
      out[labels[i]] = (start || '-') + '期/第' + (done + 1) + '期/尾' + ((rows[0] || [])[3] || '-').replace('尾','');
    });
    return JSON.stringify(out);
  })()`));

  // 下注执行表（全14条模式）
  await ev("document.querySelector('.tab[data-tab=\"betexec\"]').click(); true"); await sleep(1800);
  // 下注执行表切到“三期全打”，和执行提示/14线同一套窗口口径（两期方案本来就是另一套窗口，不能混比）
  await ev("var b=document.querySelector('[data-bet-mode=\"three\"]'); if(b)b.click(); true"); await sleep(1600);
  const bet = JSON.parse(await ev(`(function () {
    var out = {};
    [].forEach.call(document.querySelectorAll('#view .panel'), function (p) {
      var lb = ((p.querySelector('.exec-line__label') || {}).innerText || '').trim();
      if (!lb) return;
      var t = p.innerText.replace(/\\n+/g, '|');
      var cur = /当前窗口 · 起始 第(\\d+)期[^|]*\\|([\\s\\S]*?)(?:对错滚动记录|$)/.exec(t);
      if (!cur) { out[lb] = /等待重开|等尾\\d/.test(t) ? '等待重开' : '无当前窗口'; return; }
      var rows = [...cur[2].matchAll(/第(\\d)期\\|第(\\d+)期\\|(尾\\d|待定)\\|(中|错|未记录|待开奖)/g)];
      var done = rows.filter(function (r) { return r[4] === '中' || r[4] === '错'; }).length;
      out[lb] = cur[1] + '期/第' + (done + 1) + '期/尾' + ((rows[0] || [])[3] || '-').replace('尾','');
    });
    return JSON.stringify(out);
  })()`));

  // 14线规律中心 · 窗口明细（逐条线）
  await ev("document.querySelector('.tab[data-tab=\"windowmult\"]').click(); true"); await sleep(1600);
  await ev("var b=document.querySelector('.wm-view-tab[data-wm-view=\"windows\"]'); if(b)b.click(); true"); await sleep(900);
  const lineIds = ["tail0","tail1","tail2","tail3","tail4","tail5","tail6","tail7","tail8","tail9","fixedD1","fixedD2","recD1","recD2"];
  const lineLabels = ["尾0","尾1","尾2","尾3","尾4","尾5","尾6","尾7","尾8","尾9","追号码 D1","追号码 D2","追推荐 D1","追推荐 D2"];
  const wm = {};
  for (let i = 0; i < lineIds.length; i++) {
    await ev("var l=document.querySelector('.wm-line-selector [data-wm-line=\"" + lineIds[i] + "\"]'); if(l)l.click(); true");
    await sleep(850);
    const t = await ev("(document.querySelector('#view .wm-win-card--live')||{}).innerText ? document.querySelector('#view .wm-win-card--live').innerText.replace(/\\n+/g,'|') : ''");
    const start = (/起始 (\d{4})年第(\d+)期/.exec(t) || [])[2];
    const rows = [...String(t).matchAll(/第(\d)期\|(\d{4})年第(\d+)期\|(尾\d|待定|未记录|待开奖)\|?(中|错)?/g)];
    const done = rows.filter((r) => r[5] === "中" || r[5] === "错").length;
    const firstTail = (rows[0] || [])[4] || "-";
    wm[lineLabels[i]] = t ? (start + '期/第' + (done + 1) + '期/' + firstTail) : '等待重开/无窗口';
  }

  console.log("线条 | 执行提示 | 下注执行表 | 14线规律中心");
  console.log("---|---|---|---");
  let mismatch = 0;
  lineLabels.forEach((lb) => {
    const a = hint[lb] || '-', b = bet[lb] || '-', c = wm[lb] || '-';
    const same = (a === b) && (lb.indexOf("尾") === 0 ? (a.split('/')[0] === (c.split('/')[0] || c)) : true);
    if (!same) mismatch++;
    console.log(lb + " | " + a + " | " + b + " | " + c + (same ? "" : "  ← 不一致"));
  });
  console.log("\n不一致条数：" + mismatch + " / 14");
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
