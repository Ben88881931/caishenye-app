#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "data.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "data.js" });
const data = sandbox.window.APP_DATA;

const CONFIGS = {
  p10: {
    label: "5 / 10 / 20 / 30 期",
    windows: [5, 10, 20, 30],
  },
  p57152130: {
    label: "5 / 7 / 15 / 21 / 30 期",
    windows: [5, 7, 15, 21, 30],
  },
};
const L2 = 1;
const EPSILON = 1e-12;

function rawByYear() {
  const years = {};
  data.d.forEach((row, index) => {
    const year = Number(row.y);
    if (!years[year]) years[year] = [];
    const bits = Array(10).fill("0");
    (row.nums || []).forEach((number) => {
      bits[Number(number) % 10] = "1";
    });
    years[year].push({ period: index + 1, bits: bits.join("") });
  });
  return years;
}

function hit(raw, period, tail) {
  const row = raw[period - 1];
  return Boolean(row && row.bits[tail] === "1");
}

function featuresAt(raw, basedOn, tail, windows) {
  const values = windows.map((window) => {
    let count = 0;
    const start = Math.max(1, basedOn - window + 1);
    for (let period = start; period <= basedOn; period++) {
      if (hit(raw, period, tail)) count++;
    }
    return count / window;
  });
  let miss = 0;
  for (let period = basedOn; period >= 1; period--) {
    if (!hit(raw, period, tail)) miss++;
    else break;
  }
  let streak = 0;
  for (let period = basedOn; period >= 1; period--) {
    if (hit(raw, period, tail)) streak++;
    else break;
  }
  values.push(Math.min(10, miss) / 10, Math.min(5, streak) / 5);
  return values;
}

function rowsForConfig(rawYears, config, samples) {
  const out = [];
  Object.keys(samples).forEach((yearKey) => {
    const year = Number(yearKey);
    const raw = rawYears[year];
    if (!raw) return;
    samples[yearKey].forEach((sample) => {
      out.push({
        year,
        basedOn: sample.basedOn,
        tail: sample.tail,
        next: sample.next,
        window3: sample.window3,
        features: featuresAt(raw, sample.basedOn, sample.tail, config.windows),
      });
    });
  });
  return out;
}

function collectSamples(rawYears) {
  const samples = {};
  Object.keys(rawYears).forEach((yearKey) => {
    const year = Number(yearKey);
    const raw = rawYears[year];
    samples[yearKey] = [];
    for (let basedOn = 0; basedOn < raw.length; basedOn++) {
      for (let tail = 0; tail <= 9; tail++) {
        const target = basedOn + 1;
        if (target > raw.length) continue;
        let window3 = null;
        if (target + 2 <= raw.length) {
          window3 = [0, 1, 2].some((offset) => hit(raw, target + offset, tail));
        }
        samples[yearKey].push({
          basedOn,
          tail,
          next: hit(raw, target, tail),
          window3,
        });
      }
    }
  });
  return samples;
}

function fitScaler(rows) {
  const size = rows[0].features.length;
  const mean = Array(size).fill(0);
  const sd = Array(size).fill(0);
  rows.forEach((row) => {
    row.features.forEach((value, index) => {
      mean[index] += value;
    });
  });
  mean.forEach((value, index) => {
    mean[index] = value / rows.length;
  });
  rows.forEach((row) => {
    row.features.forEach((value, index) => {
      const delta = value - mean[index];
      sd[index] += delta * delta;
    });
  });
  sd.forEach((value, index) => {
    sd[index] = Math.sqrt(value / rows.length) || 1;
  });
  return { mean, sd };
}

function normalize(features, scaler) {
  return [1].concat(features.map((value, index) => (
    (value - scaler.mean[index]) / scaler.sd[index]
  )));
}

function sigmoid(value) {
  const z = Math.max(-20, Math.min(20, value));
  return 1 / (1 + Math.exp(-z));
}

function solve(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, index) => row.concat(vector[index]));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < EPSILON) continue;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

function trainLogistic(rows, outcome) {
  const scaler = fitScaler(rows);
  const x = rows.map((row) => normalize(row.features, scaler));
  const y = rows.map((row) => (outcome === "next" ? row.next : row.window3));
  const width = x[0].length;
  let weights = Array(width).fill(0);

  for (let iteration = 0; iteration < 30; iteration++) {
    const gradient = Array(width).fill(0);
    const hessian = Array.from({ length: width }, () => Array(width).fill(0));
    x.forEach((row, rowIndex) => {
      const predicted = sigmoid(row.reduce((sum, value, index) => sum + value * weights[index], 0));
      const residual = y[rowIndex] - predicted;
      const variance = Math.max(EPSILON, predicted * (1 - predicted));
      for (let i = 0; i < width; i++) {
        gradient[i] += residual * row[i];
        for (let j = 0; j < width; j++) {
          hessian[i][j] += variance * row[i] * row[j];
        }
      }
    });
    for (let i = 0; i < width; i++) {
      gradient[i] -= i === 0 ? 1e-9 * weights[i] : L2 * weights[i];
      hessian[i][i] += i === 0 ? 1e-9 : L2;
    }
    const delta = solve(hessian, gradient);
    weights = weights.map((value, index) => value + delta[index]);
  }
  return {
    weights: weights.map((value) => Number(value.toFixed(9))),
    mean: scaler.mean.map((value) => Number(value.toFixed(9))),
    sd: scaler.sd.map((value) => Number(value.toFixed(9))),
  };
}

