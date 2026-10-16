// 两期 / 三期逐线对比表：实时监测
// 每次运行都重新从页面读最新数字（页面本身就是按最新开奖实时算的），和上一次记录对比：
//   1) 哪条线的「建议」翻转了
//   2) 哪条线的净收益变动超过阈值（默认 2000 元）
//   3) 建议与「第3期中率」是否矛盾（需要复核阈值）
// 只报不改，供监督总裁判断要不要调整阈值。
const { spawn } = require("child_process");
const path = require("path"), fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9975, HTTP = 8715;
const HIST = "_twomode_watch.json";
const THRESHOLD = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + path.join(process.cwd(), ".chrome-two-watch-" + Date.now()), "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((x) => x.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0;
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (m, p) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  await ev("var g=document.querySelector('[data-directory-group=\"recommend\"]'); if(g)g.click(); true"); await sleep(600);
  await ev("var b=document.querySelector('[data-tab=\"betexec\"]'); if(b)b.click(); true"); await sleep(2600);
  const data = JSON.parse(await ev(`(function(){
    var tab=[].filter.call(document.querySelectorAll('#view table.table'),function(x){return /两期净收益/.test((x.querySelector('thead')||{}).innerText||'');})[0];
    if(!tab) return JSON.stringify({err:'NO_TABLE'});
    var rows=[].map.call(tab.querySelectorAll('tbody tr'),function(tr){
      var td=[].map.call(tr.querySelectorAll('td'),function(x){return x.innerText.trim();});
      return {label:td[0], n3:Number((td[1]||'0').replace(/[+,]/g,''))||0, n2:Number((td[2]||'0').replace(/[+,]/g,''))||0, p3:td[4], advice:td[5]};
    });
    var last=rows[rows.length-1];
    return JSON.stringify({rows:rows.slice(0,-1), total:{label:last.label,n3:last.n3,n2:last.n2,note:last.advice}});
  })()`));
  ws.close(); chrome.kill(); server.kill(); await sleep(200);
  if (data.err) { console.log("FAIL: 读不到对比表 " + data.err); process.exit(1); }

  const period = JSON.parse(fs.readFileSync("prediction_snapshots.json", "utf8")).latestPeriod;
  const prev = fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, "utf8")) : null;
  const changes = [];
  if (prev && prev.rows) {
    data.rows.forEach(function (r) {
      const old = prev.rows.filter((x) => x.label === r.label)[0];
      if (!old) { changes.push("新增线路 " + r.label); return; }
      if (old.advice !== r.advice) changes.push(r.label + " 建议翻转：" + old.advice + " → " + r.advice);
      if (Math.abs(r.n2 - old.n2) > THRESHOLD) changes.push(r.label + " 两期净收益变动 " + (old.n2 >= 0 ? "+" : "") + old.n2 + " → " + (r.n2 >= 0 ? "+" : "") + r.n2);
    });
    if (prev.total && (Math.abs(data.total.n2 - prev.total.n2) > THRESHOLD || Math.abs(data.total.n3 - prev.total.n3) > THRESHOLD)) {
      changes.push("合计变动：三期 " + prev.total.n3 + " → " + data.total.n3 + "，两期 " + prev.total.n2 + " → " + data.total.n2);
    }
  }
  // 建议与第3期中率是否矛盾（命中率高的线却说两期更优 / 命中率低却说三期更优）
  const odd = [];
  data.rows.forEach(function (r) {
    if (/永久不建仓|都亏/.test(r.advice)) return;
    const p3 = Number(String(r.p3).replace("%", ""));
    if (!isFinite(p3)) return;
    if (p3 >= 58 && /两期更优/.test(r.advice)) odd.push(r.label + "：第3期中率 " + r.p3 + " 却建议两期更优");
    if (p3 <= 52 && /三期更优/.test(r.advice)) odd.push(r.label + "：第3期中率 " + r.p3 + " 却建议三期更优");
    if (p3 < 55.56 && /三期更优/.test(r.advice)) odd.push(r.label + "：第3期中率 " + r.p3 + " 低于打平线却建议三期更优（应按结构选两期）");
  });
  fs.writeFileSync(HIST, JSON.stringify({ updatedAt: new Date().toISOString(), latestPeriod: period, rows: data.rows, total: data.total }, null, 1));
  console.log("两期/三期对比监测 · 最新期=" + period + " · 合计 三期" + data.total.n3 + " / 两期" + data.total.n2);
  console.log("本期变化：" + (changes.length ? changes.join(" ; ") : "无（和上次一致）"));
  console.log("建议与第3期中率矛盾：" + (odd.length ? odd.join(" ; ") : "无"));
  process.exit(0);
})();
