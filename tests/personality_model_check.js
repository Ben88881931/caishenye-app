"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const personality = require("../next_window_model.js");
const probabilityModel = require("../model_probability.js");

const dataSandbox = { window: {} };
vm.runInNewContext(fs.readFileSync("data.js", "utf8"), dataSandbox, { filename: "data.js" });
const appData = dataSandbox.window.APP_DATA;
const reviewedAt = "2026-10-29T12:00:00.000Z";
const model = personality.build({
  raw: appData.raw,
  d: appData.d,
  probabilityModel,
  asOfPeriod: appData.d.length,
  reviewedAt,
});
const repeatModel = personality.build({
  raw: appData.raw,
  d: appData.d,
  probabilityModel,
  asOfPeriod: appData.d.length,
  reviewedAt,
});
const rankingSnapshot = (value) => value.ranking.map((line) => ({
  id: line.id,
  rank: line.rank,
  predictedRate: line.current.predictedRate,
  threeWindowRate: line.current.threeWindowRate,
  compositeScore: line.current.compositeScore,
  safeHorizons: line.current.safeHorizons,
}));
assert.deepEqual(rankingSnapshot(repeatModel), rankingSnapshot(model));
const personalitySnapshots = JSON.parse(fs.readFileSync("personality_snapshots.json", "utf8"));
const activeSnapshot = personalitySnapshots.records.find((record) => (
  !record.superseded && Number(record.targetGlobal) === Number(model.target)
));
assert.ok(activeSnapshot, "active target snapshot missing");
if (activeSnapshot.version === model.version) {
  assert.deepEqual(activeSnapshot.top3, model.diagnosticRanking.slice(0, 3).map((line) => line.id));
}

const expectedLines = [
  ...Array.from({ length: 10 }, (_, tail) => `tail${tail}`),
  "prob1",
  "prob2",
  "prob3",
];

assert.equal(model.method, "per-line-independent-window-personality-v8.1");
assert.equal(model.independentHorizons, true);
assert.equal(model.riskCascade, false);
assert.equal(model.bidirectionalRiskCascade, false);
assert.equal(model.overlappingWindows, true);
assert.equal(model.lines.length, 13);
assert.deepEqual(model.lines.map((line) => line.id), expectedLines);
assert.deepEqual(model.lines.filter((line) => line.kind === "probability").map((line) => line.label), ["A", "B", "C"]);
assert.equal(model.ranking.length, 13);
assert.ok(model.ranking.every((line, index, rows) => (
  index === 0 ||
  rows[index - 1].current.safeHorizons > line.current.safeHorizons ||
  (
    rows[index - 1].current.safeHorizons === line.current.safeHorizons &&
    rows[index - 1].current.compositeScore >= line.current.compositeScore
  )
)));
assert.equal(model.threeWindowRanking.length, 13);
assert.ok(model.threeWindowRanking.every((line, index, rows) => (
  index === 0 || rows[index - 1].current.threeWindowRate >= line.current.threeWindowRate
)));
assert.equal(model.diagnosticRanking.length, 13);
assert.ok(model.diagnosticRanking.every((line, index, rows) => (
  index === 0 ||
  rows[index - 1].current.diagnostic.safeCount > line.current.diagnostic.safeCount ||
  (
    rows[index - 1].current.diagnostic.safeCount === line.current.diagnostic.safeCount &&
    rows[index - 1].current.diagnostic.riskCount <= line.current.diagnostic.riskCount
  )
)));

