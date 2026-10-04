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
  const wPicks = (p.models.weightedBounce.picks || []).map((x) => ({ tail: x.tail, score: x.score }));
  const wExpected = (prediction.weightedBounce || []).map((x) => ({ tail: x.tail, score: x.score }));
  must(JSON.stringify(dPicks) === JSON.stringify(dExpected), "下一期双号快照与模型输出一致");
  must(JSON.stringify(wPicks) === JSON.stringify(wExpected), "下一期加权快照与模型输出一致，空推荐也一致");
}

const weightedRecords = Array.isArray(snapshotJs.weightedRecords) ? snapshotJs.weightedRecords : [];
const settledWeighted = weightedRecords.filter((r) => r.settled);
const actedWeighted = settledWeighted.filter((r) => Array.isArray(r.picks) && r.picks.length > 0);
const summary = snapshotJs.weightedSummary || {};
must(weightedRecords.every((r) => r.skipped === (Array.isArray(r.picks) && r.picks.length === 0)), "weightedRecords 的 skipped 字段正确");
must(summary.n === actedWeighted.length, "加权汇总 n 只统计实际推荐");
must(summary.settled === settledWeighted.length, "加权汇总 settled 等于全部已结算");
must(summary.skipped === settledWeighted.length - actedWeighted.length, "加权汇总 skipped 等于空推荐期数");
const weightedHits = actedWeighted.filter((r) => r.hit).length;
must(summary.hits === weightedHits && summary.miss === actedWeighted.length - weightedHits, "加权命中/未中不包含跳过期");

const settledDoubleTargets = records.filter((r) => r.settled && r.results && r.results.doubleRecommendation).map((r) => Number(r.target)).sort((a, b) => a - b);
const detailTargets = (snapshotJs.detail || []).map((r) => Number(r.target)).sort((a, b) => a - b);
must(JSON.stringify(settledDoubleTargets) === JSON.stringify(detailTargets), "双号五级明细与已结算快照一致");
must(Array.isArray(snapshotJs.threePeriodRecords), "snapshots.js 含三期内追推荐真实快照");
must(Array.isArray(snapshotJs.sourceWindows), "snapshots.js 含双号原始号源真实窗口");
const sourceWindowRecords = Array.isArray(snapshotJs.sourceWindows) ? snapshotJs.sourceWindows : [];
const pendingByStream = {};
sourceWindowRecords.forEach((r) => { if (r.status === "pending") pendingByStream[r.stream] = (pendingByStream[r.stream] || 0) + 1; });
must(["D1", "D2"].every((k) => (pendingByStream[k] || 0) <= 1), "每条号源最多只有一个进行中的三期窗口");
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

must(appText.includes("WEIGHTED_CARD_START") && appText.includes("WEIGHTED_CARD_END") && appText.indexOf('var weightedHeaderPos = html.indexOf(\'<div class="section" id="weightedPageHeader">\')') > appText.indexOf("var weightedCardStart = html.indexOf") && appText.includes("sourceStripHtml") && appText.includes("下一轮窗口号：") && appText.includes("当前状态：") && appText.includes("真实快照") && appText.includes("历史回测") && appText.includes("历史顺序回测") && appText.includes("settleManualOrder") && appText.includes("ORDER_PATTERNS") && !appText.includes("ultimateQuickAdd") && !appText.includes("data-uo-gen") && appText.includes("rowMap") && appText.includes("模型建议：") && appText.includes("第' + batch.startPeriod + '期批次") && appText.includes("ULT_CARD_HISTORY") && appText.includes("ULT_RECORDS_START") && appText.includes("card-followup"), "本期选号通过HTML顺序直接置顶且三期内四流记录紧接卡片下方");
must(appText.includes("snapshotSkipped") && appText.includes("跳过，未参与结算"), "空快照不会回退成实时推荐");
must(appText.includes("function nudgeNavItem") && appText.includes("renderedTab") && appText.includes("nav-group-caret") && appText.includes("window.scrollTo"), "导航保持横向位置、当前项可见且切页回顶");
const cssText = read("styles.css");
must(cssText.includes("position: sticky") && cssText.includes("grid-template-columns: repeat(5") && cssText.includes("min-height: 42px"), "导航为粘性五项分段布局且触控高度合格");
must(appText.includes("执行规则") && appText.includes("双流三期内命中结构") && !appText.includes("固定方案对照") && !appText.includes("本页子模型状态") && appText.includes("仅建议，不代替执行") && appText.includes("窗口照常记录") && appText.includes("两个原始号源") && appText.includes("不再二次筛选") && !appText.includes("仅观察候选"), "追三期使用两个原始号源且不二次筛选");
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
