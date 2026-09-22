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
const {
  gradeOf,
  GRADE_TIERS,
  scoreBucketOf,
  SCORE_BUCKETS,
  wilson,
  riskOf,
  BASE_RATE_SINGLE
} = require("./model_core.js");

const SNAPSHOT_PATH = path.join(__dirname, "prediction_snapshots.json");
const MIN_SAMPLE = 20;

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
  const scoreBuckets = {}; // 分数整数分档
  for (const b of SCORE_BUCKETS) scoreBuckets[b] = { n: 0, hits: 0 };
  const tagStats = {}; // 信号标签

  for (const rec of settled) {
    const model = rec.models && rec.models.doubleRecommendation;
    const picks = model && Array.isArray(model.picks) ? model.picks : [];
    const actualTails = rec.actualTails || [];
    if (!picks.length) continue; // 空仓快照不计样本，不伪造

    const grades = picks.map((p) => gradeFrom(p));
    for (let i = 0; i < picks.length; i++) {
      const g = grades[i];
      const hitI = actualTails.includes(picks[i].tail);
      const s = single[g] || (single[g] = { n: 0, hits: 0 });
      s.n++;
      if (hitI) s.hits++;

      const bname = scoreBucketOf(picks[i].score);
      const sb = scoreBuckets[bname] || (scoreBuckets[bname] = { n: 0, hits: 0 });
      sb.n++;
      if (hitI) sb.hits++;

      const tg = picks[i].tag || "其他";
      const ts = tagStats[tg] || (tagStats[tg] = { n: 0, hits: 0 });
      ts.n++;
      if (hitI) ts.hits++;
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

  console.log("");
  console.log("--- 分数细分（1分一档，单尾口径，基准55.39%）---");
  for (const b of SCORE_BUCKETS) {
    const s = scoreBuckets[b] || { n: 0, hits: 0 };
    const miss = s.n - s.hits;
    const r = riskOf(s.n, s.hits);
    let line = `${b}：样本${s.n} 命中${s.hits} 未中${miss}`;
    if (s.n < MIN_SAMPLE) {
      line += ` 命中率${rateText(s.n, s.hits)} 错误率${s.n ? pct(miss / s.n) : "-"}`;
    } else {
      line += ` 命中率${pct(s.hits / s.n)} 错误率${pct(miss / s.n)} 95%CI ${pct(r.ci.lo)}~${pct(r.ci.hi)}`;
    }
    line += ` 状态${r.label}`;
    console.log(line);
  }
  console.log("");

  console.log("--- 信号标签命中率（单尾口径，基准55.39%）---");
  const TAG_ORDER = ["连出4", "连出3", "5期3次", "7期4次"];
  const tagKeys = Object.keys(tagStats);
  const orderedTags = TAG_ORDER.filter((t) => tagStats[t])
    .concat(tagKeys.filter((t) => !TAG_ORDER.includes(t)).sort());
  if (!orderedTags.length) {
    console.log("（暂无标签样本）");
  } else {
    for (const tg of orderedTags) {
      const s = tagStats[tg];
      const miss = s.n - s.hits;
      const r = riskOf(s.n, s.hits);
      let line = `${tg}：样本${s.n} 命中${s.hits} 未中${miss}`;
      if (s.n < MIN_SAMPLE) {
        line += ` 命中率${rateText(s.n, s.hits)} 错误率${s.n ? pct(miss / s.n) : "-"}`;
      } else {
        line += ` 命中率${pct(s.hits / s.n)} 错误率${pct(miss / s.n)} 95%CI ${pct(r.ci.lo)}~${pct(r.ci.hi)}`;
      }
      line += ` 状态${r.label}`;
      console.log(line);
    }
  }
  console.log("");

  console.log("--- 风险状态汇总 ---");
  const dangerList = [];
  const observeList = [];
  const advantageList = [];
  for (const b of SCORE_BUCKETS) {
    const s = scoreBuckets[b] || { n: 0, hits: 0 };
    const r = riskOf(s.n, s.hits);
    if (r.flag === "danger") dangerList.push(`${b}(${s.hits}/${s.n})`);
    else if (r.flag === "observe") observeList.push(`${b}(${s.hits}/${s.n})`);
    else if (r.flag === "advantage") advantageList.push(`${b}(${s.hits}/${s.n})`);
  }
  for (const tg of orderedTags) {
    const s = tagStats[tg];
    const r = riskOf(s.n, s.hits);
    if (r.flag === "danger") dangerList.push(`${tg}(${s.hits}/${s.n})`);
    else if (r.flag === "observe") observeList.push(`${tg}(${s.hits}/${s.n})`);
    else if (r.flag === "advantage") advantageList.push(`${tg}(${s.hits}/${s.n})`);
  }
  console.log(`🔴危险：${dangerList.length ? dangerList.join("、") : "无"}`);
  console.log(`🟡观察：${observeList.length ? observeList.join("、") : "无"}`);
  console.log(`🟢优势：${advantageList.length ? advantageList.join("、") : "无"}`);
}

const command = process.argv[2] || "report";
if (command === "report") report();
else {
  console.error("未知命令：" + command);
  process.exit(1);
}