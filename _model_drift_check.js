#!/usr/bin/env node
// 模型漂移监控：滑窗命中率 vs 长期基线 + 随机基准，显著下滑就报警（每日审计用）
const core = require("./model_core.js");
const sel = require("./model_selector.js");
const raw = require("./lottery_data.json");
const model = core.createModel(raw);
const rows = sel.buildSignals(raw, model, { startPeriod: 31 });
const byP = {}; rows.forEach((r) => (byP[r.period] = r));
const periods = Object.keys(byP).map(Number).sort((a, b) => a - b);
const tails = (p) => (raw[String(p)] || "").split("").reduce((a, b, i) => { if (b === "1") a.push(i); return a; }, []);
function binomLE(k, n, p) { let s = 0, c = 1; for (let i = 0; i <= k; i++) { if (i > 0) c = c * (n - i + 1) / i; s += c * Math.pow(p, i) * Math.pow(1 - p, n - i); } return s; }
function hit(p, stream) { const r = byP[p]; const pick = stream === "D1" ? r.D1 : r.D2; return !!(pick && pick.hit); }
function stats(range, label) {
  const n = range.length;
  const d1 = range.filter((p) => hit(p, "D1")).length;
  const d2 = range.filter((p) => hit(p, "D2")).length;
  const any = range.filter((p) => hit(p, "D1") || hit(p, "D2")).length;
  const b1 = range.reduce((s, p) => s + tails(p).length / 10, 0) / n;
  const b2 = range.reduce((s, p) => s + (1 - ((10 - tails(p).length) * (9 - tails(p).length)) / 90), 0) / n;
  return { n, d1, d2, any, r1: d1 / n, r2: d2 / n, ra: any / n, b1, b2 };
}
const all = stats(periods, "全部");
const prior = stats(periods.filter((p) => p <= 261), "前段");
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };
log("模型漂移监控（走步重建，口径=每期首推/备选是否命中）");
log("区间".padEnd(20) + "期数".padStart(5) + "D1命中".padStart(10) + "D1-随机".padStart(10) + "D2命中".padStart(10) + "至少中一".padStart(10));
[["全部(31起)", all], ["前段(31-261)", prior]].forEach(([label, s]) => {
  log(label.padEnd(20) + String(s.n).padStart(5) + (s.r1 * 100).toFixed(1).padStart(9) + "%" + (s.b1 * 100).toFixed(1).padStart(9) + "%" +
    (s.r2 * 100).toFixed(1).padStart(9) + "%" + (s.ra * 100).toFixed(1).padStart(9) + "%");
});
let alarm = 0;
[30, 50, 100].forEach((w) => {
  const s = stats(periods.slice(-w), "最近" + w);
  const pValue = binomLE(s.d1, s.n, prior.r1);
  const flag = pValue < 0.05 && s.r1 < prior.r1;
  if (flag) alarm++;
  log(("最近" + w + "期").padEnd(20) + String(s.n).padStart(5) + (s.r1 * 100).toFixed(1).padStart(9) + "%" + (s.b1 * 100).toFixed(1).padStart(9) + "%" +
    (s.r2 * 100).toFixed(1).padStart(9) + "%" + (s.ra * 100).toFixed(1).padStart(9) + "%" +
    "  对比前段 " + (prior.r1 * 100).toFixed(1) + "% → p=" + pValue.toFixed(4) + (flag ? " ⚠报警" : ""));
});
log("");
log("结论：" + (alarm ? "D1 首推出现显著下滑（" + alarm + " 个滑窗 p<0.05）→ 建议 D1 降权/只跟 D2，并继续影子观察" : "未发现显著漂移"));
process.exit(alarm ? 2 : 0);
