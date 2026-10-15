// 首推(D1)命中率诊断：分区间看真实命中 vs 随机基准、按等级看、滚动看
const core = require("./model_core.js");
const sel = require("./model_selector.js");
const raw = require("./lottery_data.json");
const model = core.createModel(raw);
const rows = sel.buildSignals(raw, model, { startPeriod: 31 });
const byP = {};
rows.forEach((r) => (byP[r.period] = r));
const periods = Object.keys(byP).map(Number).sort((a, b) => a - b);
const tailsOf = (p) => (raw[String(p)] || "").split("").reduce((acc, bit, i) => { if (bit === "1") acc.push(i); return acc; }, []);
// 每期随机基准
const base1 = {}, base2 = {};
periods.forEach((p) => {
  const d = tailsOf(p).length;
  base1[p] = d / 10;
  base2[p] = 1 - ((10 - d) * (9 - d)) / 90;
});
function stats(range, label) {
  let n = 0, d1 = 0, d2 = 0, any = 0, b1 = 0, b2 = 0;
  range.forEach((p) => {
    const r = byP[p]; if (!r) return;
    n++;
    const h1 = r.D1 && r.D1.hit, h2 = r.D2 && r.D2.hit;
    if (h1) d1++; if (h2) d2++; if (h1 || h2) any++;
    b1 += base1[p]; b2 += base2[p];
  });
  const f = (x) => (x / n * 100).toFixed(1) + "%";
  console.log(label.padEnd(22) + "期数 " + String(n).padStart(3) +
    " | D1 " + f(d1) + "(随机 " + (b1 / n * 100).toFixed(1) + "%)" +
    " | D2 " + f(d2) + "(随机 " + (b2 / n * 100).toFixed(1) + "%)" +
    " | 至少中一 " + f(any));
}
console.log("=== 首推 D1 命中率诊断（走步重建，和页面/快照同一模型）===");
stats(periods, "全部");
stats(periods.filter((p) => p <= 261), "2026年 1-261期");
stats(periods.filter((p) => p >= 262), "2026年 262-288期(真实快照)");
stats(periods.slice(-50), "最近50期");
stats(periods.slice(-30), "最近30期");
stats(periods.slice(-10), "最近10期");
// 分块看最近 80 期
console.log("\n最近80期每10期一块：");
const last80 = periods.slice(-80);
for (let i = 0; i < last80.length; i += 10) {
  const blk = last80.slice(i, i + 10);
  const n = blk.length, h1 = blk.filter((p) => byP[p].D1 && byP[p].D1.hit).length, h2 = blk.filter((p) => byP[p].D2 && byP[p].D2.hit).length;
  console.log("  " + blk[0] + "-" + blk[blk.length - 1] + "期：D1 " + h1 + "/" + n + " · D2 " + h2 + "/" + n);
}
// 按等级
console.log("\n按等级（最近27期 vs 全部）：");
function gradeStats(range, label) {
  const g = {};
  range.forEach((p) => {
    const r = byP[p]; if (!r) return;
    [["D1", r.D1], ["D2", r.D2]].forEach(([k, pick]) => {
      if (!pick) return;
      const key = k + "-" + (pick.grade || "?");
      g[key] = g[key] || { n: 0, h: 0 };
      g[key].n++; if (pick.hit) g[key].h++;
    });
  });
  console.log("  " + label + "：" + Object.keys(g).sort().map((k) => k + " " + g[k].h + "/" + g[k].n + "(" + (g[k].h / g[k].n * 100).toFixed(0) + "%)").join(" · "));
}
gradeStats(periods, "全部");
gradeStats(periods.filter((p) => p >= 262), "262-288");
// 二项检验：最近27期 D1 命中数 vs 前段命中率
const prev = periods.filter((p) => p <= 261);
const prevHit = prev.filter((p) => byP[p].D1 && byP[p].D1.hit).length / prev.length;
const rec = periods.filter((p) => p >= 262);
const recHit = rec.filter((p) => byP[p].D1 && byP[p].D1.hit).length;
function binomLE(k, n, p) { let s = 0, c = 1; for (let i = 0; i <= k; i++) { if (i > 0) c = c * (n - i + 1) / i; s += c * Math.pow(p, i) * Math.pow(1 - p, n - i); } return s; }
console.log("\n统计检验：");
console.log("  前段(31-261) D1 命中率 " + (prevHit * 100).toFixed(1) + "% · 最近27期 " + recHit + "/" + rec.length + " = " + (recHit / rec.length * 100).toFixed(1) + "%");
console.log("  若真实命中率=前段水平，" + recHit + "/" + rec.length + " 或更差的概率 p=" + binomLE(recHit, rec.length, prevHit).toFixed(4));
console.log("  随机基准(同期) " + (rec.reduce((s, p) => s + base1[p], 0) / rec.length * 100).toFixed(1) + "% · 最近27期 D1 比随机 " +
  ((recHit / rec.length - rec.reduce((s, p) => s + base1[p], 0) / rec.length) * 100).toFixed(1) + " 个百分点");
