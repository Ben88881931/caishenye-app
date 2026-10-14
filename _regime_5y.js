// 规律变化周期探索：每条线的“盈亏状态”平均能维持多少个窗口才翻转
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
let fullModel = null; const pickCache = {};
function model() {
  if (fullModel) return fullModel;
  const raw = {};
  D.forEach((row, index) => { const bits = Array(10).fill("0"); (row.nums || []).forEach((n) => { bits[Number(n) % 10] = "1"; }); raw[String(index + 1)] = bits.join(""); });
  fullModel = MODEL.createModel(raw); return fullModel;
}
function pick(period, stream) {
  if (period <= 1) return null;
  if (!pickCache[period]) pickCache[period] = model().buildPrediction(period - 1);
  return (pickCache[period].doubleRecommendation || [])[stream === "D1" ? 0 : 1] || null;
}
const yearOf = (p) => (D[p - 1] ? Number(D[p - 1].y) : 0);
function windowsFor(line, cap) {
  const rows = []; let active = null, waiting = null; let p = line.kind === "tail" ? 1 : 31; let curYear = 0;
  while (p <= D.length) {
    const y = yearOf(p);
    if (y && y !== curYear) { curYear = y; active = null; waiting = null; }
    if (waiting) { const t = (D[p - 1].nums || []).map((n) => Number(n) % 10); if (t.indexOf(Number(waiting.tail)) >= 0) waiting = null; p++; continue; }
    if (!active) { const trig = line.kind === "tail" ? { tail: line.tail } : pick(p, line.stream); if (!trig) { p++; continue; } active = { start: p, lockedTail: line.kind === "recommend" ? null : trig.tail, attempts: [] }; }
    const actual = (D[p - 1].nums || []).map((n) => Number(n) % 10);
    const pk = line.kind === "recommend" ? pick(p, line.stream) : { tail: active.lockedTail };
    const tail = pk ? pk.tail : null;
    const hit = tail != null && actual.indexOf(Number(tail)) >= 0;
    active.attempts.push({ period: p, tail, hit });
    if (hit) { active.hitIndex = active.attempts.length; rows.push(active); active = null; p++; }
    else if (active.attempts.length >= cap) {
      active.hitIndex = 0; rows.push(active);
      let wt = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { wt = active.attempts[i].tail; break; }
      active = null; p++; if (wt != null) waiting = { tail: wt };
    } else p++;
  }
  return rows;
}
function windowNet(w, cap) {
  let cost = 0;
  for (let k = 0; k < w.attempts.length; k++) cost += STAKES[k] || 0;
  const hitAt = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0;
  const back = hitAt ? STAKES[hitAt - 1] * ODDS : 0;
  return { net: back - cost, hit: hitAt > 0, year: yearOf(w.start), start: w.start };
}
function stats(arr) {
  if (!arr.length) return { n: 0, mean: 0, median: 0, max: 0 };
  const s = arr.slice().sort((a, b) => a - b);
  return { n: arr.length, mean: arr.reduce((a, b) => a + b, 0) / arr.length, median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
}
// 滚动 K 窗净收益的符号 = 该线当前的“盈亏状态”，符号翻转即状态变化
function regimes(nets, K) {
  const roll = [];
  for (let i = 0; i < nets.length; i++) {
    if (i + 1 < K) continue;
    let s = 0;
    for (let j = i - K + 1; j <= i; j++) s += nets[j];
    roll.push(s >= 0 ? 1 : -1);
  }
  const runs = []; let cur = null;
  roll.forEach((sg) => {
    if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; runs.push(cur); }
    else cur.len++;
  });
  if (runs.length > 1) runs.shift();                       // 首段不完整，不计
  if (runs.length && runs[runs.length - 1].len < K) runs.pop(); // 尾段不完整，不计
  const lens = runs.map((r) => r.len);
  const winRuns = runs.filter((r) => r.sign === 1).map((r) => r.len);
  const loseRuns = runs.filter((r) => r.sign === -1).map((r) => r.len);
  return { flips: runs.length, runs: runs, len: stats(lens), winLen: stats(winRuns), loseLen: stats(loseRuns), roll: roll };
}
// 原始连续盈亏窗口（不滚动）
function streaks(nets) {
  const runs = []; let cur = null;
  nets.forEach((n) => {
    const sg = n > 0 ? 1 : -1;
    if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; runs.push(cur); } else cur.len++;
  });
  if (runs.length > 1) runs.shift();
  if (runs.length > 1) runs.pop();
  return { hit: stats(runs.filter((r) => r.sign === 1).map((r) => r.len)), miss: stats(runs.filter((r) => r.sign === -1).map((r) => r.len)), hitMax: Math.max(1, ...runs.filter((r) => r.sign === 1).map((r) => r.len)), missMax: Math.max(1, ...runs.filter((r) => r.sign === -1).map((r) => r.len)) };
}
const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("规律变化周期探索：每条线的盈亏状态平均能维持多少窗口才翻转");
log("口径：把每个窗口按该方案算成 盈/亏，取“最近5个窗口累计净收益”的符号当作当前状态；符号翻转=状态变化。");
log("灰色区：每个状态段首尾不完整的不计。数据 2021-2026（2026截至286期）。");
log("");
[3, 2].forEach((cap) => {
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  log("线路 | 窗口数 | 状态切换次数 | 平均状态长度(窗) | 中位 | 最长 | 平均盈利状态 | 平均亏损状态 | 最长连亏窗 | 最长连盈窗");
  log("---|---|---|---|---|---|---|---|---|---");
  const allLens = [], allWin = [], allLose = [];
  LINES.forEach((line) => {
    const nets = windowsFor(line, cap).map((w) => windowNet(w, cap));
    const n = nets.map((x) => x.net);
    const r = regimes(n, 5);
    const st = streaks(n);
    allLens.push(...r.runs.map((x) => x.len));
    allWin.push(...r.runs.filter((x) => x.sign === 1).map((x) => x.len));
    allLose.push(...r.runs.filter((x) => x.sign === -1).map((x) => x.len));
    log(line.label + " | " + n.length + " | " + r.flips + " | " + r.len.mean.toFixed(1) + " | " + r.len.median + " | " + r.len.max +
      " | " + (r.winLen.n ? r.winLen.mean.toFixed(1) : "-") + " | " + (r.loseLen.n ? r.loseLen.mean.toFixed(1) : "-") +
      " | " + st.missMax + " | " + st.hitMax);
  });
  const g = stats(allLens), gw = stats(allWin), gl = stats(allLose);
  log("14条合计 | - | - | **" + g.mean.toFixed(1) + "** | " + g.median + " | " + g.max + " | " + gw.mean.toFixed(1) + " | " + gl.mean.toFixed(1) + " | - | -");
  const buckets = { "1-2窗": 0, "3-5窗": 0, "6-10窗": 0, "11-20窗": 0, "21窗以上": 0 };
  allLens.forEach((l) => { if (l <= 2) buckets["1-2窗"]++; else if (l <= 5) buckets["3-5窗"]++; else if (l <= 10) buckets["6-10窗"]++; else if (l <= 20) buckets["11-20窗"]++; else buckets["21窗以上"]++; });
  log("状态长度分布：" + Object.keys(buckets).map((k) => k + " " + buckets[k] + "段").join(" ｜ "));
  log("");
});
fs.writeFileSync("_regime_5y.md", out.join("\n"));
console.log("已写入 _regime_5y.md");
