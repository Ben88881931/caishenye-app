#!/usr/bin/env node
// 拉出每条线"三期全错 → 等该号重新开出 → 才开新窗"的真实记录（证明规则在跑）
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
const label = (p) => { const r = D[p - 1]; return r ? r.y + "年第" + r.p + "期" : "第" + p + "期"; };
const tailsAt = (p) => (D[p - 1] ? (D[p - 1].nums || []).map((n) => Number(n) % 10) : []);

function episodes(line) {
  const out = [];
  let active = null, waiting = null, p = line.kind === "tail" ? 1 : 31, curYear = 0;
  while (p <= D.length) {
    const y = yearOf(p);
    if (y && y !== curYear) { curYear = y; active = null; waiting = null; }
    if (waiting) {
      const t = tailsAt(p);
      if (t.indexOf(Number(waiting.tail)) >= 0) {
        out.push({ missEnd: waiting.missEnd, waitTail: waiting.tail, reopenSeen: p, newStart: p + 1, waited: p - waiting.missEnd });
        waiting = null;
      }
      p++; continue;
    }
    if (!active) {
      const tr = line.kind === "tail" ? { tail: line.tail } : pick(p, line.stream);
      if (!tr) { p++; continue; }
      active = { start: p, lockedTail: line.kind === "recommend" ? null : tr.tail, attempts: [] };
    }
    const actual = tailsAt(p);
    const pk = line.kind === "recommend" ? pick(p, line.stream) : { tail: active.lockedTail };
    const tail = pk ? pk.tail : null;
    const hit = tail != null && actual.indexOf(Number(tail)) >= 0;
    active.attempts.push({ period: p, tail: tail, hit: hit });
    if (hit) { active = null; p++; }
    else if (active.attempts.length >= 3) {
      let wt = null;
      for (let i = active.attempts.length - 1; i >= 0; i--) if (active.attempts[i].tail != null) { wt = active.attempts[i].tail; break; }
      active = null; p++;
      if (wt != null) waiting = { tail: wt, missEnd: p - 1 };
    } else p++;
  }
  return { eps: out, waiting: waiting, active: active };
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("每条线“三期全错 → 等号重开”的真实记录（最近两次）");
log("");
LINES.forEach((l) => {
  const r = episodes(l);
  const last2 = r.eps.slice(-2);
  const state = r.waiting ? "当前状态：等待尾" + r.waiting.tail + "重新开出（错窗结束于 " + label(r.waiting.missEnd) + "）"
    : (r.active ? "当前状态：窗口进行中，起始 " + label(r.active.start) + "，已检查" + r.active.attempts.length + "期" : "当前状态：无窗口");
  log("【" + l.label + "】" + state);
  if (!last2.length) { log("   暂无“错窗后等重开”的记录"); }
  last2.forEach((e) => {
    log("   错窗结束 " + label(e.missEnd) + " → 等尾" + e.waitTail + " 重新开出（" + label(e.reopenSeen) + "）→ 新窗口从 " + label(e.newStart) + " 开始（等了 " + e.waited + " 期）");
  });
});
require("fs").writeFileSync("_wait_episodes.md", out.join("\n"));
console.log("已写入 _wait_episodes.md");
