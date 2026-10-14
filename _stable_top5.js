// 最优5条到底是“常年稳定”还是“年年换”：入榜频率 + 长期最优组 + 走步/持有检验
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
function costOf(w) { let c = 0; w.attempts.forEach((a, k) => { c += STAKES[k] || 0; }); return c; }

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("最优5条是常年稳定还是年年换？——入榜频率 + 长期最优组 + 三种用法检验");
log("口径：1:7:15，窗口规则不变，2026截至286期");
log("");
["three", "two"].forEach((plan) => {
  const cap = plan === "three" ? 3 : 2;
  const net = {}, cost = {};
  LINES.forEach((l) => {
    const ws = windowsFor(l, cap);
    net[l.id] = {}; cost[l.id] = {};
    YEARS.forEach((y) => {
      const inYear = ws.filter((w) => yearOf(w.start) === y);
      net[l.id][y] = inYear.reduce((s, w) => s + netOf(w, cap), 0);
      cost[l.id][y] = inYear.reduce((s, w) => s + costOf(w), 0);
    });
  });
  const topOf = (ids, years) => ids.slice().sort((a, b) => years.reduce((s, y) => s + net[b][y], 0) - years.reduce((s, y) => s + net[a][y], 0)).slice(0, 5);
  log("========== " + (cap === 3 ? "三期方案（100/700/1500）" : "两期方案（100/700）") + " ==========");
  // 1) 入榜频率：每年进当年最优5条的次数
  const inTop = {};
  LINES.forEach((l) => (inTop[l.id] = { label: l.label, count: 0, years: [] }));
  YEARS.forEach((y) => { topOf(LINES.map((l) => l.id), [y]).forEach((id) => { inTop[id].count++; inTop[id].years.push(y); }); });
  const freq = LINES.slice().sort((a, b) => inTop[b.id].count - inTop[a.id].count);
  log("每年最优5条的入榜次数（6年最多6次）：");
  freq.forEach((l) => {
    const f = inTop[l.id];
    const total = YEARS.reduce((s, y) => s + net[l.id][y], 0);
    log("  " + l.label.padEnd(9) + " 入榜 " + f.count + "/6" + (f.years.length ? "（" + f.years.join(",") + "）" : "") +
      " · 六年合计 " + (total >= 0 ? "+" : "") + Math.round(total));
  });
  // 2) 长期最优组（2021-2025累计）与它逐年表现
  const longIds = topOf(LINES.map((l) => l.id), [2021, 2022, 2023, 2024, 2025]);
  const longSum = [2021, 2022, 2023, 2024, 2025].reduce((s, y) => s + longIds.reduce((a, id) => a + net[id][y], 0), 0);
  log("");
  log("2021-2025累计最优5条：" + longIds.map((id) => inTop[id].label).join("、") + " · 五年合计 " + (longSum >= 0 ? "+" : "") + Math.round(longSum));
  log("  逐年：" + YEARS.map((y) => y + " " + (longIds.reduce((a, id) => a + net[id][y], 0) >= 0 ? "+" : "") + Math.round(longIds.reduce((a, id) => a + net[id][y], 0))).join(" ｜ "));
  // 3) 三种用法
  function evalGroup(ids, years) {
    let s = 0, c = 0;
    years.forEach((y) => ids.forEach((id) => { s += net[id][y]; c += cost[id][y]; }));
    return { net: s, cost: c, roi: c ? s / c : 0 };
  }
  const early = topOf(LINES.map((l) => l.id), [2021, 2022]);
  const hold = evalGroup(early, [2023, 2024, 2025, 2026]);
  log("");
  log("用法A【固定持有】用2021-2022最优5条（" + early.map((id) => inTop[id].label).join("、") + "）一直打到2026：" +
    (hold.net >= 0 ? "+" : "") + Math.round(hold.net) + " · ROI " + (hold.roi * 100).toFixed(1) + "%");
  let walk = { net: 0, cost: 0 }, detail = [];
  [2023, 2024, 2025, 2026].forEach((y) => {
    const ids = topOf(LINES.map((l) => l.id), YEARS.filter((yy) => yy < y));
    const e = evalGroup(ids, [y]);
    walk.net += e.net; walk.cost += e.cost;
    detail.push(y + " 用" + YEARS.filter((yy) => yy < y).join("-") + "累计最优(" + ids.map((id) => inTop[id].label).join("、") + ") → " + (e.net >= 0 ? "+" : "") + Math.round(e.net));
  });
  log("用法B【走步换组】每年用“到上一年为止累计最优5条”：");
  detail.forEach((d) => log("  " + d));
  log("  四年合计 " + (walk.net >= 0 ? "+" : "") + Math.round(walk.net) + " · ROI " + (walk.cost ? (walk.net / walk.cost * 100).toFixed(1) : "0.0") + "%");
  const allSix = evalGroup(topOf(LINES.map((l) => l.id), YEARS), YEARS);
  log("用法C【事后全期最优】用6年累计最优5条（不可能提前知道）：" + (allSix.net >= 0 ? "+" : "") + Math.round(allSix.net) + " · ROI " + (allSix.roi * 100).toFixed(1) + "%");
  log("");
});
fs.writeFileSync("_stable_top5.md", out.join("\n"));
console.log("已写入 _stable_top5.md");
