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
const cssText = read("styles.css");
must(cssText.includes("position: sticky") && cssText.includes("grid-template-columns: repeat(5") && cssText.includes("min-height: 42px"), "导航为粘性五项分段布局且触控高度合格");
must(appText.includes("执行规则") && appText.includes("双流三期内命中结构") && !appText.includes("固定方案对照") && !appText.includes("本页子模型状态") && appText.includes("仅建议，不代替执行") && appText.includes("窗口照常记录") && appText.includes("两个原始号源") && appText.includes("不再二次筛选") && !appText.includes("仅观察候选"), "追三期使用两个原始号源且不二次筛选");
must(appText.includes("function activeSnapshotWindow") && appText.includes("当前窗口第") && appText.includes("锁定号不换") && appText.includes("下一期检查"), "追号码顶部必须显示当前锁定窗口且状态指向下一检查期");
must(appText.includes("result: \"pending\"") && appText.includes("snapshot+live") && appText.includes("pendingBatch.attempts.push(liveAttempt)"), "追推荐必须保留未满三期的最新窗口并续接当前期");
must(appText.includes("buildThreePeriodCorrectScrollHTML") && appText.includes("三期内对错滚动条") && appText.includes("第\" + batch.hitIndex + \"期中") && appText.includes("三期全错"), "追号码和追推荐必须分别显示三期内对错滚动条");
must(appText.includes("batch.status !== \"miss\" && batch.hitIndex >= 1 && batch.hitIndex <= 3"), "对错滚动条必须把 hitIndex=0 视为三期全错");
must(appText.includes("threeCorrectScroll") && appText.includes("[\"D1\", \"D2\"].forEach(function (key)") && appText.includes("overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px"), "对错滚动条 D1/D2 必须上下可见且各自独立滚动");
must(appText.includes("buildRealtimeSnapshotRateHTML") && appText.includes("真实快照命中率 · 实时记录") && appText.includes("threePeriodRealtimeSnapshotRows") && appText.includes("firstSnapshotRows") && appText.includes("secondSnapshotRows") && appText.includes("第一推荐 D1") && appText.includes("第二推荐 D2"), "双号追热、追号码、追推荐必须分开显示 D1/D2 实时真实快照命中率");
must(!appText.includes("D1+D2 合计") && !appText.includes("双号合计 · 至少中一"), "实时命中率只保留 D1/D2 独立记录，不做合计");
must(!appText.includes('id: "orderfollow"') && !appText.includes("下单追投"), "不存在已废弃的下单追投入口");

const tabsBlock = (appText.match(/var TABS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
const tabIds = [...tabsBlock.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const missingTabs = tabIds.filter((id) => !appText.includes('state.tab === "' + id + '"') && !appText.includes("renderUltimateMode"));
must(tabIds.length > 0 && missingTabs.length === 0, "所有导航页面都有渲染入口");
const modelFlow = ["pick3", "chasenumber", "chaserecommend", "orderlog"];
const flowPositions = modelFlow.map((id) => tabIds.indexOf(id));
must(flowPositions.every((pos, i) => pos >= 0 && (i === 0 || pos > flowPositions[i - 1])), "导航按模型流程排序");

const versions = [...indexText.matchAll(/(?:styles\.css|data\.js|model_core\.js|model_selector\.js|ultimate_model\.js|snapshots\.js|app\.js)\?v=([\w.-]+)/g)].map((m) => m[1]);
must(versions.length === 7 && new Set(versions).size === 1, "7处资源版本一致");

console.log("");
console.log("PAGE AUDIT SUMMARY: latest=" + latest + ", pending=" + (pending[0] && pending[0].target) + ", cache=" + (versions[0] || "-") + ", selector=" + selector.decision.action);
if (errors.length) {
  console.log("PAGE AUDIT FAILED: " + errors.length + " issue(s)");
  process.exit(1);
}
console.log("PAGE AUDIT PASSED");
