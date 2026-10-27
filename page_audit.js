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
const probabilitySnapshots = json("probability_snapshots.json");
const probabilitySnapshotJs = JSON.parse(read("probability_snapshots.js").match(/window\.APP_PROBABILITY_SNAPSHOTS\s*=\s*(\{.*\});/s)[1]);
const indexText = read("index.html");
const appText = read("app.js");
const stylesText = read("styles.css");
must(appText.includes('var WINDOW_RECORD_FORMAT') && appText.includes('class="record-format"') && appText.includes('horizontalGestureInfoAt') && !appText.includes('function isInsideHorizontalScroll') && stylesText.includes('统一横向记录') && stylesText.includes('.prob-test-strip::-webkit-scrollbar') && stylesText.includes('.exec-seq::-webkit-scrollbar') && !stylesText.includes('html.gesture-active *'), "所有窗口记录必须统一滚动样式、统一格式说明，并用单次遍历处理滑动手势");
must(!/touch-action:\s*pan-x\s*;/.test(stylesText) && (stylesText.match(/touch-action:\s*pan-x pan-y/g) || []).length >= 6, "所有横向滚动区必须同时允许纵向页面滚动");
must(appText.includes("horizontalWheelTargetAt") && appText.includes('addEventListener("wheel"') && appText.includes("verticalWheelScrollsPage"), "横向滚动区内的纵向滚轮必须滚动整个页面");
must(appText.includes("if (historyPointerStart.inHorizontalScroll && !historyPointerStart.edgeSwipe) return;") && appText.includes("if (gesture.inHorizontalScroll && !gesture.edgeSwipe) return null;") && !appText.includes("canScrollDir"), "横向滚动区中间只滚动内容，屏幕边缘起手才能翻页");
must(!appText.includes("pageSwipeEligible") && !appText.includes("navSwipeEdge") && !appText.includes("horizontalSwipeEdge") && appText.includes("horizontalScrollEdgeAt(e.clientX)"), "全页面正文必须使用整屏翻页手势，只有横向滚动区中间需要保护");
must(stylesText.includes('body[data-page="windowmult"] .wm-view-tabs') && stylesText.includes("grid-template-columns: repeat(3, minmax(0, 1fr))") && stylesText.includes("overflow-x: hidden"), "13线规律中心三级页签必须固定换行，不得保留横向翻页");
must(appText.includes("var HORIZONTAL_EDGE_FLIP_ZONE = 56") && appText.includes("function horizontalScrollEdgeAt") && appText.includes("horizontalScrollEdgeAt(e.clientX)") && !appText.includes("LEFT_ONE_HAND_ZONE") && !appText.includes("RIGHT_ONE_HAND_ZONE") && !appText.includes("edgeFlipZoneAt"), "横向滚动条左右边缘必须使用对称的56px翻页感应区");
must(appText.includes("var SWIPE_X = 48") && appText.includes("var SWIPE_PRIMARY_X = 42") && appText.includes("var SWIPE_CANCEL_X = 38") && appText.includes("SWIPE_DIRECTION_RATIO = 1.45") && appText.includes('gesture.axis === "vertical"') && !appText.includes("WM_LINE_SWIPE_X"), "左右翻页必须使用48px阈值并锁定横向轴，纵向手势不得翻页");
must(appText.includes("wmLineBestCache") && appText.includes("function wmLineBestData") && appText.includes("segmentsPageCache") && appText.includes("function segmentsHTMLFor"), "13线和分段对比必须缓存重计算结果，避免左右切换卡顿");
must(appText.includes("intent: null") && appText.includes("function finishHistoryGesture") && appText.includes("gesture.intent || gestureIntentAt") && appText.includes("historyPointerStart.intent = { type: \"page\""), "重页面翻页必须在手指抬起或系统取消后执行，滑动过程中不得整页重渲染");
must(appText.includes("gestureCommitTimer = setTimeout(function () {") && appText.includes("function scheduleGestureIntent") && appText.includes("function commitGestureIntent") && appText.includes("function finishHistoryGesture") && appText.includes("finishHistoryGesture(e.clientX, e.clientY, true)"), "触摸系统取消指针流时必须完成一次翻页，缺少抬起事件时仍需兜底");
must(appText.includes('directory-card[data-directory-group]') && appText.includes('data-directory-tab') && appText.includes('directoryGroup') && appText.includes('v2_directory_group') && appText.includes('startDirectoryGroupSort') && !appText.includes('groupHtml += groups.map'), "目录必须分级：主目录选一级类目、类目目录选二级页面，顶部不得重复铺一级滚动导航");
must(appText.includes('{ id: "prob1"') && appText.includes('{ id: "prob2"') && appText.includes('{ id: "prob3"') && /function renderWindowMiss\(mode\)[\s\S]*EXEC_LINES\.map/.test(appText), "两期和三期窗口遗漏热图都必须包含A1/A2/A3三条线并共用窗口口径");

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
must(appText.includes("function nudgeNavItem") && appText.includes("renderedTab") && appText.includes("data-directory-tab") && appText.includes("v2_directory_group") && appText.includes("window.scrollTo"), "导航保持横向位置、当前项可见且切页回顶");
must(appText.includes("var waiting = null") && appText.includes("waitingTails.indexOf(Number(waiting.tail))") && appText.includes("等待尾") && appText.includes("重新开出后再开新窗口") && appText.includes("等待重开"), "13线窗口引擎必须保持「三期全错→等该号重新开出→下一期才开新窗」，且页面必须写明等待的尾号");
must(!appText.includes("function renderFunds") && !appText.includes("function renderOrderHint") && !appText.includes("FUND_CAPITAL") && !appText.includes("本金锚定") && !appText.includes("本金占用率") && appText.includes("本窗剩余风险") && appText.includes("本期不下注（条）"), "执行提示与资金调度两页必须彻底删除（连代码一起删干净），本期金额/本窗剩余风险只保留下注执行表一处");
must(appText.includes("function renderFormulaTable") && appText.includes("EXEC_FORMULA_AUDIT") && appText.includes("不配仓") && appText.includes("训练 / 验证"), "公式表页必须展示13条线路的训练/验证系数、最终公式和配仓状态");
must(appText.includes("WM_BASE = 100") && appText.includes("wmPlanText") && appText.includes("每个号码的最优下注公式") && appText.includes("lineBest") && appText.includes("最优 ") && appText.includes("未通过"), "窗口倍投测试必须100元起，并为每条线路标注训练/验证同时为正的最优下注公式");
must(appText.includes("function renderOverview") && appText.includes("data-today-dashboard") && appText.includes("data-dashboard-pick") && appText.includes("data-dashboard-window-state") && appText.includes("data-dashboard-shortcut") && appText.includes("今日计划") && appText.includes("13线窗口状态") && appText.includes("常用入口") && appText.includes("PAGE_GUIDE_GROUPS") && appText.includes("PAGE_GUIDE_BY_NAME") && appText.includes("PAGE_GUIDE_DISPLAY_GROUPS") && appText.includes("PAGE_GUIDE_DISPLAY_GROUPS.forEach") && appText.includes("PAGE_LABEL_GUIDE") && appText.includes("PAGE_GUIDE_TAB_MAP") && appText.includes("function pageGuideHTML") && appText.includes("today-page-map") && appText.includes("data-overview-tab") && appText.includes("pageGuideHTML()") && appText.includes("function historyStackHTML") && appText.includes("function stepGroupHistory") && appText.includes("function stepTabHistory") && appText.includes("orderedGroupAt") && appText.includes("orderedTabAt") && appText.includes("getConfiguredGroups()") && appText.includes("var SWIPE_X = 48") && appText.includes("addEventListener(\"pointermove\"") && appText.includes("gesture-active") && appText.includes("gestureClickGuard") && appText.includes('e.target.closest("input, select, textarea, a, [contenteditable=\'true\']")') && appText.includes("pointerdown") && appText.includes("pointerup"), "今日驾驶舱必须集中展示候选、执行面、窗口状态和页面职责，并保留整屏即时手势");
must(appText.includes("var COMMON_SHORTCUTS") && appText.includes("function pageQuickAccessHTML") && appText.includes("data-page-quick-access") && appText.includes("data-quick-recent") && appText.includes("data-quick-common") && appText.includes('view.insertAdjacentHTML("beforeend", pageQuickAccessHTML())') && appText.includes('state.tab !== "overview"'), "除今日外的每个页面都必须复用最近访问和六个常用入口");
must(appText.includes("navDragState") && appText.includes("startNavDrag") && appText.includes("openNavSortDialog") && appText.includes("applyNavTabSort") && appText.includes("savePageGroupMap") && appText.includes("persistTabOrderFromDom") && appText.includes("persistGroupOrderFromDom") && appText.includes("data-sort-reset") && !appText.includes("data-sort=\"up\"") && !appText.includes("sort-btn") && appText.includes("TABLE_COL_ORDER_KEY") && appText.includes("tableDragState") && appText.includes("applySavedTableColumnOrders") && appText.includes("normalizedColumnOrder") && stylesText.includes(".nav-sort-dragging") && stylesText.includes(".nav-sort-dialog") && stylesText.includes(".table-cols-draggable") && stylesText.includes(".table-col-dragging"), "导航必须支持长按数字顺位、跨类目调整、拖动排序并本地保存；表头继续支持长按拖动排序，禁止上下箭头");
must(appText.includes("function wmPositionForPlan") && appText.includes("正式执行仓位 ") && appText.includes("今年测试仓位 ") && appText.includes("等待重开") && appText.includes("空仓等待"), "窗口倍投测试必须按每条线路自己的窗口规律标注正式执行仓位和今年测试仓位");
must(appText.includes("function wmYearStats") && appText.includes("13线逐年测试对比") && appText.includes("年度稳健最优") && appText.includes("全周期收益最高") && appText.includes("正收益年") && appText.includes("最近3年"), "窗口倍投测试必须逐年对比13条线路，并区分年度稳健最优和全周期收益最高");
must(appText.includes("var orderedLines = EXEC_LINES.slice();") && appText.includes("wm-formula-panel") && appText.includes("wm-formula-row") && appText.includes("orderedLines.forEach") && appText.includes("正式执行仓位") && appText.includes("wmPositionForPlan(item, item.plan)"), "窗口倍投测试必须按固定线路顺序合并显示公式和正式仓位，不得再拆成大量单独卡片");
must(appText.includes("function wmYearBest") && appText.includes("年最优规律排名") && appText.includes("今年最优") && appText.includes("今年测试仓位") && appText.includes("全周期验证") && appText.includes("13线规律中心"), "13线规律中心必须单独标注今年最优规律和测试仓位");
must(appText.includes("function modelPairStrip") && appText.includes("PROB_MODEL.analyze") && appText.includes("三期第1 · 正式") && appText.includes("锁定第1 · 296快照") && appText.includes("model-pair-card--p1") && appText.includes("model-pair-card--p2") && appText.includes("model-pair-card--p3") && appText.includes("前三名概率接近") && appText.includes("modelPairStrip(latest + 1)"), "所有页面顶部必须显示新方法三期前三名并保留296锁定快照");
must(appText.includes("function renderBetExec") && appText.includes("data-bet-exec-task") && appText.includes('data-bet-exec-task="today"') && appText.includes('data-bet-exec-task="windows"') && appText.includes('data-bet-exec-task="profit"') && appText.includes('data-bet-exec-task="research"') && appText.includes('data-bet-task-panel="today"') && appText.includes("今日规划 · 第") && appText.includes("自己的最优公式 line.plan") && appText.includes("本期计划金额") && appText.includes("本窗最大风险"), "下注执行表必须默认只显示今日规划，并把当前窗口、逐期盈亏和研究明细拆成独立任务页签");
must(appText.includes("function wmPositionForPlan") && appText.includes("正式执行公式") && appText.includes("正式执行仓位") && appText.includes("今年测试仓位") && appText.includes("wmPositionForPlan(item, item.plan)") && appText.includes("wmPositionForPlan(line, line.plan)"), "执行提示、资金调度、窗口倍投测试必须统一以公式表line.plan作为正式执行仓位口径");
must(!appText.includes('id: "fixedD1"') && !appText.includes('id: "fixedD2"') && !appText.includes('id: "recD1"') && !appText.includes('id: "recD2"'), "旧D1/D2四条推荐线必须从正式执行线路中移除");
must(appText.includes("MODEL.bounceCritical ") && !appText.includes("BOUNCE["), "页面运行不得引用未定义的BOUNCE变量，性格阈值必须读取MODEL.bounceCritical");
must(appText.includes("逐期下注金额与盈亏记录 · 每卡一个窗口") && appText.includes("exec-line__scroll") && appText.includes("当前窗口 · 起始 第") && appText.includes("首次命中分布") && appText.includes("本线公式（元）") && appText.includes("锁定尾") && appText.includes("本窗") && !appText.includes("exec-window-card--current"), "下注执行表必须保留逐线当前窗口第1/2/3期明细、逐期下注金额盈亏记录、首次命中分布和本线公式金额；被删页面的旧卡片结构不得残留");
const cssText = read("styles.css");
must(appText.includes("function betChainHTML") && appText.includes("betChainHTML(line, maxStage, live, refRows[line.id]") && appText.includes("① 线方向") && appText.includes("② 窗口选号") && appText.includes("③ 第几期定轻重") && appText.includes("首次命中分布：第1期") && cssText.includes(".bet-chain__step--dir") && cssText.includes(".bet-chain__step--pick") && cssText.includes(".bet-chain__step--stake"), "节奏链条（① 线方向性格 → ② 窗口选号 → ③ 第几期定轻重）只保留下注执行表一页，禁止再拆回多页");
must(appText.includes("position-card-grid") && appText.includes("position-card--execution") && cssText.includes(".position-card-grid") && cssText.includes("height: 104px"), "当前仓位卡片必须统一网格列宽和固定高度，防止格子大小不一");
must(appText.includes("wm-line-selector") && cssText.includes(".wm-line-selector") && cssText.includes("repeat(7, minmax(0, 1fr))") && cssText.includes("repeat(5, minmax(0, 1fr))") && cssText.includes("repeat(4, minmax(0, 1fr))") && cssText.includes("repeat(3, minmax(0, 1fr))"), "窗口倍投测试13线按钮必须使用7/5/4/3列响应式网格，不能固定两列");
must(appText.includes("background:#2563eb;color:#fff;border-color:#1d4ed8") && appText.includes("box-shadow:0 0 0 2px #bfdbfe"), "窗口倍投测试13线按钮选中态必须使用蓝色高亮，禁止黑色底");
must(appText.includes("windowMultView") && appText.includes("wm-view-tabs") && appText.includes("data-wm-view") && appText.includes("wm-view-group") && appText.includes('data-wm-group="overview"') && appText.includes('data-wm-group="formula"') && appText.includes('data-wm-group="years"') && appText.includes('data-wm-group="windows"') && cssText.includes(".wm-view-tabs") && cssText.includes(".wm-view-tab.is-active") && cssText.includes("overflow-x: auto"), "窗口倍投测试必须拆成多个三级子页面，三级页签点击切换");
must(appText.includes("wm-hscroll") && cssText.includes(".wm-hscroll") && cssText.includes("::-webkit-scrollbar-thumb") && appText.includes("function wmWindowCard") && appText.includes("WINDOW_RECORD_FORMAT") && appText.includes("record-format") && appText.includes("data-wm-detail-more") && appText.includes("windowMultDetailYears") && !appText.includes("min-width:980px"), "窗口明细必须做成横向滚动卡片条并按年份分批显示，每张卡片标清第1/2/3期对应期号、尾号和中错，不得再用超长竖排表格");
must(appText.includes("每年第一期重新开窗") && appText.includes("var curYear = 0") && appText.includes('class="wm-year"') && appText.includes("windowMultDetailYears"), "窗口倍投测试的窗口必须每年从第1期重新开窗，窗口明细按年展示并显示年度分隔");
must(appText.includes("连续命中规律") && appText.includes("hitRunCounts") && appText.includes("连续2窗及以上命中记录") && appText.includes("maxHitStreak"), "窗口明细必须同时给出连错规律和连中规律（含连续命中记录）");
must(appText.includes("wm-line-btn__rate") && appText.includes("窗口命中 "), "窗口倍投测试13线按钮必须显示各线的窗口命中率");
must(appText.includes("整条统一按时间倒序") && !appText.includes("但每一年内部从该年第1期往后排"), "窗口明细滚动条必须整条按时间倒序，最新在左，禁止中途反转");
must(appText.includes("panel wm-card") && cssText.includes(".wm-card") && appText.includes("核心结论") && appText.includes("wm-subhead") && cssText.includes(".wm-subhead"), "窗口倍投测试必须把每个三级子页面合并成一个卡片并集中核心结论，去掉重复信息");
must(appText.indexOf('["overview", "总览"]') >= 0 && appText.indexOf('["windows", "窗口明细"]') >= 0 && appText.indexOf('["overview", "总览"]') < appText.indexOf('["windows", "窗口明细"]') && appText.indexOf('["windows", "窗口明细"]') < appText.indexOf('["formula", "公式与仓位"]') && appText.indexOf('["formula", "公式与仓位"]') < appText.indexOf('["years", "年度测试"]'), "窗口倍投测试三级子页面顺序必须是 总览 → 窗口明细 → 公式与仓位 → 年度测试");
must(appText.indexOf('["windows", "窗口明细"]') < appText.indexOf('["personality", "13线性格"]') && appText.indexOf('["personality", "13线性格"]') < appText.indexOf('["formula", "公式与仓位"]'), "13线规律中心三级子页面顺序必须是 总览 → 窗口明细 → 13线性格 → 公式与仓位 → 年度测试");
must(appText.includes('data-wm-group="personality"') && appText.includes("13线性格规律") && appText.includes("wm-nat-card") && cssText.includes(".wm-nat-card") && appText.includes("可重投") && appText.includes("轻仓") && appText.includes("只认公式表 line.plan"), "13线规律中心必须新增“13线性格”子页面：逐线给出窗口性格（第1/2/3期中分布、命中/全错/连错）和当下参考建议（可重投/标准/轻仓/不下），并标明金额只认公式表");
must(appText.includes("下一窗命中率（按上一窗状态）") && appText.includes("上窗全错1次") && appText.includes("连错2次后") && appText.includes("连错3次以上后") && appText.includes("当下前窗状态") && appText.includes("本窗建议") && appText.includes("连错反弹型") && appText.includes("连错走弱型"), "13线性格必须按窗口判定（上一窗状态→下一窗命中率），不得按期数判定");
must(appText.includes("回本倍投") && appText.includes("上一窗全错亏 ") && appText.includes("该线平均每窗 +") && appText.includes("整体建议 ×") && appText.includes("封顶5倍"), "13线性格必须给出窗口级回本倍投建议：上一窗全错后，用（上窗亏损+100）÷该线平均每窗收益算本窗倍数并封顶");
must(appText.includes("规律结论：") && appText.includes("连错之后反而更容易命中") && appText.includes("连错之后命中率逐级下降") && appText.includes("很少连错，按公式稳定执行"), "13线性格必须按窗口写清每条线的规律结论（反弹/走弱/稳），不能只给标签");
must(appText.includes("function threeRowsHTML") && appText.includes("滚动条统一记录口径") && appText.includes("threeRowsHTML(batch, isRecommendMode") && appText.includes("待定") && ((appText.match(/threeRowsHTML\(/g) || []).length >= 2), "对错滚动条必须用 threeRowsHTML（定义+使用）把每个窗口的第1/2/3期分别列出（期号+尾号+中/错/待开奖，未来期写待定）——重复的三期内滚动记录已删，只保留这一条");
must(appText.includes("多跑一期：最后一期之后那一期（待开奖）也要把新窗口开出来") && appText.includes("while (p <= D.length + 1)"), "13线规律中心的窗口引擎必须在最后一期之后把待开奖的新窗口开出来（该开窗就要开），不允许上一窗命中后显示空仓等待");
must(appText.includes("当前倍率逐年统计") && appText.includes("yearlyStage") && appText.includes("第1/2/3期中 ") && appText.includes("命中率 ") && appText.includes("全错率 "), "总览的当前倍率统计必须按年拆分，逐年显示窗口数、命中率、全错率、第1/2/3期中与净收益");
must(!appText.includes("function stepWindowMultLine") && !appText.includes("lineStrip") && !appText.includes("WM_LINE_SWIPE_X") && !appText.includes("windowViewSwipe") && !appText.includes("type: \"window-view\"") && appText.includes('data-wm-line="') && appText.includes('data-wm-view="'), "13线规律中心的数字线路和三级页签都只能点击，不得横滑切换");
must(indexText.includes("data-top-nav") && !indexText.includes("data-top-context") && indexText.includes("data-top-tabs") && indexText.includes("topTabs") && !indexText.includes("data-top-group") && indexText.includes("data-nav-drawer") && indexText.includes("data-nav-handle") && indexText.includes("data-nav-hide") && indexText.includes("data-nav-edge") && indexText.includes("data-nav-search") && appText.includes('{ id: "all", label: "全部页面"') && appText.includes("function renderTopNavigation") && appText.includes("data-top-tab") && appText.includes("function bindTopNavLongPress") && appText.includes("openNavSortDialog") && appText.includes("hasMultipleGroups") && appText.includes("function initNavDrawer") && appText.includes("edgeGesture") && appText.includes("verticalMoved") && appText.includes("function setNavDrawer") && appText.includes("NAV_HANDLE_TOP_KEY") && appText.includes("NAV_HANDLE_HIDDEN_KEY") && appText.includes("NAV_RECENT_KEY") && appText.includes("function recentTabIds") && appText.includes('navHandleEl.addEventListener("contextmenu"') && stylesText.includes(".topnav") && stylesText.includes(".topnav__tabs") && stylesText.includes(".topnav__tab") && stylesText.includes(".nav-drawer .nav-subtabs") && stylesText.includes("flex-direction: column") && stylesText.includes(".nav-handle") && stylesText.includes(".nav-edge-trigger::before") && stylesText.includes("body.nav-handle-hidden") && stylesText.includes("min-height: 44px"), "顶部必须是一条可排序的全部页面表头，抽屉内页面必须从上到下排列，并支持轻触、拖动、隐藏、可移动边缘拉手、搜索、最近访问和选页自动收起");
must(/body\s*\{\s*font-size:\s*14px;/.test(stylesText) && /button\s*\{\s*min-height:\s*44px;/.test(stylesText) && stylesText.includes(".task-tabs") && stylesText.includes(".task-tab") && stylesText.includes(".daily-report-accordion"), "正文、任务页签、折叠报告和主要按钮必须统一字号与44px触控标准");
must(appText.includes("执行规则") && appText.includes("双流三期内命中结构") && !appText.includes("固定方案对照") && !appText.includes("本页子模型状态") && appText.includes("仅建议，不代替执行") && appText.includes("窗口照常记录") && appText.includes("两个原始号源") && appText.includes("不再二次筛选") && !appText.includes("仅观察候选"), "追三期使用两个原始号源且不二次筛选");
must(appText.includes("function activeSnapshotWindow") && appText.includes("当前窗口第") && appText.includes("锁定号不换") && appText.includes("待开奖") && appText.includes("source-window-card") && appText.includes("data-window-start") && appText.includes("data-window-tail") && appText.includes("起始第"), "追号码顶部必须显示当前锁定窗口、起始期和当前尾号，且窗口内逐期状态（待开奖/中/错）可见");
must(appText.includes("result: \"pending\"") && appText.includes("snapshot+live") && appText.includes("pendingBatch.attempts.push(liveAttempt)"), "追推荐必须保留未满三期的最新窗口并续接当前期");
must(appText.includes("buildThreePeriodCorrectScrollHTML") && appText.includes("三期内对错滚动条") && appText.includes("第\" + batch.hitIndex + \"期中") && appText.includes("三期全错"), "追号码和追推荐必须分别显示三期内对错滚动条");
must(appText.includes("batch.status !== \"miss\" && batch.hitIndex >= 1 && batch.hitIndex <= 3"), "对错滚动条必须把 hitIndex=0 视为三期全错");
must(appText.includes("threeCorrectScroll") && appText.includes("[\"D1\", \"D2\"].forEach(function (key)") && appText.includes("record-scroll") && appText.includes("WINDOW_RECORD_FORMAT"), "对错滚动条 D1/D2 必须上下可见且各自独立滚动");
must(appText.includes("单期快照诊断按") && appText.includes("APP_SNAPSHOTS.detail") && appText.includes("只用于确认快照持续更新") && appText.includes("正式战略仍按三期窗口是否命中结算") && !appText.includes("只统计真实快照已结算窗口"), "单期快照必须逐期实时更新以检查数据链路，但不能冒充正式战略成绩");
must(!appText.includes("D1+D2 合计") && !appText.includes("双号合计 · 至少中一"), "实时命中率只保留 D1/D2 独立记录，不做合计");
must(!appText.includes("至少中一") && !appText.includes("至少中1"), "禁止再出现「每期两号至少中一」口径：唯一认可的是「三期窗口命中」（窗口=短期策略单元）");
must(appText.includes("if (waiting) {") && appText.includes("waiting = null") && appText.includes("等待重开") && appText.includes("等尾") && appText.includes("重新开出"),
  "窗口引擎必须保持「三期全错 → 等该号重新开出 → 才开新窗」（用户规则，已验证：比立刻重开少亏67%、回撤小15%）");
must(!appText.includes('id: "orderfollow"') && !appText.includes("下单追投"), "不存在已废弃的下单追投入口");

const tabsBlock = (appText.match(/var TABS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
const tabIds = [...tabsBlock.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const missingTabs = tabIds.filter((id) => !appText.includes('state.tab === "' + id + '"') && !appText.includes("renderUltimateMode"));
must(tabIds.length > 0 && missingTabs.length === 0, "所有导航页面都有渲染入口");
must(appText.includes("exec-hist-card--live") && appText.includes("每个页面的窗口都必须能看到现在走到哪一步") && appText.includes("进行中 · 第") && appText.includes("等待中 · 等尾") && appText.includes("本期不下注"), "下注执行表的对错滚动记录第1张必须是当前窗口状态（进行中第N期 / 等待中等尾X已等N期），和窗口遗漏热图底行一个口径");
must(appText.includes("function renderProbabilityModel") && appText.includes("动态概率模型") && appText.includes("三期优先预测") && appText.includes("PROB_MODEL.META") && appText.includes("生产状态 · 用户已切换新方法") && !appText.includes('id: "fixedD1"') && !appText.includes('id: "recD1"'), "旧D1/D2必须退出正式推荐，由5/7/15/21/30新方法替代");
must(appText.includes("function renderProbabilityModel") && appText.includes("function renderPersonality") && appText.includes("data-model-detail-task") && appText.includes('data-model-detail-panel="overview"') && appText.includes('data-model-detail-panel="history"') && appText.includes('data-model-detail-panel="snapshot"') && appText.includes("v2_prob_view") && appText.includes("v2_personality_view"), "动态概率和尾号性格必须把当前视图、历史记录和明细快照拆成同页任务页签");
must(appText.includes("function renderWindowMiss") && appText.includes("function renderWindowMiss2") && appText.includes("windowMiss2Year") && appText.includes('{ id: "windowmiss", label: "三期热图" }') && appText.includes('{ id: "windowmiss2", label: "两期热图" }') && appText.includes('{ id: "trend", label: "一期热图" }') && appText.includes("wmWindowsForStage(line, maxStage)") && appText.includes("data-window-miss2-year") && appText.includes("data-window-miss-task") && appText.includes('data-window-miss-panel="heat"') && appText.includes('data-window-miss-panel="chain"') && !appText.includes("windowMissMode") && !appText.includes("data-wm-mode") && appText.includes("三期热图") && appText.includes("完全独立"), "两期和三期热图必须把热图与遗漏连中铁链拆成两个独立任务页签");
must(stylesText.includes('body[data-page="trend"] .task-tabs') && stylesText.includes('body[data-page="missorder"] .task-tabs') && stylesText.includes('body[data-page="windowmiss"] .task-tabs') && stylesText.includes('body[data-page="windowmiss2"] .task-tabs') && /body\[data-page="(?:trend|missorder|windowmiss|windowmiss2)"\] \.task-tabs\s*\{\s*position:\s*static;/.test(stylesText), "热图页任务按钮不得吸顶遮挡号码表头");
must(appText.includes('data-window-state="wait"') && appText.includes('data-window-rule-wait="true"') && appText.includes('data-window-state="live"') && !appText.includes("missReopenPendingOpen") && !appText.includes("lastEvent.pendingOpen = true") && !appText.includes("Number(stNow.active.start) > D.length") && appText.includes("if (isCurrentYear && stNow && stNow.waiting && rows.length)") && appText.includes(">进' + c.stage"), "两期和三期热图只能在尾号尚未重开时显示等待，尾号开出后下一期必须正常显示进");
must(appText.includes("function wmWindowRunData") && appText.includes("function wmRunHistoryHTML") && appText.includes("function wmRunGapText") && appText.includes("function wmRunLiveChipHTML") && appText.includes("data-wm-live-state") && appText.includes("html += liveChip") && appText.includes("wmRunHistoryHTML(maxStage, curYear)") && appText.includes("起点差") && appText.includes("中间隔") && appText.includes("window-gap-link--hit") && appText.includes("window-gap-link__start") && appText.includes("window-gap-link__between") && appText.includes("wmRunGapText(data.hit)") && appText.includes("wm-run-summary") && appText.includes('label + "1×"') && appText.includes('label + "4+×"') && appText.includes('isHit ? "连" : "漏"') && stylesText.includes('body[data-page="windowmiss"] .trend-run-chip--live') && stylesText.includes('body[data-page="windowmiss"] .window-gap-link--hit') && stylesText.includes('body[data-page="windowmiss"] .window-gap-link__start') && stylesText.includes('body[data-page="windowmiss"] .window-gap-link__between') && stylesText.includes('body[data-page="windowmiss"] .wm-run-summary__item span'), "窗口遗漏热图必须提供按年、按窗口单位的遗漏和连中铁链滚动记录，最左实时格显示进行中或等待重开，起点差与中间隔数字必须用不同突出颜色");
must(appText.includes("var jumpLatest") && appText.includes(".panel--wmheat tbody tr:last-child") && appText.includes('block: "end"') && !appText.includes("jumpBottom"), "一期/两期/三期热图打开时必须定位最新行，不得把整页跳到底部");
must(appText.includes("每年的窗口总数与命中率单独列出来") && appText.includes("共' + seq.length + '窗") && appText.includes("命中率' + (seq.length ? (hitN / seq.length * 100)"), "下注执行表每条线必须把窗口总数按年单独列出：每年写「共N窗 / 中X / 错Y / 命中率Z%」，不能只给全历史总数");
must(appText.includes('{ id: "notes", label: "我的笔记" }') && appText.includes("function renderNotes") && appText.includes("v2_my_notes") && appText.includes("data-note-add") && appText.includes("data-note-del") && appText.includes("data-note-clear") && appText.includes("只存在这台手机/浏览器里"), "必须提供「我的笔记」页：本地保存、随时可加可删，且不参与任何计算");
must(!appText.includes('{ id: "miss", label: "遗漏监控" }') && !appText.includes("function renderMiss()") && appText.includes('if (state.tab === "miss")') && appText.includes('state.tab = "trend"'), "「遗漏监控」页必须删除，老入口只能重定向到遗漏热图");
must(appText.includes("function fullTailRuns") && appText.includes("function fullRunHistoryHTML") && appText.includes("runs.slice().reverse().forEach") && appText.includes("新→旧") && appText.includes("打开自动停在最新") && appText.includes("strip.scrollLeft = 0") && appText.includes("row.y !== D[i - 1].y") && appText.includes("trend-run-card__years") && appText.includes("longestMiss") && appText.includes("longestHit") && appText.includes("每年独立") && (appText.match(/fullRunHistoryHTML\(\)/g) || []).length >= 2 && stylesText.includes('body[data-page="missorder"] .trend-run-strip') && stylesText.includes('body[data-page="trend"] .trend-run-strip'), "遗漏热图和遗漏排序都必须提供从第1期开始、按新→旧排列、自动停在最新、跨年断段且逐年显示最长遗漏/最长连出的全历史横向滚动记录");
must(appText.includes("function renderTrendImpl") && appText.includes("function renderMissOrderHeatmap") && appText.includes("data-flow-task") && appText.includes('data-flow-panel="heat"') && appText.includes('data-flow-panel="chain"') && appText.includes('data-flow-panel="chart"') && appText.includes("v2_trend_view") && appText.includes("v2_miss_order_view"), "一期热图和遗漏排序必须把热图、遗漏连出链和走势图拆成同页任务页签");
must(appText.includes("function wmFixedSourceWindows") && appText.includes("line.kind === \"fixed\"") && appText.includes("wmFixedSourceWindows(line)") && appText.includes("execPick(betLocalPeriod(period), stream)") && appText.includes("heat-cell__sub") && appText.includes("heat-cell__amount") && appText.includes("data-window-amount") && appText.includes("line.plan") && appText.includes("进' + c.stage") && read("model_supervisor.js").includes("function rebuildSourceWindows") && read("model_supervisor.js").includes("waitingTail") && read("model_supervisor.js").includes("reopened == null") && read("model_supervisor.js").includes("snapshots.sourceWindows = rebuilt"), "三期内追号码、下注执行表、13线规律中心和窗口遗漏热图必须共用同一条真实快照窗口，且三期全错后等待锁定尾重新开出再开窗；最新格必须上下显示期数、尾号和本期公式金额");
must(appText.includes("function yearChipsHTML") && appText.includes("missOrderYear") && appText.includes("windowMissYear") && appText.includes("windowMiss2Year") && appText.includes("data-miss-order-year") && appText.includes("data-window-miss-year") && appText.includes("data-window-miss2-year") && appText.includes("function buildMissInfoForRows") && appText.includes("missOrderTailsForRows") && appText.includes("每年独立"), "遗漏排序和两期/三期窗口遗漏热图必须提供独立年份切换，并且每一年各自独立计算、不得跨年混算");
const modelFlow = ["dailyreport", "pick3", "betexec", "formulas", "windowmult", "orderlog"];
const flowPositions = modelFlow.map((id) => tabIds.indexOf(id));
must(flowPositions.every((pos, i) => pos >= 0 && (i === 0 || pos > flowPositions[i - 1])), "导航按模型流程排序");
must(!appText.includes('{ id: "orderhint", label: "执行提示" }') && !appText.includes('{ id: "funds", label: "资金调度" }') && appText.includes('if (state.tab === "orderhint" || state.tab === "funds")') && appText.includes('state.tab = "betexec"'), "执行提示与资金调度必须已从导航撤掉（内容并入下注执行表），老入口一律重定向到下注执行表");

const workflowText = read("SUPERVISOR_WORKFLOW.md");
const executorWorkflowText = read("EXECUTOR_WORKFLOW.md");
const executorPromptText = read("AGENT_PROMPTS.md");
must(workflowText.includes("五道闸门") && workflowText.includes("不得事后补造快照") && workflowText.includes("资金调度只做倍率"), "权威工作流必须包含数据真实性五道闸门和资金调度只做倍率规则");
must(workflowText.includes("停止模型探索") && workflowText.includes("未来模型训练门槛") && workflowText.includes("只准用真实快照当训练集") && workflowText.includes("≥ 400 期") && workflowText.includes("55.56%") && workflowText.includes("锁定段在模型定稿前") && workflowText.includes("262 期起"), "权威工作流必须锁定：停止模型探索、只用真实快照训练、单线样本≥400期、时间切分锁定段、打平线55.56%");
must(appText.includes("function betRegimeFor") && appText.includes("var ps = betPersonalitySeries(line, maxStage);") && appText.includes("var states = ps.states;") && !appText.includes("function rollOf(nets)") && appText.includes("只看窗口对错，不看金额") && appText.includes("连中第") && appText.includes("连错第") && workflowText.includes("「性格」只看窗口对错") && workflowText.includes("盈亏只是模拟账"), "性格必须只按窗口对错算（连中N/连错N，不看金额），与逐窗标记/参考表同源；盈亏只能作模拟账并写明，禁止当成用户真账");
must(appText.includes("exec-seq__cell") && appText.includes("窗口对错序列 · ' + WINDOW_RECORD_FORMAT") && appText.includes("连中段") && appText.includes("连错段") && appText.includes("连中几个窗口会断开") && appText.includes("错的时候连错几个窗口") && appText.includes("长度出现频率") && appText.includes("年 1 次") && appText.includes("看危险不要只看最长") && cssText.includes(".exec-seq__cell.is-hit") && cssText.includes(".exec-seq__cell.is-miss"), "下注执行表必须逐线给出窗口对错序列（中/错方块条，标期号）和连中/连错段长分布，且段长必须带出现频率（多少年一次），禁止只看最长就判危险");
must(appText.includes("function betPlanFor") && appText.includes("function betWindowRow(w, maxStage, line)") && appText.includes("data-bet-plan-card") && appText.includes("data-bet-period-row") && appText.includes("data-bet-period-strip") && !appText.includes("cost += BET_STAKES[k]") && !appText.includes("var stake = stage <= maxStage ? BET_STAKES[stage - 1] : 0"), "下注执行表必须按各线line.plan计算金额，并在逐期记录卡中标注窗口第几期、下注金额和盈亏");
must(workflowText.includes("执行提示、资金调度已彻底删除") && !appText.includes("function renderOrderHint") && !appText.includes("function renderFunds"), "权威工作流必须写明执行提示/资金调度已彻底删除（连代码一起删），且 app.js 不得残留");
must(workflowText.includes("第 6 步：执行端结束（不做审计）") && workflowText.includes("执行端不得汇报或生成模型命中率"), "权威工作流必须禁止执行端运行审计、汇报审计结论或生成最终签收意见");
must(
  executorWorkflowText.includes("executor-v4-20261026") &&
  executorWorkflowText.includes("零审计边界") &&
  executorWorkflowText.includes("无新号码，不执行") &&
  executorWorkflowText.includes("只允许本文第1节的 `git pull --ff-only`、`git status` 预检、第3节的7个数据更新步骤") &&
  executorWorkflowText.includes("不得运行任何测试、审计、回测、健康检查或模型报告") &&
  executorWorkflowText.includes("禁止运行 `npm test`") &&
  executorWorkflowText.includes("npm run test:*") &&
  executorWorkflowText.includes("不得超过六行") &&
  executorWorkflowText.includes("禁止运行 `score_calibration.js`") &&
  executorPromptText.includes("财神爷小程序每日执行机器人（零审计版）") &&
  executorPromptText.includes("无新号码，不执行") &&
  executorPromptText.includes("除工作区预检的 git pull --ff-only、git status，以及 EXECUTOR_WORKFLOW.md 第3节的7个更新步骤外，不运行任何其他命令") &&
  executorPromptText.includes("每日完整审计由监督线程独立执行一次") &&
  executorPromptText.includes("不得超过六行") &&
  !["score_calibration.js", "ultimate_backtest.js", "selector_backtest.js", "page_audit.js", "check_app.py", "health_check.js", "_probability_model_check.js"].some((name) => (
    new RegExp("^(?:node|python) " + name.replace(/\./g, "\\."), "m").test(executorWorkflowText)
  )) &&
  !/^(?:npm (?:test|run test:)|node page_audit\.js|python check_app\.py)/m.test(executorWorkflowText),
  "执行端工作流必须为零审计版本，只能更新数据，不得重复运行测试、审计脚本或生成第二份报告"
);
must(!/mock|demo|sampleData|假数据|模拟数据/i.test(appText), "所有页面都不得内置伪造、演示或模拟数据");

must(appText.includes("生产状态 · 用户已切换新方法") && appText.includes("2025验证段") && appText.includes("2026影子段") && appText.includes("下一期Top1") && appText.includes("三期Top1") && appText.includes(".currentMiss") && appText.includes(".currentStreak") && appText.includes("function probabilityTestWindowHTML") && appText.includes("prob-test-strip") && appText.includes("测试窗口记录 · 全历史三期窗口") && appText.includes("2021-2026各年独立") && appText.includes("5/7/15/21/30") && appText.includes("研究提示：2025验证段仍弱于旧方法") && appText.includes("继续跟踪风险"), "动态概率页面必须显示新方法生产状态、验证风险、随机基准和真实遗漏/连出");
must(appText.includes("data-prob-live-window") && appText.includes("wmStageNow(liveLine, 3)") && appText.includes("当前窗口"), "动态概率三个排名必须显示共用窗口引擎的当前窗口和待开奖状态");
must(appText.includes("每期10尾完整排序快照") && appText.includes("probability_snapshots.json") && appText.includes("data-prob-snapshot-strip") && appText.includes("probabilitySnapshotCardHTML") && appText.includes("rows.length !== 10") && appText.includes("完整10尾排序"), "动态概率必须按每期真实快照横滑显示完整10尾排序，禁止折叠或遗漏");
must(appText.includes("probabilitySinglePeriodByRank") && appText.includes('PROB_MODEL.analyze(rawYear, period - 1, { method: "new" })') && appText.includes("单期对错") && appText.includes("data-prob-single-rank") && appText.includes("prob-single-period-chip"), "动态概率三个排名必须各自提供单期对错滚动记录");
must(JSON.stringify(probabilitySnapshotJs) === JSON.stringify(probabilitySnapshots), "概率快照 JS 必须与冻结的 JSON 完全一致");
must(Array.isArray(probabilitySnapshots.records) && probabilitySnapshots.records.every((record) => {
  const metric = record.rankingMetric === "window3Prob" ? "window3Prob" : "nextProb";
  return Array.isArray(record.allTails) && record.allTails.length === 10 && record.allTails.every((row, index, rows) => (
    index === 0 || Number(rows[index - 1][metric]) >= Number(row[metric])
  ));
}), "概率快照必须按当期声明的排序指标保存完整10尾排序");
must(appText.includes("function probabilitySnapshotRecord") && appText.includes("APP_PROBABILITY_SNAPSHOTS") && appText.includes("legacyLocked") && appText.includes("第294-296期真实快照保持原样"), "概率页面必须读取冻结快照并保留切换前的294-296期");
must(appText.includes("function probabilityPickAt") && appText.includes("var localPeriod = betLocalPeriod(period)") && appText.includes("probabilitySnapshotRecord(localPeriod)"), "概率历史窗口必须先把全年序号换算为当年期号，再读取真实快照");
const personalityData = JSON.parse(read("personality_model_data.js").match(/window\.APP_PERSONALITY_MODEL\s*=\s*(\{.*\});/s)[1]);
const personalitySnapshots = JSON.parse(read("personality_snapshots.js").match(/window\.APP_PERSONALITY_SNAPSHOTS\s*=\s*(\{.*\});/s)[1]);
must(personalityData.method === "per-line-dual-direction-risk-cascade-v6" && personalityData.overlappingWindows === true && personalityData.riskCascade === true && personalityData.bidirectionalRiskCascade === true && personalityData.uniformWeightsUsed === false && personalityData.oneTwoThreeWeightMix === false && personalityData.lookAheadUsed === false && personalityData.lines.length === 13 && personalityData.ranking.length === 13, "每日报告必须每期独立评估13条线的下一窗口概率，并使用1→2→3与3→2→1双向实时风险级联模型");
must(personalityData.lines.every((line) => line.longTerm.windows >= 400 && line.yearly.length >= 3 && line.validation.length === 2 && Number.isFinite(line.current.predictedRate) && Number.isFinite(line.current.edge)), "每条线必须含长期画像、分年记录、2025/2026走步验证和当前三期预测");
must(personalityData.lines.every((line) => ["one", "two", "three"].every((key) => Number.isFinite(line.current.submodels[key].predictedRate)) && line.current.riskLevels.length === 3 && Number.isFinite(line.current.directionPredictions.forward.predictedRate) && Number.isFinite(line.current.directionPredictions.reverse.predictedRate) && /^(safe|risk)-(safe|risk)-(safe|risk)\|(safe|risk)-(safe|risk)-(safe|risk)$/.test(line.current.riskPattern)), "每条线必须分别产出一期/两期/三期预测，并同时给出正向与反向实时风险级联状态");
must(personalityData.selectionValidation.length === 2 && personalityData.selectionValidation.every((item) => item.periods >= 200 && Number.isFinite(item.top2.rate) && Number.isFinite(item.top3.rate)), "逐线模型必须提供2025/2026每期前2、前3选线的走步验证");
must(personalitySnapshots.records.some((record) => record.version === personalityData.version && !record.superseded && Number(record.target) === latest + 1 && record.candidates.length === 13 && Array.isArray(record.lines) && record.lines.every((line) => Number.isFinite(line.predictedRate) && line.status === "pending" && line.riskPattern && line.cascadeDecision && line.forward && line.reverse)), "逐线长期性格模型必须保存13条线全部参与的双向风险排名快照，后续不得事后换线");
must(appText.includes("APP_PERSONALITY_MODEL") && appText.includes("data-report-personality-state") && appText.includes("data-personality-predicted") && appText.includes("data-report-section=\"personality\"") && !appText.includes("modePerformance[0] * 0.2 + modePerformance[1] * 0.3 + modePerformance[2] * 0.4"), "每日报告排名必须读取逐线长期性格预测，不得恢复统一20/30/40混合");
must(appText.includes("function dailyReportRankingHistoryHTML") && appText.includes("data-report-ranking-card") && appText.includes("data-ranking-target") && appText.includes("每期排名快照卡") && stylesText.includes(".daily-report-ranking-card") && stylesText.includes("flex: 0 0 286px"), "每日报告排名必须做成按期冻结的横向卡片，供逐期对比");
must(appText.includes('label: "A1"') && appText.includes('label: "A2"') && appText.includes('label: "A3"') && !appText.includes('label: "概率第1"') && !appText.includes('label: "概率第2"') && !appText.includes('label: "概率第3"'), "动态概率三条线必须统一命名为A1A2A3");
must(appText.includes('"双安全·高分"') && appText.includes('"双风险·低分"') && appText.includes('"方向分歧·中性"') && appText.includes('"混合·观察"') && !appText.includes('"长期偏强·观察"') && !appText.includes('"长期偏弱·观察"'), "每日报告建议标签必须明确显示双向级联结论，禁止模糊的长期偏强偏弱");
must(appText.includes('{ id: "dailyreport", label: "每日最终报告" }') && appText.includes("function renderDailyReport") && appText.includes("function dailyReportModeStats") && appText.includes("data-daily-report-row") && appText.includes("data-daily-report-rank-card") && appText.includes("data-daily-report-rank-item") && !appText.includes("daily-report-rank-table") && appText.includes("data-daily-report-card") && appText.includes("data-daily-report-accordion") && appText.includes("daily-report-line-summary") && appText.includes("data-report-mode") && appText.includes("一期 / 两期 / 三期热图分别分析后综合") && appText.includes("下一独立三期窗口预测排名") && appText.includes("每条线按自身一期 / 两期 / 三期性格独立预测新窗口命中概率") && appText.includes("data-weight-model") && appText.includes("5 / 7 / 15 / 21 / 30") && indexText.includes("probability_weight_research.js"), "每日最终报告必须保留一张排名卡，并把13份逐线报告默认折叠供按线展开");
must(appText.includes("function dailyReportPersonalityHTML") && appText.includes("function dailyReportModeComparisonHTML") && appText.includes("function dailyReportSignalSummary") && appText.includes("function dailyReportSourceAnalysisHTML") && appText.includes('data-report-section="personality"') && appText.includes('data-report-section="period-comparison"') && appText.includes('data-report-section="cross-page"') && appText.includes('data-report-section="conclusion"') && appText.includes('data-report-section="reason"') && appText.includes('data-report-section="window"') && appText.includes('data-report-section="recent"') && appText.includes('data-report-section="longterm"') && appText.includes('data-report-section="formula"') && appText.includes('data-report-section="risk"') && appText.includes("dailyReportPersonalityValidationText") && appText.includes("仓位和金额不参与评分") && appText.includes("data-report-advice") && appText.includes("data-report-reason"), "每日最终报告必须把逐线长期性格、一期/两期/三期诊断、公式、窗口、样本和走步验证分别写进每张滚动报告卡");
must((appText.match(/wmPeriodLabel\((?:row\.)?personality\.current\.target\)/g) || []).length >= 3 && !appText.includes('"第" + personality.current.target') && !appText.includes('"第" + row.personality.current.target'), "每日最终报告当前窗口必须显示当年真实期号，禁止显示全局第1465期");
must(stylesText.includes("flex: 0 0 286px") && stylesText.includes("max-width: calc(100vw - 84px)") && stylesText.includes("box-shadow: 0 6px 18px"), "13线综合报告必须使用手机可读的窄卡片并露出下一张卡");

const versions = [...indexText.matchAll(/(?:styles\.css|data\.js|model_core\.js|model_selector\.js|probability_weight_research\.js|model_probability\.js|personality_model_data\.js|personality_snapshots\.js|ultimate_model\.js|snapshots\.js|probability_snapshots\.js|app\.js)\?v=([\w.-]+)/g)].map((m) => m[1]);
must(versions.length === 12 && new Set(versions).size === 1, "12处资源版本一致");

console.log("");
console.log("PAGE AUDIT SUMMARY: latest=" + latest + ", pending=" + (pending[0] && pending[0].target) + ", cache=" + (versions[0] || "-") + ", selector=" + selector.decision.action);
if (errors.length) {
  console.log("PAGE AUDIT FAILED: " + errors.length + " issue(s)");
  process.exit(1);
}
console.log("PAGE AUDIT PASSED");
must(appText.includes("两期 / 三期 逐线对比") && appText.includes("betLineAccount(line, 2, 2026).net") && appText.includes("betLineAccount(line, 3, 2026).net") && appText.includes("两期−三期") && appText.includes("单窗最深亏按各线公式") && appText.includes("maxLossThree") && appText.includes("maxLossTwo") && appText.includes("只作参考") && appText.includes("正式战略固定三期"), "下注执行表必须给「两期/三期逐线对比」研究表，并按各线公式计算风险，明确正式战略固定三期、两期只作对照");
