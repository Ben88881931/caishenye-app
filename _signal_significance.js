#!/usr/bin/env node
// 信号显著性表：每个信号/分数档/等级 单独对随机基准做检验（含 Bonferroni 校正）
const fs = require("fs");
const core = require("./model_core.js");
const sel = require("./model_selector.js");
const raw = require("./lottery_data.json");
const model = core.createModel(raw);
const rows = sel.buildSignals(raw, model, { startPeriod: 31 });
const tailsOf = (p) => (raw[String(p)] || "").split("").reduce((a, b, i) => { if (b === "1") a.push(i); return a; }, []);

// 组织样本：每一条 (期号, 流, 尾号, 信号标签, 分数档, 等级, 是否命中, 该期随机基准)
const samples = [];
rows.forEach((r) => {
  const actual = r.actual || tailsOf(r.period);
  const base = Math.min(1, new Set(actual).size / 10);
  ["D1", "D2"].forEach((k) => {
    const p = r[k];
    if (!p) return;
    samples.push({
      period: r.period, stream: k, tail: p.tail, score: p.score,
      tag: p.tag || "无标签", bucket: core.scoreBucketOf(p.score), grade: p.grade || core.gradeOf(p.score),
      hit: !!p.hit, base: base,
    });
  });
});

function wilson(k, n) {
  const z = 1.96, p = k / n, den = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / den, w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
  return [c - w, c + w];
}
function binomTwoSided(k, n, p) {
  const le = (kk) => { let s = 0, c = 1; for (let i = 0; i <= kk; i++) { if (i > 0) c = c * (n - i + 1) / i; s += c * Math.pow(p, i) * Math.pow(1 - p, n - i); } return s; };
  return Math.min(1, 2 * Math.min(le(k), 1 - le(k - 1)));
}

// 待测信号集合
const groups = {};
function addGroup(name, list) { if (list.length) groups[name] = list; }
addGroup("标签·连出3（两流合并）", samples.filter((s) => s.tag === "连出3"));
addGroup("标签·连出4（两流合并）", samples.filter((s) => s.tag === "连出4"));
addGroup("标签·5期3次（两流合并）", samples.filter((s) => s.tag === "5期3次"));
addGroup("标签·7期4次（两流合并）", samples.filter((s) => s.tag === "7期4次"));
["D1", "D2"].forEach((k) => {
  ["连出3", "连出4", "5期3次", "7期4次"].forEach((t) => addGroup("标签·" + t + "（" + k + "）", samples.filter((s) => s.stream === k && s.tag === t)));
});
core.SCORE_BUCKETS.forEach((b) => addGroup("分数档·" + b + "（两流合并）", samples.filter((s) => s.bucket === b)));
["D1", "D2"].forEach((k) => core.SCORE_BUCKETS.forEach((b) => addGroup("分数档·" + b + "（" + k + "）", samples.filter((s) => s.stream === k && s.bucket === b))));
["S", "A", "B", "C", "D"].forEach((g) => addGroup("等级·" + g + "（两流合并）", samples.filter((s) => s.grade === g)));
["D1", "D2"].forEach((k) => ["S", "A", "B", "C", "D"].forEach((g) => addGroup("等级·" + g + "（" + k + "）", samples.filter((s) => s.stream === k && s.grade === g))));

const tested = Object.keys(groups).length;
const alpha = 0.05 / tested;   // Bonferroni
const results = Object.keys(groups).map((name) => {
  const list = groups[name];
  const n = list.length, hits = list.filter((s) => s.hit).length;
  const rate = hits / n;
  const baseline = list.reduce((a, s) => a + s.base, 0) / n;
  const [lo, hi] = wilson(hits, n);
  const p = binomTwoSided(hits, n, baseline);
  let verdict;
  if (n < 30) verdict = "观察（样本不足）";
  else if (p < alpha && rate > baseline) verdict = "✅ 留";
  else if (p < 0.05 && rate < baseline) verdict = "❌ 反向，砍";
  else verdict = "➖ 无证据，不参与打分";
  return { name, n, hits, rate, baseline, diff: rate - baseline, lo, hi, p, verdict };
});
results.sort((a, b) => (b.n - a.n));

const out = [];
const log = (s) => { out.push(s); console.log(s); };
log("信号显著性表（走步样本 " + rows.length + " 期 · 每个样本=一次推荐 · 随机基准=该期不同尾数/10）");
log("多重比较校正：共测 " + tested + " 个信号，Bonferroni 门槛 α = 0.05/" + tested + " = " + alpha.toFixed(5));
log("判定：n<30=观察；p<α 且高于基准=留；p<0.05 且低于基准=反向砍；其余=无证据不参与打分");
log("");
log("信号 | 样本 | 命中 | 命中率 | 随机基准 | 差值 | 95%CI | p值 | 结论");
results.forEach((r) => {
  log([r.name, r.n, r.hits, (r.rate * 100).toFixed(1) + "%", (r.baseline * 100).toFixed(1) + "%",
    (r.diff >= 0 ? "+" : "") + (r.diff * 100).toFixed(1) + "pp",
    (r.lo * 100).toFixed(1) + "%~" + (r.hi * 100).toFixed(1) + "%", r.p.toFixed(4), r.verdict].join(" | "));
});
const keep = results.filter((r) => r.verdict.indexOf("留") >= 0);
const reverse = results.filter((r) => r.verdict.indexOf("反向") >= 0);
const noEv = results.filter((r) => r.verdict.indexOf("无证据") >= 0);
const watch = results.filter((r) => r.verdict.indexOf("观察") >= 0);
log("");
log("===== 结论 =====");
log("  可以留：" + (keep.length ? keep.map((r) => r.name + "(" + (r.rate * 100).toFixed(1) + "%/n" + r.n + ")").join("、") : "无"));
log("  反向要砍：" + (reverse.length ? reverse.map((r) => r.name).join("、") : "无"));
log("  无证据（不参与打分）：" + noEv.length + " 个");
log("  样本不足（继续观察）：" + watch.length + " 个");
log("  → " + (keep.length === 0
  ? "没有任何信号在统计上优于随机：这套打分目前不具备可证明的预测力"
  : "只有 " + keep.length + " 个信号通过校正检验，其余都不应参与打分"));
fs.writeFileSync("_signal_significance.md", out.join("\n"));
console.log("已写入 _signal_significance.md");
