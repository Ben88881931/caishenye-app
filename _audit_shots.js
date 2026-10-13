// 监督总裁每日页面层审计：真实 Chrome 逐页截图 + 跨源数字核对（临时脚本，审计后删除）
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9433;
const HTTP_PORT = 8173;
const APP_URL = "http://127.0.0.1:" + HTTP_PORT + "/index.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fails = [];
const notes = [];
function check(ok, label, extra) {
  const line = (ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "");
  console.log(line);
  if (!ok) fails.push(label);
}
function note(label) { notes.push(label); console.log("note: " + label); }

async function getJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return res.json();
}

function planFromSource() {
  const src = fs.readFileSync("app.js", "utf8");
  const re = /\{ id: "(tail\d|fixedD\d|recD\d)", label: "([^"]+)", kind: "(\w+)"[^}]*?plan: \[([^\]]+)\] \}/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], label: m[2], plan: m[4].split(",").map((s) => Number(s.trim())).join(" / ") });
  return out;
}

async function main() {
  const version = (/styles\.css\?v=([\w-]+)/.exec(fs.readFileSync("index.html", "utf8")) || [])[1] || "unknown";
  const outDir = path.join("audit_screenshots", version);
  fs.mkdirSync(outDir, { recursive: true });
  const textDir = path.join(outDir, "text");
  fs.mkdirSync(textDir, { recursive: true });
  const userDir = path.join(process.cwd(), ".chrome-audit-" + Date.now());

  const server = spawn("python", ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
    "--remote-allow-origins=*", "--remote-debugging-port=" + CDP_PORT, "--user-data-dir=" + userDir,
    "--hide-scrollbars", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });

  let target = null;
  for (let i = 0; i < 40; i++) {
    try { const list = await getJSON("http://127.0.0.1:" + CDP_PORT + "/json/list"); target = (list || []).find((t) => t.type === "page"); if (target) break; } catch (e) {}
    await sleep(400);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let msgId = 0;
  const consoleErrors = [];
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") consoleErrors.push((m.params.exceptionDetails || {}).text || "exception");
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") consoleErrors.push(m.params.entry.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push("console.error");
  });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evalJS = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const evalP = (body) => evalJS("(function(){" + body + "})()");

  await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 393, height: 852, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: APP_URL });
  for (let i = 0; i < 40; i++) { if (await evalJS("document.readyState==='complete' && document.querySelectorAll('.directory-card').length>0")) break; await sleep(400); }

  async function shot(name) {
    await evalJS("window.scrollTo(0,0); document.querySelector('#view').scrollTop=0; true");
    await sleep(250);
    const r = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const buf = Buffer.from(r.result.data, "base64");
    fs.writeFileSync(path.join(outDir, name + ".png"), buf);
    return buf.length;
  }

  const pages = [];
  // 打开小程序第一屏：目录
  {
    const dt = await evalJS("document.querySelector('#view').innerText");
    fs.writeFileSync(path.join(textDir, "directory.txt"), (dt || "").replace(/\n{3,}/g, "\n\n"));
    await shot("directory");
    pages.push({ group: "-", id: "directory", label: "目录", textLength: (dt || "").length, bytes: 0, bad: [], has286: /286/.test(dt || "") });
  }
  const groups = await evalP("return JSON.stringify([].map.call(document.querySelectorAll('.directory-card'),function(e){return{id:e.dataset.directoryGroup,label:e.textContent.trim()}}))");
  const timings = [];

  async function toDirectory() {
    for (let i = 0; i < 6; i++) {
      if (await evalJS("!!document.querySelector('.directory-card')")) return true;
      await evalJS("var b=document.querySelector('[data-directory=\"1\"]'); if(b)b.click(); true");
      await sleep(400);
    }
    return await evalJS("!!document.querySelector('.directory-card')");
  }

  for (const g of JSON.parse(groups)) {
    await toDirectory();
    await evalJS("document.querySelector('[data-directory-group=\"" + g.id + "\"]').click(); true");
    await sleep(500);
    const tabs = JSON.parse(await evalP("return JSON.stringify([].map.call(document.querySelectorAll('.tab[data-tab]'),function(e){return{id:e.dataset.tab,label:e.textContent.trim()}}))"));
    for (const t of tabs) {
      const t0 = Date.now();
      await evalJS("document.querySelector('.tab[data-tab=\"" + t.id + "\"]').click(); true");
      await sleep(450);
      const text = await evalJS("document.querySelector('#view').innerText");
      const bytes = await shot(t.id);
      fs.writeFileSync(path.join(textDir, t.id + ".txt"), (text || "").replace(/\n{3,}/g, "\n\n"));
      timings.push({ id: t.id, ms: Date.now() - t0 });
      pages.push({ group: g.id, id: t.id, label: t.label, textLength: (text || "").length, bytes,
        bad: /undefined|NaN|\[object Object\]/.test(text || "") ? (text.match(/undefined|NaN|\[object Object\]/g) || []).slice(0, 5) : [],
        has286: /286/.test(text || "") });
      if (/undefined|NaN|\[object Object\]/.test(text || "")) note("页面 " + t.id + " 含可疑文本: " + (text.match(/.{0,30}(undefined|NaN|\[object Object\]).{0,30}/g) || []).slice(0, 3).join(" | "));
      // 14线规律中心的三级页（总览/窗口明细/14线性格/公式与仓位/年度测试）也要逐页留证
      if (t.id === "windowmult") {
        const wmViews = JSON.parse(await evalP("return JSON.stringify([].map.call(document.querySelectorAll('.wm-view-tab[data-wm-view]'),function(e){return{id:e.dataset.wmView,label:e.textContent.trim()}}))"));
        for (const w of wmViews) {
          await evalJS("document.querySelector('.wm-view-tab[data-wm-view=\"" + w.id + "\"]').click(); true");
          await sleep(700);
          const wt = await evalJS("document.querySelector('#view').innerText");
          fs.writeFileSync(path.join(textDir, "windowmult-" + w.id + ".txt"), (wt || "").replace(/\n{3,}/g, "\n\n"));
          await shot("windowmult-" + w.id);
          pages.push({ group: g.id, id: "windowmult/" + w.id, label: w.label, textLength: (wt || "").length, bytes: 0, bad: [], has286: /286/.test(wt || "") });
        }
      }
      if (t.id === "chasenumber") {
        await evalJS("var b=document.querySelector('[data-ult-mode=\"recommend\"]'); if(b)b.click(); true");
        await sleep(800);
        const rt = await evalJS("document.querySelector('#view').innerText");
        fs.writeFileSync(path.join(textDir, "chaserecommend.txt"), (rt || "").replace(/\n{3,}/g, "\n\n"));
        await shot("chaserecommend");
        pages.push({ group: g.id, id: "chaserecommend", label: "三期内追推荐", textLength: (rt || "").length, bytes: 0, bad: [], has286: /286/.test(rt || "") });
        await evalJS("var b=document.querySelector('[data-ult-mode=\"number\"]'); if(b)b.click(); true");
        await sleep(500);
      }
    }
  }
  console.log("\n== 逐页截图完成: " + pages.length + " 页 ==");
  for (const t of timings) if (t.ms > 2500) note("渲染耗时偏长 " + t.ms + "ms: " + t.id);
  check(pages.every((p) => p.textLength > 0), "所有导航页面都有内容");

  // ---- 跨源核对 A：公式表 DOM vs app.js 源码 EXEC_LINES ----
  await toDirectory();
  await evalJS("document.querySelector('[data-directory-group=\"recommend\"]').click(); true"); await sleep(400);
  await evalJS("document.querySelector('.tab[data-tab=\"formulas\"]').click(); true"); await sleep(600);
  const domPlans = JSON.parse(await evalP(
    "return JSON.stringify([].map.call(document.querySelectorAll('#view tbody tr'),function(tr){var c=tr.querySelectorAll('td');return{l:c[0].innerText.trim(),p:c[2].innerText.trim()}}))"));
  const srcPlans = planFromSource();
  check(srcPlans.length === 14, "app.js 源码解析出 14 条线路公式", "解析到 " + srcPlans.length);
  const mismatch = srcPlans.filter((s) => { const d = domPlans.find((x) => x.l === s.label); return !d || d.p !== s.plan; });
  check(mismatch.length === 0, "公式表页面金额 = app.js 源码公式（逐条）", mismatch.length ? JSON.stringify(mismatch) : srcPlans.map((s) => s.label + ":" + s.plan).join(" , "));

  // ---- 跨源核对 B：资金调度 合计 = 各线路当期金额之和 ----
  await evalJS("document.querySelector('.tab[data-tab=\"funds\"]').click(); true"); await sleep(700);
  const funds = JSON.parse(await evalP(`
    var rows=[].map.call(document.querySelectorAll('.fund-line'),function(el){
      var t=(el.querySelector('.exec-line__label')||{}).textContent||'';
      var n=(el.querySelector('.position-card__number')||{}).textContent||'';
      var amt='';var risk='';var stage='';
      [].forEach.call(el.querySelectorAll('.stat'),function(s){
        var l=((s.querySelector('.stat__label')||{}).textContent||'');
        var v=((s.querySelector('.stat__value')||{}).textContent||'').trim();
        if(l.indexOf('当期资金')>=0)amt=v;
        if(l.indexOf('本窗剩余风险')>=0)risk=v;
        if(l.indexOf('当前窗口期序')>=0)stage=v;
      });
      return {label:t.trim(),amount:amt,risk:risk,stage:stage};
    });
    var totals={};
    [].forEach.call(document.querySelectorAll('.stat'),function(s){
      var l=((s.querySelector('.stat__label')||{}).textContent||'');var v=((s.querySelector('.stat__value')||{}).textContent||'').trim();
      if(l.indexOf('本期公式金额')>=0)totals.current=v;
      if(l.indexOf('本窗最大风险')>=0)totals.risk=v;
      if(l.indexOf('本期不下注线路')>=0)totals.skip=v;
      if(l.indexOf('当前有公式线路')>=0)totals.enabled=v;
    });
    return JSON.stringify({rows:rows,totals:totals});
  `));
  const num = (s) => Number(String(s).replace(/[^\d.-]/g, "")) || 0;
  const sumAmount = funds.rows.reduce((a, r) => a + num(r.amount), 0);
  check(funds.rows.length === 14, "资金调度逐条列出 14 条线路", String(funds.rows.length));
  check(sumAmount === num(funds.totals.current), "资金调度：各线路当期金额之和 = 本期公式金额",
    sumAmount + " vs " + funds.totals.current + "（快照：" + funds.rows.map((r) => r.label + "=" + r.amount).join(",") + "）");
  const sumRisk = funds.rows.reduce((a, r) => a + num(r.risk), 0);
  check(sumRisk === num(funds.totals.risk), "资金调度：各线路剩余风险之和 = 本窗最大风险", sumRisk + " vs " + funds.totals.risk);
  const zeroRows = funds.rows.filter((r) => num(r.amount) === 0).length;
  check(zeroRows === num(funds.totals.skip), "资金调度：不下注线路数 = 当期金额为0的线路数", zeroRows + " vs " + funds.totals.skip);

  // ---- 跨源核对 C：执行提示 今日合计 = 卡片金额之和，且线路集合与资金调度一致 ----
  await evalJS("document.querySelector('.tab[data-tab=\"orderhint\"]').click(); true"); await sleep(800);
  const hint = JSON.parse(await evalP(`
    var cards=[].map.call(document.querySelectorAll('.position-card--execution'),function(el){
      var t=(el.querySelector('.position-card__title')||{}).textContent||'';
      var m=el.innerText.match(/(\\d+)\\s*元/);
      return {title:t.trim(),base:t.split('·')[0].trim(),amount:m?Number(m[1]):0};
    });
    var totals={};
    [].forEach.call(document.querySelectorAll('.stat'),function(s){
      var l=((s.querySelector('.stat__label')||{}).textContent||'');var v=((s.querySelector('.stat__value')||{}).textContent||'').trim();
      if(l.indexOf('今日合计')>=0)totals.today=v;
      if(l.indexOf('本窗最大风险')>=0)totals.risk=v;
      if(l.indexOf('今日不下注')>=0)totals.skip=v;
    });
    return JSON.stringify({cards:cards,totals:totals});
  `));
  const hintSum = hint.cards.reduce((a, c) => a + c.amount, 0);
  check(hintSum === num(hint.totals.today), "执行提示：今日卡片金额之和 = 今日合计", hintSum + " vs " + hint.totals.today);
  check(hint.cards.length === funds.rows.filter((r) => num(r.amount) > 0).length,
    "执行提示与资金调度：下注线路条数一致", hint.cards.length + " vs " + funds.rows.filter((r) => num(r.amount) > 0).length);
  const fundsBet = funds.rows.filter((r) => num(r.amount) > 0).map((r) => r.label + "=" + num(r.amount)).sort();
  const hintBet = hint.cards.map((c) => c.base + "=" + c.amount).sort();
  check(JSON.stringify(fundsBet) === JSON.stringify(hintBet), "执行提示与资金调度：每条线路金额逐条相等",
    "\n  资金调度 " + fundsBet.join(",") + "\n  执行提示 " + hintBet.join(","));

  // ---- 跨源核对 D：页面锁定号 = 快照源窗口 = prediction_snapshots.json ----
  const snapFile = JSON.parse(fs.readFileSync("prediction_snapshots.json", "utf8"));
  const latest = Number(snapFile.latestPeriod);
  const unsettled = (snapFile.records || []).filter((r) => !r.settled);
  check(unsettled.length === 1 && Number(unsettled[0].target) === latest + 1,
    "prediction_snapshots.json 只有 1 条待开奖且 target = latest+1",
    "latest=" + latest + " 待开奖=" + JSON.stringify(unsettled.map((r) => r.target)));
  const nextPicks = (unsettled[0] && unsettled[0].models && unsettled[0].models.doubleRecommendation.picks || []).map((p) => p.tail);
  note("下期推荐 picks = " + JSON.stringify(nextPicks) + " (D1/D2)");

  const snapWs = JSON.parse(await evalP(`
    var s=window.APP_SNAPSHOTS||{};var w=s.sourceWindows||[];
    return JSON.stringify({win:w.map(function(x){return{stream:x.stream,target:x.target,tail:x.tail,status:x.status,attempts:(x.attempts||[]).map(function(a){return{period:a.period,hit:a.hit}})}})});
  `));
  const pendingWins = snapWs.win.filter((w) => w.status === "pending");
  check(pendingWins.length >= 1, "快照 sourceWindows 存在进行中的窗口", String(pendingWins.length));
  check(pendingWins.every((w) => w.attempts.every((a) => a.period <= latest)),
    "进行中窗口的 attempts 只到最新已开奖期（无未来数据）",
    JSON.stringify(pendingWins.map((w) => w.stream + ":" + w.attempts.map((a) => a.period).join("/"))));
  const d1Win = pendingWins.filter((w) => w.stream === "D1").sort((a, b) => b.target - a.target)[0];
  const d2Win = pendingWins.filter((w) => w.stream === "D2").sort((a, b) => b.target - a.target)[0];
  check(!!d1Win && !!d2Win && d1Win.tail === nextPicks[0], "D1 窗口锁定号 = 下期 D1 推荐号", d1Win && d1Win.tail + " vs " + nextPicks[0]);

  // 页面顶部锁定号必须等于源窗口锁定号
  await evalJS("document.querySelector('.tab[data-tab=\"chasenumber\"]').click(); true"); await sleep(800);
  const lockText = await evalJS("(document.querySelector('#ultimateLockCard')||{}).innerText || ''");
  const domLocks = JSON.parse(await evalP(`
    var out={};
    [].forEach.call(document.querySelectorAll('#ultimateLockCard div'),function(d){
      var t=(d.innerText||'').trim();
      var m=/^(D1|D2)\\b/.exec(t);
      if(m && t.length<80){ var c=t.match(/尾(\\d)/); if(c&&!out[m[1]])out[m[1]]=Number(c[1]); }
    });
    return JSON.stringify(out);
  `));
  check(domLocks.D1 === (d1Win && d1Win.tail), "三期内追号码 页面 D1 锁定号 = 源窗口", JSON.stringify(domLocks) + " vs D1=" + (d1Win && d1Win.tail) + " D2=" + (d2Win && d2Win.tail));
  check(domLocks.D2 === (d2Win && d2Win.tail), "三期内追号码 页面 D2 锁定号 = 源窗口", String(domLocks.D2));
  check(lockText.indexOf("第" + (latest + 1) + "期") >= 0, "三期内追号码 锁定卡片指向下一检查期", "第" + (latest + 1) + "期");

  // ---- console 无报错 ----
  check(consoleErrors.length === 0, "全站逐页无 console 报错", consoleErrors.slice(0, 5).join(" | "));

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({
    generatedAt: new Date().toISOString(), version, pages,
    checks: { fails, notes }, funds, hint, sourceWindows: snapWs.win,
  }, null, 2));
  console.log("\nRESULT: " + (fails.length ? "FAILED " + fails.length + " → " + fails.join(" ; ") : "ALL PASS"));
  console.log("截图目录: " + outDir);

  ws.close(); chrome.kill(); server.kill();
  await sleep(400);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
}
setTimeout(() => { console.log("FAIL: watchdog"); process.exit(1); }, 300000);
main().catch((e) => { console.log("FAIL: " + (e && e.stack || e)); process.exit(1); });
