// 5年逐线报告：14条线 × 2021-2026 × 两套方案（两期窗口 / 三期窗口），与页面上跑的引擎同一套规则
global.window = {};
require("./data.js");
const fs = require("fs");
const MODEL = require("./model_core.js");

const D = window.APP_DATA.d;
const STAKES = [100, 700, 1500];
const ODDS = 1.8;
const LINES = [
  { id: "tail0", label: "尾0", kind: "tail", tail: 0 },
  { id: "tail1", label: "尾1", kind: "tail", tail: 1 },
  { id: "tail2", label: "尾2", kind: "tail", tail: 2 },
  { id: "tail3", label: "尾3", kind: "tail", tail: 3 },
  { id: "tail4", label: "尾4", kind: "tail", tail: 4 },
  { id: "tail5", label: "尾5", kind: "tail", tail: 5 },
  { id: "tail6", label: "尾6", kind: "tail", tail: 6 },
  { id: "tail7", label: "尾7", kind: "tail", tail: 7 },
  { id: "tail8", label: "尾8", kind: "tail", tail: 8 },
  { id: "tail9", label: "尾9", kind: "tail", tail: 9 },
  { id: "fixedD1", label: "追号码D1", kind: "fixed", stream: "D1" },
  { id: "fixedD2", label: "追号码D2", kind: "fixed", stream: "D2" },
  { id: "recD1", label: "追推荐D1", kind: "recommend", stream: "D1" },
  { id: "recD2", label: "追推荐D2", kind: "recommend", stream: "D2" },
];
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

let fullModel = null;
const pickCache = {};
function model() {
  if (fullModel) return fullModel;
  const raw = {};
  D.forEach((row, index) => {
    const bits = Array(10).fill("0");
    (row.nums || []).forEach((n) => { bits[Number(n) % 10] = "1"; });
    raw[String(index + 1)] = bits.join("");
  });
  fullModel = MODEL.createModel(raw);
  return fullModel;
}
function pick(period, stream) {
  if (period <= 1) return null;
  if (!pickCache[period]) pickCache[period] = model().buildPrediction(period - 1);
  return (pickCache[period].doubleRecommendation || [])[stream === "D1" ? 0 : 1] || null;
}
const yearOf = (p) => (D[p - 1] ? Number(D[p - 1].y) : 0);

// 与页面同一套窗口引擎：cap=2 就是两期窗口，cap=3 就是三期窗口
function windowsFor(line, cap) {
  const rows = [];
  let active = null, waiting = null;
  let p = line.kind === "tail" ? 1 : 31;
  let curYear = 0;
  while (p <= D.length + 1) {
    if (p > D.length) break; // 待开奖的新窗口不进账
    const hereYear = yearOf(p);
    if (hereYear && hereYear !== curYear) { curYear = hereYear; active = null; waiting = null; }
    if (waiting) {
      const row = D[p - 1];
      const tails = (row.nums || []).map((n) => Number(n) % 10);
      if (tails.indexOf(Number(waiting.tail)) >= 0) waiting = null;
      p++; continue;
    }
    if (!active) {
      const trigger = line.kind === "tail" ? { tail: line.tail } : pick(p, line.stream);
      if (!trigger) { p++; continue; }
      active = { start: p, lockedTail: line.kind === "recommend" ? null : trigger.tail, attempts: [] };
    }
    const row = D[p - 1] || {};
    const actual = (row.nums || []).map((n) => Number(n) % 10);
    const pk = line.kind === "recommend" ? pick(p, line.stream) : { tail: active.lockedTail };
    const tail = pk ? pk.tail : null;
    const hit = tail != null && actual.indexOf(Number(tail)) >= 0;
    active.attempts.push({ period: p, tail: tail, hit: hit });
    if (hit) {
      active.hitIndex = active.attempts.length;
      rows.push(active); active = null; p++;
    } else if (active.attempts.length >= cap) {
      active.hitIndex = 0;
      rows.push(active);
      let waitTail = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { waitTail = active.attempts[i].tail; break; }
      active = null; p++;
      if (waitTail != null) waiting = { tail: waitTail };
    } else p++;
  }
  return rows;
}

function account(rows, cap, year) {
  const acc = { windows: 0, hit: 0, miss: 0, cost: 0, back: 0, net: 0, roi: 0, first: [0, 0, 0] };
  rows.forEach((w) => {
    if (year && yearOf(w.start) !== year) return;
    let cost = 0;
    for (let k = 0; k < w.attempts.length; k++) cost += STAKES[k] || 0;
    const hitAt = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0;
    const back = hitAt ? STAKES[hitAt - 1] * ODDS : 0;
    acc.windows++; acc.cost += cost; acc.back += back;
    if (hitAt) { acc.hit++; acc.first[hitAt - 1]++; } else acc.miss++;
  });
  acc.net = acc.back - acc.cost;
  acc.roi = acc.cost ? acc.net / acc.cost : 0;
  return acc;
}

