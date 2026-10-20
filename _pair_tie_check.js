// 护栏：D1/D2 同分时，所有页面的顶部推荐必须显示全部并列尾号，不能把排序冒充强弱
const { spawn } = require("child_process");
const path = require("path");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9999, HTTP = 8739;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return response.json();
}

(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  await sleep(1200);
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--remote-debugging-port=" + CDP,
    "--user-data-dir=" + path.join(process.cwd(), ".chrome-pair-tie-" + Date.now()),
    "--window-size=390,844",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      try {
        const list = await getJSON("http://127.0.0.1:" + CDP + "/json/list");
        target = (list || []).find((item) => item.type === "page");
        if (target) break;
      } catch (error) {}
      await sleep(300);
    }
    if (!target) throw new Error("Chrome 未启动");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map();
    let id = 0;
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
    });
    await new Promise((resolve) => ws.addEventListener("open", resolve));
    const send = (method, params) => new Promise((resolve) => {
      const requestId = ++id;
      pending.set(requestId, resolve);
      ws.send(JSON.stringify({ id: requestId, method, params: params || {} }));
    });
    const evaluate = async (expression) => {
      const response = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return response.result && response.result.result ? response.result.result.value : undefined;
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: "http://127.0.0.1:" + HTTP + "/index.html" });
    await sleep(1800);
    await evaluate("localStorage.clear(); location.reload(); true");
    await sleep(1800);

    const groups = JSON.parse(await evaluate(
      "JSON.stringify([].map.call(document.querySelectorAll('[data-directory-group]'),function(node){return node.dataset.directoryGroup;}))"
    ));
    const failures = [];
    let pages = 0;
    for (const group of groups) {
      await evaluate("var back=document.querySelector('[data-directory=\"1\"]');if(back)back.click();true");
      await sleep(350);
      await evaluate("var group=document.querySelector('[data-directory-group=\"" + group + "\"]');if(group)group.click();true");
      await sleep(450);
      const tabs = JSON.parse(await evaluate(
        "JSON.stringify([].map.call(document.querySelectorAll('#tabs .tab[data-tab]'),function(node){return {id:node.dataset.tab,label:node.innerText.trim()};}).filter(function(item){return item.id!=='directory';}))"
      ));
      for (const tab of tabs) {
        await evaluate("var tab=document.querySelector('.tab[data-tab=\"" + tab.id + "\"]');if(tab)tab.click();true");
        await sleep(900);
        const tieState = JSON.parse(await evaluate(`(function(){
          var raw=window.APP_DATA&&window.APP_DATA.raw||{};
          var latest=Math.max.apply(null,Object.keys(raw).map(Number));
          var model=window.CAISHEN_MODEL.createModel(raw);
          var ranked=model.pickTopAt(latest,10);
          var tied=ranked.length?ranked.filter(function(item){return item.sc===ranked[0].sc;}).map(function(item){return item.d;}):[];
          var note=document.querySelector('.model-pair-note');
          return JSON.stringify({tied:tied,note:note?note.innerText.trim():''});
        })()`));
        pages++;
        const expectedTie = tieState.tied.length > 2;
        const noteText = tieState.note || "";
        const hasAllTails = tieState.tied.every((tail) => noteText.indexOf(String(tail)) >= 0);
        if (expectedTie && (!noteText || noteText.indexOf("同分并列") < 0 || !hasAllTails || noteText.indexOf("不代表强弱") < 0)) {
          failures.push(tab.label + "(" + group + ")");
        }
        if (!expectedTie && noteText) {
          failures.push(tab.label + "(" + group + ")");
        }
      }
    }
    ws.close();
    console.log((failures.length ? "FAIL: " : "PASS: ") + "所有页面必须显示全部同分尾号且声明排序不代表强弱");
    console.log("检查页面数：" + pages + (failures.length ? " · 不合格：" + failures.join(", ") : " · 全部合格"));
    console.log("RESULT: " + (failures.length ? "FAILED " + failures.length : "ALL PASS"));
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    chrome.kill();
    server.kill();
    await sleep(200);
  }
})().catch((error) => {
  console.error("FAIL: " + error.message);
  console.log("RESULT: FAILED 1");
  process.exitCode = 1;
});
