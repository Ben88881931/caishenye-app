// 当年稳不稳定：一年之内“年内累计前5名”换了几次、什么时候定型、半年榜与年终榜重合多少
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
log("当年稳不稳定：一年之内“年内累计净收益前5名”的换榜次数与定型时间");
log("口径：1:7:15，窗口规则不变；每期按当年累计净收益重新排名，前5名集合变化一次算换榜一次。2026截至286期。");
log("");
["three", "two"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  const data = {};
  LINES.forEach((l) => {
    const ws = windowsFor(l, cap);
    data[l.id] = { label: l.label, byYear: {} };
    YEARS.forEach((y) => {
      const list = ws.filter((w) => yearOf(w.start) === y).map((w) => {
        const gp = Number(w.attempts[w.attempts.length - 1].period);   // 全表序号
        const local = D[gp - 1] ? Number(D[gp - 1].p) : gp;            // 当年第几期
        return { period: local, net: netOf(w, cap) };
      }).sort((a, b) => a.period - b.period);
      data[l.id].byYear[y] = list;
    });
  });
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  log("年份 | 全年期数 | 换榜次数 | 最后一次换榜(第几期) | 定型进度 | 半年榜 vs 年终榜 | 年终前5名");
  log("---|---|---|---|---|---|---");
  const changesAll = [], settlePctAll = [], overlapAll = [];
  YEARS.forEach((y) => {
    const periodCount = D.filter((r) => Number(r.y) === y).length;
    // 每期的累计净收益
    const cum = {};
    LINES.forEach((l) => { cum[l.id] = 0; });
    const timeline = [];
    const events = [];
    LINES.forEach((l) => data[l.id].byYear[y].forEach((w) => events.push({ period: w.period, id: l.id, net: w.net })));
    events.sort((a, b) => a.period - b.period);
    let idx = 0;
    for (let p = 1; p <= periodCount; p++) {
      while (idx < events.length && events[idx].period <= p) { cum[events[idx].id] += events[idx].net; idx++; }
      const sorted = LINES.map((l) => ({ id: l.id, v: cum[l.id] })).sort((a, b) => b.v - a.v);
      timeline.push(sorted.slice(0, 5).map((x) => x.id).join(","));
    }
    let changes = 0, lastChange = 0, prev = timeline[0];
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i] !== prev) { changes++; lastChange = i + 1; prev = timeline[i]; }
    }
    const finalSet = timeline[timeline.length - 1].split(",");
    const halfSet = timeline[Math.floor(timeline.length / 2)].split(",");
    const overlap = halfSet.filter((id) => finalSet.indexOf(id) >= 0).length;
    const settlePct = periodCount ? (lastChange / periodCount * 100) : 0;
    changesAll.push(changes); settlePctAll.push(settlePct); overlapAll.push(overlap);
    log(y + " | " + periodCount + " | " + changes + " | " + lastChange + " | " + settlePct.toFixed(0) + "% | " +
      overlap + "/5 | " + finalSet.map((id) => data[id].label).join("、"));
  });
  const avg = (a) => (a.reduce((x, y2) => x + y2, 0) / a.length);
  log("平均 | - | **" + avg(changesAll).toFixed(1) + " 次** | - | **" + avg(settlePctAll).toFixed(0) + "%** | " + avg(overlapAll).toFixed(1) + "/5 | -");
  log("");
});
fs.writeFileSync("_intra_year.md", out.join("\n"));
console.log("已写入 _intra_year.md");
