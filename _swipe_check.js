// 翻页手势回归：阈值式（原可用版本口径）——短距离即翻页、页面不跟手位移、横滚条不误翻
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9431, HTTP = 8171;
const APP_URL = "http://127.0.0.1:" + HTTP + "/index.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const failures = [];
function check(ok, label) { results.push((ok ? "PASS: " : "FAIL: ") + label); if (!ok) failures.push(label); }
async function getJSON(url) { const res = await fetch(url, { signal: AbortSignal.timeout(3000) }); return res.json(); }

async function main() {
  const userDir = path.join(process.cwd(), ".chrome-swipe-" + Date.now());
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
    "--remote-allow-origins=*", "--remote-debugging-port=" + CDP, "--user-data-dir=" + userDir, "--window-size=430,932", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 40; i++) { try { const list = await getJSON("http://127.0.0.1:" + CDP + "/json/list"); target = (list || []).find((t) => t.type === "page"); if (target && target.webSocketDebuggerUrl) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let msgId = 0; const errs = [];
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails || {}).text || "exception");
  });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evalJS = async (e) => {
    const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send("Runtime.enable"); await send("Page.enable");
  await send("Page.navigate", { url: APP_URL });
  for (let i = 0; i < 30; i++) { if (await evalJS("document.readyState === 'complete' && document.querySelectorAll('.tab').length > 0")) break; await sleep(400); }

  async function gesture(sel, dxList, dyList, gapMs) {
    await evalJS(
      "(function(){var el=document.querySelector('" + sel + "');if(!el)return false;var r=el.getBoundingClientRect();" +
      "window.__g={el:el,x:Math.round(r.left+r.width/2),y:Math.round(r.top+Math.min(r.height/2,20))};" +
      "window.__g.el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:window.__g.x,clientY:window.__g.y,pointerId:1,pointerType:'touch',isPrimary:true}));return true;})()");
    for (let i = 0; i < dxList.length; i++) {
      await sleep(gapMs);
      await evalJS("window.__g.el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,clientX:window.__g.x+" + dxList[i] + ",clientY:window.__g.y+" + ((dyList && dyList[i]) || 0) + ",pointerId:1,pointerType:'touch',isPrimary:true}));true");
    }
    const last = dxList[dxList.length - 1];
    const lastY = (dyList && dyList[dyList.length - 1]) || 0;
    await evalJS("window.__g.el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:window.__g.x+" + last + ",clientY:window.__g.y+" + lastY + ",pointerId:1,pointerType:'touch',isPrimary:true}));true");
  }
  const viewT = () => evalJS("getComputedStyle(document.querySelector('#view')).transform");
  const activeTab = () => evalJS("(document.querySelector('.tab.is-active')||{}).dataset ? document.querySelector('.tab.is-active').dataset.tab : ''");

  await evalJS("document.querySelector('[data-directory-group=\"recommend\"]').click(); true");
  await sleep(300);
  await evalJS("var dt=document.querySelector('[data-directory-tab=\"pick3\"]'); if(dt)dt.click(); true");
  await sleep(500);

  // 0) 执行提示/资金调度必须已从导航撤掉（并入下注执行表）
  const navLabels = await evalJS("[].map.call(document.querySelectorAll('#tabs .tab'),function(t){return (t.innerText||'').trim();}).join(',')");
  const hasMerged = navLabels.indexOf("执行提示") < 0 && navLabels.indexOf("资金调度") < 0 && navLabels.indexOf("下注执行表") >= 0;
  check(hasMerged, "导航已无「执行提示 / 资金调度」，只留下注执行表", navLabels);

  // 1) 短距离左滑就该翻页（原阈值 28px）
  const before1 = await activeTab();
  await gesture("#view .section__title", [-10, -30, -50], null, 20);
  await sleep(500);
  const after1 = await activeTab();
  check(before1 !== after1 && after1 !== "", "短距离左滑 → 翻到下一页（" + before1 + " → " + after1 + "）");

  // 2) 短距离右滑 → 回上一页
  const before2 = await activeTab();
  await gesture("#view .section__title", [10, 30, 50], null, 20);
  await sleep(500);
  const after2 = await activeTab();
  check(before2 !== after2 && after2 === before1, "短距离右滑 → 回上一页（" + before2 + " → " + after2 + "）");

  // 3) 页面不跟手位移（不该有 transform，避免晃屏）
  const t3 = await evalJS(
    "(function(){var v=document.querySelector('#view');var before=getComputedStyle(v).transform;" +
    "var el=document.querySelector('#view .section__title');var r=el.getBoundingClientRect();" +
    "el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:r.left+5,clientY:r.top+5,pointerId:2,pointerType:'touch',isPrimary:true}));" +
    "el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,clientX:r.left+15,clientY:r.top+5,pointerId:2,pointerType:'touch',isPrimary:true}));" +
    "var during=getComputedStyle(v).transform;" +
    "el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:r.left+15,clientY:r.top+5,pointerId:2,pointerType:'touch',isPrimary:true}));" +
    "return JSON.stringify({before:before,during:during});})()");
  const t3o = JSON.parse(t3);
  check(t3o.during === "none" && t3o.before === "none", "拖动时页面不整体位移（不晃屏）", t3);
  await sleep(400);

  // 4a2) 中间页长右滑 → 只回上一页，不回目录（滑到第一页才能返回上一级）
  await evalJS("var cb=document.querySelector('.tab[data-tab=\"betexec\"]'); if(cb)cb.click(); true"); await sleep(900);
  await gesture("#view .section__title", [80, 150, 240], null, 25);
  await sleep(900);
  const midTab = await evalJS("(document.querySelector('.tab.is-active')||{}).innerText||''");
  check((await evalJS("!!document.querySelector('.directory-grid')")) === false && midTab === "动态概率", "中间页长右滑 → 只回上一页，不回目录", "当前=" + midTab);
  await evalJS("var cb2=document.querySelector('.tab[data-tab=\"betexec\"]'); if(cb2)cb2.click(); true"); await sleep(700);
  // 4a) 右滑 200px 不够 → 不该回目录（门槛已提到 220px）
  await gesture("#view .section__title", [60, 130, 200], null, 25);
  await sleep(700);
  check(await evalJS("!!document.querySelector('.directory-grid')") === false, "右滑 200px 不够 → 不会误回目录");
  // 4b) 右滑 ≥220px 且明显横向 → 回目录
  await gesture("#view .section__title", [80, 150, 240], null, 25);
  await sleep(700);
  check(await evalJS("!!document.querySelector('.directory-grid')") === true, "右滑 ≥220px 且明显横向 → 回到目录");

  // 5) 横向滚动条内滑动不翻页
  await evalJS("var bk9=document.querySelector('[data-directory=\"1\"]'); if(bk9)bk9.click(); true"); await sleep(500);
  await evalJS("var g9=document.querySelector('[data-directory-group=\"recommend\"]'); if(g9)g9.click(); true"); await sleep(300);
  await evalJS("var dt9=document.querySelector('[data-directory-tab=\"betexec\"]'); if(dt9)dt9.click(); true"); await sleep(500);
  await evalJS("var b9=document.querySelector('.tab[data-tab=\"betexec\"]'); if(b9)b9.click(); true"); await sleep(1800);
  const before5 = await activeTab();
  await gesture(".exec-line__scroll", [-40, -90], null, 20);
  await sleep(500);
  const after5 = await activeTab();
  check(after5 === before5 && (await viewT()) === "none", "横向滚动条内滑动不翻页");

  // 6) 竖滑不翻页
  const before6 = await activeTab();
  await gesture("#view .section__title", [4, 6, 8], [40, 90, 140], 20);
  await sleep(500);
  check((await activeTab()) === before6, "竖向滑动不翻页");

  // 7) 13线按钮排左滑 → 切下一条线
  await evalJS("document.querySelector('.tab[data-tab=\"windowmult\"]').click(); true"); await sleep(1600);
  const lineBefore = await evalJS("(document.querySelector('.wm-line-selector [data-wm-line][style*=\"2563eb\"]')||{}).dataset.wmLine");
  await gesture(".wm-line-selector [data-wm-line]", [-30, -60], null, 20);
  await sleep(700);
  const lineAfter = await evalJS("(document.querySelector('.wm-line-selector [data-wm-line][style*=\"2563eb\"]')||{}).dataset.wmLine");
  check(lineBefore !== lineAfter, "13线按钮排左滑 → 切到下一条线（" + lineBefore + " → " + lineAfter + "）");

  check(errs.length === 0, "控制台无报错" + (errs.length ? " → " + errs.join(",") : ""));
  console.log(results.join("\n"));
  console.log("\nRESULT: " + (failures.length === 0 ? "ALL PASS" : "FAILED " + failures.length));
  ws.close(); chrome.kill(); server.kill();
  await sleep(300); try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(failures.length === 0 ? 0 : 1);
}
setTimeout(() => { console.log("FAIL: watchdog"); process.exit(1); }, 180000);
main().catch((e) => { console.log("FAIL: " + (e && e.stack || e)); process.exit(1); });
