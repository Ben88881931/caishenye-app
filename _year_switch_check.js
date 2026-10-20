// 护栏：遗漏排序、窗口遗漏热图必须支持全部年份切换，每年独立展示
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9481;
const HTTP = 8231;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return response.json();
}

async function main() {
  const failures = [];
  const check = (ok, label, extra) => {
    console.log(`${ok ? "PASS" : "FAIL"}: ${label}${extra ? ` [${extra}]` : ""}`);
    if (!ok) failures.push(label);
  };
  const dataText = fs.readFileSync("data.js", "utf8");
  const data = JSON.parse(dataText.match(/window\.APP_DATA\s*=\s*(\{.*\});/s)[1]);
  const years = [...new Set(data.d.map((row) => Number(row.y)))].sort((a, b) => b - a);

  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "ignore"
  });
  await sleep(1200);
  const userDir = path.join(process.cwd(), `.chrome-yearswitch-${Date.now()}`);
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${CDP}`,
    `--user-data-dir=${userDir}`,
    "--window-size=390,844",
    "about:blank"
  ], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJSON(`http://127.0.0.1:${CDP}/json/list`);
      target = (list || []).find((item) => item.type === "page");
      if (target && target.webSocketDebuggerUrl) break;
    } catch (error) {}
    await sleep(400);
  }
  if (!target) throw new Error("Chrome target unavailable");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let messageId = 0;
  ws.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      return;
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === "Runtime.exceptionThrown") {
      errors.push((message.params.exceptionDetails || {}).text || "exception");
    }
  });
  await new Promise((resolve) => ws.addEventListener("open", resolve));
  const send = (method, params) => new Promise((resolve) => {
    const id = ++messageId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return response.result && response.result.result ? response.result.result.value : undefined;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 50; i++) {
      if (await evaluate(expression)) return true;
      await sleep(150);
    }
    return false;
  };
  const setTab = async (tab) => {
    await evaluate(`localStorage.setItem("v2_current_tab", JSON.stringify(${JSON.stringify(tab)}));localStorage.setItem("v2_nav_group", JSON.stringify("miss"));location.reload();`);
    await waitFor(`document.body && document.body.dataset.page === ${JSON.stringify(tab)}`);
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `http://127.0.0.1:${HTTP}/index.html` });
  await waitFor("!!document.querySelector('.directory-card')");

  await setTab("missorder");
  await waitFor("!!document.querySelector('[data-miss-order-year]') && !!document.querySelector('#view .heatmap__table')");
  const missButtons = await evaluate("document.querySelectorAll('[data-miss-order-year]').length");
  check(missButtons === years.length, "遗漏排序显示全部年份按钮", `页面${missButtons} 数据${years.length}`);
  for (const year of years) {
    await evaluate(`document.querySelector('[data-miss-order-year="${year}"]').click()`);
    const titleOk = await waitFor(`document.querySelector('#view .section__title') && document.querySelector('#view .section__title').innerText.includes('${year}年')`);
    const active = await evaluate(`(document.querySelector('[data-miss-order-year].is-active') || {}).innerText`);
    const last = await evaluate(`(function(){
      var rows = document.querySelectorAll('#view .heatmap__table tbody tr');
      var last = rows[rows.length - 1];
      if (!last) return null;
      var cells = last.querySelectorAll('td');
      return { period: Number(cells[0].innerText), tails: cells[1].innerText.trim() };
    })()`);
    const source = data.d.filter((row) => Number(row.y) === year);
    const sourceLast = source[source.length - 1];
    const expectedTails = [...new Set(sourceLast.nums.map((number) => Number(number) % 10))].sort((a, b) => a - b).join(" ");
    check(titleOk && Number(active) === year, `遗漏排序切换到${year}年`, `active=${active}`);
    check(last && last.period === Number(sourceLast.p) && last.tails === expectedTails, `遗漏排序${year}年独立数据正确`, `页面${last ? last.period + '/' + last.tails : '-'} 数据${sourceLast.p}/${expectedTails}`);
  }

  await evaluate(`document.querySelector('[data-miss-order-year="2023"]').click()`);
  await waitFor(`document.querySelector('#view .section__title').innerText.includes('2023年')`);
  await evaluate(`document.querySelector('[data-tab="windowmiss"]').click()`);
  await waitFor("document.body.dataset.page === 'windowmiss' && !!document.querySelector('[data-window-miss-year]')");
  const wmButtons = await evaluate("document.querySelectorAll('[data-window-miss-year]').length");
  check(wmButtons === years.length, "窗口遗漏热图显示全部年份按钮", `页面${wmButtons} 数据${years.length}`);
  for (const year of years) {
    await evaluate(`document.querySelector('[data-window-miss-year="${year}"]').click()`);
    const titleOk = await waitFor(`document.querySelector('#view .section__title') && document.querySelector('#view .section__title').innerText.includes('${year}年')`);
    const active = await evaluate(`(document.querySelector('[data-window-miss-year].is-active') || {}).innerText`);
    const runInfo = JSON.parse(await evaluate(`(function(){
      var cards=document.querySelectorAll('#view .trend-run-card');
      var strips=document.querySelectorAll('#view .trend-run-strip');
      var text=document.querySelector('#view').innerText;
      var gapMath=true;
      cards.forEach(function(card){
        var row=card.querySelector('.trend-run-row');
        if(!row)return;
        var chips=[].slice.call(row.querySelectorAll('.trend-run-chip')).reverse();
        var previousStart=null;
        chips.forEach(function(chip){
          var small=(chip.querySelector('small')||{}).innerText||'';
          var startMatch=small.match(/第(\\d+)/);
          if(!startMatch){gapMath=false;return;}
          var start=Number(startMatch[1]);
          if(previousStart==null){
            if(small.indexOf('年内首段')<0)gapMath=false;
          }else{
            var gapMatch=small.match(/距上次(\\d+)窗/);
            if(!gapMatch||Number(gapMatch[1])!==start-previousStart)gapMath=false;
          }
          previousStart=start;
        });
      });
      return JSON.stringify({
        cards:cards.length,
        strips:strips.length,
        yearTitle:text.indexOf('窗口遗漏 / 窗口连中滚动记录 · ${year}年')>=0,
        counts:text.indexOf('漏1×')>=0 && text.indexOf('漏4+×')>=0 && text.indexOf('连1×')>=0 && text.indexOf('连4+×')>=0,
        gap:(text.indexOf('距上次')>=0 || text.indexOf('年内首段')>=0) && gapMath
      });
    })()`));
    check(titleOk && Number(active) === year, `窗口遗漏热图切换到${year}年`, `active=${active}`);
    check(runInfo.cards === 14 && runInfo.strips === 28 && runInfo.yearTitle && runInfo.counts && runInfo.gap, `窗口遗漏${year}年滚动记录结构正确`, JSON.stringify(runInfo));
  }

  await evaluate(`document.querySelector('[data-wm-mode="two"]').click()`);
  await waitFor("document.querySelector('[data-wm-mode=\"two\"]').classList.contains('is-active')");
  const twoMode = JSON.parse(await evaluate(`(function(){return JSON.stringify({cards:document.querySelectorAll('#view .trend-run-card').length,strips:document.querySelectorAll('#view .trend-run-strip').length});})()`));
  check(twoMode.cards === 14 && twoMode.strips === 28, "两期窗口滚动记录同步切换为14线", JSON.stringify(twoMode));
  await evaluate(`document.querySelector('[data-wm-mode="three"]').click()`);
  await waitFor("document.querySelector('[data-wm-mode=\"three\"]').classList.contains('is-active')");

  await evaluate(`document.querySelector('[data-window-miss-year="2025"]').click()`);
  await waitFor(`document.querySelector('#view .section__title').innerText.includes('2025年')`);
  await evaluate(`document.querySelector('[data-tab="missorder"]').click()`);
  await waitFor("document.body.dataset.page === 'missorder'");
  const preservedMiss = await evaluate(`Number((document.querySelector('[data-miss-order-year].is-active') || {}).innerText)`);
  await evaluate(`document.querySelector('[data-tab="windowmiss"]').click()`);
  await waitFor("document.body.dataset.page === 'windowmiss'");
  const preservedWindow = await evaluate(`Number((document.querySelector('[data-window-miss-year].is-active') || {}).innerText)`);
  check(preservedMiss === 2023 && preservedWindow === 2025, "两页年份选择互不影响并能保留");
  check(errors.length === 0, "控制台无报错", errors.join(" | "));

  await send("Browser.close", {});
  chrome.kill();
  server.kill();
  await sleep(200);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (error) {}
  console.log(`RESULT: ${failures.length ? "FAIL" : "ALL PASS"}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
