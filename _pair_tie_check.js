// 护栏：旧D1/D2必须退出推荐，所有页面顶部改为动态概率前三名
const { spawn } = require("child_process");
const path = require("path");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = 9999, HTTP = 8739;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJSON(url) { const response = await fetch(url, { signal: AbortSignal.timeout(3000) }); return response.json(); }
(async () => {
  const server = spawn("python", ["-m", "http.server", String(HTTP), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });
  await sleep(1200);
  const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--no-sandbox","--no-first-run","--remote-debugging-port="+CDP,"--user-data-dir="+path.join(process.cwd(),".chrome-pair-tie-"+Date.now()),"--window-size=390,844","about:blank"], { stdio: "ignore" });
  try {
    let target=null;
    for(let i=0;i<40;i++){try{const list=await getJSON("http://127.0.0.1:"+CDP+"/json/list");target=(list||[]).find(x=>x.type==="page");if(target)break;}catch(e){}await sleep(300);}
    if(!target)throw new Error("Chrome 未启动");
    const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let id=0;
    ws.addEventListener("message",(event)=>{let m;try{m=JSON.parse(event.data)}catch(e){return}if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}});
    await new Promise(r=>ws.addEventListener("open",r));
    const send=(method,params)=>new Promise(resolve=>{const rid=++id;pending.set(rid,resolve);ws.send(JSON.stringify({id:rid,method,params:params||{}}))});
    const ev=async expression=>{const response=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});return response.result&&response.result.result?response.result.result.value:undefined};
    await send("Page.enable");await send("Runtime.enable");await send("Page.navigate",{url:"http://127.0.0.1:"+HTTP+"/index.html"});await sleep(1800);
    await ev("localStorage.clear(); location.reload(); true");await sleep(1800);
    const groups=JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('[data-directory-group]'),function(n){return n.dataset.directoryGroup;}))"));
    const failures=[];let pages=0,probPages=0;
    for(const group of groups){
      await ev("var back=document.querySelector('[data-directory=\"1\"]');if(back)back.click();true");await sleep(350);
      await ev("var group=document.querySelector('[data-directory-group=\"" + group + "\"]');if(group)group.click();true");await sleep(450);
      const tabs=JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('#tabs .tab[data-tab]'),function(n){return {id:n.dataset.tab,label:n.innerText.trim()};}).filter(function(x){return x.id!=='directory';}))"));
      for(const tab of tabs){
        await ev("var b=document.querySelector('.tab[data-tab=\"" + tab.id + "\"]');if(b)b.click();true");await sleep(900);
        const state=JSON.parse(await ev("(function(){var g=document.querySelector('.model-pair-grid');var t=g?g.innerText:'';return JSON.stringify({p1:document.querySelectorAll('.model-pair-card--p1').length,p2:document.querySelectorAll('.model-pair-card--p2').length,p3:document.querySelectorAll('.model-pair-card--p3').length,old:document.querySelectorAll('.model-pair-card--d1,.model-pair-card--d2').length,text:t,view:document.querySelector('#view')?document.querySelector('#view').innerText:''});})()"));
        pages++;
        if(tab.id==="pick3")probPages++;
        if(state.p1!==1||state.p2!==1||state.p3!==1||state.old!==0||!/动态第1/.test(state.text)||!/动态第2/.test(state.text)||!/动态第3/.test(state.text)||(state.text.match(/%/g)||[]).length<4)failures.push(tab.label+"("+group+")");
        if(tab.id==="pick3"&&(!/动态概率模型 · 第/.test(state.view)||!/影子预测/.test(state.view)||!/测试状态 · 未通过正式验证/.test(state.view)||!/测试窗口记录 · 2025验证 \/ 2026影子/.test(state.view)))failures.push("动态概率页缺少影子模型或测试状态");
        if(tab.id==="pick3"){
          const probTest=JSON.parse(await ev("(function(){return JSON.stringify({strips:document.querySelectorAll('.prob-test-strip').length,cards:document.querySelectorAll('.prob-test-card').length,text:document.querySelector('#view').innerText});})()"));
          if(probTest.strips!==6||probTest.cards<6||!/第1期中/.test(probTest.text)||!/全错/.test(probTest.text))failures.push("动态概率页测试窗口滚动条不完整");
        }
        if(/D1 第一推荐|D2 第二推荐/.test(state.text))failures.push(tab.label+"("+group+"·旧推荐)");
      }
    }
    const oldTabs=await ev("document.querySelectorAll('.tab[data-tab=\"chasenumber\"]').length");
    if(oldTabs!==0)failures.push("旧追号页签仍存在");
    ws.close();
    console.log((failures.length?"FAIL: ":"PASS: ")+"所有页面顶部必须是动态概率前三名，旧D1/D2不得出现");
    console.log("检查页面数："+pages+" · 动态概率页："+probPages+(failures.length?" · 不合格："+failures.join(", "):" · 全部合格"));
    console.log("RESULT: "+(failures.length?"FAILED "+failures.length:"ALL PASS"));
    process.exitCode=failures.length?1:0;
  } finally { chrome.kill(); server.kill(); await sleep(200); }
})().catch(error=>{console.error("FAIL: "+error.message);console.log("RESULT: FAILED 1");process.exitCode=1;});
