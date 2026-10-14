// 每年最优5条线：逐年选出当年最赚的5条，并检验“用上一年最优5条打今年”的无未来数据策略
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
function netOf(w, cap) { let c = 0; w.attempts.forEach((a, k) => { c += STAKES[k] || 0; }); const h = (w.hitIndex > 0 && w.hitIndex <= cap) ? w.hitIndex : 0; return (h ? STAKES[h - 1] * ODDS : 0) - c; }

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("每年最优5条线（两套方案各自算）· 同时检验“用上一年最优5条打今年”");
log("口径：1:7:15，窗口规则不变，2026截至286期；每年最优=该年净收益最高的5条（事后对照，不是可执行策略）");
log("");
["three", "two"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  const perLine = {};
  LINES.forEach((l) => {
    const ws = windowsFor(l, cap);
    perLine[l.id] = { label: l.label };
    YEARS.forEach((y) => {
      const nets = ws.filter((w) => yearOf(w.start) === y).map((w) => netOf(w, cap));
      perLine[l.id][y] = nets.reduce((a, b) => a + b, 0);
    });
  });
  const topByYear = {}, botByYear = {};
  YEARS.forEach((y) => {
    const sorted = LINES.slice().sort((a, b) => perLine[b.id][y] - perLine[a.id][y]);
    topByYear[y] = sorted.slice(0, 5).map((l) => l.id);
    botByYear[y] = sorted.slice(-5).map((l) => l.id);
  });
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  log("年份 | 当年最优5条 | 这5条当年合计 | 当年最差5条 | 这5条当年合计");
  log("---|---|---|---|---");
  YEARS.forEach((y) => {
    const t = topByYear[y], b = botByYear[y];
    const tn = t.reduce((s, id) => s + perLine[id][y], 0);
    const bn = b.reduce((s, id) => s + perLine[id][y], 0);
    log(y + " | " + t.map((id) => perLine[id].label).join("、") + " | " + (tn >= 0 ? "+" : "") + Math.round(tn) +
      " | " + b.map((id) => perLine[id].label).join("、") + " | " + (bn >= 0 ? "+" : "") + Math.round(bn));
  });
  log("");
  // 无未来数据：当年用“上一年最优5条”
  let sum = 0; let cost = 0;
  log("上一年最优5条 → 打今年（无未来数据）");
  YEARS.forEach((y) => {
    if (y === 2021) { log("  " + y + "：无上年数据，跳过"); return; }
    const use = topByYear[y - 1];
    const n = use.reduce((s, id) => s + perLine[id][y], 0);
    const c = use.reduce((s, id) => { const ws = windowsFor(LINES.filter((l) => l.id === id)[0], cap).filter((w) => yearOf(w.start) === y); return s + ws.reduce((x, w) => x + (w.attempts || []).reduce((a, _, k) => a + (STAKES[k] || 0), 0), 0); }, 0);
    sum += n; cost += c;
    log("  " + y + "：用" + (y - 1) + "年最优（" + use.map((id) => perLine[id].label).join("、") + "）→ " + (n >= 0 ? "+" : "") + Math.round(n));
  });
  log("  五年合计 " + (sum >= 0 ? "+" : "") + Math.round(sum) + " · 投入 " + Math.round(cost) + " · ROI " + (cost ? (sum / cost * 100).toFixed(1) : "0.0") + "%");
  const overlap = [];
  for (let i = 1; i < YEARS.length; i++) {
    const a = topByYear[YEARS[i - 1]], b = topByYear[YEARS[i]];
    overlap.push(YEARS[i] + " 保留 " + b.filter((id) => a.indexOf(id) >= 0).length + "/5");
  }
  log("  每年最优5条的重合度：" + overlap.join(" ｜ "));
  log("");
});
fs.writeFileSync("_yearly_top5.md", out.join("\n"));
console.log("已写入 _yearly_top5.md");
