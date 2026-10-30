"use strict";

const fs = require("node:fs");
const vm = require("node:vm");
const personality = require("./next_window_model.js");
const probabilityModel = require("./model_probability.js");

function readSnapshots() {
  if (!fs.existsSync("personality_snapshots.json")) {
    return { version: "personality-snapshots-v1", records: [] };
  }
  return JSON.parse(fs.readFileSync("personality_snapshots.json", "utf8"));
}

function readPreviousModel() {
  if (!fs.existsSync("personality_model.json")) return null;
  return JSON.parse(fs.readFileSync("personality_model.json", "utf8"));
}

function settleSnapshots(snapshots, d) {
  let changed = false;
  snapshots.records.forEach((record) => {
    if (record.superseded) return;
    record.lines.forEach((line) => {
      if (line.status !== "pending") return;
      line.attempts = Array.isArray(line.attempts) ? line.attempts : [];
      while (line.attempts.length < 3) {
        const localPeriod = Number(record.target) + line.attempts.length;
        const actual = d.find((row) => Number(row.y) === Number(record.year) && Number(row.p) === localPeriod);
        if (!actual) break;
        const hit = (actual.nums || []).some((num) => Number(num) % 10 === Number(line.tail));
        line.attempts.push({
          period: localPeriod,
          tail: Number(line.tail),
          hit,
        });
        changed = true;
        if (hit) {
          line.status = "hit";
          line.hitIndex = line.attempts.length;
          break;
        }
      }
      if (line.status === "pending" && line.attempts.length === 3) {
        line.status = "miss";
        line.hitIndex = 0;
      }
    });
  });
  return { snapshots, changed };
}

function appendCurrentSnapshot(snapshots, model, appData) {
  const latest = appData.d[appData.d.length - 1];
  const targetGlobal = appData.d.length + 1;
  const targetLocal = Number(latest.p) + 1;
  const activeTargetSnapshot = snapshots.records.some((record) => (
    Number(record.year) === Number(latest.y) &&
    Number(record.target) === targetLocal &&
    !record.superseded
  ));
  // 同一目标期只能锁定一张开奖前快照。即使模型升级，也必须等该期开奖后再从下一期启用新版本。
  if (activeTargetSnapshot) return false;

  const lockedRanking = model.diagnosticRanking || model.ranking;
  const candidates = lockedRanking.map((line) => ({
    id: line.id,
    label: line.label,
    tail: line.current.tail,
    predictedRate: line.current.predictedRate,
    threeWindowRate: line.current.threeWindowRate,
    threeWindowBaseline: line.current.threeWindowBaseline,
    threeWindowEdge: line.current.threeWindowEdge,
    compositeScore: line.current.compositeScore,
    safeHorizons: line.current.safeHorizons,
    horizonEdges: line.current.horizonEdges,
    baseline: line.current.baseline,
    edge: line.current.edge,
    state: line.current.state,
    stateByHorizon: line.current.stateByHorizon,
    stateLabelByHorizon: line.current.stateLabelByHorizon,
    realtimeByHorizon: line.current.realtimeByHorizon,
    diagnosticByHorizon: line.current.diagnosticByHorizon,
    diagnostic: line.current.diagnostic,
    riskPattern: line.current.riskPattern,
    riskLevels: line.current.riskLevels,
    cascadeDecision: line.current.cascadeDecision,
    forward: {
      pattern: line.current.directionPredictions.forward.riskPattern,
      predictedRate: line.current.directionPredictions.forward.predictedRate,
      hits: line.current.directionPredictions.forward.patternHits,
      samples: line.current.directionPredictions.forward.patternSamples,
    },
    reverse: {
      pattern: line.current.directionPredictions.reverse.riskPattern,
      predictedRate: line.current.directionPredictions.reverse.predictedRate,
      hits: line.current.directionPredictions.reverse.patternHits,
      samples: line.current.directionPredictions.reverse.patternSamples,
    },
    attempts: [],
    status: "pending",
    hitIndex: null,
  }));
  snapshots.records.push({
    version: model.version,
    generatedAt: model.generatedAt,
    year: Number(latest.y),
    basedOn: Number(latest.p),
    target: targetLocal,
    targetGlobal,
    candidates: candidates.map((line) => line.id),
    top3: candidates.slice(0, 3).map((line) => line.id),
    lines: candidates,
  });
  return true;
}

