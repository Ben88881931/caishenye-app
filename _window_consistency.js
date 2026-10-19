// 同一条线在不同页面的“当前窗口”是否一致：下注执行表 / 14线规律中心
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

  // 三期内追号码：D1/D2 顶部当前窗口（与热图共享真实快照窗口）
  await ev("document.querySelector('.tab[data-tab=\"chasenumber\"]').click(); true"); await sleep(1800);
  const source = JSON.parse(await ev(`(function () {
    var out = {};
    [].forEach.call(document.querySelectorAll('#view .source-window-card'), function (card) {
      var key = card.getAttribute('data-source-stream');
      var start = card.getAttribute('data-window-start') || '';
      var stage = card.getAttribute('data-window-stage') || '';
      var tail = card.getAttribute('data-window-tail') || '';
      out[key] = start ? (start + '期/第' + stage + '期/尾' + tail) : '等待重开/无窗口';
    });
    return JSON.stringify(out);
  })()`));

  // 公式表：热图最新格金额的唯一口径
  await ev("document.querySelector('.tab[data-tab=\"formulas\"]').click(); true"); await sleep(1200);
  const plans = JSON.parse(await ev(`(function () {
    var out = {};
    [].forEach.call(document.querySelectorAll('#view table.table tbody tr'), function (row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 3) return;
      out[cells[0].innerText.trim()] = cells[2].innerText.split('/').map(function (v) { return Number(v.trim()) || 0; });
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

  // 窗口遗漏热图：最底一行=各线当前状态（等N=等待重开 / 进N=窗口已跑到第N期）
  await ev("var bk=document.querySelector('[data-directory=\"1\"]'); if(bk)bk.click(); true"); await sleep(700);
  await ev("var g1=document.querySelector('[data-directory-group=\"miss\"]'); if(g1)g1.click(); true"); await sleep(700);
  await ev("document.querySelector('.tab[data-tab=\"windowmiss\"]').click(); true"); await sleep(2300);
  const hm = JSON.parse(await ev(`(function(){
    var tab = document.querySelector('#view .heatmap__table');
    if (!tab) return JSON.stringify({});
    var heads = [].map.call(tab.querySelectorAll('thead th'), function (t) { return t.innerText.trim(); });
    var rows = tab.querySelectorAll('tbody tr');
    var last = rows[rows.length - 1];
    var tds = last.querySelectorAll('td');
    var out = {};
    // 行号是第0列，14条线从第1列开始（“中”合计列已删除，别再按2开始，否则整体错位）
    for (var i = 1; i < tds.length; i++) {
      var v = tds[i].innerText.trim();
      var name = heads[i] || '';
      var full = name.indexOf('号D') === 0 ? ('追号码 ' + name.slice(1))
        : (name.indexOf('推D') === 0 ? ('追推荐 ' + name.slice(1)) : name);
      out[full] = v;
    }
    return JSON.stringify(out);
  })()`));
  const hmLayout = JSON.parse(await ev(`(function(){
    var liveCells = [].slice.call(document.querySelectorAll('#view .wm-heat .cell-live'));
    var waitCells = [].slice.call(document.querySelectorAll('#view .wm-heat .cell-wait'));
    return JSON.stringify({
      count: liveCells.length + waitCells.length,
      ok: liveCells.every(function (cell) {
        return cell.innerText.indexOf('·') < 0
          && getComputedStyle(cell).flexDirection === 'column'
          && !!cell.querySelector('.heat-cell__amount')
          && /\\d+元/.test(cell.querySelector('.heat-cell__amount').innerText);
      }) && waitCells.every(function (cell) {
        return cell.innerText.indexOf('·') < 0
          && getComputedStyle(cell).flexDirection === 'column'
          && !cell.querySelector('.heat-cell__amount');
      })
    });
  })()`));
  const hmAmounts = JSON.parse(await ev(`(function(){
    var tab = document.querySelector('#view .heatmap__table');
    var out = {};
    if (!tab) return JSON.stringify(out);
    var heads = [].map.call(tab.querySelectorAll('thead th'), function (t) { return t.innerText.trim(); });
    var rows = tab.querySelectorAll('tbody tr');
    var tds = rows[rows.length - 1].querySelectorAll('td');
    for (var i = 1; i < tds.length; i++) {
      var name = heads[i] || '';
      var full = name.indexOf('号D') === 0 ? ('追号码 ' + name.slice(1))
        : (name.indexOf('推D') === 0 ? ('追推荐 ' + name.slice(1)) : name);
      out[full] = Number(tds[i].getAttribute('data-window-amount') || 0);
    }
    return JSON.stringify(out);
  })()`));

  // 回到模型流程分组，继续核对14线规律中心
  await ev("var bk2=document.querySelector('[data-directory=\"1\"]'); if(bk2)bk2.click(); true"); await sleep(700);
  await ev("var g2=document.querySelector('[data-directory-group=\"recommend\"]'); if(g2)g2.click(); true"); await sleep(700);
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

  console.log("线条 | 下注执行表 | 14线规律中心 | 三期内追号码");
  console.log("---|---|---|---");
  let mismatch = 0;
  let sourceMismatch = 0;
  let amountMismatch = 0;
  lineLabels.forEach((lb) => {
    const a = bet[lb] || '-', c = wm[lb] || '-';
    const sourceKey = lb === "追号码 D1" ? "D1" : (lb === "追号码 D2" ? "D2" : "");
    const s = sourceKey ? (source[sourceKey] || '-') : '-';
    // 只比“同一窗口”：起始期号相同（等待重开时两边都必须写等待重开）
    const same = a !== '-' && c !== '-' && a.split('/')[0] === c.split('/')[0];
    const sourceSame = !sourceKey || (s !== '-' && c !== '-' && s.split('/')[0] === c.split('/')[0] && s === c);
    const stage = Number((c.match(/第(\d+)期/) || [])[1] || 0);
    const expectedAmount = plans[lb] && stage ? Number(plans[lb][stage - 1] || 0) : 0;
    const amountSame = expectedAmount === Number(hmAmounts[lb] || 0);
    if (!same) mismatch++;
    if (!sourceSame) sourceMismatch++;
    if (!amountSame) amountMismatch++;
    console.log(lb + " | " + a + " | " + c + " | " + s + (same ? "" : "  ← 下注/14线不一致") + (sourceSame ? "" : "  ← 快照/14线不一致"));
  });
  console.log("\n不一致条数：" + mismatch + " / 14");
  console.log("三期内追号码与14线不一致条数：" + sourceMismatch + " / 2");
  console.log("热图本期金额与公式表不一致：" + amountMismatch + " / 14");
  // 额外核对：窗口遗漏热图最底行（当前状态）必须与下注执行表一致
  let hmBad = [];
  lineLabels.forEach(function (lb) {
    const bv = bet[lb] || "-", hv = hm[lb] || "-";
    const bWait = bv === "等待重开", hWait = hv.indexOf("等") === 0;
    const bStage = (bv.match(/第(\d)期/) || [])[1] || "";
    const hStage = (hv.match(/进(\d)/) || [])[1] || "";
    const bTail = (bv.match(/尾(\d)/) || [])[1] || "";
    const hTail = (hv.match(/尾(\d)/) || [])[1] || "";
    const ok = (bWait === hWait) && (bWait || (bStage && bStage === hStage && bTail === hTail));
    if (!ok) hmBad.push(lb + " 下注执行表=" + bv + " 热图=" + hv);
  });
  console.log("热图底行(当前状态) 与 下注执行表 不一致：" + hmBad.length + " / 14" + (hmBad.length ? " → " + hmBad.join(" ; ") : ""));
  console.log("窗口热图金额显示：" + (hmLayout.ok ? "PASS" : "FAIL") + " · 最新进格显示金额、等待格不显示金额 · 检查 " + hmLayout.count + " 格");
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(hmBad.length || sourceMismatch || amountMismatch || !hmLayout.ok ? 1 : 0);
})();
