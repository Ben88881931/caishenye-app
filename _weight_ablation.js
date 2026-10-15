#!/usr/bin/env node
// 权重消融测试：逐个改动模型各环节的参数，看命中率/窗口命中率变不变（诊断用，不用于调参）
const core = require("./model_core.js");
const sel = require("./model_selector.js");
const raw = require("./lottery_data.json");
const model = core.createModel(raw);
const base = Object.assign({}, sel.DEFAULT_OPTIONS, { startPeriod: 31 });

const VARIANTS = [
  { name: "基线（当前默认）", opt: {} },
  { name: "平滑 alpha=1（弱）", opt: { alpha: 1 } },
  { name: "平滑 alpha=20（强）", opt: { alpha: 20 } },
  { name: "平滑 alpha=100（极强）", opt: { alpha: 100 } },
  { name: "过热线=4（更早降权）", opt: { hotStreakLimit: 4 } },
  { name: "过热线=6（更晚降权）", opt: { hotStreakLimit: 6 } },
  { name: "过热降权=关闭", opt: { hotStreakLimit: 99 } },
  { name: "双号分门槛=0（关闭）", opt: { minDoubleScore: 0 } },
  { name: "双号分门槛=95", opt: { minDoubleScore: 95 } },
  { name: "基准率过滤=关闭", opt: { baseEligibleEnabled: false } },
];

function run(opt) {
  const opts = Object.assign({}, base, opt);
  const rows = sel.buildSignals(raw, model, opts);
  const d1 = rows.filter((r) => r.D1);
  const d2 = rows.filter((r) => r.D2);
  const r1 = d1.filter((r) => r.D1.hit).length;
  const r2 = d2.filter((r) => r.D2.hit).length;
  const w1 = sel.runThreePeriodStreamBacktest(raw, model, "D1", opts);
  const w2 = sel.runThreePeriodStreamBacktest(raw, model, "D2", opts);
  return {
    n1: d1.length, h1: r1, p1: d1.length ? r1 / d1.length : 0,
    n2: d2.length, h2: r2, p2: d2.length ? r2 / d2.length : 0,
    w1n: w1.n, w1h: w1.hits, w1r: w1.hitRate,
    w2n: w2.n, w2h: w2.hits, w2r: w2.hitRate,
  };
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };
const results = VARIANTS.map((v) => ({ name: v.name, r: run(v.opt) }));
const b = results[0].r;
const f = (x) => (x * 100).toFixed(1) + "%";
const d = (x, y) => ((x - y) * 100 >= 0 ? "+" : "") + ((x - y) * 100).toFixed(1) + "pp";

log("权重消融测试（走步 258 期 · 逐个改模型环节参数，看结果变不变）");
log("口径：单尾=每期推荐是否命中；窗口=三期窗口命中率。改动只是诊断，不用于挑选最优参数。");
log("");
log("变体 | 单尾D1(样本) | 单尾D2(样本) | 窗口D1(窗数) | 窗口D2(窗数) | 影响");
results.forEach((x, i) => {
  const r = x.r;
  const impact = i === 0 ? "—" :
    "单尾D1 " + d(r.p1, b.p1) + " / D2 " + d(r.p2, b.p2) + " · 窗口D1 " + d(r.w1r, b.w1r) + " / D2 " + d(r.w2r, b.w2r);
  log([x.name, f(r.p1) + "(" + r.n1 + ")", f(r.p2) + "(" + r.n2 + ")",
    f(r.w1r) + "(" + r.w1n + "窗)", f(r.w2r) + "(" + r.w2n + "窗)", impact].join(" | "));
});
log("");
// 影响力排序（按窗口D1变化 + 单尾D1变化的绝对值）
const ranked = results.slice(1).map((x) => ({
  name: x.name,
  mag: Math.abs(x.r.p1 - b.p1) + Math.abs(x.r.w1r - b.w1r) + Math.abs(x.r.p2 - b.p2) + Math.abs(x.r.w2r - b.w2r),
})).sort((a, b2) => b2.mag - a.mag);
log("各环节影响力排序（改动后结果变化越大=这个环节越关键）：");
ranked.forEach((x, i) => log("  " + (i + 1) + ". " + x.name + " · 变化量 " + (x.mag * 100).toFixed(1) + "pp"));
require("fs").writeFileSync("_weight_ablation.md", out.join("\n"));
console.log("已写入 _weight_ablation.md");
