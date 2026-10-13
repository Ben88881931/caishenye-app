const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9431, HTTP_PORT = 8171;
const APP_URL = "http://127.0.0.1:" + HTTP_PORT + "/index.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const failures = [];
function check(ok, label) { results.push((ok ? "PASS: " : "FAIL: ") + label); if (!ok) failures.push(label); }
async function getJSON(url) { const res = await fetch(url, { signal: AbortSignal.timeout(3000) }); return res.json(); }
async function main() {
  const userDir = path.join(process.cwd(), ".chrome-ios-" + Date.now());
  const server = spawn("python", ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*", "--remote-debugging-port=" + CDP_PORT, "--user-data-dir=" + userDir, "--window-size=430,932", "about:blank"], { stdio: "ignore" });
  let version = null;
  for (let i = 0; i < 40; i++) { try { version = await getJSON("http://127.0.0.1:" + CDP_PORT + "/json/version"); if (version && version.webSocketDebuggerUrl) break; } catch (e) {} await sleep(500); }
  let target = null;
  for (let i = 0; i < 20; i++) { try { const list = await getJSON("http://127.0.0.1:" + CDP_PORT + "/json/list"); target = (list || []).find((t) => t.type === "page"); if (target && target.webSocketDebuggerUrl) break; } catch (e) {} await sleep(400); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let msgId = 0; const errs = [];
  ws.addEventListener("message", (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails || {}).text || "exception"); });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evalJS = async (e) => {
    const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send("Runtime.enable"); await send("Page.enable");
  await send("Page.navigate", { url: APP_URL });
  for (let i = 0; i < 30; i++) { if (await evalJS("document.readyState === 'complete' && document.querySelectorAll('.tab').length > 0")) break; await sleep(500); }

  // 手势工具：在指定元素上做一次滑动，返回松手前的 transform
  async function gesture(sel, dxList, gapMs) {
    await evalJS(
      "(function(){var el=document.querySelector('" + sel + "');if(!el)return false;var r=el.getBoundingClientRect();" +
        "window.__g={el:el,x:Math.round(r.left+r.width/2),y:Math.round(r.top+Math.min(r.height/2,20))};" +
        "window.__g.el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:window.__g.x,clientY:window.__g.y,pointerId:1,pointerType:'touch',isPrimary:true}));return true;})()"
    );
    for (const dx of dxList) {
      await sleep(gapMs);
      await evalJS("window.__g.el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,clientX:window.__g.x+" + dx + ",clientY:window.__g.y,pointerId:1,pointerType:'touch',isPrimary:true}));true");
    }
    const t = await evalJS("getComputedStyle(document.querySelector('#view')).transform");
    const last = dxList[dxList.length - 1];
    await evalJS("window.__g.el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:window.__g.x+" + last + ",clientY:window.__g.y,pointerId:1,pointerType:'touch',isPrimary:true}));true");
    return t;
  }
  const viewT = () => evalJS("getComputedStyle(document.querySelector('#view')).transform");
  // 回弹是动画，读到的可能是动画中间帧；这里允许 1.5px 内的残差
  const isIdentity = (t) => {
    if (!t || t === "none") return true;
    const m = /matrix\(([^)]+)\)/.exec(t);
    if (!m) return false;
    const p = m[1].split(",").map(Number);
    return Math.abs(p[4]) < 1.5 && Math.abs(p[5]) < 1.5;
  };
  const activeTab = () => evalJS("(document.querySelector('.tab.is-active')||{}).dataset ? document.querySelector('.tab.is-active').dataset.tab : ''");
  const tabCount = () => evalJS("document.querySelectorAll('.tab[data-tab]').length");

  // 进入模型流程（二级）
  await evalJS("document.querySelector('[data-directory-group=\"recommend\"]').click(); true");
  await sleep(700);

  // 1) 跟手预览：慢慢拖 60px，页面应跟手位移
  const t1 = await gesture("#view .section__title", [-20, -40, -60], 30);
  check(/matrix.*-60|-60/.test(t1) || t1.indexOf("60") >= 0, "拖动时页面跟手位移（transform=" + t1 + "）");
  let t1b = "";
  for (let i = 0; i < 20; i++) { await sleep(120); t1b = await viewT(); if (isIdentity(t1b)) break; }
  check(isIdentity(t1b), "没到阈值松手 → 回弹复位（transform=" + t1b + "）");

  // 2) 惯性甩动：三次快速移动累计 -150px，应翻到下一页
  const before = await activeTab();
  await gesture("#view .section__title", [-50, -100, -150], 16);
  await sleep(600);
  const after = await activeTab();
  check(before !== after && after !== "", "快速甩动 → 翻到下一页（" + before + " → " + after + "）");
  await sleep(400);

  // 3) 边界阻尼：走到最后一个二级页再往后甩，应不翻页且带阻尼
  let guard = 0;
  while (guard++ < 12) {
    const cur = await activeTab();
    if (cur === "orderlog") break;
    await evalJS("document.querySelector('.tab[data-tab=\"orderlog\"]').click(); true");
    await sleep(500);
    break;
  }
  const lastTab = await activeTab();
  const t3 = await gesture("#view .section__title", [-80, -160], 20);
  await sleep(500);
  const afterLast = await activeTab();
  check(afterLast === lastTab, "最后一个页面继续左滑 → 不翻页（仍在 " + afterLast + "）");

  // 4) 横向滚动条内滑动不翻页
  const before4 = await activeTab();
  const t4 = await gesture(".exec-line__scroll", [-40, -90], 20);
  await sleep(500);
  const after4 = await activeTab();
  check(after4 === before4 && isIdentity(t4), "横向滚动条内滑动不触发翻页（transform=" + t4 + "）");

  // 5) 右滑 ≥160px → 回目录
  await gesture("#view .section__title", [80, 200], 25);
  await sleep(700);
  const backDir = await evalJS("!!document.querySelector('.directory-grid')");
  check(backDir === true, "右滑 ≥160px → 回到目录");

  // 6) 14线按钮排左右滑 → 翻线路
  await evalJS("document.querySelector('[data-directory-group=\"recommend\"]').click(); true");
  await sleep(500);
  await evalJS("document.querySelector('.tab[data-tab=\"windowmult\"]').click(); true");
  await sleep(1400);
  const lineBefore = await evalJS("(document.querySelector('.wm-line-selector [data-wm-line][style*=\"2563eb\"]')||{}).dataset.wmLine");
  await gesture(".wm-line-selector [data-wm-line]", [-40, -120], 18);
  await sleep(700);
  const lineAfter = await evalJS("(document.querySelector('.wm-line-selector [data-wm-line][style*=\"2563eb\"]')||{}).dataset.wmLine");
  check(lineBefore !== lineAfter, "14线按钮排左滑 → 切到下一条线（" + lineBefore + " → " + lineAfter + "）");

  check(errs.length === 0, "控制台无报错" + (errs.length ? " → " + errs.join(",") : ""));
  console.log(results.join("\n"));
  console.log("\nRESULT: " + (failures.length === 0 ? "ALL PASS" : "FAILED " + failures.length));
  ws.close(); chrome.kill(); server.kill();
  await sleep(300); try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(failures.length === 0 ? 0 : 1);
}
const watchdog = setTimeout(() => { console.log("FAIL: watchdog"); process.exit(1); }, 180000);
main().then(() => clearTimeout(watchdog)).catch((e) => { clearTimeout(watchdog); console.log("ERROR " + (e && e.stack ? e.stack : e)); process.exit(1); });