const results = { two: {}, three: {} };
["two", "three"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  LINES.forEach((line) => {
    const rows = windowsFor(line, cap);
    results[plan][line.id] = { label: line.label, byYear: {}, five: null, y2026: null };
    YEARS.forEach((y) => { results[plan][line.id].byYear[y] = account(rows, cap, y); });
    const fiveAcc = { windows: 0, hit: 0, miss: 0, cost: 0, back: 0, net: 0, roi: 0, first: [0, 0, 0] };
    [2021, 2022, 2023, 2024, 2025].forEach((y) => {
      const a = results[plan][line.id].byYear[y];
      fiveAcc.windows += a.windows; fiveAcc.hit += a.hit; fiveAcc.miss += a.miss;
      fiveAcc.cost += a.cost; fiveAcc.back += a.back;
      for (let i = 0; i < 3; i++) fiveAcc.first[i] += a.first[i];
    });
    fiveAcc.net = fiveAcc.back - fiveAcc.cost;
    fiveAcc.roi = fiveAcc.cost ? fiveAcc.net / fiveAcc.cost : 0;
    results[plan][line.id].five = fiveAcc;
    results[plan][line.id].y2026 = results[plan][line.id].byYear[2026];
  });
});

function money(n) { return (n >= 0 ? "+" : "") + Math.round(n); }
const out = [];
function log(s) { out.push(s); console.log(s); }

log("财神爷 · 14条线 5年逐线报告（1:7:15，赔率1.8，100元起）");
log("数据：2021-2026真实开奖；2026截至286期。窗口规则：中了就开新窗；窗口内没中就等锁定号重新开出再开新窗；每年第1期重新开窗。");
log("两期方案=窗口最多2期（100/700）；三期方案=窗口最多3期（100/700/1500）。4条模型线为模型逐期喂数据口径，2026年8月起才有开奖前保存的真实快照。");
log("");

["two", "three"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  log("========== " + (cap === 2 ? "两期方案（100/700）" : "三期方案（100/700/1500）") + " ==========");
  log("线路 | " + YEARS.map((y) => y + "净收益(命中率)").join(" | ") + " | 2021-2025合计 | 五年ROI | 正年数");
  log("---|---|---|---|---|---|---|---|---|---");
  LINES.forEach((line) => {
    const r = results[plan][line.id];
    const cells = YEARS.map((y) => {
      const a = r.byYear[y];
      const rate = a.windows ? (a.hit / a.windows * 100).toFixed(0) + "%" : "-";
      return money(a.net) + " (" + rate + ")";
    });
    let posYears = 0;
    [2021, 2022, 2023, 2024, 2025].forEach((y) => { if (r.byYear[y].net > 0) posYears++; });
    log(line.label + " | " + cells.join(" | ") + " | " + money(r.five.net) + " | " +
      (r.five.roi * 100).toFixed(1) + "% | " + posYears + "/5");
  });
  const tot = { five: 0, y2026: 0, cost5: 0, pos5: 0 };
  LINES.forEach((line) => {
    const r = results[plan][line.id];
    tot.five += r.five.net; tot.y2026 += r.byYear[2026].net; tot.cost5 += r.five.cost;
    [2021, 2022, 2023, 2024, 2025].forEach((y) => { if (r.byYear[y].net > 0) tot.pos5++; });
  });
  log("14条合计 | " + YEARS.map((y) => money(LINES.reduce((s, l) => s + results[plan][l.id].byYear[y].net, 0))).join(" | ") +
    " | " + money(tot.five) + " | " + (tot.five / tot.cost5 * 100).toFixed(1) + "% | " + tot.pos5 + "/70");
  const stable = LINES.filter((l) => [2021, 2022, 2023, 2024, 2025].every((y) => results[plan][l.id].byYear[y].net > 0)).map((l) => l.label);
  const unstable = LINES.filter((l) => {
    const pos = [2021, 2022, 2023, 2024, 2025].filter((y) => results[plan][l.id].byYear[y].net > 0).length;
    return pos > 0 && pos < 5;
  }).map((l) => l.label);
  const alwaysLose = LINES.filter((l) => [2021, 2022, 2023, 2024, 2025].every((y) => results[plan][l.id].byYear[y].net <= 0)).map((l) => l.label);
  log("");
  log("五年全为正（可长期做）：" + (stable.join("、") || "无"));
  log("五年全为负（应剔除）：" + (alwaysLose.join("、") || "无"));
  log("时正时负（不稳定）：" + (unstable.join("、") || "无"));
  log("");
});

fs.writeFileSync("_report_5y.md", out.join("\n"));
console.log("报告已写入 _report_5y.md");
