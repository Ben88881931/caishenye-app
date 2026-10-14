// 规律轮动到底有没有提高收益：无未来数据的走步回测（每一步只用当时已结算的窗口）
global.window = {};
require("./data.js");
const fs = require("fs");
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
const POS9 = {
  2: ["tail0", "tail1", "tail6", "tail8", "tail9", "fixedD1", "fixedD2", "recD1", "recD2"],
  3: ["tail0", "tail1", "tail4", "tail6", "tail7", "tail9", "fixedD1", "fixedD2", "recD2"],
};
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
    active.attempts.push({ period: p, tail, hit, stake: STAKES[active.attempts.length] });
    if (hit) { active.hitIndex = active.attempts.length; rows.push(active); active = null; p++; }
    else if (active.attempts.length >= cap) {
      active.hitIndex = 0; rows.push(active); let wt = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { wt = active.attempts[i].tail; break; }
      active = null; p++; if (wt != null) waiting = { tail: wt };
    } else p++;
  }
  return rows;
}
function netOf(w, cap) { let c = 0; w.attempts.forEach((a, k) => { c += STAKES[k] || 0; }); const h = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0; return (h ? STAKES[h - 1] * ODDS : 0) - c; }
function costOf(w) { let c = 0; w.attempts.forEach((a, k) => { c += STAKES[k] || 0; }); return c; }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// 每条线：为每个窗口算“决策时”的状态（只用该窗口之前已结算的窗口）
function statesFor(ws, cap) {
  const nets = ws.map((w) => netOf(w, cap));
  return ws.map((w, i) => {
    const before = nets.slice(0, i);
    if (before.length < 5) return { tier: 3, score: -1e6, note: "样本不足" };
    const roll = [];
    for (let k = 4; k < before.length; k++) { let s = 0; for (let j = k - 4; j <= k; j++) s += before[j]; roll.push(s >= 0 ? 1 : -1); }
    const state = roll[roll.length - 1];
    let len = 1;
    for (let k = roll.length - 2; k >= 0 && roll[k] === state; k--) len++;
    const winRuns = [], loseRuns = [];
    let cur = null;
    roll.forEach((sg) => { if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; (sg === 1 ? winRuns : loseRuns).push(cur); } else cur.len++; });
    const wAvg = avg(winRuns.map((r) => r.len)), lAvg = avg(loseRuns.map((r) => r.len));
    if (state === 1) return { tier: 0, score: wAvg - len, state: 1, len, note: "盈利第" + len + "窗/均值" + wAvg.toFixed(1) };
    if (loseRuns.length >= 3 && len > q(loseRuns.map((r) => r.len), 0.9)) return { tier: 3, score: -1e6, state: -1, len, note: "亏损第" + len + "窗·超p90" };
    return { tier: 1, score: -Math.abs(lAvg - len), state: -1, len, note: "亏损第" + len + "窗/均值" + lAvg.toFixed(1) };
  });
}

function run(plan) {
  const cap = plan === "three" ? 3 : 2;
  const data = {};
  LINES.forEach((l) => { const ws = windowsFor(l, cap); data[l.id] = { line: l, ws, st: statesFor(ws, cap) }; });
  // 按“窗口起始期”分组，每个起始期做一次决策
  const byStart = {};
  LINES.forEach((l) => data[l.id].ws.forEach((w, i) => {
    const k = w.start;
    (byStart[k] = byStart[k] || []).push({ line: l, w, st: data[l.id].st[i] });
  }));
  const starts = Object.keys(byStart).map(Number).sort((a, b) => a - b);
  const res = { all: {}, top5: {}, topOnlyWin: {}, pos9: {} };
  Object.keys(res).forEach((k) => (res[k] = { byYear: {}, cost: 0, net: 0, bets: 0, perLine: {} }));
  starts.forEach((p) => {
    const cands = byStart[p];
    const y = yearOf(p);
    cands.forEach((c) => {
      const n = netOf(c.w, cap), cost = costOf(c.w);
      // 全做
      let a = res.all;
      a.byYear[y] = (a.byYear[y] || 0) + n; a.cost += cost; a.net += n; a.bets++;
      // 固定9条（有未来信息，仅作参考）
      if (POS9[cap].indexOf(c.line.id) >= 0) { let b9 = res.pos9; b9.byYear[y] = (b9.byYear[y] || 0) + n; b9.cost += cost; b9.net += n; b9.bets++; }
    });
    // 规律轮动：按当时状态排队取前5
    const sorted = cands.slice().sort((x, y2) => (x.st.tier !== y2.st.tier) ? x.st.tier - y2.st.tier : y2.st.score - x.st.score);
    sorted.slice(0, 5).forEach((c) => {
      const n = netOf(c.w, cap), cost = costOf(c.w);
      let t = res.top5; t.byYear[y] = (t.byYear[y] || 0) + n; t.cost += cost; t.net += n; t.bets++;
      t.perLine[c.line.label] = (t.perLine[c.line.label] || 0) + n;
    });
    // 严格：只做“盈利状态且没超75%分位”的（可能少于5条）
    sorted.filter((c) => c.st.tier === 0).slice(0, 5).forEach((c) => {
      const n = netOf(c.w, cap), cost = costOf(c.w);
      let s = res.topOnlyWin; s.byYear[y] = (s.byYear[y] || 0) + n; s.cost += cost; s.net += n; s.bets++;
    });
  });
  return res;
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("规律轮动 vs 全做 vs 固定9条：无未来数据的走步回测（2021-2026，2026截至286期）");
log("口径：1:7:15 倍投；窗口规则不变。轮动=每个窗口起始时，仅用当时已结算窗口算状态，按状态排队取前5条。");
log("");
["three", "two"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  const r = run(plan);
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  log("策略 | " + YEARS.map((y) => y + "净收益").join(" | ") + " | 合计净收益 | 总投入 | ROI | 下注窗数");
  log("---|---|---|---|---|---|---");
  [["全做14条", "all"], ["规律轮动前5条", "top5"], ["只做盈利状态(≤5条)", "topOnlyWin"], ["固定9条(含未来信息·参考)", "pos9"]].forEach(([label, key]) => {
    const x = r[key];
    log(label + " | " + YEARS.map((y) => (x.byYear[y] >= 0 ? "+" : "") + Math.round(x.byYear[y] || 0)).join(" | ") +
      " | " + (x.net >= 0 ? "+" : "") + Math.round(x.net) + " | " + Math.round(x.cost) + " | " + (x.cost ? (x.net / x.cost * 100).toFixed(1) : "0.0") + "% | " + x.bets);
  });
  log("");
  log("轮动前5条 各线贡献：" + Object.keys(r.top5.perLine).sort((a, b) => r.top5.perLine[b] - r.top5.perLine[a]).map((k) => k + " " + (r.top5.perLine[k] >= 0 ? "+" : "") + Math.round(r.top5.perLine[k])).join(" ｜ "));
  log("");
});
fs.writeFileSync("_rotation_backtest.md", out.join("\n"));
console.log("已写入 _rotation_backtest.md");
