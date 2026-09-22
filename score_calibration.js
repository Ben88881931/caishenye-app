#!/usr/bin/env node
/**
 * 双号推荐五级强度 · 逐期记录 + 真实命中率统计
 *
 * 数据源：prediction_snapshots.json 的真实快照账（仅已结算记录，不含回测）
 * 等级规则统一引用 model_core.js 的 gradeOf / GRADE_TIERS，禁止各算一套。
 *
 * 用法：
 *   node score_calibration.js report
 *
 * 口径（2026-09-22 修正版）：
 *   单尾样本 —— 每个已结算快照的 doubleRecommendation 每个推荐尾号算一个样本，
 *              按该尾号自己的等级分组，命中 = 该尾号落在实际尾数集合里。
 *   双号整体至少中一 —— 每个已结算快照算一个样本（不分等级），
 *              命中 = 两个推荐尾号至少一个落在实际尾数集合里。
 *   等级组合至少中一 —— 每个已结算快照按两个尾号的等级组合分组（如 A+C、C+C、C+D），
 *              命中 = 两个推荐尾号至少一个落在实际尾数集合里。
 *   Wilson 95% 置信区间 —— z=1.96。
 *   样本 < 20 —— 显示「样本不足」。
 *
 * 约束：命中记录只追加，不反写历史；回测账与真实快照账分开；不伪造样本；不用未来数据。
 */

const fs = require("fs");
const path = require("path");
const { gradeOf, GRADE_TIERS } = require("./model_core.js");

const SNAPSHOT_PATH = path.join(__dirname, "prediction_snapshots.json");
const MIN_SAMPLE = 20;
const Z = 1.96;

function wilson(k, n) {
  if (n <= 0) return null;
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

function tierLabel(key) {
  const idx = GRADE_TIERS.findIndex((t) => t.key === key);
  if (idx < 0) return key + "级";
  const t = GRADE_TIERS[idx];
  const higher = GRADE_TIERS[idx - 1];
  if (t.min === -Infinity) {
    return key + "级（<" + (higher ? higher.min.toFixed(1) : "-") + "）";
  }
  if (!higher) return key + "级（>=" + t.min.toFixed(1) + "）";
  return key + "级（" + t.min.toFixed(1) + "-" + (higher.min - 0.01).toFixed(2) + "）";
}

function gradeFrom(pick) {
  return pick.grade != null ? pick.grade : gradeOf(pick.score);
}

function comboKey(g1, g2) {
  const i1 = GRADE_TIERS.findIndex((t) => t.key === g1);
  const i2 = GRADE_TIERS.findIndex((t) => t.key === g2);
  return i1 <= i2 ? g1 + "+" + g2 : g2 + "+" + g1;
}

function rateText(n, hits) {
  if (n < MIN_SAMPLE) return "样本不足";
  let s = pct(hits / n);
  const ci = wilson(hits, n);
  if (ci) s += "（95%CI " + pct(ci.lo) + "~" + pct(ci.hi) + "）";
  return s;
}

function fmtPerPick(picks) {
  return picks.map((p) => `${p.tail}-${gradeFrom(p)}(${p.score})`).join(", ");
}

function fmtHit(picks) {
  return picks.map((p) => (p.hit ? `${p.tail}✓` : `${p.tail}✗`)).join(" ");
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

  console.log("===== 双号推荐五级强度 · 真实命中率统计 =====");
  console.log("数据源：prediction_snapshots.json 真实快照账（仅已结算，不含回测）");
  console.log("等级统一引用 model_core.js gradeOf；历史快照按原分数临时映射，不反写");
  console.log("");

  console.log("--- 逐期记录（真实快照账）---");
  for (const rec of settled) {
    const model = rec.models && rec.models.doubleRecommendation;
    const picks = model && Array.isArray(model.picks) ? model.picks : [];
    const actualTails = rec.actualTails || [];
    let perPick;
    const saved = rec.results.doubleRecommendation.perPick;
    if (Array.isArray(saved) && saved.length === picks.length) {
      perPick = saved.map((pp) => ({
        tail: pp.tail,
        score: pp.score,
        grade: pp.grade != null ? pp.grade : gradeOf(pp.score),
        hit: pp.hit === true || actualTails.includes(pp.tail)
      }));
    } else {
      perPick = picks.map((p) => ({
        tail: p.tail,
        score: p.score,
        grade: gradeFrom(p),
        hit: actualTails.includes(p.tail)
      }));
    }
    const atLeastOne = perPick.some((p) => p.hit);
    console.log(
      `第${rec.target}期 | 双号[${fmtPerPick(perPick)}] | 实际[${actualTails.join(",")}] | 单尾 ${fmtHit(perPick)} | 至少中一${atLeastOne ? "✓" : "✗"} | 结算 ${rec.settledAt || "-"}`
    );
  }
  console.log("");

  // 统计
  const single = {}; // { grade: {n, hits} }
  const overall = { n: 0, hits: 0 }; // 双号整体至少中一
  const combos = {}; // { "A+C": {n, hits} }

  for (const rec of settled) {
    const model = rec.models && rec.models.doubleRecommendation;
    const picks = model && Array.isArray(model.picks) ? model.picks : [];
    const actualTails = rec.actualTails || [];
    if (!picks.length) continue; // 空仓快照不计样本，不伪造

    const grades = picks.map((p) => gradeFrom(p));
    for (let i = 0; i < picks.length; i++) {
      const g = grades[i];
      const s = single[g] || (single[g] = { n: 0, hits: 0 });
      s.n++;
      if (actualTails.includes(picks[i].tail)) s.hits++;
    }

    overall.n++;
    if (picks.some((p) => actualTails.includes(p.tail))) overall.hits++;

    if (picks.length >= 2) {
      const ck = comboKey(grades[0], grades[1]);
      const c = combos[ck] || (combos[ck] = { n: 0, hits: 0 });
      c.n++;
      if (picks.some((p) => actualTails.includes(p.tail))) c.hits++;
    }
  }

  console.log("--- 单尾命中率（按各尾号等级分组）---");
  for (const g of GRADE_TIERS) {
    const s = single[g.key] || { n: 0, hits: 0 };
    console.log(
      `${tierLabel(g.key)}：样本${s.n} 命中${s.hits} 未中${s.n - s.hits} 命中率${rateText(s.n, s.hits)}`
    );
  }
  console.log("");

  console.log("--- 双号整体至少中一（不分等级）---");
  console.log(
    `样本${overall.n}期 命中${overall.hits} 未中${overall.n - overall.hits} 命中率${rateText(overall.n, overall.hits)}`
  );
  console.log("");

  console.log("--- 等级组合至少中一 ---");
  const comboKeys = Object.keys(combos).sort((a, b) => combos[b].n - combos[a].n);
  if (!comboKeys.length) {
    console.log("（暂无组合样本）");
  } else {
    for (const ck of comboKeys) {
      const c = combos[ck];
      console.log(
        `${ck}：样本${c.n} 命中${c.hits} 未中${c.n - c.hits} 命中率${rateText(c.n, c.hits)}`
      );
    }
  }
}

const command = process.argv[2] || "report";
if (command === "report") report();
else {
  console.error("未知命令：" + command);
  process.exit(1);
}