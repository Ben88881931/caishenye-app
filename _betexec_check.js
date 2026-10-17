// 下注执行表页面回归：两期/三期窗口分开、命中率、逐条金额、无报错
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9451, HTTP = 8191;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) { const r = await fetch(u, { signal: AbortSignal.timeout(3000) }); return r.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const userDir = path.join(process.cwd(), ".chrome-bet-" + Date.now());
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + userDir, "--window-size=393,852", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const l = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (l || []).find((t) => t.type === "page"); if (target) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend = new Map(); let id = 0; const errs = [];
  ws.addEventListener("message", (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails || {}).text || "exception"); });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
  for (let i = 0; i < 30; i++) { if (await ev("!!document.querySelector('.directory-card')")) break; await sleep(400); }
  const fails = [];
  const check = (ok, label, extra) => { console.log((ok ? "PASS: " : "FAIL: ") + label + (extra ? "  [" + extra + "]" : "")); if (!ok) fails.push(label); };

  await ev("document.querySelector('[data-directory-group=\"recommend\"]').click(); true"); await sleep(500);
  const hasTab = await ev("!!document.querySelector('.tab[data-tab=\"betexec\"]')");
  check(hasTab, "导航出现「下注执行表」入口");
  await ev("document.querySelector('.tab[data-tab=\"betexec\"]').click(); true"); await sleep(1500);

  const read = () => ev(`(function () {
    var cards = [].map.call(document.querySelectorAll('#view .panel'), function (p) {
      var label = (p.querySelector('.exec-line__label') || {}).innerText || '';
      var chips = [].map.call(p.querySelectorAll('.chip'), function (c) { return c.innerText.replace(/\\n/g, ' '); });
      return { label: label.trim(), chips: chips };
    });
    var top = (document.querySelector('#view .section') || {}).innerText || '';
    return JSON.stringify({ cards: cards.filter(function (c) { return c.label; }), top: top });
  })()`);

  let d = JSON.parse(await read());
  check(d.cards.length === 14, "默认按 1:7:15 全做14条（研究模式已收起）", String(d.cards.length));
  const planBtns = await ev("!!document.querySelector('[data-bet-mode=\"two\"]') && !!document.querySelector('[data-bet-mode=\"three\"]')");
  check(planBtns, "顶部保留“只做两期 / 三期全打”两个切换按钮");
  // 选号参考表：14 条线，含状态/命中率/连错/错1后/今年净收益/参考
  // 只看“选号参考表”（页面现在还有一张两期/三期对比表，不能混在一起数）
  const refTable = JSON.parse(await ev(`(function(){
    var tb=[].filter.call(document.querySelectorAll('#view table.table'), function (x) { return /对错性格/.test((x.querySelector('thead')||{}).innerText||''); })[0];
    if (!tb) return JSON.stringify([]);
    return JSON.stringify([].map.call(tb.querySelectorAll('tbody tr'), function (tr) {
      return [].map.call(tr.querySelectorAll('td'), function (td) { return td.innerText.replace(/\\n+/g, ' ').trim(); }).join(' | ');
    }));
  })()`));
  check(refTable.length === 14 && refTable.every((r) => /%/.test(r) && /\|/.test(r)),
    "选号参考表列出14条线（状态+窗口命中率+连错+错1后+今年净收益+参考）", refTable.slice(0, 3).join("  ;;  "));
  // 每个窗口记录卡都要带对错标记（连中N/连错N）
  const histCards = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#view .exec-hist-card'), function (c) {
    var t = c.innerText.replace(/\\n+/g, ' ');
    var m = t.match(/起始 第\\d+期\\s*(连中\\d+|连错\\d+|样本不足)/);
    return m ? m[1] : null;
  }).filter(Boolean))`));
  check(histCards.length >= 100 && histCards.some((t) => /连中\d+/.test(t)) && histCards.some((t) => /连错\d+/.test(t)),
    "每个窗口记录都标了对错性格（连中N/连错N）", histCards.length + " 个窗口带标记，示例 " + histCards.slice(0, 6).join(","));
  const research = await ev("!!document.querySelector('#view details summary')");
  check(research, "研究性筛选收进折叠区（默认不显示）");
  await ev("var sm=document.querySelector('#view details > summary'); if(sm)sm.click(); true"); await sleep(700);
  await ev("var b=document.querySelector('[data-bet-lines=\"verdict\"]'); if(b)b.click(); true"); await sleep(1600);
  const verdicts = await ev("[].map.call(document.querySelectorAll('#view .panel'), function(p){var r=p.innerText.match(/窗口体检 · [^\\n]+/); return r?r[0]:'';}).filter(Boolean).join(' || ')");
  check(/窗口体检 · (正常下注|轻仓|不下|停|样本不足)/.test(verdicts), "切到体检模式后每条线有体检结论", verdicts.slice(0, 120));
  await ev("var b=document.querySelector('[data-bet-lines=\"all\"]'); if(b)b.click(); true"); await sleep(1500);
  const rankCards = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#view .wm-hscroll > div'), function (c) { return c.innerText.replace(/\\n+/g, ' '); }).filter(function (t) { return /^#\\d+/.test(t); }))`));
  check(rankCards.length === 14 && rankCards.slice(0, 5).every((t) => /当前组/.test(t)), "规律排队列出14条并标出当前组5条", rankCards.slice(0, 6).join(" | "));
  const yearCards = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#view .wm-hscroll > div'), function (c) { return c.innerText.replace(/\\n+/g, ' '); }).filter(function (t) { return /年最优5条/.test(t); }))`));
  check(yearCards.length === 6 && yearCards.every((t) => (t.match(/尾\d|追号码|追推荐/g) || []).length >= 5),
    "年度最优5条按年分开列出（6年×5条）", yearCards.map((t) => t.slice(0, 4)).join(" | "));
  await ev("var b=document.querySelector('[data-bet-lines=\"lastyear\"]'); if(b)b.click(); true"); await sleep(1500);
  const ly = JSON.parse(await read());
  check(ly.cards.length > 0 && ly.cards.length <= 5, "切成“去年最优5条”后只列该组线路", ly.cards.map((c) => c.label).join(","));
  await ev("var b=document.querySelector('[data-bet-lines=\"win5\"]'); if(b)b.click(); true"); await sleep(1500);
  // 后面的滚动条/命中率断言要在“体检下单(全14条)”模式下看，切回来
  await ev("var b=document.querySelector('[data-bet-lines=\"verdict\"]'); if(b)b.click(); true"); await sleep(1600);
  const withRate = d.cards.filter((c) => c.chips.some((x) => x.indexOf("命中率") >= 0));
  check(withRate.length === d.cards.length, "每条线都标了命中率", withRate.length + "/" + d.cards.length);
  const withStake = d.cards.filter((c) => c.chips.some((x) => /本期 (\d+元|-)/.test(x)));
  check(withStake.length === d.cards.length, "每条线都标了本期下多少", withStake.length + "/" + d.cards.length);
  const withRoll = await ev("document.querySelectorAll('#view .exec-line__scroll').length");
  if (withRoll < d.cards.length) {
    const diag = await ev(`JSON.stringify([].map.call(document.querySelectorAll('#view .panel'), function (p) {
      var lb = (p.querySelector('.exec-line__label') || {}).innerText || '';
      return lb.trim() + ':' + (p.querySelector('.exec-line__scroll') ? 'hasScroll' : 'noScroll');
    }))`);
    console.log("  DIAG panels=" + JSON.stringify(JSON.parse(diag)));
  }
  check(withRoll >= d.cards.length, "每条线都有对错滚动条", String(withRoll));

  // 今日规划：每条要下的线都要有 尾号 + 金额，且条数与“本期>0”的线数一致
  const todayCards = JSON.parse(await ev(`(function () {
    var cards = [].map.call(document.querySelectorAll('#view .position-card--execution'), function (c) { return c.innerText.replace(/\\n+/g, ' '); });
    var betLines = [].filter.call(document.querySelectorAll('#view .panel'), function (p) {
      var chips = [].map.call(p.querySelectorAll('.chip'), function (x) { return x.innerText; });
      return chips.some(function (t) { return /本期 \\d+元/.test(t); });
    }).length;
    return JSON.stringify({ cards: cards, betLines: betLines });
  })()`));
  const cardsOk = todayCards.cards.length > 0 && todayCards.cards.every((t) => /尾\d/.test(t) && /\d+元/.test(t) && /第\d期/.test(t));
  check(cardsOk, "今日规划每条线都有尾号+金额+第几期", todayCards.cards.join(" | "));
  check(todayCards.cards.length === todayCards.betLines, "今日规划条数 = 本期要下的线数", todayCards.cards.length + " vs " + todayCards.betLines);

  // 对错规律提示：每条线都有，且随方案切换而变
  // 默认已是三期，先明确切到两期再读，才能比较两种方案下的提示差异
  await ev("var b=document.querySelector('[data-bet-mode=\"two\"]'); if(b)b.click(); true"); await sleep(1800);
  const regime2 = await ev("[].map.call(document.querySelectorAll('#view .panel'), function(p){var r=p.innerText.match(/对错规律 · [^\\n]+/); return r?r[0]:'';}).filter(Boolean).join(' || ')");
  check(/对错规律 · (连中第|连错第|对错样本不足)/.test(regime2), "每条线都有对错规律提示（连中/连错）", regime2.slice(0, 160));
  await ev("var b=document.querySelector('[data-bet-mode=\"three\"]'); if(b)b.click(); true"); await sleep(1600);
  const regime3 = await ev("[].map.call(document.querySelectorAll('#view .panel'), function(p){var r=p.innerText.match(/对错规律 · [^\\n]+/); return r?r[0]:'';}).filter(Boolean).join(' || ')");
  check(regime3 !== regime2, "切换方案后对错规律提示跟着重算", "两期: " + (regime2.match(/第\d+窗/g) || []).join(",") + " / 三期: " + (regime3.match(/第\d+窗/g) || []).join(","));
  // 重新切到两期并读一次，再切三期读一次（不能用前面的旧 d.cards）
  await ev("var b=document.querySelector('[data-bet-mode=\"two\"]'); if(b)b.click(); true"); await sleep(1800);
  const d2 = JSON.parse(await read());
  const twoCounts = d2.cards.map((c) => (c.chips.find((x) => x.indexOf("2026窗") >= 0) || ""));
  await ev("var b=document.querySelector('[data-bet-mode=\"three\"]'); if(b)b.click(); true"); await sleep(2000);
  let d3 = JSON.parse(await read());
  const threeCounts = d3.cards.map((c) => (c.chips.find((x) => x.indexOf("2026窗") >= 0) || ""));
  const w2 = twoCounts.map((s) => Number((/2026窗 (\d+)/.exec(s) || [])[1] || 0));
  const w3 = threeCounts.map((s) => Number((/2026窗 (\d+)/.exec(s) || [])[1] || 0));
  check(w2.some((n, i) => n !== w3[i]), "两期窗口与三期窗口分开算（各线独立，窗数对比）", "两期 " + w2.join(",") + " / 三期 " + w3.join(","));

  // 三期模式：滚动记录里应该有“第3期中”（窗口按3期跑）
  const text3 = await ev("document.querySelector('#view').innerText");
  check(/第3期中/.test(text3), "三期方案窗口做到第3期");

  // 两期模式：记录卡里只能有第1/2期，不许再出现第3期（窗口就是两期一个窗口）
  await ev("var b=document.querySelector('[data-bet-mode=\"two\"]'); if(b)b.click(); true"); await sleep(1500);
  const text2 = await ev("document.querySelector('#view').innerText");
  // 只看“窗口记录卡”（选号参考表里有“第3期中”这一列，不参与判定）
  const bad3 = await ev("[].filter.call(document.querySelectorAll('#view .exec-hist-card'), function (c) { return /第3期/.test(c.innerText); }).length");
  const hasTwo = await ev("[].filter.call(document.querySelectorAll('#view .exec-hist-card'), function (c) { return /第2期/.test(c.innerText); }).length");
  check(bad3 === 0 && hasTwo > 0 && /两期/.test(text2), "两期方案一个窗口只做两期（记录卡里没有第3期）", "含第3期的卡=" + bad3 + " 含第2期的卡=" + hasTwo);

  await ev("var b=document.querySelector('[data-bet-lines=\"all\"]'); if(b)b.click(); true"); await sleep(1800);
  d = JSON.parse(await read());
  check(d.cards.length === 14, "可切换显示全部14条", String(d.cards.length));
  // 回到“只做验证为正的线”，确认只渲染正线条数（D1已剔除，不进场）
  await ev("var b=document.querySelector('[data-bet-lines=\"positive\"]'); if(b)b.click(); true"); await sleep(1500);
  const dp = JSON.parse(await read());
  check(dp.cards.length === 7 && !dp.cards.some((c) => /D1/.test(c.label)), "只做正线模式只渲染7条（亏损线+D1不进场）", dp.cards.map((c) => c.label).join(","));

  // 切换到只做正线，两种方案下都应把 D1 排除
  await ev("var b=document.querySelector('[data-bet-lines=\"positive\"]'); if(b)b.click(); true"); await sleep(1500);
  const nine = JSON.parse(await read());
  const nineLabels = nine.cards.map((c) => c.label).join(",");
  check(nine.cards.length === 7 && !/D1/.test(nineLabels), "正线模式已剔除 D1", nineLabels);

  const txt = await ev("document.querySelector('#view').innerText");
  check(/命中率/.test(txt) && /本期合计/.test(txt), "页面显示命中率与本期合计");

  // 打印两套方案下 14 条线的账，用来核对“正线”名单
  for (const mode of ["two", "three"]) {
    await ev("var b=document.querySelector('[data-bet-lines=\"all\"]'); if(b)b.click(); true"); await sleep(1800);
    await ev("var b=document.querySelector('[data-bet-mode=\"" + mode + "\"]'); if(b)b.click(); true"); await sleep(2200);
    const dd = JSON.parse(await read());
    console.log("--- " + (mode === "two" ? "只做两期" : "三期全打") + " ---");
    dd.cards.forEach((c) => {
      const win = (c.chips.find((x) => x.indexOf("2026窗") >= 0) || "").replace(/\s+/g, " ");
      const net = (c.chips.find((x) => /2026年 /.test(x)) || "").replace(/\s+/g, " ");
      const rate = (c.chips.find((x) => x.indexOf("命中率") >= 0) || "").replace(/\s+/g, " ");
      const stake = (c.chips.find((x) => x.indexOf("本期 ") >= 0) || "").replace(/\s+/g, " ");
      console.log("  " + c.label.padEnd(10) + stake.padEnd(12) + rate.padEnd(14) + win.padEnd(26) + net);
    });
    // 切回只做正线，打印顶部汇总（本期合计 / 本窗最大风险 / 命中率 / 亏损线）
    await ev("var b=document.querySelector('[data-bet-lines=\"positive\"]'); if(b)b.click(); true"); await sleep(1400);
    const top = await ev(`(function () {
      var stats = [].map.call(document.querySelectorAll('#view .stat'), function (s) {
        return ((s.querySelector('.stat__label') || {}).innerText || '').replace(/\\n/g, ' ') + '=' + ((s.querySelector('.stat__value') || {}).innerText || '');
      });
      return stats.join(' | ');
    })()`);
    console.log("  顶部汇总（只做正线）：" + top);
  }
  check(errs.length === 0, "无 console 报错", errs.slice(0, 3).join(","));
  console.log("RESULT: " + (fails.length ? "FAILED " + fails.length : "ALL PASS"));
  ws.close(); chrome.kill(); server.kill(); await sleep(300);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(fails.length ? 1 : 0);
})();
