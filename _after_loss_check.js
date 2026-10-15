#!/usr/bin/env node
// 检验你的规律：“错1个窗口或2个窗口后，下一个窗口基本上都会命中”——是不是真的比平时更高？
global.window = {};
require("./data.js");
const MODEL = require("./model_core.js");
const D = window.APP_DATA.d;
const STAKES = [100, 700, 1500];
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
// 与 14线规律中心同一套窗口引擎（每年重开、错窗等号重开）
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

function binomTwoSided(k, n, p) {
  const le = (kk) => { let s = 0, c = 1; for (let i = 0; i <= kk; i++) { if (i > 0) c = c * (n - i + 1) / i; s += c * Math.pow(p, i) * Math.pow(1 - p, n - i); } return s; };
  return Math.min(1, 2 * Math.min(le(k), 1 - le(k - 1)));
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
const perLine = [];
LINES.forEach((l) => {
  const seq = windowsFor(l).map((w) => (w.hitIndex > 0 ? 1 : 0));
  if (seq.length < 30) return;
  perLine.push({ label: l.label, seq: seq });
});

// 汇总统计：无条件 vs 连错1/2/3个窗口后的下一个窗口
let stat = { all: { n: 0, h: 0 }, after1: { n: 0, h: 0 }, after2: { n: 0, h: 0 }, after3: { n: 0, h: 0 } };
perLine.forEach((x) => {
  const s = x.seq;
  for (let i = 0; i < s.length; i++) {
    if (i + 1 < s.length) {
      stat.all.n++; if (s[i + 1]) stat.all.h++;          // 每个窗口都算“下一个窗口”的基准
    }
    if (i >= 1 && s[i] === 0 && s[i - 1] === 0 && i + 1 < s.length) { stat.after1.n++; if (s[i + 1]) stat.after1.h++; }
    if (i >= 2 && s[i] === 0 && s[i - 1] === 0 && s[i - 2] === 0 && i + 1 < s.length) { stat.after2.n++; if (s[i + 1]) stat.after2.h++; }
    if (i >= 3 && s[i] === 0 && s[i - 1] === 0 && s[i - 2] === 0 && s[i - 3] === 0 && i + 1 < s.length) { stat.after3.n++; if (s[i + 1]) stat.after3.h++; }
  }
});
const f = (o) => (o.n ? (o.h / o.n * 100).toFixed(1) + "%" : "-");
log("你的规律检验：连错 1 / 2 / 3 个窗口之后，下一个窗口的命中率有没有变高？");
log("口径：14 条线（10尾号+4模型线）用同一套三期窗口引擎，2021–2026 全部窗口，共 " + perLine.length + " 条线。");
log("");
log("情形 | 样本（次） | 下一个窗口中 | 命中率 | 与平时比 | p值");
const baseRate = stat.all.h / stat.all.n;
[["平时（所有窗口）", stat.all], ["前面错 1 个窗口", stat.after1], ["前面连错 2 个窗口", stat.after2], ["前面连错 3 个窗口", stat.after3]].forEach(([label, o]) => {
  if (!o.n) { log(label + " | 0 | - | - | - | -"); return; }
  const p = binomTwoSided(o.h, o.n, baseRate);
  const diff = (o.h / o.n - baseRate) * 100;
  log(label + " | " + o.n + " | " + o.h + " | " + f(o) + " | " + (diff >= 0 ? "+" : "") + diff.toFixed(1) + "pp | " + p.toFixed(3));
});
log("");
log("结论：如果“连错后下一个窗口命中率”比平时高且 p<0.05，你的规律成立；否则就是“平时本来就有这么高”，跟前面错不错没关系。");
require("fs").writeFileSync("_after_loss_check.md", out.join("\n"));
console.log("已写入 _after_loss_check.md");
