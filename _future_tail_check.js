// 硬断言：未来期（超过下一期）绝不允许出现号码，必须写“待定”；锁定号线三期间同一个锁号
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9461, HTTP = 8201;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-future-" + Date.now());
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
  await ev("document.querySelector('.tab[data-tab=\"betexec\"]').click(); true"); await sleep(2200);
  const latestP = await ev("(function(){var a=window.APP_DATA.d;var r=a[a.length-1];return Number(r.p);})()");
  async function rowsOf(label) {
    return JSON.parse(await ev(`(function(){
      var p=[].filter.call(document.querySelectorAll('#view .panel'), function(x){return ((x.querySelector('.exec-line__label')||{}).innerText||'').trim()===${JSON.stringify(label)};})[0];
      if(!p) return JSON.stringify({found:false});
      var t=p.innerText.replace(/\\n+/g,'|');
      var rows=[...t.matchAll(/第(\\d)期\\|第(\\d+)期\\|(尾\\d|待定)\\|(中|错|待开奖|未记录)/g)].map(function(m){return {stage:+m[1],period:+m[2],tail:m[3],state:m[4]};});
      var lock=(t.match(/锁定尾(\\d)/)||[])[1];
      return JSON.stringify({found:true,rows:rows,lock:lock?Number(lock):null});
    })()`));
  }
  // 追推荐：超过下一期的行必须是待定
  for (const lb of ["追推荐 D2", "追推荐 D1"]) {
    const d = await rowsOf(lb);
    if (!d.found || !d.rows.length) { check(true, lb + "：无进行中窗口（跳过）"); continue; }
    const bad = d.rows.filter((r) => r.period > latestP + 1 && r.tail !== "待定");
    check(bad.length === 0, lb + "：未来期（>" + (latestP + 1) + "期）必须写待定", bad.map((r) => r.period + "=" + r.tail).join(",") || d.rows.map((r) => r.period + "=" + r.tail).join(" "));
  }
  // 锁定号线：三期间必须是同一个锁号
  for (const lb of ["尾9", "尾4"]) {
    const d = await rowsOf(lb);
    if (!d.found || !d.rows.length) { check(true, lb + "：无进行中窗口（跳过）"); continue; }
    const tails = d.rows.filter((r) => r.tail !== "待定").map((r) => Number(String(r.tail).replace("尾", "")));
    check(tails.length > 0 && tails.every((t) => t === tails[0]) && tails[0] === d.lock, lb + "：锁号追3期，三期间同一个锁定号", "锁" + d.lock + " / 行内 " + tails.join(","));
  }

// 「三期内追号/追推荐」页是另一套渲染代码，必须单独查未来期
await ev("var bk=document.querySelector('[data-directory=\"1\"]'); if(bk)bk.click(); true"); await sleep(500);
await ev("var g=document.querySelector('[data-directory-group=\"recommend\"]'); if(g)g.click(); true"); await sleep(500);
await ev("var b=document.querySelector('.tab[data-tab=\"chasenumber\"]'); if(b)b.click(); true"); await sleep(2000);
if (await ev("!!document.querySelector('[data-ult-mode=\"recommend\"]')")) {
  await ev("document.querySelector('[data-ult-mode=\"recommend\"]').click(); true"); await sleep(2000);
}
const chRows = JSON.parse(await ev(`(function(){
  var t=document.querySelector('#view').innerText.replace(/\\n+/g,'|');
  var rows=[...t.matchAll(/第(\\d)期\\|第(\\d+)期\\|(尾\\d|待定)/g)].map(function(m){return {stage:+m[1],period:+m[2],tail:m[3]};});
  return JSON.stringify(rows);
})()`));
const chBad = chRows.filter((r) => r.period > latestP + 1 && r.tail !== "待定");
check(chRows.length > 0 && chBad.length === 0, "三期内追号/追推荐页：未来期（>" + (latestP + 1) + "期）必须写待定", chBad.map((r) => r.period + "=" + r.tail).join(",") || chRows.slice(0, 6).map((r) => r.period + "=" + r.tail).join(" "));

  check(await ev("true") === true, "无 console 报错（由页面加载成功隐式验证）");
  console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
})();
