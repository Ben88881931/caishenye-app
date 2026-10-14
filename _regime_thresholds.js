// 算每套方案的“状态段长度”分位线，用来做退出提示阈值
global.window = {};
require("./data.js");
const MODEL = require("./model_core.js");
const D = window.APP_DATA.d;
const STAKES = [100, 700, 1500], ODDS = 1.8;
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
const LINES = [
  { id: "tail0", label: "尾0", kind: "tail", tail: 0 }, { id: "tail1", label: "尾1", kind: "tail", tail: 1 },
  { id: "tail2", label: "尾2", kind: "tail", tail: 2 }, { id: "tail3", label: "尾3", kind: "tail", tail: 3 },
  { id: "tail4", label: "尾4", kind: "tail", tail: 4 }, { id: "tail5", label: "尾5", kind: "tail", tail: 5 },
  { id: "tail6", label: "尾6", kind: "tail", tail: 6 }, { id: "tail7", label: "尾7", kind: "tail", tail: 7 },
  { id: "tail8", label: "尾8", kind: "tail", tail: 8 }, { id: "tail9", label: "尾9", kind: "tail", tail: 9 },
  { id: "fixedD1", label: "追号码D1", kind: "fixed", stream: "D1" }, { id: "fixedD2", label: "追号码D2", kind: "fixed", stream: "D2" },
  { id: "recD1", label: "追推荐D1", kind: "recommend", stream: "D1" }, { id: "recD2", label: "追推荐D2", kind: "recommend", stream: "D2" },
];
let fullModel = null; const pickCache = {};
function model() { if (fullModel) return fullModel; const raw = {}; D.forEach((r, i) => { const b = Array(10).fill("0"); (r.nums || []).forEach((n) => { b[Number(n) % 10] = "1"; }); raw[String(i + 1)] = b.join(""); }); fullModel = MODEL.createModel(raw); return fullModel; }
function pick(p, s) { if (p <= 1) return null; if (!pickCache[p]) pickCache[p] = model().buildPrediction(p - 1); return (pickCache[p].doubleRecommendation || [])[s === "D1" ? 0 : 1] || null; }
const yearOf = (p) => (D[p - 1] ? Number(D[p - 1].y) : 0);
function windowsFor(line, cap) {
  const rows = []; let active = null, waiting = null, p = line.kind === "tail" ? 1 : 31, curYear = 0;
  while (p <= D.length) {
    const y = yearOf(p); if (y && y !== curYear) { curYear = y; active = null; waiting = null; }
    if (waiting) { const t = (D[p - 1].nums || []).map((n) => Number(n) % 10); if (t.indexOf(Number(waiting.tail)) >= 0) waiting = null; p++; continue; }
    if (!active) { const tr = line.kind === "tail" ? { tail: line.tail } : pick(p, line.stream); if (!tr) { p++; continue; } active = { start: p, lockedTail: line.kind === "recommend" ? null : tr.tail, attempts: [] }; }
    const actual = (D[p - 1].nums || []).map((n) => Number(n) % 10);
    const pk = line.kind === "recommend" ? pick(p, line.stream) : { tail: active.lockedTail };
    const tail = pk ? pk.tail : null, hit = tail != null && actual.indexOf(Number(tail)) >= 0;
    active.attempts.push({ period: p, tail, hit });
    if (hit) { active.hitIndex = active.attempts.length; rows.push(active); active = null; p++; }
    else if (active.attempts.length >= cap) {
      active.hitIndex = 0; rows.push(active); let wt = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { wt = active.attempts[i].tail; break; }
      active = null; p++; if (wt != null) waiting = { tail: wt };
    } else p++;
  }
  return rows;
}
function net(w, cap) { let c = 0; for (let k = 0; k < w.attempts.length; k++) c += STAKES[k] || 0; const h = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0; return (h ? STAKES[h - 1] * ODDS : 0) - c; }
function runsOf(nets) {
  const roll = [];
  for (let i = 4; i < nets.length; i++) { let s = 0; for (let j = i - 4; j <= i; j++) s += nets[j]; roll.push(s >= 0 ? 1 : -1); }
  const rs = []; let cur = null;
  roll.forEach((sg) => { if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; rs.push(cur); } else cur.len++; });
  if (rs.length > 1) rs.shift();
  if (rs.length && rs[rs.length - 1].len < 5) rs.pop();
  return rs;
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
[3, 2].forEach((cap) => {
  const all = [], win = [], lose = [];
  const perLine = {};
  LINES.forEach((l) => {
    const ws = windowsFor(l, cap);
    const lr = [];
    YEARS.forEach((y) => { const nets = ws.filter((w) => yearOf(w.start) === y).map((w) => net(w, cap)); runsOf(nets).forEach((r) => { all.push(r.len); lr.push(r); (r.sign === 1 ? win : lose).push(r.len); }); });
    perLine[l.label] = { win: mean(lr.filter((r) => r.sign === 1).map((r) => r.len)), lose: mean(lr.filter((r) => r.sign === -1).map((r) => r.len)) };
  });
  console.log("===== " + (cap === 3 ? "三期方案" : "两期方案") + " =====");
  console.log("全部状态段 " + all.length + " 段 · 均值 " + mean(all).toFixed(1) + " · 中位 " + pct(all, 0.5) + " · p75 " + pct(all, 0.75) + " · p90 " + pct(all, 0.9) + " · 最大 " + Math.max(...all));
  console.log("盈利段 均值 " + mean(win).toFixed(1) + " · p75 " + pct(win, 0.75) + " · p90 " + pct(win, 0.9) + " · 最大 " + Math.max(...win));
  console.log("亏损段 均值 " + mean(lose).toFixed(1) + " · 中位 " + pct(lose, 0.5) + " · p75 " + pct(lose, 0.75) + " · p90 " + pct(lose, 0.9) + " · 最大 " + Math.max(...lose));
  console.log("各线均值：" + LINES.map((l) => l.label + " 盈" + perLine[l.label].win.toFixed(1) + "/亏" + perLine[l.label].lose.toFixed(1)).join(" ｜ "));
  console.log("");
});