function predict(features, model) {
  const values = normalize(features, model);
  return sigmoid(values.reduce((sum, value, index) => sum + value * model.weights[index], 0));
}

function evaluate(rawYears, config, models, years) {
  const result = {};
  years.forEach((year) => {
    const raw = rawYears[year];
    const stats = {
      year,
      periods: 0,
      hits: 0,
      first: 0,
      second: 0,
      third: 0,
      miss: 0,
      baselineHits: 0,
      baselineSamples: 0,
      nextBaselineHits: 0,
      nextBaselineSamples: 0,
      nextTop3CoverageHits: 0,
      window3Top3CoverageHits: 0,
      outcomes: [],
    };
    for (let basedOn = 0; basedOn < raw.length - 2; basedOn++) {
      const scored = [];
      for (let tail = 0; tail <= 9; tail++) {
        scored.push({
          tail,
          probability: predict(
            featuresAt(raw, basedOn, tail, config.windows),
            models.window3
          ),
        });
      }
      scored.sort((a, b) => b.probability - a.probability || a.tail - b.tail);
      const pick = scored[0].tail;
      const top3Tails = scored.slice(0, 3).map((row) => row.tail);
      let hitIndex = 0;
      for (let offset = 0; offset < 3; offset++) {
        if (hit(raw, basedOn + 1 + offset, pick)) {
          hitIndex = offset + 1;
          break;
        }
      }
      stats.periods++;
      if (hitIndex) stats.hits++;
      if (top3Tails.some((tail) => hit(raw, basedOn + 1, tail))) {
        stats.nextTop3CoverageHits++;
      }
      if ([0, 1, 2].some((offset) => (
        top3Tails.some((tail) => hit(raw, basedOn + 1 + offset, tail))
      ))) {
        stats.window3Top3CoverageHits++;
      }
      if (hitIndex === 1) stats.first++;
      else if (hitIndex === 2) stats.second++;
      else if (hitIndex === 3) stats.third++;
      else stats.miss++;
      stats.outcomes.push({ basedOn, hit: hitIndex > 0 });
      for (let tail = 0; tail <= 9; tail++) {
        stats.nextBaselineSamples++;
        if (hit(raw, basedOn + 1, tail)) stats.nextBaselineHits++;
        stats.baselineSamples++;
        if ([0, 1, 2].some((offset) => hit(raw, basedOn + 1 + offset, tail))) {
          stats.baselineHits++;
        }
      }
    }
    stats.rate = stats.periods ? stats.hits / stats.periods : 0;
    stats.baseline = stats.baselineSamples ? stats.baselineHits / stats.baselineSamples : 0;
    stats.nextBaseline = stats.nextBaselineSamples ? stats.nextBaselineHits / stats.nextBaselineSamples : 0;
    stats.nextTop3Coverage = stats.periods ? stats.nextTop3CoverageHits / stats.periods : 0;
    stats.window3Top3Coverage = stats.periods ? stats.window3Top3CoverageHits / stats.periods : 0;
    result[year] = stats;
  });
  return result;
}

function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t)
    + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function compareOutcomes(base, challenger) {
  const byPeriod = new Map();
  base.outcomes.forEach((row) => byPeriod.set(row.basedOn, row.hit));
  let baseHits = 0;
  let challengerHits = 0;
  let challengerOnly = 0;
  let baseOnly = 0;
  let periods = 0;
  challenger.outcomes.forEach((row) => {
    if (!byPeriod.has(row.basedOn)) return;
    const baseHit = byPeriod.get(row.basedOn);
    periods++;
    if (baseHit) baseHits++;
    if (row.hit) challengerHits++;
    if (!baseHit && row.hit) challengerOnly++;
    if (baseHit && !row.hit) baseOnly++;
  });
  const discordant = challengerOnly + baseOnly;
  const z = discordant
    ? Math.max(0, Math.abs(challengerOnly - baseOnly) - 1) / Math.sqrt(discordant)
    : 0;
  return {
    year: base.year === "all" ? "all" : Number(base.year),
    periods,
    baseHits,
    challengerHits,
    baseRate: periods ? baseHits / periods : 0,
    challengerRate: periods ? challengerHits / periods : 0,
    delta: periods ? (challengerHits - baseHits) / periods : 0,
    challengerOnly,
    baseOnly,
    pValue: discordant ? Math.max(0, Math.min(1, 2 * (1 - normalCdf(z)))) : 1,
  };
}

