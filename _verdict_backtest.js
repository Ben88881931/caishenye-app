// 窗口体检下单：逐窗判断“该不该下、下多重”，无未来数据走步回测
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
// 指定注码表算一个窗口的盈亏
function netWith(w, cap, stakes) {
  let c = 0;
  for (let k = 0; k < w.attempts.length && k < cap; k++) c += stakes[k] || 0;
  const h = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0;
  return (h ? (stakes[h - 1] || 0) * ODDS : 0) - c;
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// 体检规则：只看“这个窗口开始之前”已经结算的窗口
function verdictsFor(ws, cap) {
  const nets = ws.map((w) => netWith(w, cap, FULL));
  return ws.map((w, i) => {
    const before = nets.slice(0, i);
    if (before.length < 5) return { verdict: "样本不足", stakes: null };
    const roll = [];
    for (let k = 4; k < before.length; k++) { let s = 0; for (let j = k - 4; j <= k; j++) s += before[j]; roll.push(s >= 0 ? 1 : -1); }
    const state = roll[roll.length - 1];
    let len = 1;
    for (let k = roll.length - 2; k >= 0 && roll[k] === state; k--) len++;
    const winRuns = [], loseRuns = [];
    let cur = null;
    roll.forEach((sg) => { if (!cur || cur.sign !== sg) { cur = { sign: sg, len: 1 }; (sg === 1 ? winRuns : loseRuns).push(cur); } else cur.len++; });
    const winLens = winRuns.map((r) => r.len), loseLens = loseRuns.map((r) => r.len);
    if (state === 1) {
      if (len <= q(winLens, 0.75) || winLens.length < 4) return { verdict: "正常下注", stakes: FULL, state: 1, len };
      return { verdict: "轻仓(见顶)", stakes: HALF, state: 1, len };
    }
    const l75 = q(loseLens, 0.75), l90 = q(loseLens, 0.9);
    if (loseLens.length >= 4 && len > l90) return { verdict: "停(超退出线)", stakes: null, state: -1, len };
    if (loseLens.length >= 4 && len > l75) return { verdict: "轻仓(接近翻转)", stakes: HALF, state: -1, len };
    return { verdict: "不下(亏损期)", stakes: null, state: -1, len };
  });
}

function run(plan) {
  const cap = plan === "three" ? 3 : 2;
  const per = {};
  LINES.forEach((l) => { const ws = windowsFor(l, cap); per[l.id] = { line: l, ws, v: verdictsFor(ws, cap) }; });
  const res = { byYear: {}, cost: 0, net: 0, bets: 0, skip: 0, perLine: {}, full: {}, fullNet: 0, fullCost: 0, fullByYear: {} };
  LINES.forEach((l) => { res.full[l.id] = 0; });
  LINES.forEach((l) => {
    per[l.id].ws.forEach((w, i) => {
      const y = yearOf(w.start);
      const fullNet = netWith(w, cap, FULL);
      res.fullNet += fullNet; res.fullCost += w.attempts.reduce((s, _, k) => s + (FULL[k] || 0), 0);
      res.fullByYear[y] = (res.fullByYear[y] || 0) + fullNet;
      res.full[l.id] += fullNet;
      const verdict = per[l.id].v[i];
      if (!verdict.stakes) { res.skip++; return; }
      const n = netWith(w, cap, verdict.stakes);
      const c = w.attempts.reduce((s, _, k) => s + (verdict.stakes[k] || 0), 0);
      res.byYear[y] = (res.byYear[y] || 0) + n; res.cost += c; res.net += n; res.bets++;
      res.perLine[l.label] = (res.perLine[l.label] || 0) + n;
    });
  });
  // 严格版：只做“正常下注”的窗口，轻仓窗口也不下
  const strict = { byYear: {}, cost: 0, net: 0, bets: 0 };
  LINES.forEach((l) => {
    per[l.id].ws.forEach((w, i) => {
      const y = yearOf(w.start);
      const verdict = per[l.id].v[i];
      if (!verdict.stakes || verdict.verdict !== "正常下注") return;
      const n = netWith(w, cap, FULL);
      const c = w.attempts.reduce((s, _, k) => s + (FULL[k] || 0), 0);
      strict.byYear[y] = (strict.byYear[y] || 0) + n; strict.cost += c; strict.net += n; strict.bets++;
    });
  });
  res.strict = strict;
  return res;
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("窗口体检下单（走步回测）：逐窗判断该不该下、下多重");
log("规则：盈利状态且在p75内→正常100/700(/1500)；盈利但超p75→轻仓100/300(/700)；");
log("      亏损状态但没超p75→不下；亏损p75~p90→轻仓试；亏损超p90→停。只用该窗口之前已结算的窗口。");
log("");
["three", "two"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  const r = run(plan);
  log("========== " + (cap === 3 ? "三期方案" : "两期方案") + " ==========");
  log("策略 | " + YEARS.map((y) => y + "净收益").join(" | ") + " | 合计 | 投入 | ROI | 下注窗/跳过窗");
  log("---|---|---|---|---|---|---");
  log("窗口体检下单 | " + YEARS.map((y) => (r.byYear[y] >= 0 ? "+" : "") + Math.round(r.byYear[y] || 0)).join(" | ") +
    " | " + (r.net >= 0 ? "+" : "") + Math.round(r.net) + " | " + Math.round(r.cost) + " | " + (r.cost ? (r.net / r.cost * 100).toFixed(1) : "0") + "% | " + r.bets + "/" + r.skip);
  log("全做14条（对照） | " + YEARS.map((y) => (r.fullByYear[y] >= 0 ? "+" : "") + Math.round(r.fullByYear[y] || 0)).join(" | ") + " | " + (r.fullNet >= 0 ? "+" : "") + Math.round(r.fullNet) + " | " + Math.round(r.fullCost) + " | " + (r.fullCost ? (r.fullNet / r.fullCost * 100).toFixed(1) : "0") + "% | -");
  log("体检严格版(只正常下注) | " + YEARS.map((y) => (r.strict.byYear[y] >= 0 ? "+" : "") + Math.round(r.strict.byYear[y] || 0)).join(" | ") + " | " + (r.strict.net >= 0 ? "+" : "") + Math.round(r.strict.net) + " | " + Math.round(r.strict.cost) + " | " + (r.strict.cost ? (r.strict.net / r.strict.cost * 100).toFixed(1) : "0") + "% | " + r.strict.bets);
  log("");
  log("体检后各线净收益：" + Object.keys(r.perLine).sort((a, b) => r.perLine[b] - r.perLine[a]).map((k) => k + " " + (r.perLine[k] >= 0 ? "+" : "") + Math.round(r.perLine[k])).join(" ｜ "));
  log("");
});
fs.writeFileSync("_verdict_backtest.md", out.join("\n"));
console.log("已写入 _verdict_backtest.md");
