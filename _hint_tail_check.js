// 校验：执行提示里每条线“当前窗口卡片”的当期号码必须写出尾号（真未来期才允许待定）
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9443, HTTP = 8183;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-hint-" + Date.now());
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
  const check = (ok, label, extra) => { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); };

  await ev("document.querySelector('[data-directory-group=\"recommend\"]').click(); true"); await sleep(500);
  await ev("document.querySelector('.tab[data-tab=\"orderhint\"]').click(); true"); await sleep(1200);
  const data = JSON.parse(await ev(`(function () {
    var out = [];
    [].forEach.call(document.querySelectorAll('#view .exec-window-card--current'), function (card, idx) {
      var labels = [].map.call(document.querySelectorAll('#view .exec-line__label'), function (e) { return e.innerText.trim(); });
      out.push({ idx: idx, label: labels[idx] || ('#' + idx), text: card.innerText.replace(/\\n+/g, '|') });
    });
    return JSON.stringify({ next: document.querySelector('#view .exec-window-card--current').dataset.currentPeriod, out: out });
  })()`));
  let bad = 0, rowsTotal = 0;
  if (process.argv[2] === "debug") data.out.forEach((c) => console.log("--- " + c.label + " ---\n" + c.text));
  data.out.forEach((c) => {
    const rows = [...c.text.matchAll(/第(\d{3,4})期\|(尾\d|待定)\|(中|错|未记录|待开奖)/g)];
    rows.forEach((m) => {
      rowsTotal++;
      if (Number(m[1]) <= Number(data.next) && m[2] === "待定") { bad++; console.log("  当期缺尾号: " + c.label + " 第" + m[1] + "期"); }
    });
  });
  check(bad === 0, "执行提示：当期（第" + data.next + "期及以前）必须写出尾号，不能待定", rowsTotal + " 行，缺号 " + bad + " 行");

  // 三期内追推荐：待检查的那一期也要有尾号
  await ev("document.querySelector('.tab[data-tab=\"chasenumber\"]').click(); true"); await sleep(900);
  await ev("var b=document.querySelector('[data-ult-mode=\"recommend\"]'); if(b)b.click(); true"); await sleep(1400);
  const recText = await ev("document.querySelector('#view').innerText");
  const recFlat = recText.replace(/\n+/g, "|");
  const pendingRow = /第\d期\|第(\d{3,4})期\|(尾\d|待定)\|待开奖/.exec(recFlat);
  check(!!pendingRow && pendingRow[2] !== "待定", "三期内追推荐：待检查当期也写出尾号", pendingRow ? pendingRow[0] : "未找到待开奖行");

  // 双号追热：连错遗漏记录里的当期也要写尾号
  await ev("document.querySelector('.tab[data-tab=\"pick3\"]').click(); true"); await sleep(1100);
  const pick3Text = await ev("document.querySelector('#view').innerText");
  const liveCell = /①尾\d/.test(pick3Text) && /②尾\d/.test(pick3Text);
  check(liveCell, "双号追热：连错遗漏记录当期写尾号而不是①待②待", (/[①②][^\n]{0,4}/.exec(pick3Text) || [""])[0]);

  // 14线规律中心：窗口明细的当前窗口也要写尾号
  await ev("document.querySelector('.tab[data-tab=\"windowmult\"]').click(); true"); await sleep(1600);
  await ev("var b=document.querySelector('.wm-view-tab[data-wm-view=\"windows\"]'); if(b)b.click(); true"); await sleep(900);
  const lineChecks = [];
  for (const lineId of ["fixedD2", "recD2", "tail1"]) {
    await ev("var l=document.querySelector('.wm-line-selector [data-wm-line=\"" + lineId + "\"]'); if(l)l.click(); true"); await sleep(900);
    const card = await ev("(document.querySelector('#view .wm-win-card--live')||{}).innerText || ''");
    const flat = String(card).replace(/\n+/g, "|");
    const tails = (flat.match(/尾\d/g) || []).length;
    const pending = (flat.match(/待开奖/g) || []).length;
    lineChecks.push({ lineId, flat, tails, pending });
  }
  const badLine = lineChecks.filter((c) => c.tails < 2 || c.pending < 2);
  check(badLine.length === 0, "14线规律中心：当前窗口待开奖行写出尾号", lineChecks.map((c) => c.lineId + " 尾号" + c.tails + "个/待开奖" + c.pending).join(" ; "));

  check(errs.length === 0, "无 console 报错", errs.slice(0, 3).join(","));
  console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
})();
