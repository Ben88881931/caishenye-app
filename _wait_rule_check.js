#!/usr/bin/env node
// 检验"错窗后等该号重新开出再开新窗"这条规则：跟"不等、下一期立刻开新窗"对比
global.window = {};
require("./data.js");
const MODEL = require("./model_core.js");
const D = window.APP_DATA.d;
const STAKES = [100, 700, 1500], ODDS = 1.8;
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

// waitAfterMiss=true → 错窗后等该号重新开出再开新窗（当前规则）
// waitAfterMiss=false → 错窗后下一期立刻开新窗
function run(line, waitAfterMiss) {
  const out = { windows: 0, hits: 0, miss: 0, cost: 0, back: 0, net: 0, dd: 0, peak: 0 };
  let active = null, waiting = null, p = line.kind === "tail" ? 1 : 31, curYear = 0;
  while (p <= D.length) {
    const y = yearOf(p);
    if (y && y !== curYear) { curYear = y; active = null; waiting = null; }
    if (waiting) {
      const t = (D[p - 1].nums || []).map((n) => Number(n) % 10);
      if (t.indexOf(Number(waiting.tail)) >= 0) waiting = null;
      p++; continue;
    }
    if (!active) {
      const tr = line.kind === "tail" ? { tail: line.tail } : pick(p, line.stream);
      if (!tr) { p++; continue; }
      active = { start: p, lockedTail: line.kind === "recommend" ? null : tr.tail, attempts: [] };
    }
    const actual = (D[p - 1].nums || []).map((n) => Number(n) % 10);
    const pk = line.kind === "recommend" ? pick(p, line.stream) : { tail: active.lockedTail };
    const tail = pk ? pk.tail : null;
    const hit = tail != null && actual.indexOf(Number(tail)) >= 0;
    active.attempts.push({ period: p, tail: tail, hit: hit });
    if (hit) {
      active.hitIndex = active.attempts.length;
      out.windows++; out.hits++;
      let c = 0;
      for (let k = 0; k < active.attempts.length; k++) c += STAKES[k];
      out.cost += c; out.back += STAKES[active.attempts.length - 1] * ODDS;
      active = null; p++;
    } else if (active.attempts.length >= 3) {
      out.windows++; out.miss++;
      let c = 0; for (let k = 0; k < 3; k++) c += STAKES[k];
      out.cost += c;
      let wt = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { wt = active.attempts[i].tail; break; }
      active = null; p++;
      if (waitAfterMiss && wt != null) waiting = { tail: wt };
    } else p++;
    out.net = out.back - out.cost;
    if (out.net > out.peak) out.peak = out.net;
    const d = out.peak - out.net;
    if (d > out.dd) out.dd = d;
  }
  out.net = out.back - out.cost;
  return out;
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("规则对比：错窗后【等号重开】vs【不等·立刻开新窗】（2021–2026，1:7:15）");
log("");
log("规则 | 窗口数 | 中窗 | 错窗 | 窗口命中率 | 投入 | 回收 | 净收益 | ROI | 最大回撤");
[["等号重开（当前规则）", true], ["不等·立刻重开", false]].forEach(([label, wait]) => {
  const tot = { windows: 0, hits: 0, miss: 0, cost: 0, back: 0, net: 0, dd: 0 };
  LINES.forEach((l) => {
    const r = run(l, wait);
    tot.windows += r.windows; tot.hits += r.hits; tot.miss += r.miss;
    tot.cost += r.cost; tot.back += r.back; tot.net += r.net; tot.dd += r.dd;
  });
  log([label, tot.windows, tot.hits, tot.miss, (tot.hits / tot.windows * 100).toFixed(1) + "%",
    Math.round(tot.cost), Math.round(tot.back), (tot.net >= 0 ? "+" : "") + Math.round(tot.net),
    (tot.net / tot.cost * 100).toFixed(1) + "%", Math.round(tot.dd)].join(" | "));
});
log("");
log("说明：两条规则下注金额相同（100/700/1500，赔率1.8）；差别只在“三期全错之后”是等号重开还是立刻重开。");
require("fs").writeFileSync("_wait_rule_check.md", out.join("\n"));
console.log("已写入 _wait_rule_check.md");
