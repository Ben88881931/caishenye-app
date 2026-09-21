#!/usr/bin/env node
/**
 * 双号推荐五级强度 · 真实命中率统计
 *
 * 数据源：prediction_snapshots.json 的真实快照账（仅已结算记录，不含回测）
 * 等级规则统一引用 model_core.js 的 gradeOf / GRADE_TIERS，禁止各算一套。
 *
 * 用法：
 *   node score_calibration.js report
 *
 * 口径：
 *   单尾样本    —— 每个已结算快照的 doubleRecommendation 每个推荐尾号算一个样本，
 *                  命中 = 该尾号落在实际尾数集合里。
 *   双号至少中一个 —— 每个已结算快照算一个样本，按首推尾号的等级分组，
 *                  命中 = 该快照两个推荐尾号至少一个落在实际尾数集合里。
 *   Wilson 95% 置信区间 —— 对每个命中率计算（z=1.96）。
 *   样本 < 20 —— 显示「样本不足」。
 *
 * 约束：历史快照中用原分数临时映射等级，绝不反写历史快照；不回测不有用未来数据。
 */

const fs = require("fs");
const path = require("path");
const { gradeOf, GRADE_TIERS } = require("./model_core.js");

const SNAPSHOT_PATH = path.join(__dirname, "prediction_snapshots.json");
const MIN_SAMPLE = 20;
const Z = 1.96;

function wilson(k, n) {
  if (n <= 0) return { lo: null, hi: null };
  const p = k / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    lo: Math.max(0, center - margin),
    hi: Math.min(1, center + margin)
  };
}

function pct(x) {
  return (x * 100).toFixed(1) + "%";
}

function dump(title, table) {
  console.log(title);
  for (const g of GRADE_TIERS) {
    const s = table[g.key] || { n: 0, hits: 0 };
    if (s.n < MIN_SAMPLE) {
      console.log(`  ${g.key}级: 样本不足（当前 ${s.n} 期，需 ${MIN_SAMPLE} 期）`);
      continue;
    }
    const rate = s.hits / s.n;
    const ci = wilson(s.hits, s.n);
    console.log(
      `  ${g.key}级: 命中 ${s.hits}/${s.n} = ${pct(rate)}  [Wilson 95% CI: ${ci.lo === null ? "-" : pct(ci.lo)} ~ ${ci.hi === null ? "-" : pct(ci.hi)}]`
    );
  }
}

function report() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error("ERROR: 未找到 " + SNAPSHOT_PATH);
    process.exit(1);
  }
  const snapshots = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  const records = snapshots.records || [];
  const settled = records.filter(
    (r) => r.settled && r.results && r.results.doubleRecommendation
  );

  const single = {};
  const atLeastOne = {};
  for (const g of GRADE_TIERS) {
    single[g.key] = { n: 0, hits: 0 };
    atLeastOne[g.key] = { n: 0, hits: 0 };
  }

  for (const rec of settled) {
    const model = rec.models && rec.models.doubleRecommendation;
    const result = rec.results.doubleRecommendation;
    const actualTails = rec.actualTails || [];
    const picks = model && Array.isArray(model.picks) ? model.picks : [];
    if (!picks.length) continue;

    for (const pick of picks) {
      const grade = pick.grade || gradeOf(pick.score);
      const g = single[grade] || (single[grade] = { n: 0, hits: 0 });
      g.n++;
      if (actualTails.includes(pick.tail)) g.hits++;
    }

    const first = picks[0];
    const fg = first.grade || gradeOf(first.score);
    const d = atLeastOne[fg] || (atLeastOne[fg] = { n: 0, hits: 0 });
    d.n++;
    if (result.hit === true) d.hits++;
  }

  console.log("===== 双号推荐五级强度 · 真实命中率统计 =====");
  console.log("数据源：prediction_snapshots.json 真实快照账（仅已结算，不含回测）");
  console.log("等级统一引用 model_core.js gradeOf；历史快照按原分数临时映射，不反写");
  console.log(
    "已结算快照数：" + settled.length + "（样本阈值 " + MIN_SAMPLE + " 期）"
  );
  console.log("");
  dump("--- 单尾命中率（每个推荐尾号为一个样本）---", single);
  console.log("");
  dump("--- 双号至少中一个命中率（按首推等级分组）---", atLeastOne);
}

const command = process.argv[2] || "report";
if (command === "report") report();
else {
  console.error("未知命令：" + command);
  process.exit(1);
}