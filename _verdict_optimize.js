// 窗口体检门槛网格搜索：找收益最优的“热段进场 / 冷段试单 / 冷段停止”组合（走步，无未来数据）
global.window = {};
require("./data.js");
const fs = require("fs");
const MODEL = require("./model_core.js");
const D = window.APP_DATA.d;
const FULL = [100, 700, 1500], HALF = [100, 300, 700], ODDS = 1.8;
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
function netWith(w, cap, stakes) {
  let c = 0;
  for (let k = 0; k < w.attempts.length && k < cap; k++) c += stakes[k] || 0;
  const h = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0;
  return (h ? (stakes[h - 1] || 0) * ODDS : 0) - c;
}
const qq = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };

// 预计算每个窗口的“体检特征”（只用该窗口之前已结算的窗口）
function features(ws, cap) {
  const nets = ws.map((w) => netWith(w, cap, FULL));
  return ws.map((w, i) => {
    const before = nets.slice(0, i);
    const y = yearOf(w.start);
    const f = { year: y, full: nets[i], half: netWith(w, cap, HALF), costFull: w.attempts.reduce((s, _, k) => s + (FULL[k] || 0), 0), costHalf: w.attempts.reduce((s, _, k) => s + (HALF[k] || 0), 0) };
    if (before.length < 5) { f.state = 0; return f; }
    const roll = [];
    for (let k = 4; k < before.length; k++) { let s = 0; for (let j = k - 4; j <= k; j++) s += before[j]; roll.push(s >= 0 ? 1 : -1); }
    const state = roll[roll.length - 1];
    let len = 1;
    for (let k = roll.length - 2; k >= 0 && roll[k] === state; k--) len++;
    const winRuns = [], loseRuns = []; let cur = null;
    roll.forEach((sg) => { if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; (sg === 1 ? winRuns : loseRuns).push(cur); } else cur.len++; });
    f.state = state; f.len = len;
    f.w = (q) => qq(winRuns.map((r) => r.len), q);
    f.l = (q) => qq(loseRuns.map((r) => r.len), q);
    f.hasWin = winRuns.length >= 4; f.hasLose = loseRuns.length >= 4;
    return f;
  });
}

function evalParams(feat, cap, p) {
  let net = 0, cost = 0, bets = 0, skip = 0;
  const byYear = {};
  feat.forEach((f) => {
    let isFull = false, isHalf = false;
    if (f.state === 1 && f.hasWin) {
      if (f.len <= f.w(p.hotMax)) isFull = true;
      else if (p.hotBeyond === "half") isHalf = true;
    } else if (f.state === -1 && f.hasLose && p.coldEntry > 0) {
      const lo = f.l(p.coldEntry), hi = p.coldStop > 0 ? f.l(p.coldStop) : 9999;
      if (f.len > lo && f.len <= hi) isHalf = true;
    }
    if (!isFull && !isHalf) { skip++; return; }
    bets++;
    const n = isFull ? f.full : f.half;
    const c = isFull ? f.costFull : f.costHalf;
    net += n; cost += c;
    byYear[f.year] = (byYear[f.year] || 0) + n;
  });
  return { net, cost, roi: cost ? net / cost : 0, bets, skip, byYear };
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("窗口体检门槛网格搜索（走步回测，2021-2026，2026截至286期）");
log("参数：热段进场上限(p50/p75/p90/不限) × 热段超限(轻仓/不下) × 冷段试单门槛(不开/p50/p75/p90) × 冷段停止线(p90/p95/不限)");
log("");
["two", "three"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  const feat = [];
  LINES.forEach((l) => { features(windowsFor(l, cap), cap).forEach((f) => feat.push(f)); });
  const grid = [];
  [0.5, 0.75, 0.9, 1.0].forEach((hotMax) => ["half", "skip"].forEach((hotBeyond) =>
    [0, 0.5, 0.75, 0.9].forEach((coldEntry) => [0.9, 0.95, 0].forEach((coldStop) => {
      const r = evalParams(feat, cap, { hotMax, hotBeyond, coldEntry, coldStop });
      grid.push({ hotMax, hotBeyond, coldEntry, coldStop, ...r });
    }))));
  const name = (p) => "热≤p" + (p.hotMax * 100) + (p.hotBeyond === "half" ? "超限轻仓" : "超限不下") +
    " · 冷试" + (p.coldEntry ? ">" + p.coldEntry * 100 : "不开") + " · 冷停" + (p.coldStop ? ">p" + p.coldStop * 100 : "不限");
  const viable = grid.filter((g) => g.bets >= 1200);
  const byRoi = viable.slice().sort((a, b) => b.roi - a.roi).slice(0, 8);
  const byNet = viable.slice().sort((a, b) => b.net - a.net).slice(0, 5);
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  log("【按 ROI 排名前8】参数 | 净收益 | 投入 | ROI | 下注窗/跳过窗 | 2021..2026 逐年");
  byRoi.forEach((g) => log("  " + name(g) + " | " + (g.net >= 0 ? "+" : "") + Math.round(g.net) + " | " + Math.round(g.cost) + " | " +
    (g.roi * 100).toFixed(1) + "% | " + g.bets + "/" + g.skip + " | " + YEARS.map((y) => (g.byYear[y] >= 0 ? "+" : "") + Math.round(g.byYear[y] || 0)).join(" ")));
  log("【按净收益排名前5】");
  byNet.forEach((g) => log("  " + name(g) + " | " + (g.net >= 0 ? "+" : "") + Math.round(g.net) + " | ROI " + (g.roi * 100).toFixed(1) + "% | " + g.bets + "窗"));
  // 样本内/样本外：用 2021-2023 选参数，测 2024-2026
  const inSample = (g) => [2021, 2022, 2023].reduce((s, y) => s + (g.byYear[y] || 0), 0);
  const outSample = (g) => [2024, 2025, 2026].reduce((s, y) => s + (g.byYear[y] || 0), 0);
  const bestIn = viable.slice().sort((a, b) => inSample(b) - inSample(a))[0];
  log("【样本内选参 → 样本外验证】2021-2023 最优：" + name(bestIn) + "（样本内 " + (inSample(bestIn) >= 0 ? "+" : "") + Math.round(inSample(bestIn)) + "）→ 2024-2026 样本外 " +
    (outSample(bestIn) >= 0 ? "+" : "") + Math.round(outSample(bestIn)) + " · ROI " + (bestIn.roi * 100).toFixed(1) + "%");
  const allIn = viable.slice().sort((a, b) => b.net - a.net)[0];
  log("【全期最优（含未来信息，仅参考）】" + name(allIn) + " → " + (allIn.net >= 0 ? "+" : "") + Math.round(allIn.net) + " · ROI " + (allIn.roi * 100).toFixed(1) + "%");
  log("");
});
fs.writeFileSync("_verdict_optimize.md", out.join("\n"));
console.log("已写入 _verdict_optimize.md");
