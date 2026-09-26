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
const { createModel, gradeOf, GRADE_TIERS, scoreBucketOf, SCORE_BUCKETS } = require("./model_core.js");

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

  // 分数整数分档 + 信号标签 细分统计（单尾口径，含逐期 rolls）
  const scoreBuckets = {};
  for (const b of SCORE_BUCKETS) {
    scoreBuckets[b] = { n: 0, hits: 0, miss: 0, rolls: [] };
  }
  const tags = {};

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
      const tag = p.tag || "其他";
      const bname = scoreBucketOf(p.score);
      const bucket = gradeStats[g];
      if (bucket) {
        bucket.single.n++;
        if (hit) bucket.single.hits++;
        else bucket.single.miss++;
      }
      if (scoreBuckets[bname]) {
        scoreBuckets[bname].n++;
        if (hit) scoreBuckets[bname].hits++;
        else scoreBuckets[bname].miss++;
        scoreBuckets[bname].rolls.push({ target: rec.target, tail: p.tail, score: p.score, tag: tag, hit: hit });
      }
      const tg = tags[tag] || (tags[tag] = { n: 0, hits: 0, miss: 0, rolls: [] });
      tg.n++;
      if (hit) tg.hits++;
      else tg.miss++;
      tg.rolls.push({ target: rec.target, tail: p.tail, score: p.score, bucket: bname, hit: hit });
      return { tail: p.tail, score: p.score, tag: tag, bucket: bname, grade: g, hit: hit };
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

  const weightedRecords = records
    .filter((rec) => rec.models && rec.models.weightedBounce && Array.isArray(rec.models.weightedBounce.picks))
    .map((rec) => {
      const picks = rec.models.weightedBounce.picks || [];
      const actualTails = rec.actualTails || [];
      const savedResult = rec.results && rec.results.weightedBounce;
      const savedPerPick = savedResult && Array.isArray(savedResult.perPick) ? savedResult.perPick : [];
      const perPick = picks.map((p) => {
        const saved = savedPerPick.find((x) => x.tail === p.tail);
        const resolvedHit = saved && typeof saved.hit === "boolean"
          ? saved.hit
          : actualTails.includes(p.tail);
        return {
          tail: p.tail,
          score: p.score,
          miss: p.miss,
          maxMiss: p.maxMiss,
          ratio: p.ratio,
          weightedBounceRate: p.weightedBounceRate,
          sample: p.sample,
          hit: rec.settled ? resolvedHit : null
        };
      });
      const hits = perPick.filter((p) => p.hit === true).map((p) => p.tail);
      return {
        target: rec.target,
        basedOn: rec.basedOn,
        settled: !!rec.settled,
        picks: perPick,
        actualTails: actualTails,
        hits: hits,
        hit: rec.settled ? hits.length > 0 : null,
        settledAt: rec.settledAt || null
      };
    })
    .sort((a, b) => a.target - b.target);

  const weightedSettled = weightedRecords.filter((r) => r.settled);
  const weightedFirst = weightedSettled.filter((r) => r.picks.length && r.picks[0].hit === true).length;
  const weightedSecond = weightedSettled.filter((r) => r.picks.length >= 2 && r.picks[1].hit === true).length;
  const weightedBoth = weightedSettled.filter((r) => r.picks.length >= 2 && r.picks.every((p) => p.hit === true)).length;
  const weightedSummary = {
    n: weightedSettled.length,
    hits: weightedSettled.filter((r) => r.hit).length,
    miss: weightedSettled.filter((r) => !r.hit).length,
    firstPick: { n: weightedSettled.length, hits: weightedFirst, miss: weightedSettled.length - weightedFirst },
    secondPick: { n: weightedSettled.length, hits: weightedSecond, miss: weightedSettled.length - weightedSecond },
    atLeastOne: { n: weightedSettled.length, hits: weightedSettled.filter((r) => r.hit).length, miss: weightedSettled.filter((r) => !r.hit).length },
    both: { n: weightedSettled.length, hits: weightedBoth, miss: weightedSettled.length - weightedBoth }
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    settledCount: settled.length,
    grades: gradeStats,
    overallAtLeastOne: overall,
    combos: combos,
    scoreBuckets: scoreBuckets,
    tags: tags,
    weightedRecords: weightedRecords,
    weightedSummary: weightedSummary,
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
    tag: p.tag || null,
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
          ambiguous: !!pred.doubleAmbiguous,
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
  const settled = records.filter((r) => r.settled);
  const firstHit = (key, idx) => settled.filter((r) => {
    const picks = r.models && r.models[key] && r.models[key].picks;
    return picks && picks[idx] && (r.actualTails || []).includes(picks[idx].tail);
  }).length;
  const bothHit = (key) => settled.filter((r) => {
    const picks = r.models && r.models[key] && r.models[key].picks;
    return picks && picks.length >= 2 && picks.every((p) => (r.actualTails || []).includes(p.tail));
  }).length;

  console.log("===== 真实预测快照报告 =====");
  console.log(`双号至少中一：${d.hits}/${d.settled} = ${(d.rate * 100).toFixed(1)}%`);
  console.log(`双号首推：${firstHit("doubleRecommendation", 0)}/${d.settled}`);
  console.log(`加权至少中一：${w.hits}/${w.settled} = ${(w.rate * 100).toFixed(1)}%`);
  console.log(`加权首推：${firstHit("weightedBounce", 0)}/${w.settled}`);
  console.log(`加权两个全中：${bothHit("weightedBounce")}/${w.settled}`);
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