function main() {
  const rawYears = rawByYear();
  const samples = collectSamples(rawYears);
  const trainRows = {};
  [2021, 2022, 2023, 2024].forEach((year) => {
    trainRows[year] = samples[year] || [];
  });
  const output = {
    generatedAt: new Date().toISOString(),
    training: "2021-2024",
    validation: "2025",
    shadow: "2026",
    l2: L2,
    hyperparameters: {
      fit: "IRLS logistic regression",
      iterations: 30,
      featureScaling: "train mean and standard deviation",
      evaluationRank: "window3 probability descending, then tail ascending",
      outcome: "tail appears in target period or next two periods",
    },
    models: {},
  };

  Object.keys(CONFIGS).forEach((key) => {
    const config = CONFIGS[key];
    const rows = rowsForConfig(rawYears, config, trainRows)
      .filter((row) => row.window3 != null);
    output.models[key] = {
      key,
      label: config.label,
      windows: config.windows,
      sampleCount: rows.length,
      next: trainLogistic(rows, "next"),
      window3: trainLogistic(rows, "window3"),
    };
    output.models[key].evaluation = evaluate(
      rawYears,
      config,
      output.models[key],
      Object.keys(rawYears).map(Number).sort((a, b) => a - b)
    );
  });

  const baseModel = output.models.p10;
  const challenger = output.models.p57152130;
  const comparison = {
    validation2025: compareOutcomes(baseModel.evaluation[2025], challenger.evaluation[2025]),
    shadow2026: compareOutcomes(baseModel.evaluation[2026], challenger.evaluation[2026]),
  };
  const annualComparison = Object.keys(baseModel.evaluation).map((year) => (
    compareOutcomes(baseModel.evaluation[year], challenger.evaluation[year])
  ));
  const baseAll = {
    year: "all",
    outcomes: Object.values(baseModel.evaluation).flatMap((row) => row.outcomes.map((item) => ({
      basedOn: String(row.year) + ":" + item.basedOn,
      hit: item.hit,
    }))),
  };
  const challengerAll = {
    year: "all",
    outcomes: Object.values(challenger.evaluation).flatMap((row) => row.outcomes.map((item) => ({
      basedOn: String(row.year) + ":" + item.basedOn,
      hit: item.hit,
    }))),
  };
  comparison.allYears = compareOutcomes(baseAll, challengerAll);

  challenger.promotionEligible = (
    comparison.validation2025.delta > 0 &&
    comparison.shadow2026.delta > 0 &&
    comparison.allYears.pValue < 0.05 &&
    annualComparison.every((row) => row.delta >= 0)
  );
  challenger.conclusion = challenger.promotionEligible
    ? "验证段、影子段和年度方向均通过，可进入新的前向影子版本"
    : "研究层面验证段与年度方向不稳定；用户已要求直接切换生产，风险继续跟踪";
  output.researchRecommendation = challenger.promotionEligible ? "shadow-challenger" : "keep-production";
  output.productionModel = "p57152130";
  output.decision = "user-approved-production";
  output.override = {
    approvedBy: "user",
    approvedAt: "2026-10-22",
    reason: "用户明确要求直接更替到 5 / 7 / 15 / 21 / 30 新方法",
    productionActivation: {
      legacyTarget: 296,
      firstNewTarget: 297,
      rule: "已保存的296期开奖前快照不改写，新权重从297期第一张未生成快照开始",
    },
  };
  output.comparison = comparison;
  output.annualComparison = annualComparison;

  const jsonTarget = path.join(ROOT, "probability_weight_research.json");
  const jsTarget = path.join(ROOT, "probability_weight_research.js");
  const jsonText = JSON.stringify(output, null, 2) + "\n";
  const appOutput = JSON.parse(JSON.stringify(output));
  Object.values(appOutput.models).forEach((model) => {
    Object.values(model.evaluation).forEach((row) => {
      delete row.outcomes;
    });
  });
  fs.writeFileSync(jsonTarget, jsonText);
  fs.writeFileSync(
    jsTarget,
    "(function (root, factory) {\n" +
    "  if (typeof module === \"object\" && module.exports) module.exports = factory();\n" +
    "  else root.CAISHEN_PROBABILITY_WEIGHT_RESEARCH = factory();\n" +
    "})(typeof self !== \"undefined\" ? self : this, function () {\n" +
    "  \"use strict\";\n" +
    "  return " + JSON.stringify(appOutput, null, 2).replace(/\n/g, "\n  ") + ";\n" +
    "});\n"
  );
  console.log(JSON.stringify({
    output: jsonTarget,
    models: Object.fromEntries(Object.keys(output.models).map((key) => {
      const model = output.models[key];
      return [key, {
        windows: model.windows,
        sampleCount: model.sampleCount,
        window3Weights: model.window3.weights,
        annual: Object.fromEntries(Object.values(model.evaluation).map((row) => [row.year, row.rate])),
      }];
    })),
    comparison,
    allYears: comparison.allYears,
    productionModel: output.productionModel,
    decision: output.decision,
  }, null, 2));
}

main();
