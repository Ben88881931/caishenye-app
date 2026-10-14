// 每一年的规律：同一条线、同一年内，盈亏状态平均能维持多少窗口才翻转
global.window = {};
require("./data.js");
const fs = require("fs");
const MODEL = require("./model_core.js");
const D = window.APP_DATA.d;
const STAKES = [100, 700, 1500];
const ODDS = 1.8;
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
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
  D.forEach((row, i) => { const bits = Array(10).fill("0"); (row.nums || []).forEach((n) => { bits[Number(n) % 10] = "1"; }); raw[String(i + 1)] = bits.join(""); });
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
function net(w, cap) {
  let cost = 0;
  for (let k = 0; k < w.attempts.length; k++) cost += STAKES[k] || 0;
  const hitAt = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0;
  return (hitAt ? STAKES[hitAt - 1] * ODDS : 0) - cost;
}
// 年内状态段长度（最近5窗累计盈亏的符号）
function yearRegime(nets) {
  if (nets.length < 6) return { flips: 0, avg: null, win: null, lose: null, windows: nets.length };
  const roll = [];
  for (let i = 4; i < nets.length; i++) { let s = 0; for (let j = i - 4; j <= i; j++) s += nets[j]; roll.push(s >= 0 ? 1 : -1); }
  const runs = []; let cur = null;
  roll.forEach((sg) => { if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; runs.push(cur); } else cur.len++; });
  if (runs.length > 1) runs.shift();
  if (runs.length && runs[runs.length - 1].len < 5) runs.pop();
  const lens = runs.map((r) => r.len);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return { flips: runs.length, avg: mean(lens), win: mean(runs.filter((r) => r.sign === 1).map((r) => r.len)), lose: mean(runs.filter((r) => r.sign === -1).map((r) => r.len)), windows: nets.length };
}
const TWO = 2, THREE = 3;
const data = {};
[TWO, THREE].forEach((cap) => {
  data[cap] = {};
  LINES.forEach((line) => {
    const ws = windowsFor(line, cap);
    data[cap][line.id] = { label: line.label, years: {} };
    YEARS.forEach((y) => {
      const nets = ws.filter((w) => yearOf(w.start) === y).map((w) => net(w, cap));
      data[cap][line.id].years[y] = yearRegime(nets);
    });
  });
});
const out = [];
const log = (s) => { out.push(s); console.log(s); };
const f = (n) => (n == null ? "-" : n.toFixed(1));
log("每一年的规律：同一年内，盈亏状态（最近5窗累计）平均维持多少窗口才翻转");
log("单元格 = 平均状态长度(窗) · 切换次数；2026 为部分年（截至286期）");
log("");
[THREE, TWO].forEach((cap) => {
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  log("线路 | " + YEARS.map((y) => y + " 平均(切换)").join(" | ") + " | 六年平均");
  log("---|---|---|---|---|---|---|---|---");
  const yearAvg = {}; YEARS.forEach((y) => (yearAvg[y] = []));
  LINES.forEach((line) => {
    const cells = YEARS.map((y) => {
      const r = data[cap][line.id].years[y];
      if (r.avg != null) yearAvg[y].push(r.avg);
      return f(r.avg) + " (" + r.flips + ")";
    });
    const all = YEARS.map((y) => data[cap][line.id].years[y].avg).filter((x) => x != null);
    log(line.label + " | " + cells.join(" | ") + " | " + (all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : "-"));
  });
  log("当年平均 | " + YEARS.map((y) => (yearAvg[y].length ? (yearAvg[y].reduce((a, b) => a + b, 0) / yearAvg[y].length).toFixed(1) : "-")).join(" | ") + " | -");
  log("");
  // 每年 盈利状态 vs 亏损状态 平均长度
  log("每年 盈利状态 / 亏损状态 平均长度（14条线平均）");
  log("年份 | 盈利状态平均 | 亏损状态平均 | 比值");
  log("---|---|---|---");
  YEARS.forEach((y) => {
    const wins = LINES.map((l) => data[cap][l.id].years[y].win).filter((x) => x != null);
    const loses = LINES.map((l) => data[cap][l.id].years[y].lose).filter((x) => x != null);
    const w = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const l2 = loses.length ? loses.reduce((a, b) => a + b, 0) / loses.length : 0;
    log(y + " | " + w.toFixed(1) + " | " + l2.toFixed(1) + " | " + (l2 ? (w / l2).toFixed(2) : "-"));
  });
  log("");
});
fs.writeFileSync("_regime_yearly.md", out.join("\n"));
console.log("已写入 _regime_yearly.md");