for (const line of model.lines) {
  assert.ok(line.longTerm.windows > 0, `${line.id} needs long-term windows`);
  assert.ok(line.longTerm.hits >= 0 && line.longTerm.hits <= line.longTerm.windows);
  assert.ok(Number.isFinite(line.longTerm.rate), `${line.id} long-term rate missing`);
  assert.ok(Number.isFinite(line.longTerm.baseline), `${line.id} baseline missing`);
  assert.ok(Number.isFinite(line.longTerm.edge), `${line.id} edge missing`);
  assert.ok(line.longTerm.stageShare);
  assert.ok(Number.isFinite(line.longTerm.stageShare.first));
  assert.ok(Number.isFinite(line.longTerm.stageShare.second));
  assert.ok(Number.isFinite(line.longTerm.stageShare.third));
  assert.ok(Number.isInteger(line.longTerm.stageCounts.first));
  assert.ok(Number.isInteger(line.longTerm.stageCounts.second));
  assert.ok(Number.isInteger(line.longTerm.stageCounts.third));
  assert.ok(Array.isArray(line.yearly) && line.yearly.length > 0);
  assert.ok(line.current.state, `${line.id} missing personality state`);
  assert.ok(Number.isFinite(line.current.predictedRate), `${line.id} prediction missing`);
  assert.ok(line.current.predictedRate >= 0 && line.current.predictedRate <= 1);
  assert.ok(Number.isFinite(line.current.edge), `${line.id} current edge missing`);
  assert.ok(line.current.samples >= 0);
  assert.ok(line.current.reason);
  assert.equal(line.current.target, model.target);
  assert.ok(line.current.tail >= 0 && line.current.tail <= 9);
  assert.ok(Number.isFinite(line.current.threeWindowRate));
  assert.ok(Number.isFinite(line.current.threeWindowBaseline));
  assert.ok(Number.isFinite(line.current.threeWindowEdge));
  assert.ok(Number.isFinite(line.current.compositeScore));
  assert.ok(Number.isInteger(line.current.safeHorizons));
  assert.ok(line.current.safeHorizons >= 0 && line.current.safeHorizons <= 3);
  assert.ok(line.current.diagnostic);
  assert.ok(Number.isInteger(line.current.diagnostic.safeCount));
  assert.ok(Number.isInteger(line.current.diagnostic.reboundCount));
  assert.ok(Number.isInteger(line.current.diagnostic.riskCount));
  assert.ok(Number.isInteger(line.current.diagnostic.rareCount));
  for (const key of ["one", "two", "three"]) {
    assert.ok(["safe", "rebound", "risk", "unseen"].includes(line.current.diagnosticByHorizon[key].stage));
    assert.equal(line.current.diagnosticByHorizon[key].phases.length, 4);
  }
  assert.equal(line.current.predictedRate, line.current.threeWindowRate);
  assert.ok(Number.isFinite(line.current.submodels.one.predictedRate));
  assert.ok(Number.isFinite(line.current.submodels.two.predictedRate));
  assert.ok(Number.isFinite(line.current.submodels.three.predictedRate));
  assert.ok(line.current.submodels.one.state);
  assert.ok(line.current.submodels.two.state);
  assert.ok(line.current.submodels.three.state);
  assert.ok(Number.isFinite(line.current.submodels.one.edge));
  assert.ok(Number.isFinite(line.current.submodels.two.edge));
  assert.ok(Number.isFinite(line.current.submodels.three.edge));
  for (const key of ["one", "two", "three"]) {
    const realtime = line.current.realtimeByHorizon[key];
    for (const period of ["year", "month", "halfMonth", "week", "recent12"]) {
      assert.ok(Number.isFinite(realtime[period].rate), `${line.id}/${key}/${period} missing`);
      assert.ok(Number.isFinite(realtime[period].delta), `${line.id}/${key}/${period} delta missing`);
      assert.ok(["样本不足", "转强", "转弱", "稳定"].includes(realtime[period].trend));
    }
  }
  assert.match(line.current.riskPattern, /^(safe|risk)-(safe|risk)-(safe|risk)\|(safe|risk)-(safe|risk)-(safe|risk)$/);
  assert.equal(line.current.riskLevels.length, 3);
  assert.ok(Number.isFinite(line.current.directionPredictions.forward.predictedRate));
  assert.ok(Number.isFinite(line.current.directionPredictions.reverse.predictedRate));
  assert.ok(line.current.cascadeDecision);
  if (
    line.current.directionPredictions.forward.riskLevels.every((level) => level === "risk") &&
    line.current.directionPredictions.reverse.riskLevels.every((level) => level === "risk")
  ) {
    assert.ok(line.current.predictedRate < line.current.baseline, `${line.id} double-risk must be low score`);
  }
  assert.equal(line.validation.length, 2);
  assert.deepEqual(line.validation.map((item) => item.year), [2025, 2026]);
  for (const item of line.validation) {
    assert.ok(item.predictions > 0, `${line.id}/${item.year} has no walk-forward predictions`);
    assert.ok(Number.isFinite(item.brier));
    assert.ok(Number.isFinite(item.baselineBrier));
    assert.ok(Number.isFinite(item.brierSkill));
    assert.ok(Number.isFinite(item.rate));
    assert.ok(Number.isFinite(item.baseline));
  }
}

assert.equal(model.uniformWeightsUsed, false);
assert.equal(model.oneTwoThreeWeightMix, false);
assert.equal(model.lookAheadUsed, false);
assert.ok(model.asOfPeriod > 0);
assert.equal(model.review.policy.maxPeriods, 30);
assert.equal(model.review.policy.maxDays, 30);
assert.equal(model.review.policy.trigger, "whichever-first");
assert.equal(model.review.lastReviewedPeriod, model.asOfPeriod);
assert.equal(model.review.lastReviewedAt, reviewedAt);
assert.equal(model.review.nextReviewPeriod, model.asOfPeriod + 30);
assert.equal(model.review.nextReviewAt, "2026-11-28T12:00:00.000Z");
assert.ok(Number.isInteger(model.review.reviewNumber));
assert.ok(model.review.reviewNumber >= 1);
assert.ok(model.lines.some((line) => line.current.state !== "year_start"), "current personality state must use completed current-year windows");
assert.equal(model.selectionValidation.length, 2);
for (const item of model.selectionValidation) {
  assert.ok(item.periods > 0);
  assert.ok(Number.isFinite(item.all.rate));
  assert.ok(Number.isFinite(item.top2.rate));
  assert.ok(Number.isFinite(item.top3.rate));
}

const beforeDue = personality.build({
  raw: appData.raw,
  d: appData.d,
  probabilityModel,
  asOfPeriod: appData.d.length,
  reviewedAt: "2026-11-01T12:00:00.000Z",
  previousReview: model.review,
});
assert.equal(beforeDue.review.reviewNumber, model.review.reviewNumber);
assert.equal(beforeDue.review.lastReviewedAt, reviewedAt);
assert.equal(beforeDue.review.nextReviewAt, model.review.nextReviewAt);

const duePrevious = JSON.parse(JSON.stringify(model.review));
duePrevious.nextReviewPeriod = model.asOfPeriod;
duePrevious.nextReviewAt = "2026-10-20T12:00:00.000Z";
const afterDue = personality.build({
  raw: appData.raw,
  d: appData.d,
  probabilityModel,
  asOfPeriod: appData.d.length,
  reviewedAt: "2026-10-29T13:00:00.000Z",
  previousReview: duePrevious,
});
assert.equal(afterDue.review.reviewNumber, duePrevious.reviewNumber + 1);
assert.equal(afterDue.review.lastReviewedPeriod, afterDue.asOfPeriod);
assert.equal(afterDue.review.lastReviewedAt, "2026-10-29T13:00:00.000Z");
assert.equal(afterDue.review.nextReviewPeriod, afterDue.asOfPeriod + 30);
assert.equal(afterDue.review.nextReviewAt, "2026-11-28T13:00:00.000Z");

console.log("PASS: per-line long-term personality model contract and review cadence");
