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
const selector = require("./model_selector.js");

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

  const threePeriodRecords = (Array.isArray(snapshots.threePeriodRecords) ? snapshots.threePeriodRecords : []).map((r) => Object.assign({}, r));
  const threeActed = threePeriodRecords.filter((r) => r.tail != null && r.action !== "观望");
  const threeSettled = threeActed.filter((r) => r.status === "hit" || r.status === "miss");
  const threeHits = threeSettled.filter((r) => r.status === "hit").length;
  const threeSummary = {
    n: threePeriodRecords.length,
    acted: threeActed.length,
    settled: threeSettled.length,
    pending: threeActed.filter((r) => r.status === "pending").length,
    skipped: threePeriodRecords.filter((r) => r.status === "skip").length,
    hits: threeHits,
    miss: threeSettled.length - threeHits,
    first: threeSettled.filter((r) => r.hitIndex === 1).length,
    second: threeSettled.filter((r) => r.hitIndex === 2).length,
    third: threeSettled.filter((r) => r.hitIndex === 3).length,
    hit3Rate: threeSettled.length ? threeHits / threeSettled.length : 0
  };

  const sourceWindows = (Array.isArray(snapshots.sourceWindows) ? snapshots.sourceWindows : []).map((r) => Object.assign({}, r));
  const sourceWindowSummary = { total: sourceWindows.length, byStream: {} };
  ["D1", "D2"].forEach((key) => {
    const rows = sourceWindows.filter((r) => r.stream === key);
    const acted = rows.filter((r) => r.tail != null);
    const settled = acted.filter((r) => r.status === "hit" || r.status === "miss");
    const hits = settled.filter((r) => r.status === "hit").length;
    sourceWindowSummary.byStream[key] = {
      total: rows.length,
      acted: acted.length,
      pending: acted.filter((r) => r.status === "pending").length,
      skipped: rows.filter((r) => r.status === "skip").length,
      settled: settled.length,
      hits,
      miss: settled.length - hits,
      hit3Rate: settled.length ? hits / settled.length : 0
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    settledCount: settled.length,
    grades: gradeStats,
    overallAtLeastOne: overall,
    combos: combos,
    scoreBuckets: scoreBuckets,
    tags: tags,
    detail: detail,
    threePeriodRecords: threePeriodRecords,
    threePeriodSummary: threeSummary,
    sourceWindows: sourceWindows,
    sourceWindowSummary: sourceWindowSummary
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

function settleThreePeriodRecords(snapshots, raw, model) {
  if (!Array.isArray(snapshots.threePeriodRecords)) snapshots.threePeriodRecords = [];
  for (const rec of snapshots.threePeriodRecords) {
    if (rec.status !== "pending" || rec.tail == null) continue;
    if (!Array.isArray(rec.attempts)) rec.attempts = [];
    while (rec.attempts.length < 3) {
      const period = Number(rec.startPeriod || rec.target) + rec.attempts.length;
      if (!raw[String(period)]) break;
      const actualTails = model.tailsOf(period);
      const hit = actualTails.includes(Number(rec.tail));
      rec.attempts.push({ period, tail: Number(rec.tail), actualTails, hit });
      if (hit) {
        rec.status = "hit";
        rec.hitIndex = rec.attempts.length;
        rec.settledPeriod = period;
        rec.settledAt = new Date().toISOString();
        break;
      }
      if (rec.attempts.length === 3) {
        rec.status = "miss";
        rec.hitIndex = 0;
        rec.settledPeriod = period;
        rec.settledAt = new Date().toISOString();
      }
    }
  }
}

function buildSourceWindow(snapshots, recordByTarget, model, raw, stream, target) {
  const saved = recordByTarget.get(Number(target));
  if (!saved) return null;
  const picks = saved.models && saved.models.doubleRecommendation && saved.models.doubleRecommendation.picks;
  const pick = Array.isArray(picks) ? (picks[stream === "D1" ? 0 : 1] || null) : null;
  if (!pick || pick.tail == null) return null;
  const window = {
    target: Number(target),
    basedOn: Number(saved.basedOn || (Number(target) - 1)),
    generatedAt: saved.generatedAt || null,
    stream,
    model: "双号追热",
    tail: Number(pick.tail),
    score: pick.score,
    grade: pick.grade || gradeOf(pick.score),
    tag: pick.tag || null,
    status: "pending",
    attempts: [],
    hitIndex: null,
    settledPeriod: null,
    settledAt: null
  };
  for (let index = 0; index < 3; index++) {
    const period = Number(target) + index;
    if (!raw[String(period)]) break;
    const actualTails = model.tailsOf(period);
    const hit = actualTails.includes(Number(window.tail));
    window.attempts.push({ period, tail: Number(window.tail), actualTails, hit });
    if (hit) {
      window.status = "hit";
      window.hitIndex = window.attempts.length;
      window.settledPeriod = period;
      break;
    }
    if (window.attempts.length === 3) {
      window.status = "miss";
      window.hitIndex = 0;
      window.settledPeriod = period;
    }
  }
  if (window.settledPeriod != null) {
    const settled = recordByTarget.get(Number(window.settledPeriod));
    window.settledAt = settled && settled.settledAt ? settled.settledAt : null;
  }
  return window;
}

function rebuildSourceWindows(snapshots, raw, model, latest) {
  const records = Array.isArray(snapshots.records) ? snapshots.records : [];
  const recordByTarget = new Map(records.map((record) => [Number(record.target), record]));
  const targets = records.map((record) => Number(record.target)).filter(Number.isFinite);
  const firstTarget = Math.max(262, targets.length ? Math.min(...targets) : latest + 1);
  const rebuilt = [];
  for (const stream of ["D1", "D2"]) {
    let target = firstTarget;
    let waitingTail = null;
    let guard = 0;
    while (target <= latest + 1 && guard++ < 500) {
      if (waitingTail != null) {
        let reopened = null;
        for (let period = target; period <= latest; period++) {
          if (!raw[String(period)]) continue;
          if (model.tailsOf(period).includes(Number(waitingTail))) {
            reopened = period;
            break;
          }
        }
        if (reopened == null) break;
        target = reopened + 1;
        waitingTail = null;
      }
      const window = buildSourceWindow(snapshots, recordByTarget, model, raw, stream, target);
      if (!window) {
        target += 1;
        continue;
      }
      rebuilt.push(window);
      if (window.status === "pending") break;
      target = Number(window.settledPeriod) + 1;
      if (window.status === "miss") waitingTail = Number(window.tail);
    }
  }
  rebuilt.sort((a, b) => a.target - b.target || (a.stream === "D1" ? -1 : 1));
  snapshots.sourceWindows = rebuilt;
}


function sync() {
  const raw = loadRaw();
  const model = createModel(raw);
  const snapshots = loadSnapshots();
  const periods = model.periods;
  const latest = periods[periods.length - 1];
  const prediction = model.buildPrediction(latest);

  settleThreePeriodRecords(snapshots, raw, model);

  for (const rec of snapshots.records) {
    if (rec.settled || !raw[String(rec.target)]) continue;
    const actualTails = model.tailsOf(rec.target);
    rec.actualTails = actualTails;
    rec.actualPeriod = rec.target;
    rec.settledAt = new Date().toISOString();
    rec.settled = true;
    rec.results = {};
    rec.results.doubleRecommendation = modelHit(rec.models.doubleRecommendation, actualTails);
  }

  const target = latest + 1;
  if (!snapshots.records.some((r) => r.target === target)) {
    snapshots.records.push({
      modelVersion: MODEL_VERSION,
      generatedAt: new Date().toISOString(),
      basedOn: latest,
      target: target,
      settled: false,
      models: {
        doubleRecommendation: {
          description: "连出惯性分层打分，推2个尾号",
          ambiguous: !!prediction.doubleAmbiguous,
          picks: prediction.doubleRecommendation
        }
      }
    });
  }


  if (!Array.isArray(snapshots.threePeriodRecords)) snapshots.threePeriodRecords = [];
  if (!snapshots.threePeriodRecords.some((r) => Number(r.target) === target)) {
    const selectorAnalysis = selector.analyze(raw, model, { startPeriod: 31 });
    const decision = selectorAnalysis && selectorAnalysis.decision ? selectorAnalysis.decision : null;
    let streamKey = null;
    let pick = null;
    if (decision && decision.source === "double" && decision.streams && decision.streams.D1.current) {
      streamKey = "D1";
      pick = decision.streams.D1.current;
    }
    const pending = !!(pick && pick.tail != null);
    snapshots.threePeriodRecords.push({
      target,
      basedOn: latest,
      generatedAt: new Date().toISOString(),
      action: decision ? decision.action : "观望",
      source: decision ? decision.source : null,
      rule: decision ? decision.rule : "P5/P6",
      reason: decision ? decision.reason : "三期内必出模块未加载",
      stream: streamKey,
      tail: pending ? pick.tail : null,
      score: pending ? pick.score : null,
      grade: pending ? (pick.grade || gradeOf(pick.score)) : null,
      status: pending ? "pending" : "skip",
      attempts: [],
      hitIndex: null,
      settledPeriod: pending ? null : target,
      settledAt: pending ? null : new Date().toISOString()
    });
  }

  rebuildSourceWindows(snapshots, raw, model, latest);
  snapshots.latestPeriod = latest;
  snapshots.updatedAt = new Date().toISOString();
  saveSnapshots(snapshots);
  generateSnapshotsJs(snapshots);
  console.log(`快照已同步：已开奖 ${snapshots.records.filter((r) => r.settled).length} 期，待开奖 ${snapshots.records.filter((r) => !r.settled).length} 期，下一期 ${target}`);
}

function summarize(records, key) {
  const settled = records.filter((r) => r.settled && r.results && r.results[key]);
  const acted = settled.filter((r) => r.models && r.models[key] && Array.isArray(r.models[key].picks) && r.models[key].picks.length > 0);
  const hits = acted.filter((r) => r.results[key].hit).length;
  return {
    settled: settled.length,
    acted: acted.length,
    skipped: settled.length - acted.length,
    hits,
    rate: acted.length ? hits / acted.length : 0
  };
}

function report() {
  const snapshots = loadSnapshots();
  const records = snapshots.records || [];
  const d = summarize(records, "doubleRecommendation");
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
  // 唯一认可口径：三期窗口命中（窗口=短期策略单元）。每期两号口径已退役，不再输出。
  const srcWins = Array.isArray(snapshots.sourceWindows) ? snapshots.sourceWindows : [];
  ["D1", "D2"].forEach((sk) => {
    const mine = srcWins.filter((w) => w.stream === sk && w.status !== "pending");
    const hitW = mine.filter((w) => w.status === "hit").length;
    const pendW = srcWins.filter((w) => w.stream === sk && w.status === "pending").length;
    console.log(`三期窗口·${sk === "D1" ? "首推" : "备选"}：中${hitW}窗 / 错${mine.length - hitW}窗 · 窗口命中率 ${mine.length ? ((hitW / mine.length) * 100).toFixed(1) : "-"}% · 进行中${pendW}窗`);
  });
  console.log(`双号首推：${firstHit("doubleRecommendation", 0)}/${d.settled}`);
  const threeRecords = Array.isArray(snapshots.threePeriodRecords) ? snapshots.threePeriodRecords : [];
  const threeActed = threeRecords.filter((r) => r.tail != null && r.action !== "观望");
  const threeSettled = threeActed.filter((r) => r.status === "hit" || r.status === "miss");
  const threeHits = threeSettled.filter((r) => r.status === "hit").length;
  console.log(`三期内必出：${threeHits}/${threeSettled.length} = ${(threeSettled.length ? threeHits / threeSettled.length * 100 : 0).toFixed(1)}% · 待结算${threeActed.filter((r) => r.status === "pending").length}期 · 观望${threeRecords.filter((r) => r.status === "skip").length}期`);
  console.log(`待开奖：${pending.length} 条`);

  const recent = records.filter((r) => r.settled).slice(-10);
  if (recent.length) {
    console.log("\n最近已结算：");
    for (const r of recent) {
      const dr = r.results.doubleRecommendation;
      console.log(
        `第${r.target}期 实际[${r.actualTails.join(",")}] 双号[${dr.picks.join(",")}]${dr.hit ? "中" : "未中"}`
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
