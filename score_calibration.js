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
 * 口径：
 *   单尾样本 —— 每个已结算快照的 doubleRecommendation 每个推荐尾号算一个样本，
 *              命中 = 该尾号落在实际尾数集合里。
 *   双号至少中一个 —— 每个已结算快照算一个样本，按首推尾号的等级分组，
 *              命中 = 该快照两个推荐尾号至少一个落在实际尾数集合里。
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

function fmtPerPick(picks) {
  return picks
    .map((p) => `${p.tail}-${gradeFrom(p)}(${p.score})`)
    .join(", ");
}

function fmtHit(picks) {
  return picks
    .map((p) => (p.hit ? `${p.tail}✓` : `${p.tail}✗`))
    .join(" ");
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

  // 逐期记录：优先用快照自身保存的 perPick（新结算自带），否则用实际尾数即时判定
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
      perPick = saved.map((pp, i) => ({
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

  // 等级累计统计
  const single = {};
  const atLeastOneStat = {};
  for (const g of GRADE_TIERS) {
    single[g.key] = { n: 0, hits: 0 };
    atLeastOneStat[g.key] = { n: 0, hits: 0 };
  }

  for (const rec of settled) {
    const model = rec.models && rec.models.doubleRecommendation;
    const picks = model && Array.isArray(model.picks) ? model.picks : [];
    const actualTails = rec.actualTails || [];
    if (!picks.length) continue;

    for (const pick of picks) {
      const g = gradeFrom(pick);
      const s = single[g] || (single[g] = { n: 0, hits: 0 });
      s.n++;
      if (actualTails.includes(pick.tail)) s.hits++;
    }

    const first = picks[0];
    const fg = gradeFrom(first);
    const d = atLeastOneStat[fg] || (atLeastOneStat[fg] = { n: 0, hits: 0 });
    d.n++;
    if (picks.some((p) => actualTails.includes(p.tail))) d.hits++;
  }

  console.log("--- 等级累计统计 ---");
  for (const g of GRADE_TIERS) {
    const s = single[g.key] || { n: 0, hits: 0 };
    const d = atLeastOneStat[g.key] || { n: 0, hits: 0 };
    const missed = s.n - s.hits;
    const dMissed = d.n - d.hits;

    console.log(tierLabel(g.key));
    const sRateTxt = s.n < MIN_SAMPLE ? "样本不足" : pct(s.hits / s.n);
    const dRateTxt = d.n < MIN_SAMPLE ? "样本不足" : pct(d.hits / d.n);

    let ciTxt = "样本不足";
    if (s.n >= MIN_SAMPLE) {
      const ci = wilson(s.hits, s.n);
      ciTxt = `${pct(ci.lo)} ~ ${pct(ci.hi)}`;
    }

    console.log(`  单尾：样本${s.n} 命中${s.hits} 未中${missed} 命中率${sRateTxt}`);
    console.log(`  双号至少中一：样本${d.n} 命中${d.hits} 未中${dMissed} 命中率${dRateTxt}`);
    console.log(`  置信区间：${ciTxt}`);
  }
}

const command = process.argv[2] || "report";
if (command === "report") report();
else {
  console.error("未知命令：" + command);
  process.exit(1);
}