#!/usr/bin/env node
// 模型漂移监控：正式战略主口径=三期窗口命中；单期命中只作诊断，不作为单期下注依据
const fs = require("fs");
const core = require("./model_core.js");
const sel = require("./model_selector.js");
const raw = require("./lottery_data.json");
const model = core.createModel(raw);
const rows = sel.buildSignals(raw, model, { startPeriod: 31 });
const byP = {};
rows.forEach((row) => (byP[row.period] = row));
const periods = Object.keys(byP).map(Number).sort((a, b) => a - b);
const tails = (p) => (raw[String(p)] || "").split("").reduce((acc, bit, index) => {
  if (bit === "1") acc.push(index);
  return acc;
}, []);

function binomLE(k, n, p) {
  let sum = 0;
  let choose = 1;
  for (let i = 0; i <= k; i++) {
    if (i > 0) choose = choose * (n - i + 1) / i;
    sum += choose * Math.pow(p, i) * Math.pow(1 - p, n - i);
  }
  return sum;
}

function windowStats(batches) {
  const n = batches.length;
  const hits = batches.filter((batch) => batch.result !== "miss").length;
  return { n, hits, rate: n ? hits / n : 0 };
}

function periodHit(period, stream) {
  const row = byP[period];
  const pick = stream === "D1" ? row.D1 : row.D2;
  return !!(pick && pick.hit);
}

function periodStats(range) {
  const n = range.length;
  const d1 = range.filter((period) => periodHit(period, "D1")).length;
  const d2 = range.filter((period) => periodHit(period, "D2")).length;
  const base = range.reduce((sum, period) => sum + tails(period).length / 10, 0) / n;
  return { n, d1, d2, r1: d1 / n, r2: d2 / n, base };
}

const snapshots = JSON.parse(fs.readFileSync("prediction_snapshots.json", "utf8"));
const sourceWindows = Array.isArray(snapshots.sourceWindows) ? snapshots.sourceWindows : [];
const recentPeriods = periods.slice(-30);
const recentSingle = periodStats(recentPeriods);
let alarm = 0;

console.log("模型漂移监控（战略主口径=三期窗口命中；单期只作诊断）");
["D1", "D2"].forEach((stream) => {
  const batches = sel.runThreePeriodStreamBacktest(raw, model, stream, { startPeriod: 31 }).batches;
  [30, 50].forEach((windowSize) => {
    const recent = windowStats(batches.slice(-windowSize));
    const prior = windowStats(batches.slice(0, -windowSize));
    const pValue = prior.n && recent.n ? binomLE(recent.hits, recent.n, prior.rate) : 1;
    const flag = recent.n >= 20 && recent.rate < prior.rate && pValue < 0.05;
    if (flag) alarm++;
    console.log(
      "战略窗口·" + stream + " 最近" + windowSize + "窗：" +
      recent.hits + "/" + recent.n + "=" + (recent.rate * 100).toFixed(1) + "%" +
      " · 对比前段 " + (prior.rate * 100).toFixed(1) + "%" +
      " · p=" + pValue.toFixed(4) + (flag ? " 报警" : "")
    );
  });
  const settled = sourceWindows.filter((window) => window.stream === stream && window.status !== "pending");
  const hits = settled.filter((window) => window.status === "hit").length;
  console.log(
    "真实快照窗口·" + stream + "：" + hits + "/" + settled.length +
    "=" + (settled.length ? (hits / settled.length * 100).toFixed(1) : "-") +
    "%（样本" + (settled.length < 20 ? "不足，不作结论" : "已够") + "）"
  );
});

console.log(
  "单期诊断（不下注）· 最近30期：D1 " + recentSingle.d1 + "/" + recentSingle.n +
  "=" + (recentSingle.r1 * 100).toFixed(1) + "% · D2 " + recentSingle.d2 + "/" + recentSingle.n +
  "=" + (recentSingle.r2 * 100).toFixed(1) + "% · 随机基准 " + (recentSingle.base * 100).toFixed(1) + "%"
);
console.log(
  "结论：" + (alarm
    ? "三期窗口出现显著下滑，暂停相关窗口并人工复核"
    : "三期窗口未发现显著下滑；单期D1波动只记录为诊断，不按单期下注，也不单独触发战略切换")
);
process.exit(alarm ? 2 : 0);
