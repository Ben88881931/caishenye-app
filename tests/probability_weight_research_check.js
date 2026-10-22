"use strict";

const assert = require("node:assert/strict");
const research = require("../probability_weight_research.js");

assert.equal(research.productionModel, "p57152130", "user directed the challenger to become production");
assert.equal(research.decision, "user-approved-production");
assert.equal(research.researchRecommendation, "keep-production");

assert.deepEqual(research.models.p10.windows, [5, 10, 20, 30]);
assert.deepEqual(research.models.p57152130.windows, [5, 7, 15, 21, 30]);
assert.equal(research.models.p10.next.weights.length, 7);
assert.equal(research.models.p10.window3.weights.length, 7);
assert.equal(research.models.p57152130.next.weights.length, 8);
assert.equal(research.models.p57152130.window3.weights.length, 8);
assert.notDeepEqual(
  research.models.p10.window3.weights,
  research.models.p57152130.window3.weights,
  "each feature set must train its own coefficients"
);

assert.equal(research.models.p57152130.promotionEligible, false);
assert.match(research.models.p57152130.conclusion, /用户已要求直接切换生产/);
assert.equal(research.comparison.validation2025.year, 2025);
assert.equal(research.comparison.shadow2026.year, 2026);
assert.ok(Number.isFinite(research.comparison.validation2025.pValue));
assert.ok(Number.isFinite(research.comparison.shadow2026.pValue));
assert.ok(Array.isArray(research.annualComparison));
assert.equal(research.annualComparison.length, 6);

console.log("PASS: probability weight research contract");
