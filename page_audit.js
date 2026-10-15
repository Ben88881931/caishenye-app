#!/usr/bin/env node
/**
 * 财神爷小程序每日页面审计
 * 检查所有页面依赖的数据源、快照、缓存版本和关键显示口径是否一致。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const errors = [];

function fail(msg) { errors.push(msg); console.log("FAIL:", msg); }
function pass(msg) { console.log("PASS:", msg); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function json(rel) { return JSON.parse(read(rel)); }
function must(ok, msg) { ok ? pass(msg) : fail(msg); }
function sortedTargets(records) { return records.map((r) => Number(r.target)).sort((a, b) => a - b); }

const raw = json("lottery_data.json");
const periods = Object.keys(raw).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
const latest = periods[periods.length - 1];
const htmlText = read("号码走势图.html");
const dmatch = htmlText.match(/var D\s*=\s*(\[[\s\S]*?\]);/);
const data = JSON.parse(read("data.js").match(/window\.APP_DATA\s*=\s*(\{.*\});/s)[1]);
const snapshots = json("prediction_snapshots.json");
const snapshotJs = JSON.parse(read("snapshots.js").match(/window\.APP_SNAPSHOTS\s*=\s*(\{.*\});/s)[1]);
const indexText = read("index.html");
const appText = read("app.js");

must(periods.length > 0 && periods[0] === 1, "原始期数从第1期开始");
must(periods.every((p, i) => i === 0 || p === periods[i - 1] + 1), "原始期数连续");
must(periods.every((p) => /^[01]{10}$/.test(raw[String(p)])), "所有尾数二进制均为10位");
must(!!dmatch, "号码走势图.html 存在 var D");
if (dmatch) {
  const d = JSON.parse(dmatch[1]);
  must(d.length > 0 && Number(d[d.length - 1].p) === latest, "号码走势图最后一条等于最新期");
  must(JSON.stringify(data.d) === JSON.stringify(d), "data.js 的 D 与号码走势图一致");
}
must(JSON.stringify(data.raw) === JSON.stringify(raw), "data.js 的 raw 与 lottery_data.json 一致");

const records = Array.isArray(snapshots.records) ? snapshots.records : [];
const targets = sortedTargets(records);
must(targets.length === new Set(targets).size, "预测快照目标期无重复");
must(records.filter((r) => r.settled && Number(r.target) === latest).length === 1, "最新期已有且仅有一条已结算快照");
const pending = records.filter((r) => !r.settled);
must(pending.length === 1 && Number(pending[0].target) === latest + 1, "下一期已有且仅有一条待开奖快照");
must(records.filter((r) => r.settled).every((r) => Number(r.target) <= latest && Array.isArray(r.actualTails)), "已结算快照均有实际尾数");

const model = require("./model_core.js").createModel(raw);
const prediction = model.buildPrediction(latest);
if (pending.length === 1) {
  const p = pending[0];
  const dPicks = (p.models.doubleRecommendation.picks || []).map((x) => ({ tail: x.tail, score: x.score }));
  const dExpected = (prediction.doubleRecommendation || []).map((x) => ({ tail: x.tail, score: x.score }));
  must(JSON.stringify(dPicks) === JSON.stringify(dExpected), "下一期双号快照与模型输出一致");
}

const settledDoubleTargets = records.filter((r) => r.settled && r.results && r.results.doubleRecommendation).map((r) => Number(r.target)).sort((a, b) => a - b);
const detailTargets = (snapshotJs.detail || []).map((r) => Number(r.target)).sort((a, b) => a - b);
must(JSON.stringify(settledDoubleTargets) === JSON.stringify(detailTargets), "双号五级明细与已结算快照一致");
must(detailTargets.length > 0 && detailTargets[detailTargets.length - 1] === latest, "追推荐快照明细必须覆盖最新已开奖期");
must(Array.isArray(snapshotJs.threePeriodRecords), "snapshots.js 含三期内追推荐真实快照");
must(Array.isArray(snapshotJs.sourceWindows), "snapshots.js 含双号原始号源真实窗口");
const sourceWindowRecords = Array.isArray(snapshotJs.sourceWindows) ? snapshotJs.sourceWindows : [];
const pendingByStream = {};
sourceWindowRecords.forEach((r) => { if (r.status === "pending") pendingByStream[r.stream] = (pendingByStream[r.stream] || 0) + 1; });
must(["D1", "D2"].every((k) => (pendingByStream[k] || 0) <= 1), "每条号源最多只有一个进行中的三期窗口");
const activeWindows = ["D1", "D2"].map((k) => sourceWindowRecords
  .filter((r) => r.stream === k && r.status === "pending")
  .sort((a, b) => Number(b.target) - Number(a.target))[0] || null);
const pendingTarget = pending.length ? Number(pending[0].target) : latest + 1;
function activeWindowAttemptsValid(w) {
  if (!w || !Array.isArray(w.attempts)) return false;
  if (w.attempts.length === 0) return Number(w.target) === pendingTarget;
  const start = Number(w.target);
  return w.attempts.every((a, i) => Number(a.period) === start + i);
}
function activeWindowNextCheck(w) {
  return w.attempts.length
    ? Number(w.attempts[w.attempts.length - 1].period) + 1
    : Number(w.target);
}
must(activeWindows.every(activeWindowAttemptsValid),
  "每条号源当前窗口必须从锁定期起逐期记录且不换号");
must(activeWindows.every((w) => activeWindowNextCheck(w) <= Number(w.target) + 2),
  "每条号源当前窗口状态必须指向下一检查期");
const sourceSummary = snapshotJs.sourceWindowSummary || {};
must(["D1", "D2"].every((k) => sourceSummary.byStream && sourceSummary.byStream[k]), "snapshots.js 含双号原始号源窗口汇总");
const threeSummary = snapshotJs.threePeriodSummary || {};
must(["n", "acted", "settled", "pending", "skipped", "hits", "miss", "first", "second", "third", "hit3Rate"].every((k) => k in threeSummary), "snapshots.js 含三期内追推荐汇总");

const selector = require("./model_selector.js").analyze(raw, model, { startPeriod: 31 });
must(Number(selector.nextPeriod) === latest + 1, "三期内追推荐预测期正确");
must(["跟双号", "观望"].includes(selector.decision.action), "三期内追推荐动作合法");
const ultimate = require("./ultimate_model.js").analyze(raw, model, { startPeriod: 31 });
must(Number(ultimate.nextPeriod) === latest + 1, "追号/三期内追推荐预测期正确");
must(["分批启用", "观望"].includes(ultimate.decision.action), "固定追三期总决策合法");

must(appText.includes("ULT_CARD_HISTORY") && appText.includes("ULT_RECORDS_START") && appText.includes("card-followup") && appText.includes("真实快照") && appText.includes("历史回测"), "三期内记录与真实/历史链路完整");
must(!appText.includes("加权") && !appText.includes("weightedBounce") && !appText.includes("W1") && !appText.includes("W2"), "活动页面与代码不得再出现加权模型残留");
must(appText.includes("function nudgeNavItem") && appText.includes("renderedTab") && appText.includes("nav-group-caret") && appText.includes("window.scrollTo"), "导航保持横向位置、当前项可见且切页回顶");
must(appText.includes("var waiting = null") && appText.includes("waitingTails.indexOf(Number(waiting.tail))") && appText.includes("等待尾") && appText.includes("重新开出后再开新窗口") && appText.includes("等待重开"), "14线窗口引擎必须保持「三期全错→等该号重新开出→下一期才开新窗」，且页面必须写明等待的尾号");
must(!appText.includes("function renderFunds") && !appText.includes("function renderOrderHint") && !appText.includes("FUND_CAPITAL") && !appText.includes("本金锚定") && !appText.includes("本金占用率") && appText.includes("本窗剩余风险") && appText.includes("本期不下注（条）"), "执行提示与资金调度两页必须彻底删除（连代码一起删干净），本期金额/本窗剩余风险只保留下注执行表一处");
must(appText.includes("function renderFormulaTable") && appText.includes("EXEC_FORMULA_AUDIT") && appText.includes("不配仓") && appText.includes("训练 / 验证"), "公式表页必须展示14条线路的训练/验证系数、最终公式和配仓状态");
must(appText.includes("WM_BASE = 100") && appText.includes("wmPlanText") && appText.includes("每个号码的最优下注公式") && appText.includes("lineBest") && appText.includes("最优 ") && appText.includes("未通过"), "窗口倍投测试必须100元起，并为每条线路标注训练/验证同时为正的最优下注公式");
must(appText.includes("PAGE_GUIDE_GROUPS") && appText.includes("PAGE_GUIDE_BY_NAME") && appText.includes("PAGE_GUIDE_DISPLAY_GROUPS") && appText.includes('title: "每日操作"') && appText.includes('title: "公式验证"') && appText.includes('title: "数据参考"') && appText.includes('title: "生肖与辅助"') && appText.includes('names: ["双号追热", "三期内追号/追推荐", "下注执行表", "追三期下单"]') && appText.includes("appendGuideGroup(PAGE_GUIDE_DISPLAY_GROUPS[0])") && appText.includes("PAGE_GUIDE_DISPLAY_GROUPS.slice(1).forEach(appendGuideGroup)") && appText.includes("PAGE_LABEL_GUIDE") && appText.includes("PAGE_GUIDE_TAB_MAP") && appText.includes("function pageGuideHTML") && appText.includes("页面说明 · 大白话版") && appText.includes("页面上的标语怎么看") && appText.includes("label-guide-row") && appText.includes("overview-page-card--label-guide") && appText.includes("窗口等待") && appText.includes("开窗等待") && appText.includes("今年测试仓位") && appText.includes("overview-pages-grid") && appText.includes("overview-page-card--guide") && appText.includes("data-overview-tab") && appText.includes("pageGuideHTML()") && appText.includes("function historyStackHTML") && appText.includes("function stepGroupHistory") && appText.includes("function stepTabHistory") && appText.includes("orderedGroupAt") && appText.includes("orderedTabAt") && appText.includes("getConfiguredGroups()") && appText.includes("getVisibleTabs(state.group)") && appText.includes("var SWIPE_X = 28") && appText.includes("var SWIPE_Y = 36") && appText.includes("addEventListener(\"pointermove\"") && appText.includes("gesture-active") && appText.includes("gestureClickGuard") && appText.includes('e.target.closest("input, select, textarea, a, [contenteditable=\'true\']")') && appText.includes("pointerdown") && appText.includes("pointerup") && !appText.includes("history-nav-row") && !appText.includes("每日选号下单顺序"), "总览页必须把每日操作放在第一，再显示标语、公式验证、数据参考、生肖与辅助，并删除旧每日顺序卡；排序翻页卡隐藏，按钮密集页面也需支持整屏即时手势");
must(appText.includes("function wmPositionForPlan") && appText.includes("正式执行仓位 ") && appText.includes("今年测试仓位 ") && appText.includes("等待重开") && appText.includes("空仓等待"), "窗口倍投测试必须按每条线路自己的窗口规律标注正式执行仓位和今年测试仓位");
must(appText.includes("function wmYearStats") && appText.includes("14线逐年测试对比") && appText.includes("年度稳健最优") && appText.includes("全周期收益最高") && appText.includes("正收益年") && appText.includes("最近3年"), "窗口倍投测试必须逐年对比14条线路，并区分年度稳健最优和全周期收益最高");
must(appText.includes("var orderedLines = EXEC_LINES.slice();") && appText.includes("wm-formula-panel") && appText.includes("wm-formula-row") && appText.includes("orderedLines.forEach") && appText.includes("正式执行仓位") && appText.includes("wmPositionForPlan(item, item.plan)"), "窗口倍投测试必须按固定线路顺序合并显示公式和正式仓位，不得再拆成大量单独卡片");
must(appText.includes("function wmYearBest") && appText.includes("年最优规律排名") && appText.includes("今年最优") && appText.includes("今年测试仓位") && appText.includes("全周期验证") && appText.includes("14线规律中心"), "14线规律中心必须单独标注今年最优规律和测试仓位");
must(appText.includes("function modelPairStrip") && appText.includes("model-pair-grid") && appText.includes("model-pair-card--d1") && appText.includes("model-pair-card--d2") && appText.includes("D1 第一推荐") && appText.includes("D2 第二推荐") && appText.includes("modelPairStrip(latest + 1)") && appText.includes("view.innerHTML.indexOf('class=\"model-pair-grid\"') < 0"), "所有页面必须且只能用一组独立盒子显示下一期D1和D2推荐号码");
must(appText.includes("function renderBetExec") && appText.includes("今日规划 · 第") && appText.includes("按固定线路顺序排列") && appText.includes("今日合计（元）") && appText.includes("本窗最大风险（元）") && appText.includes("今日不下注（条）"), "下注执行表顶部必须是今日规划：今天要下的每一注按固定线路顺序排列，并汇总今日合计、本窗最大风险、今日不下注条数");
must(appText.includes("function wmPositionForPlan") && appText.includes("正式执行公式") && appText.includes("正式执行仓位") && appText.includes("今年测试仓位") && appText.includes("wmPositionForPlan(item, item.plan)") && appText.includes("wmPositionForPlan(line, line.plan)"), "执行提示、资金调度、窗口倍投测试必须统一以公式表line.plan作为正式执行仓位口径");
must(appText.includes("function execCurrentTail") && appText.includes("追号码 D1") && appText.includes("追推荐 D2") && appText.includes("D1 第一推荐") && appText.includes("D2 第二推荐") && !appText.includes("execSourceText") && !appText.includes("itemSourceText"), "当下窗口D1/D2仓位必须显示对应尾号，但卡片内不得重复拼接D1/D2来源标签");
must(appText.includes("MODEL.bounceCritical ") && !appText.includes("BOUNCE["), "页面运行不得引用未定义的BOUNCE变量，性格阈值必须读取MODEL.bounceCritical");
must(appText.includes("对错滚动记录 · 新→旧 · 已结算") && appText.includes("exec-line__scroll") && appText.includes("当前窗口 · 起始 第") && appText.includes("首次命中分布") && appText.includes("公式（元）") && appText.includes("锁定尾") && appText.includes("本方案不打") && !appText.includes("exec-window-card--current"), "下注执行表必须保留逐线当前窗口第1/2/3期明细、对错滚动记录、首次命中分布和公式金额；被删页面的旧卡片结构不得残留");
const cssText = read("styles.css");
must(appText.includes("function betChainHTML") && appText.includes("betChainHTML(line, maxStage, live, refRows[line.id]") && appText.includes("① 线方向") && appText.includes("② 窗口选号") && appText.includes("③ 第几期定轻重") && appText.includes("首次命中分布：第1期") && cssText.includes(".bet-chain__step--dir") && cssText.includes(".bet-chain__step--pick") && cssText.includes(".bet-chain__step--stake"), "节奏链条（① 线方向性格 → ② 窗口选号 → ③ 第几期定轻重）只保留下注执行表一页，禁止再拆回多页");
must(appText.includes("position-card-grid") && appText.includes("position-card--execution") && cssText.includes(".position-card-grid") && cssText.includes("height: 104px"), "当前仓位卡片必须统一网格列宽和固定高度，防止格子大小不一");
must(appText.includes("wm-line-selector") && cssText.includes(".wm-line-selector") && cssText.includes("repeat(7, minmax(0, 1fr))") && cssText.includes("repeat(5, minmax(0, 1fr))") && cssText.includes("repeat(4, minmax(0, 1fr))") && cssText.includes("repeat(3, minmax(0, 1fr))"), "窗口倍投测试14线按钮必须使用7/5/4/3列响应式网格，不能固定两列");
must(appText.includes("background:#2563eb;color:#fff;border-color:#1d4ed8") && appText.includes("box-shadow:0 0 0 2px #bfdbfe"), "窗口倍投测试14线按钮选中态必须使用蓝色高亮，禁止黑色底");
must(appText.includes("windowMultView") && appText.includes("function stepWindowMultView") && appText.includes("wm-view-tabs") && appText.includes("data-wm-view") && appText.includes("wm-view-group") && appText.includes('data-wm-group="overview"') && appText.includes('data-wm-group="formula"') && appText.includes('data-wm-group="years"') && appText.includes('data-wm-group="windows"') && cssText.includes(".wm-view-tabs") && cssText.includes(".wm-view-tab.is-active") && cssText.includes("overflow-x: auto"), "窗口倍投测试必须拆成总览、公式与仓位、年度测试、窗口明细四个三级子页面，并支持左右滑动在子页面之间切换");
must(appText.includes("wm-hscroll") && cssText.includes(".wm-hscroll") && cssText.includes("::-webkit-scrollbar-thumb") && appText.includes("function wmWindowCard") && appText.includes("每个窗口的第1/2/3期分别在哪一期") && appText.includes("data-wm-detail-more") && appText.includes("windowMultDetailYears") && !appText.includes("min-width:980px"), "窗口明细必须做成横向滚动卡片条并按年份分批显示，每张卡片标清第1/2/3期对应期号、尾号和中错，不得再用超长竖排表格");
must(appText.includes("每年第一期重新开窗") && appText.includes("var curYear = 0") && appText.includes('class="wm-year"') && appText.includes("windowMultDetailYears"), "窗口倍投测试的窗口必须每年从第1期重新开窗，窗口明细按年展示并显示年度分隔");
must(appText.includes("连续命中规律") && appText.includes("hitRunCounts") && appText.includes("连续2窗及以上命中记录") && appText.includes("maxHitStreak"), "窗口明细必须同时给出连错规律和连中规律（含连续命中记录）");
must(appText.includes("wm-line-btn__rate") && appText.includes("窗口命中 "), "窗口倍投测试14线按钮必须显示各线的窗口命中率");
must(appText.includes("整条统一按时间倒序") && !appText.includes("但每一年内部从该年第1期往后排"), "窗口明细滚动条必须整条按时间倒序，最新在左，禁止中途反转");
must(appText.includes("panel wm-card") && cssText.includes(".wm-card") && appText.includes("核心结论") && appText.includes("wm-subhead") && cssText.includes(".wm-subhead"), "窗口倍投测试必须把每个三级子页面合并成一个卡片并集中核心结论，去掉重复信息");
must(appText.indexOf('["overview", "总览"]') >= 0 && appText.indexOf('["windows", "窗口明细"]') >= 0 && appText.indexOf('["overview", "总览"]') < appText.indexOf('["windows", "窗口明细"]') && appText.indexOf('["windows", "窗口明细"]') < appText.indexOf('["formula", "公式与仓位"]') && appText.indexOf('["formula", "公式与仓位"]') < appText.indexOf('["years", "年度测试"]'), "窗口倍投测试三级子页面顺序必须是 总览 → 窗口明细 → 公式与仓位 → 年度测试");
must(appText.indexOf('["windows", "窗口明细"]') < appText.indexOf('["personality", "14线性格"]') && appText.indexOf('["personality", "14线性格"]') < appText.indexOf('["formula", "公式与仓位"]'), "14线规律中心三级子页面顺序必须是 总览 → 窗口明细 → 14线性格 → 公式与仓位 → 年度测试");
must(appText.includes('data-wm-group="personality"') && appText.includes("14线性格规律") && appText.includes("wm-nat-card") && cssText.includes(".wm-nat-card") && appText.includes("可重投") && appText.includes("轻仓") && appText.includes("只认公式表 line.plan"), "14线规律中心必须新增“14线性格”子页面：逐线给出窗口性格（第1/2/3期中分布、命中/全错/连错）和当下参考建议（可重投/标准/轻仓/不下），并标明金额只认公式表");
must(appText.includes("下一窗命中率（按上一窗状态）") && appText.includes("上窗全错1次") && appText.includes("连错2次后") && appText.includes("连错3次以上后") && appText.includes("当下前窗状态") && appText.includes("本窗建议") && appText.includes("连错反弹型") && appText.includes("连错走弱型"), "14线性格必须按窗口判定（上一窗状态→下一窗命中率），不得按期数判定");
must(appText.includes("回本倍投") && appText.includes("上一窗全错亏 ") && appText.includes("该线平均每窗 +") && appText.includes("整体建议 ×") && appText.includes("封顶5倍"), "14线性格必须给出窗口级回本倍投建议：上一窗全错后，用（上窗亏损+100）÷该线平均每窗收益算本窗倍数并封顶");
must(appText.includes("规律结论：") && appText.includes("连错之后反而更容易命中") && appText.includes("连错之后命中率逐级下降") && appText.includes("很少连错，按公式稳定执行"), "14线性格必须按窗口写清每条线的规律结论（反弹/走弱/稳），不能只给标签");
must(appText.includes("function threeRowsHTML") && appText.includes("滚动条统一记录口径") && appText.includes("threeRowsHTML(batch, isRecommendMode") && appText.includes("待定") && ((appText.match(/threeRowsHTML\(/g) || []).length >= 3), "全站对错滚动条必须统一用 threeRowsHTML（定义 + 至少两处使用：三期内对错滚动条、三期内滚动记录）把每个窗口的第1/2/3期分别列出（期号+尾号+中/错/待开奖，未来期写待定）——用户长期习惯");
must(appText.includes("多跑一期：最后一期之后那一期（待开奖）也要把新窗口开出来") && appText.includes("while (p <= D.length + 1)"), "14线规律中心的窗口引擎必须在最后一期之后把待开奖的新窗口开出来（该开窗就要开），不允许上一窗命中后显示空仓等待");
must(appText.includes("当前倍率逐年统计") && appText.includes("yearlyStage") && appText.includes("第1/2/3期中 ") && appText.includes("命中率 ") && appText.includes("全错率 "), "总览的当前倍率统计必须按年拆分，逐年显示窗口数、命中率、全错率、第1/2/3期中与净收益");
must(appText.includes("function stepWindowMultLine") && appText.includes('closest(".wm-line-selector")') && appText.includes("lineStrip") && appText.includes("onLineStrip"), "窗口倍投测试14线按钮上必须能左右滑动切换上一条/下一条线路（两端循环），并且不得因此误触返回目录");
must(cssText.includes("position: sticky") && cssText.includes("grid-template-columns: repeat(5") && cssText.includes("min-height: 42px"), "导航为粘性五项分段布局且触控高度合格");
must(appText.includes("执行规则") && appText.includes("双流三期内命中结构") && !appText.includes("固定方案对照") && !appText.includes("本页子模型状态") && appText.includes("仅建议，不代替执行") && appText.includes("窗口照常记录") && appText.includes("两个原始号源") && appText.includes("不再二次筛选") && !appText.includes("仅观察候选"), "追三期使用两个原始号源且不二次筛选");
must(appText.includes("function activeSnapshotWindow") && appText.includes("当前窗口第") && appText.includes("锁定号不换") && appText.includes("下一期检查"), "追号码顶部必须显示当前锁定窗口且状态指向下一检查期");
must(appText.includes("result: \"pending\"") && appText.includes("snapshot+live") && appText.includes("pendingBatch.attempts.push(liveAttempt)"), "追推荐必须保留未满三期的最新窗口并续接当前期");
must(appText.includes("buildThreePeriodCorrectScrollHTML") && appText.includes("三期内对错滚动条") && appText.includes("第\" + batch.hitIndex + \"期中") && appText.includes("三期全错"), "追号码和追推荐必须分别显示三期内对错滚动条");
must(appText.includes("batch.status !== \"miss\" && batch.hitIndex >= 1 && batch.hitIndex <= 3"), "对错滚动条必须把 hitIndex=0 视为三期全错");
must(appText.includes("threeCorrectScroll") && appText.includes("[\"D1\", \"D2\"].forEach(function (key)") && appText.includes("overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px"), "对错滚动条 D1/D2 必须上下可见且各自独立滚动");
must(appText.includes("buildRealtimeSnapshotRateHTML") && appText.includes("真实快照命中率 · 实时记录") && appText.includes("threePeriodRealtimeSnapshotRows") && appText.includes("firstSnapshotRows") && appText.includes("secondSnapshotRows") && appText.includes("第一推荐 D1") && appText.includes("第二推荐 D2"), "双号追热、追号码、追推荐必须分开显示 D1/D2 实时真实快照命中率");
must(appText.includes("真实快照命中率按") && appText.includes("APP_SNAPSHOTS.detail") && appText.includes("每一期真实快照独立统计") && !appText.includes("只统计真实快照已结算窗口"), "真实快照命中率必须按每一期结算（开奖后立即入账），禁止等三期窗口结束后才更新");
must(!appText.includes("D1+D2 合计") && !appText.includes("双号合计 · 至少中一"), "实时命中率只保留 D1/D2 独立记录，不做合计");
must(!appText.includes("至少中一") && !appText.includes("至少中1"), "禁止再出现「每期两号至少中一」口径：唯一认可的是「三期窗口命中」（窗口=短期策略单元）");
must(appText.includes("if (waiting) {") && appText.includes("waiting = null") && appText.includes("等待重开") && appText.includes("等尾") && appText.includes("重新开出"),
  "窗口引擎必须保持「三期全错 → 等该号重新开出 → 才开新窗」（用户规则，已验证：比立刻重开少亏67%、回撤小15%）");
must(!appText.includes('id: "orderfollow"') && !appText.includes("下单追投"), "不存在已废弃的下单追投入口");

const tabsBlock = (appText.match(/var TABS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
const tabIds = [...tabsBlock.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const missingTabs = tabIds.filter((id) => !appText.includes('state.tab === "' + id + '"') && !appText.includes("renderUltimateMode"));
must(tabIds.length > 0 && missingTabs.length === 0, "所有导航页面都有渲染入口");
const modelFlow = ["pick3", "chasenumber", "betexec", "formulas", "windowmult", "orderlog"];
const flowPositions = modelFlow.map((id) => tabIds.indexOf(id));
must(flowPositions.every((pos, i) => pos >= 0 && (i === 0 || pos > flowPositions[i - 1])), "导航按模型流程排序");
must(!appText.includes('{ id: "orderhint", label: "执行提示" }') && !appText.includes('{ id: "funds", label: "资金调度" }') && appText.includes('if (state.tab === "orderhint" || state.tab === "funds")') && appText.includes('state.tab = "betexec"'), "执行提示与资金调度必须已从导航撤掉（内容并入下注执行表），老入口一律重定向到下注执行表");

const workflowText = read("SUPERVISOR_WORKFLOW.md");
must(workflowText.includes("五道闸门") && workflowText.includes("不得事后补造快照") && workflowText.includes("资金调度只做倍率"), "权威工作流必须包含数据真实性五道闸门和资金调度只做倍率规则");
must(workflowText.includes("停止模型探索") && workflowText.includes("未来模型训练门槛") && workflowText.includes("只准用真实快照当训练集") && workflowText.includes("≥ 400 期") && workflowText.includes("55.56%") && workflowText.includes("锁定段在模型定稿前") && workflowText.includes("262 期起"), "权威工作流必须锁定：停止模型探索、只用真实快照训练、单线样本≥400期、时间切分锁定段、打平线55.56%");
must(appText.includes("function betRegimeFor") && appText.includes("var ps = betPersonalitySeries(line, maxStage);") && appText.includes("var states = ps.states;") && !appText.includes("function rollOf(nets)") && appText.includes("只看窗口对错，不看金额") && appText.includes("连中第") && appText.includes("连错第") && workflowText.includes("「性格」只看窗口对错") && workflowText.includes("盈亏只是模拟账"), "性格必须只按窗口对错算（连中N/连错N，不看金额），与逐窗标记/参考表同源；盈亏只能作模拟账并写明，禁止当成用户真账");
must(appText.includes("exec-seq__cell") && appText.includes("窗口对错序列 · 当年 · 旧→新") && appText.includes("连中段") && appText.includes("连错段") && appText.includes("连中几个窗口会断开") && appText.includes("错的时候连错几个窗口") && appText.includes("长度出现频率") && appText.includes("年 1 次") && appText.includes("看危险不要只看最长") && cssText.includes(".exec-seq__cell.is-hit") && cssText.includes(".exec-seq__cell.is-miss"), "下注执行表必须逐线给出窗口对错序列（中/错方块条，标期号）和连中/连错段长分布，且段长必须带出现频率（多少年一次），禁止只看最长就判危险");
must(workflowText.includes("执行提示、资金调度已彻底删除") && !appText.includes("function renderOrderHint") && !appText.includes("function renderFunds"), "权威工作流必须写明执行提示/资金调度已彻底删除（连代码一起删），且 app.js 不得残留");
must(workflowText.includes("第 6 步：执行端结束（不做审计）") && workflowText.includes("执行端不得汇报或生成模型命中率"), "权威工作流必须禁止执行端运行审计、汇报审计结论或生成最终签收意见");
must(!/mock|demo|sampleData|假数据|模拟数据/i.test(appText), "所有页面都不得内置伪造、演示或模拟数据");

const versions = [...indexText.matchAll(/(?:styles\.css|data\.js|model_core\.js|model_selector\.js|ultimate_model\.js|snapshots\.js|app\.js)\?v=([\w.-]+)/g)].map((m) => m[1]);
must(versions.length === 7 && new Set(versions).size === 1, "7处资源版本一致");

console.log("");
console.log("PAGE AUDIT SUMMARY: latest=" + latest + ", pending=" + (pending[0] && pending[0].target) + ", cache=" + (versions[0] || "-") + ", selector=" + selector.decision.action);
if (errors.length) {
  console.log("PAGE AUDIT FAILED: " + errors.length + " issue(s)");
  process.exit(1);
}
console.log("PAGE AUDIT PASSED");