function activateRankingForLockedSnapshot(model, snapshots) {
  const active = snapshots.records.filter((record) => (
    !record.superseded &&
    Number(record.targetGlobal) === Number(model.target)
  ))[0];
  if (active && active.version === model.version) {
    model.ranking = model.diagnosticRanking;
    model.activeRankingRule = "diagnostic-cycle";
  } else {
    model.ranking = model.legacyRanking || model.ranking;
    model.activeRankingRule = "legacy-until-diagnostic-snapshot-locked";
  }
  return active;
}

function validateSnapshotCycle(model, snapshots, appData, appended) {
  const latest = appData.d[appData.d.length - 1];
  const active = snapshots.records.filter((record) => (
    !record.superseded &&
    Number(record.targetGlobal) === Number(model.target)
  ));
  if (active.length !== 1) {
    throw new Error(`personality snapshot cycle expected 1 active target, got ${active.length}`);
  }
  const locked = active[0];
  if (Number(model.asOfPeriod) !== appData.d.length) {
    throw new Error("personality model did not use the full available draw history");
  }
  if (Number(locked.year) !== Number(latest.y) || Number(locked.basedOn) !== Number(latest.p)) {
    throw new Error("personality snapshot does not start from the latest draw");
  }
  if (Number(locked.target) !== Number(latest.p) + 1) {
    throw new Error("personality snapshot target is not the next local period");
  }
  if (!Array.isArray(locked.lines) || locked.lines.length !== model.lines.length) {
    throw new Error("personality snapshot line count does not match the model");
  }
  if (locked.lines.some((line) => line.status !== "pending")) {
    throw new Error("next-period personality snapshot must remain pending until draw");
  }
  const expectedTop3 = model.diagnosticRanking.slice(0, 3).map((line) => line.id);
  if (locked.version === model.version &&
      JSON.stringify(locked.top3) !== JSON.stringify(expectedTop3)) {
    throw new Error("personality snapshot top3 does not match the current model");
  }
  return {
    appended,
    targetGlobal: Number(model.target),
    targetLocal: Number(locked.target),
    version: locked.version,
    currentVersion: model.version,
    sameVersion: locked.version === model.version,
  };
}

const dataSandbox = { window: {} };
vm.runInNewContext(fs.readFileSync("data.js", "utf8"), dataSandbox, { filename: "data.js" });
const appData = dataSandbox.window.APP_DATA;
const previousModel = readPreviousModel();
const reviewedAt = new Date().toISOString();
const model = personality.build({
  raw: appData.raw,
  d: appData.d,
  probabilityModel,
  asOfPeriod: appData.d.length,
  reviewedAt,
  previousReview: previousModel && previousModel.review,
});
model.generatedAt = reviewedAt;

const settled = settleSnapshots(readSnapshots(), appData.d);
const snapshots = settled.snapshots;
const appended = appendCurrentSnapshot(snapshots, model, appData);
activateRankingForLockedSnapshot(model, snapshots);
snapshots.latestPeriod = Number(appData.d[appData.d.length - 1].p);
if (settled.changed || appended || !snapshots.updatedAt) snapshots.updatedAt = model.generatedAt;
const cycle = validateSnapshotCycle(model, snapshots, appData, appended);

fs.writeFileSync("personality_model.json", JSON.stringify(model, null, 2) + "\n", "utf8");
fs.writeFileSync(
  "personality_model_data.js",
  "window.APP_PERSONALITY_MODEL = " + JSON.stringify(model, null, 2) + ";\n",
  "utf8"
);
fs.writeFileSync("personality_snapshots.json", JSON.stringify(snapshots, null, 2) + "\n", "utf8");
fs.writeFileSync(
  "personality_snapshots.js",
  "window.APP_PERSONALITY_SNAPSHOTS = " + JSON.stringify(snapshots, null, 2) + ";\n",
  "utf8"
);

console.log(
  `built per-line personality model: latest ${appData.d[appData.d.length - 1].p}, ` +
  `${model.lines.length} lines, top ${model.ranking[0].label} ` +
  `${(model.ranking[0].current.predictedRate * 100).toFixed(1)}%`
);
console.log(
  `snapshot cycle: ${cycle.appended ? "locked new target" : "kept locked target"} ` +
  `${cycle.targetLocal}, top3 ${cycle.sameVersion ? "matches" : "held from prior version"}, ` +
  `ranking ${model.activeRankingRule}`
);
