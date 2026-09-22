#!/usr/bin/env node
/**
 * 财神爷模型监督脚本
 *
 * 用法：
 *   node model_supervisor.js sync
 *   node model_supervisor.js report
 *
 * sync:
 *   1. 结算已经开奖的预测快照
 *   2. 为下一期生成新的预测快照
 *
 * report:
 *   输出快照账的真实命中情况
 */

const fs = require("fs");
const path = require("path");
const { createModel, gradeOf, GRADE_TIERS } = require("./model_core.js");

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, "data.js");
const SNAPSHOT_PATH = path.join(ROOT, "prediction_snapshots.json");
const MODEL_VERSION = "core-v1";

function loadRaw() {
  const text = fs.readFileSync(DATA_PATH, "utf8");
  const m = text.match(/window\.APP_DATA\s*=\s*(\{.*\});/s);
  if (!m) throw new Error("data.js 中未找到 window.APP_DATA");
  return JSON.parse(m[1]).raw;
}

function loadSnapshots() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return {
      modelVersion: MODEL_VERSION,
      description: "开奖前保存的真实预测快照，开奖后按实际尾数结算。",
      records: []
    };
  }
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
}

function saveSnapshots(data) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// 结算后，把真实快照账各等级命中率写入 snapshots.js，供前端页面展示（等级用统一 gradeOf）
function generateSnapshotsJs(snapshots) {
  const records = snapshots.records || [];
  const settled = records.filter((r) => r.settled && r.results && r.results.doubleRecommendation);

  const gradeStats = {};
  for (const t of GRADE_TIERS) {
    gradeStats[t.key] = { single: { n: 0, hits: 0, miss: 0 } };
  }
  const overall = { n: 0, hits: 0, miss: 0 };
  const combos = {};

  const comboKeyOf = function (g1, g2) {
    const i1 = GRADE_TIERS.findIndex(function (t) { return t.key === g1; });
    const i2 = GRADE_TIERS.findIndex(function (t) { return t.key === g2; });
    return i1 <= i2 ? g1 + "+" + g2 : g2 + "+" + g1;
  };

  const detail = [];
  for (const rec of settled) {
    const model = rec.models && rec.models.doubleRecommendation;
    const picks = model && Array.isArray(model.picks) ? model.picks : [];
    const actualTails = rec.actualTails || [];
    const perPick = picks.map((p) => {
      const g = p.grade != null ? p.grade : gradeOf(p.score);
      const hit = actualTails.includes(p.tail);
      const bucket = gradeStats[g];
      if (bucket) {
        bucket.single.n++;
        if (hit) bucket.single.hits++;
        else bucket.single.miss++;
      }
      return { tail: p.tail, score: p.score, grade: g, hit: hit };
    });
    const atLeastOne = perPick.some((p) => p.hit);
    if (picks.length) {
      overall.n++;
      if (atLeastOne) overall.hits++;
      else overall.miss++;
    }
    if (picks.length >= 2) {
      const ck = comboKeyOf(perPick[0].grade, perPick[1].grade);
      const c = combos[ck] || (combos[ck] = { n: 0, hits: 0, miss: 0 });
      c.n++;
      if (atLeastOne) c.hits++;
      else c.miss++;
    }
    detail.push({
      target: rec.target,
      picks: perPick,
      actualTails: actualTails,
      atLeastOne: atLeastOne,
      settledAt: rec.settledAt
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    settledCount: settled.length,
    grades: gradeStats,
    overallAtLeastOne: overall,
    combos: combos,
    detail: detail
  };

  const outPath = path.join(ROOT, "snapshots.js");
  fs.writeFileSync(outPath, "window.APP_SNAPSHOTS = " + JSON.stringify(payload, null, 2) + ";\n", "utf8");
  console.log(`snapshots.js 已生成：结算 ${settled.length} 期`);
}

function modelHit(model, actualTails) {
  const picks = model.picks || [];
  const perPick = picks.map((p) => ({
    tail: p.tail,
    score: p.score,
    grade: p.grade != null ? p.grade : gradeOf(p.score),
    hit: actualTails.includes(p.tail)
  }));
  const hits = perPick.filter((p) => p.hit).map((p) => p.tail);
  return {
    picks: picks.map((p) => p.tail),
    perPick: perPick,
    hits: hits,
    count: hits.length,
    hit: hits.length > 0
  };
}

function sync() {
  const raw = loadRaw();
  const model = createModel(raw);
  const snapshots = loadSnapshots();
  const periods = model.periods;
  const latest = periods[periods.length - 1];

  for (const rec of snapshots.records) {
    if (rec.settled || !raw[String(rec.target)]) continue;
    const actualTails = model.tailsOf(rec.target);
    rec.actualTails = actualTails;
    rec.actualPeriod = rec.target;
    rec.settledAt = new Date().toISOString();
    rec.settled = true;
    rec.results = {};
    rec.results.doubleRecommendation = modelHit(rec.models.doubleRecommendation, actualTails);
    rec.results.weightedBounce = modelHit(rec.models.weightedBounce, actualTails);
  }

  const target = latest + 1;
  if (!snapshots.records.some((r) => r.target === target)) {
    const pred = model.buildPrediction(latest);
    snapshots.records.push({
      modelVersion: MODEL_VERSION,
      generatedAt: new Date().toISOString(),
      basedOn: latest,
      target: target,
      settled: false,
      models: {
        doubleRecommendation: {
          description: "连出惯性分层打分，推2个尾号",
          picks: pred.doubleRecommendation
        },
        weightedBounce: {
          description: "恰好遗漏k期加权近期反弹率，推2个尾号",
          picks: pred.weightedBounce
        }
      }
    });
  }

  snapshots.latestPeriod = latest;
  snapshots.updatedAt = new Date().toISOString();
  saveSnapshots(snapshots);
  generateSnapshotsJs(snapshots);
  console.log(`快照已同步：已开奖 ${snapshots.records.filter((r) => r.settled).length} 期，待开奖 ${snapshots.records.filter((r) => !r.settled).length} 期，下一期 ${target}`);
}

function summarize(records, key) {
  const settled = records.filter((r) => r.settled && r.results && r.results[key]);
  const hits = settled.filter((r) => r.results[key].hit).length;
  return {
    settled: settled.length,
    hits,
    rate: settled.length ? hits / settled.length : 0
  };
}

function report() {
  const snapshots = loadSnapshots();
  const records = snapshots.records || [];
  const d = summarize(records, "doubleRecommendation");
  const w = summarize(records, "weightedBounce");
  const pending = records.filter((r) => !r.settled);

  console.log("===== 真实预测快照报告 =====");
  console.log(`双号推荐：${d.hits}/${d.settled} = ${(d.rate * 100).toFixed(1)}%`);
  console.log(`加权反弹：${w.hits}/${w.settled} = ${(w.rate * 100).toFixed(1)}%`);
  console.log(`待开奖：${pending.length} 条`);

  const recent = records.filter((r) => r.settled).slice(-10);
  if (recent.length) {
    console.log("\n最近已结算：");
    for (const r of recent) {
      const dr = r.results.doubleRecommendation;
      const wr = r.results.weightedBounce;
      console.log(
        `第${r.target}期 实际[${r.actualTails.join(",")}] 双号[${dr.picks.join(",")}]${dr.hit ? "中" : "未中"} 加权[${wr.picks.join(",")}]${wr.hit ? "中" : "未中"}`
      );
    }
  }
}

const command = process.argv[2] || "sync";
if (command === "sync") sync();
else if (command === "report") report();
else if (command === "snapjs") generateSnapshotsJs(loadSnapshots());
else {
  console.error("未知命令：" + command);
  process.exit(1);
}
