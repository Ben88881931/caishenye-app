#!/usr/bin/env node
// 逐条线算规律：连错 1/2/3 个窗口之后，下一个窗口的命中率（每条线单独看，不合并）
global.window = {};
require("./data.js");
const MODEL = require("./model_core.js");
const D = window.APP_DATA.d;
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
function windowsFor(line) {
  const rows = []; let active = null, waiting = null, p = line.kind === "tail" ? 1 : 31, curYear = 0;
  while (p <= D.length) {
    const y = yearOf(p); if (y && y !== curYear) { curYear = y; active = null; waiting = null; }
    if (waiting) { const t = (D[p - 1].nums || []).map((n) => Number(n) % 10); if (t.indexOf(Number(waiting.tail)) >= 0) waiting = null; p++; continue; }
    if (!active) { const tr = line.kind === "tail" ? { tail: line.tail } : pick(p, line.stream); if (!tr) { p++; continue; } active = { start: p, lockedTail: line.kind === "recommend" ? null : tr.tail, attempts: [] }; }
    const actual = (D[p - 1].nums || []).map((n) => Number(n) % 10);
    const pk = line.kind === "recommend" ? pick(p, line.stream) : { tail: active.lockedTail };
    const tail = pk ? pk.tail : null;
    const hit = tail != null && actual.indexOf(Number(tail)) >= 0;
    active.attempts.push({ period: p, tail: tail, hit: hit });
    if (hit) { active.hitIndex = active.attempts.length; rows.push(active); active = null; p++; }
    else if (active.attempts.length >= 3) {
      active.hitIndex = 0; rows.push(active);
      let wt = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { wt = active.attempts[i].tail; break; }
      active = null; p++;
      if (wt != null) waiting = { tail: wt };
    } else p++;
  }
  return rows;
}
const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("逐条线窗口规律：连错 1 / 2 / 3 个窗口之后，下一个窗口的命中率（2021–2026，每条线单独算）");
log("");
log("线路 | 窗口数 | 平时命中率 | 错1个后(样本) | 错2个后(样本) | 错3个后(样本) | 该线最多连错");
const rows = [];
LINES.forEach((l) => {
  const seq = windowsFor(l).map((w) => (w.hitIndex > 0 ? 1 : 0));
  if (!seq.length) return;
  const N = seq.length, H = seq.filter((x) => x === 1).length;
  const cond = { 1: { n: 0, h: 0 }, 2: { n: 0, h: 0 }, 3: { n: 0, h: 0 } };
  let run = 0, maxRun = 0;
  seq.forEach((x) => { if (x === 0) { run++; if (run > maxRun) maxRun = run; } else run = 0; });
  for (let i = 0; i < seq.length; i++) {
    if (i + 1 >= seq.length) break;
    for (const k of [1, 2, 3]) {
      if (i + 1 - k < 0) continue;
      let allMiss = true;
      for (let j = i - k + 1; j <= i; j++) if (seq[j] !== 0) { allMiss = false; break; }
      if (allMiss) { cond[k].n++; if (seq[i + 1]) cond[k].h++; }
    }
  }
  const pct = (h, n) => (n ? (h / n * 100).toFixed(0) + "%" : "-");
  rows.push({ label: l.label, N: N, base: H / N, c1: cond[1], c2: cond[2], c3: cond[3], maxRun: maxRun });
});
rows.forEach((r) => {
  log([r.label, r.N + "窗", (r.base * 100).toFixed(1) + "%",
    (r.c1.n ? (r.c1.h / r.c1.n * 100).toFixed(0) + "%(" + r.c1.n + ")" : "-(0)"),
    (r.c2.n ? (r.c2.h / r.c2.n * 100).toFixed(0) + "%(" + r.c2.n + ")" : "-(0)"),
    (r.c3.n ? (r.c3.h / r.c3.n * 100).toFixed(0) + "%(" + r.c3.n + ")" : "-(0)"),
    r.maxRun].join(" | "));
});
const tot = rows.reduce((a, r) => ({ N: a.N + r.N, c1n: a.c1n + r.c1.n, c2n: a.c2n + r.c2.n, c3n: a.c3n + r.c3.n, c1h: a.c1h + r.c1.h, c2h: a.c2h + r.c2.h, c3h: a.c3h + r.c3.h }), { N: 0, c1n: 0, c2n: 0, c3n: 0, c1h: 0, c2h: 0, c3h: 0 });
log("");
log("14条线合计：错1个后 " + tot.c1h + "/" + tot.c1n + " · 错2个后 " + tot.c2h + "/" + tot.c2n + " · 错3个后 " + tot.c3h + "/" + tot.c3n);
log("→ 单看任何一条线：连错2次以上的样本只有个位数，凑不出「规律」；只有把14条线合并才有统计意义。");
require("fs").writeFileSync("_per_line_loss_pattern.md", out.join("\n"));
console.log("已写入 _per_line_loss_pattern.md");
