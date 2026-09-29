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

const selector = require("./model_selector.js").analyze(raw, model, { startPeriod: 31 });
must(Number(selector.nextPeriod) === latest + 1, "三期内必出预测期正确");
must(["跟双号", "跟加权", "观望"].includes(selector.decision.action), "三期内必出动作合法");
const ultimate = require("./ultimate_model.js").analyze(raw, model, { startPeriod: 31 });
must(Number(ultimate.nextPeriod) === latest + 1, "追号/每期追三期预测期正确");
must(["分批启用", "观望"].includes(ultimate.decision.action), "固定追三期总决策合法");

must(appText.includes("predictRecommendCard") && appText.includes("pick3RecommendCard") && appText.includes("function promoteSectionToTop") && appText.includes('promoteSectionToTop("三期内必出滚动记录"') && appText.includes("ULT_CARD_HISTORY") && appText.includes("ULT_RECORDS_START") && appText.includes("card-followup"), "三期内记录紧接卡片下方展示");
must(appText.includes("snapshotSkipped") && appText.includes("跳过，未参与结算"), "空快照不会回退成实时推荐");
must(appText.includes("function nudgeNavItem") && appText.includes("renderedTab") && appText.includes("nav-group-caret") && appText.includes("window.scrollTo"), "导航保持横向位置、当前项可见且切页回顶");
const cssText = read("styles.css");
must(cssText.includes("position: sticky") && cssText.includes("grid-template-columns: repeat(5") && cssText.includes("min-height: 42px"), "导航为粘性五项分段布局且触控高度合格");
must(appText.includes("观望 · 不追") && appText.includes("今日执行") && appText.includes("追尾") && appText.includes("四个原始号源") && appText.includes("自动进入追三期记录") && appText.includes("不再二次筛选") && !appText.includes("仅观察候选"), "追三期使用四原始号源且不二次筛选");
must(!appText.includes('id: "orderfollow"') && !appText.includes("下单追投"), "不存在已废弃的下单追投入口");

const tabsBlock = (appText.match(/var TABS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
const tabIds = [...tabsBlock.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const missingTabs = tabIds.filter((id) => !appText.includes('state.tab === "' + id + '"') && !appText.includes("renderUltimateMode"));
must(tabIds.length > 0 && missingTabs.length === 0, "所有导航页面都有渲染入口");

const versions = [...indexText.matchAll(/(?:styles\.css|data\.js|model_core\.js|model_selector\.js|ultimate_model\.js|snapshots\.js|app\.js)\?v=([\w.-]+)/g)].map((m) => m[1]);
must(versions.length === 7 && new Set(versions).size === 1, "7处资源版本一致");

console.log("");
console.log("PAGE AUDIT SUMMARY: latest=" + latest + ", pending=" + (pending[0] && pending[0].target) + ", cache=" + (versions[0] || "-") + ", selector=" + selector.decision.action);
if (errors.length) {
  console.log("PAGE AUDIT FAILED: " + errors.length + " issue(s)");
  process.exit(1);
}
console.log("PAGE AUDIT PASSED");
