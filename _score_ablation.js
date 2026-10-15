#!/usr/bin/env node
// 打分层消融：模型选号其实是 4 条硬编码 if（连出4/连出3/5期3次/7期4次+固定分）。
// 这里逐个改优先级/分数/标签集合，看推荐和命中率变不变。
const raw = require("./lottery_data.json");
const periods = Object.keys(raw).map(Number).sort((a, b) => a - b);
const hit = (p, d) => (raw[String(p)] || "")[d] === "1";
const tailsOf = (p) => { const o = []; for (let d = 0; d < 10; d++) if (hit(p, d)) o.push(d); return o; };
const cnt = (d, a, b) => { let c = 0; for (let p = a; p <= b; p++) if (hit(p, d)) c++; return c; };

function featsFor(cur) {
  const out = [];
  for (let d = 0; d <= 9; d++) {
    let streak = 0;
    for (let p = cur; p >= 1; p--) { if (hit(p, d)) streak++; else break; }
    const c5 = cnt(d, Math.max(1, cur - 4), cur);
    const c7 = cnt(d, Math.max(1, cur - 6), cur);
    let tag = null, score = 0;
    if (streak === 4) { tag = "连出4"; score = 95.3; }
    else if (streak === 3) { tag = "连出3"; score = 93.9; }
    else if (c5 === 3) { tag = "5期3次"; score = 92.5; }
    else if (c7 === 4) { tag = "7期4次"; score = 92.1; }
    if (tag) out.push({ d, streak, c5, c7, tag, score });
  }
  return out;
}

const RULES = {
  "基线（连出4>连出3>5期3次>7期4次）": (f) => f.score,
  "等权（四标签同分，按尾号小优先）": () => 1,
  "只留 连出4": (f) => (f.tag === "连出4" ? 1 : 0),
  "只留 连出3": (f) => (f.tag === "连出3" ? 1 : 0),
  "只留 5期3次": (f) => (f.tag === "5期3次" ? 1 : 0),
  "只留 7期4次": (f) => (f.tag === "7期4次" ? 1 : 0),
  "反向：连出3 优先于 连出4": (f) => (f.tag === "连出4" ? 92 : f.tag === "连出3" ? 96 : f.score),
};

function picksFor(cur, scorer) {
  const list = featsFor(cur).map((f) => ({ d: f.d, sc: scorer(f), tag: f.tag })).filter((x) => x.sc > 0);
  list.sort((a, b) => b.sc - a.sc || a.d - b.d);
  return list.slice(0, 2);
}

function evaluate(scorer, label) {
  let n = 0, d1 = 0, d2 = 0;
  const perPeriod = [];
  const last = periods[periods.length - 1];
  for (let p = 32; p <= last; p++) {
    const picks = picksFor(p - 1, scorer);
    const actual = tailsOf(p);
    const h1 = picks[0] ? actual.indexOf(picks[0].d) >= 0 : false;
    const h2 = picks[1] ? actual.indexOf(picks[1].d) >= 0 : false;
    n++; if (h1) d1++; if (h2) d2++;
    perPeriod.push({ p: p, hit: h1, has: !!picks[0] });
  }
  let wN = 0, wH = 0, i = 0;
  const acted = perPeriod.filter((x) => x.has);
  while (i < acted.length) {
    const blk = acted.slice(i, i + 3);
    if (!blk.length) break;
    wN++; if (blk.some((x) => x.hit)) wH++;
    i += 3;
  }
  return { label: label, n: n, d1: d1, d2: d2, p1: d1 / n, p2: d2 / n, wN: wN, wH: wH, wr: wN ? wH / wN : 0 };
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("打分层消融（模型选号 = 4 条硬编码 if；样本 32–288 期）");
log("");
log("规则 | D1单尾 | D2单尾 | 三期窗口(首推) | 窗数");
const rows = Object.keys(RULES).map((label) => evaluate(RULES[label], label));
rows.forEach((r) => log([r.label, (r.p1 * 100).toFixed(1) + "%", (r.p2 * 100).toFixed(1) + "%", (r.wr * 100).toFixed(1) + "%", r.wN + "窗"].join(" | ")));
let base = 0, m = 0;
const lastP = periods[periods.length - 1];
for (let p = 32; p <= lastP; p++) { base += tailsOf(p).length / 10; m++; }
base /= m;
log("");
log("随机挑一个尾号的基准：" + (base * 100).toFixed(1) + "%（同区间）");
const b = rows[0];
log("");
log("相对基线（当前模型）的变化：");
rows.slice(1).forEach((r) => log("  " + r.label + "：D1 " + ((r.p1 - b.p1) * 100 >= 0 ? "+" : "") + ((r.p1 - b.p1) * 100).toFixed(1) + "pp · 窗口 " +
  ((r.wr - b.wr) * 100 >= 0 ? "+" : "") + ((r.wr - b.wr) * 100).toFixed(1) + "pp"));
require("fs").writeFileSync("_score_ablation.md", out.join("\n"));
console.log("已写入 _score_ablation.md");
