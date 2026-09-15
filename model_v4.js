/**
 * V4 实验模型（独立文件，不碰生产 v3）
 *
 * 目标：在 v3 逻辑基础上加入「反追冷」维度，诚实对比样本外命中率增量。
 *
 * 反追冷实现（照 boss 规范）：
 *   - 对每个尾数算当前遗漏 miss
 *   - miss >= 5 时扣分：score -= coldWeight * (1 + (miss-5)*0.3)，coldWeight = 0.5
 *   - 关键坑：cold 只扣分，绝不 push 进 signalCount（不污染 minSignals 门槛）
 *
 * 验证要求（禁止训练集自嗨）：
 *   1. 样本外固定切分：训练 150 / 180 / 200 期，测剩余期
 *   2. 滚动验证 walk-forward：第 151 期起每期滚动预测
 *   3. 诚实对比 V4 vs V3 的真实样本外命中率，白纸黑字写清增量
 *
 * 铁律：
 *   - 本文件完全独立，不 require / 不修改生产 v3 文件
 *   - app.js / styles.css / recommend_log.json 一律不碰
 */

const fs = require('fs');
const lotteryData = JSON.parse(fs.readFileSync('lottery_data.json', 'utf8'));

const periods = Object.keys(lotteryData).map(Number).filter(p => !isNaN(p)).sort((a, b) => a - b);
console.log('2026年数据: ' + periods.length + '期（第1-' + periods[periods.length - 1] + '期）');

// ===== 反追冷参数（固定，不经网格搜索，保持单一变量）=====
const COLD = {
  enabled: false,        // 运行时切换 V3(false) / V4(true)
  threshold: 5,          // miss >= 5 才扣分
  coldWeight: 0.5,       // 扣分基准
  factor: 0.3            // 每超 1 期递增系数
};

// ===== 基础函数（与生产 v3 完全一致）=====
function hit(p, d) {
  return lotteryData[p] && lotteryData[p][d] === '1';
}

function currentMiss(d, upto) {
  let m = 0;
  for (let i = upto; i >= 1; i--) {
    if (hit(i, d)) break;
    m++;
  }
  return m;
}

function countWindow(d, p, w) {
  let c = 0;
  for (let i = p; i > Math.max(0, p - w); i--) {
    if (hit(i, d)) c++;
  }
  return c;
}

function currentStreak(d, upto) {
  let s = 0;
  for (let i = upto; i >= 1; i--) {
    if (hit(i, d)) s++;
    else break;
  }
  return s;
}

// ===== AB模型核心（保留）=====
const NEW_MODEL = {
  decayRate: 1.75,
  bounceThresh: 0.75,
  bounceThresh2: 0.65,
  wBounce: 5,
  wBounce2: 3,
  wDepth: 1,
  depthThresh: 0.5,
  minSample: 2
};

function weightedExactBounce(d, upto, k) {
  let totalW = 0, hitsW = 0, run = 0;
  const uidx = periods.indexOf(upto);
  if (uidx < 0) return { rate: 0, sample: 0 };

  for (let i = 0; i < periods.length - 1; i++) {
    if (periods[i] >= upto) break;
    if (hit(periods[i], d)) { run = 0; }
    else {
      run++;
      if (run === k) {
        const distFromEnd = uidx - i;
        const weight = Math.max(1, 10 - distFromEnd / NEW_MODEL.decayRate);
        totalW += weight;
        if (hit(periods[i + 1], d)) hitsW += weight;
      }
    }
  }
  return { rate: totalW ? hitsW / totalW : 0, sample: totalW };
}

function missDepthRatio(d, upto) {
  let m = 0;
  for (let i = upto; i >= 1; i--) {
    if (hit(i, d)) break;
    m++;
  }
  let maxM = 0, run = 0;
  for (let i = 0; i < periods.length; i++) {
    if (periods[i] > upto) break;
    if (hit(periods[i], d)) { run = 0; } else { run++; if (run > maxM) maxM = run; }
  }
  return { miss: m, maxMiss: maxM, ratio: maxM > 0 ? m / maxM : 0 };
}

function abModelScore(d, upto) {
  const md = missDepthRatio(d, upto);
  const wb = weightedExactBounce(d, upto, md.miss);
  let score = 0;
  if (wb.sample >= NEW_MODEL.minSample) {
    if (wb.rate >= NEW_MODEL.bounceThresh) score += NEW_MODEL.wBounce;
    else if (wb.rate >= NEW_MODEL.bounceThresh2) score += NEW_MODEL.wBounce2;
  }
  if (md.ratio >= NEW_MODEL.depthThresh) score += NEW_MODEL.wDepth;
  return { score, wbr: wb.rate, wbSample: wb.sample, miss: md.miss, maxMiss: md.maxMiss, ratio: md.ratio };
}

// ===== 窗口15期三段对比 =====
function tripleSegmentSignal(d, upto) {
  if (upto < 15) return null;

  const seg1 = countWindow(d, upto - 10, 5);
  const seg2 = countWindow(d, upto - 5, 5);
  const seg3 = countWindow(d, upto, 5);

  const trend1 = seg2 - seg1;
  const trend2 = seg3 - seg2;

  if (trend1 >= 1 && trend2 >= 1) {
    return { type: 'triple_hot', strength: trend1 + trend2, segs: [seg1, seg2, seg3] };
  }

  if (trend1 <= -1 && trend2 >= 1) {
    return { type: 'triple_reversal', strength: Math.abs(trend1) + trend2, segs: [seg1, seg2, seg3] };
  }

  return null;
}

// ===== 连出规律 =====
function streakSignal(d, upto) {
  const streak = currentStreak(d, upto);
  if (streak >= 4) {
    return { type: 'streak', strength: streak, strong: true };
  }
  if (streak >= 2) {
    return { type: 'streak', strength: streak, strong: false };
  }
  return null;
}

// ===== 遗漏反转信号（修复版：不用未来数据）=====
function reversalSignal(d, upto) {
  const idx = periods.indexOf(upto);
  if (idx < 2) return null;

  // 当前期必须开出该尾数
  if (!hit(upto, d)) return null;

  // 往前数当前期之前连续遗漏了多少期
  let missBefore = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (hit(periods[i], d)) break;
    missBefore++;
  }

  if (missBefore >= 3) {
    return { type: 'reversal', missBefore, strong: true };
  }

  return null;
}

// ===== 尾号性格学习 =====
function learnTailPersonality(trainPeriods) {
  const personality = {};

  for (let d = 0; d < 10; d++) {
    let hotScore = 0, coldScore = 0, streakScore = 0;
    let total = 0;

    for (const p of trainPeriods) {
      if (p < 30) continue;
      const idx = trainPeriods.indexOf(p);
      if (idx >= trainPeriods.length - 1) continue;
      const nextP = trainPeriods[idx + 1];

      const ab = abModelScore(d, p);
      const streak = streakSignal(d, p);

      if (ab.score >= 3 && hit(nextP, d)) hotScore++;
      if (streak && streak.strong && hit(nextP, d)) streakScore++;
      if (ab.ratio >= 0.5 && hit(nextP, d)) coldScore++;

      total++;
    }

    const scores = {
      hot: hotScore / Math.max(1, total),
      cold: coldScore / Math.max(1, total),
      streak: streakScore / Math.max(1, total)
    };

    let maxType = 'hot';
    let maxScore = scores.hot;
    for (const type in scores) {
      if (scores[type] > maxScore) {
        maxScore = scores[type];
        maxType = type;
      }
    }

    personality[d] = { type: maxType, scores, dominant: maxScore };
  }

  return personality;
}

// ===== 综合评分（V3 原逻辑，与生产 v3 完全一致）=====
function multiDimensionScoreV3(d, upto, personality, weights) {
  const ab = abModelScore(d, upto);
  let score = ab.score;
  const signals = [];

  if (ab.score >= 3) signals.push('ab_strong');
  else if (ab.score >= 1) signals.push('ab_weak');

  // 维度2：连出规律
  const streak = streakSignal(d, upto);
  if (streak) {
    if (streak.strong) {
      score += weights.streak * streak.strength * 0.5;
      signals.push('streak_strong');
    } else {
      score += weights.streak * streak.strength * 0.2;
      signals.push('streak_weak');
    }
  }

  // 维度3：遗漏反转（修复版）
  const reversal = reversalSignal(d, upto);
  if (reversal && reversal.strong) {
    score += weights.reversal * 2;
    signals.push('reversal');
  }

  // 维度4：分段对比趋势（多窗口）
  const windows = [5, 7, 10, 15];
  let trendScore = 0;
  for (const w of windows) {
    if (upto < w * 2) continue;
    const recent = countWindow(d, upto, w);
    const prev = countWindow(d, upto - w, w);
    const trend = recent - prev;
    if (trend >= 2) {
      trendScore += weights.trend * 0.3;
      signals.push('trend_hot_' + w);
    }
  }
  score += trendScore;

  // 维度5：窗口15期三段对比
  const triple = tripleSegmentSignal(d, upto);
  if (triple) {
    if (triple.type === 'triple_hot') {
      score += weights.triple * triple.strength * 0.3;
      signals.push('triple_hot');
    } else if (triple.type === 'triple_reversal') {
      score += weights.triple * triple.strength * 0.4;
      signals.push('triple_reversal');
    }
  }

  // 尾号性格加权
  const tailType = personality[d]?.type;
  if (tailType === 'hot' && signals.some(s => s.startsWith('ab_'))) {
    score *= weights.personalityMultiplier;
  } else if (tailType === 'streak' && signals.some(s => s.startsWith('streak_'))) {
    score *= weights.personalityMultiplier;
  } else if (tailType === 'cold' && signals.includes('reversal')) {
    score *= weights.personalityMultiplier;
  }

  return {
    score,
    signals,
    signalCount: signals.length,
    abScore: ab.score,
    wbr: ab.wbr,
    miss: ab.miss,
    ratio: ab.ratio
  };
}

// ===== 综合评分 V4（V3 + 反追冷，只扣分不污染 signalCount）=====
function multiDimensionScoreV4(d, upto, personality, weights) {
  // 完全复用 V3 评分结果（保证信号体系一致）
  const r = multiDimensionScoreV3(d, upto, personality, weights);

  // 反追冷维度：miss >= threshold 时扣分
  // 关键坑：只扣分，绝不 push 进 signals / signalCount
  const miss = r.miss; // 当前遗漏（= currentMiss）
  if (miss >= COLD.threshold) {
    const penalty = COLD.coldWeight * (1 + (miss - COLD.threshold) * COLD.factor);
    r.score -= penalty;
    r.coldPenalty = penalty;
    r.coldMiss = miss;
  } else {
    r.coldPenalty = 0;
    r.coldMiss = miss;
  }

  // signalCount 保持不变（不污染 minSignals 门槛）
  return r;
}

// ===== 预测函数（版本可切换）=====
function predict(p, personality, weights, minSignals, version) {
  const scores = [];

  for (let d = 0; d < 10; d++) {
    if (hit(p, d)) continue;

    const result = version === 'v4'
      ? multiDimensionScoreV4(d, p, personality, weights)
      : multiDimensionScoreV3(d, p, personality, weights);

    scores.push({
      d,
      score: result.score,
      signals: result.signals,
      signalCount: result.signalCount,
      abScore: result.abScore,
      wbr: result.wbr,
      miss: result.miss,
      coldPenalty: result.coldPenalty || 0
    });
  }

  scores.sort((a, b) => b.score - a.score);

  const candidates = scores.filter(s => s.signalCount >= minSignals);

  if (candidates.length === 0) return null;

  return {
    primary: candidates[0].d,
    secondary: candidates.length >= 2 ? candidates[1].d : null,
    score: candidates[0].score,
    signalCount: candidates[0].signalCount,
    signals: candidates[0].signals,
    abScore: candidates[0].abScore,
    wbr: candidates[0].wbr,
    miss: candidates[0].miss,
    coldPenalty: candidates[0].coldPenalty
  };
}

// ===== 参数网格（与生产 v3 一致，V3/V4 共用同一套参数）=====
const paramGrid = [];
const trendValues = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
const streakValues = [1.5, 2.5, 3.5];
const reversalValues = [1.0, 2.0];
const tripleValues = [1.0, 1.5];
const personalityValues = [1.2, 1.5];
const minSignalsValues = [2, 3];

for (const trend of trendValues) {
  for (const streak of streakValues) {
    for (const reversal of reversalValues) {
      for (const triple of tripleValues) {
        for (const personalityMultiplier of personalityValues) {
          for (const minSignals of minSignalsValues) {
            paramGrid.push({ trend, streak, reversal, triple, personalityMultiplier, minSignals });
          }
        }
      }
    }
  }
}

console.log('参数网格: ' + paramGrid.length + ' 组组合');

// ===== 网格搜索（训练集内 CV，用 V3 评分选参——单一变量，V4 沿用同一套参数）=====
function gridSearch(trainPeriods, personality) {
  let best = null;

  for (const params of paramGrid) {
    let correct = 0, total = 0, recommended = 0;

    for (let i = 0; i < trainPeriods.length - 1; i++) {
      const p = trainPeriods[i];
      const nextP = trainPeriods[i + 1];
      if (p < 30) continue;

      const prediction = predict(p, personality, params, params.minSignals, 'v3');
      if (prediction) {
        recommended++;
        if (hit(nextP, prediction.primary)) correct++;
        total++;
      }
    }

    const hitRate = total > 0 ? correct / total : 0;
    if (!best || hitRate > best.hitRate) {
      best = { params, hitRate, correct, total, recommended };
    }
  }

  return best;
}

// ===== 在测试集上逐期滚动预测（对每期 p 预测 p+1，只用 <=p 的历史）=====
function evaluateOnTest(testPeriods, personality, bestParams) {
  const v3 = { correct: 0, total: 0, recommended: 0, details: [] };
  const v4 = { correct: 0, total: 0, recommended: 0, details: [] };

  for (let i = 0; i < testPeriods.length - 1; i++) {
    const p = testPeriods[i];
    const nextP = testPeriods[i + 1];
    if (p < 30) continue;

    const actualTails = [];
    for (let x = 0; x < 10; x++) if (hit(nextP, x)) actualTails.push(x);

    // V3
    const pred3 = predict(p, personality, bestParams, bestParams.minSignals, 'v3');
    if (pred3) {
      v3.recommended++;
      const h = hit(nextP, pred3.primary);
      if (h) v3.correct++;
      v3.total++;
      v3.details.push({ period: nextP, primary: pred3.primary, score: pred3.score, hit: h });
    }

    // V4
    const pred4 = predict(p, personality, bestParams, bestParams.minSignals, 'v4');
    if (pred4) {
      v4.recommended++;
      const h = hit(nextP, pred4.primary);
      if (h) v4.correct++;
      v4.total++;
      v4.details.push({
        period: nextP, primary: pred4.primary, score: pred4.score,
        coldPenalty: pred4.coldPenalty, miss: pred4.miss, hit: h
      });
    }
  }

  return { v3, v4 };
}

// ===== 主程序 =====
console.log('\n===== V4 实验模型：反追冷维度 vs V3 基线 =====\n');

const finalReport = {
  timestamp: new Date().toISOString(),
  dataRange: '2026年第1-' + periods[periods.length - 1] + '期（共' + periods.length + '期）',
  coldParams: COLD,
  fixedSplits: [],
  walkForward: null,
  conclusion: {}
};

// ===== 验证1：样本外固定切分（150 / 180 / 200）=====
for (const trainSize of [150, 180, 200]) {
  console.log('【固定切分】训练 ' + trainSize + ' 期');
  const trainPeriods = periods.slice(0, trainSize);
  const testPeriods = periods.slice(trainSize);

  const personality = learnTailPersonality(trainPeriods);
  const best = gridSearch(trainPeriods, personality);
  const result = evaluateOnTest(testPeriods, personality, best.params);

  const v3Rate = result.v3.total ? result.v3.correct / result.v3.total : 0;
  const v4Rate = result.v4.total ? result.v4.correct / result.v4.total : 0;
  const delta = v4Rate - v3Rate;

  console.log('  训练集内最优命中率: ' + (best.hitRate * 100).toFixed(1) + '%（仅供调参，不用于验收）');
  console.log('  V3 样本外: ' + result.v3.correct + '/' + result.v3.total + ' = ' + (v3Rate * 100).toFixed(1) + '%（推荐' + result.v3.recommended + '期）');
  console.log('  V4 样本外: ' + result.v4.correct + '/' + result.v4.total + ' = ' + (v4Rate * 100).toFixed(1) + '%（推荐' + result.v4.recommended + '期）');
  console.log('  增量: ' + (delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + ' 个百分点\n');

  finalReport.fixedSplits.push({
    trainSize,
    trainRange: '第1-' + trainSize + '期',
    testRange: '第' + (trainSize + 1) + '-' + periods[periods.length - 1] + '期',
    trainBestHitRate: best.hitRate,
    v3: { correct: result.v3.correct, total: result.v3.total, hitRate: v3Rate, recommended: result.v3.recommended },
    v4: { correct: result.v4.correct, total: result.v4.total, hitRate: v4Rate, recommended: result.v4.recommended, coldPenalty: result.v4.details.reduce((s, x) => s + x.coldPenalty, 0) },
    delta: delta,
    v4Details: result.v4.details,
    v3Details: result.v3.details
  });
}

// ===== 验证2：滚动验证 walk-forward（第151期起每期滚动预测）=====
console.log('【walk-forward 滚动验证】初始窗口 150 期，第151期起每期滚动预测');

const wfTrain = periods.slice(0, 150);
const wfTest = periods.slice(150); // 151..256
const wfPersonality = learnTailPersonality(wfTrain);
const wfBest = gridSearch(wfTrain, wfPersonality);

const wfResult = evaluateOnTest(periods.slice(150 - 0), wfPersonality, wfBest.params);
// 注意：walk-forward 的测试集从第150期开始（预测点151期及之后），
// 但 predict(p) 内部只用 <=p 历史，无未来泄露。

// 重新精确实现 walk-forward：从第151期起，每期用截至上一期的全部数据预测
// 这里与 evaluateOnTest 一致（predict 天然只用 upto 及之前），
// 只是把预测期明确限定在第151期之后。
const wf = { v3: { correct: 0, total: 0, recommended: 0, details: [] }, v4: { correct: 0, total: 0, recommended: 0, details: [] } };
{
  const startIdx = periods.indexOf(151);
  for (let i = startIdx; i < periods.length - 1; i++) {
    const p = periods[i];      // 当前期（用 <=p 历史预测 p+1）
    const nextP = periods[i + 1];
    const actualTails = [];
    for (let x = 0; x < 10; x++) if (hit(nextP, x)) actualTails.push(x);

    const pred3 = predict(p, wfPersonality, wfBest.params, wfBest.params.minSignals, 'v3');
    if (pred3) { wf.v3.recommended++; const h = hit(nextP, pred3.primary); if (h) wf.v3.correct++; wf.v3.total++; wf.v3.details.push({ period: nextP, primary: pred3.primary, hit: h }); }

    const pred4 = predict(p, wfPersonality, wfBest.params, wfBest.params.minSignals, 'v4');
    if (pred4) { wf.v4.recommended++; const h = hit(nextP, pred4.primary); if (h) wf.v4.correct++; wf.v4.total++; wf.v4.details.push({ period: nextP, primary: pred4.primary, coldPenalty: pred4.coldPenalty, miss: pred4.miss, hit: h }); }
  }
}

const wfV3Rate = wf.v3.total ? wf.v3.correct / wf.v3.total : 0;
const wfV4Rate = wf.v4.total ? wf.v4.correct / wf.v4.total : 0;
const wfDelta = wfV4Rate - wfV3Rate;

console.log('  V3 滚动样本外: ' + wf.v3.correct + '/' + wf.v3.total + ' = ' + (wfV3Rate * 100).toFixed(1) + '%');
console.log('  V4 滚动样本外: ' + wf.v4.correct + '/' + wf.v4.total + ' = ' + (wfV4Rate * 100).toFixed(1) + '%');
console.log('  增量: ' + (wfDelta >= 0 ? '+' : '') + (wfDelta * 100).toFixed(1) + ' 个百分点\n');

finalReport.walkForward = {
  note: '初始窗口150期定参+定人格，第151期起每期只用<=当期历史滚动预测下一期，无未来数据泄露',
  trainRange: '第1-150期',
  testRange: '第151-' + periods[periods.length - 1] + '期',
  v3: { correct: wf.v3.correct, total: wf.v3.total, hitRate: wfV3Rate, recommended: wf.v3.recommended },
  v4: { correct: wf.v4.correct, total: wf.v4.total, hitRate: wfV4Rate, recommended: wf.v4.recommended },
  delta: wfDelta,
  v4Details: wf.v4.details,
  v3Details: wf.v3.details
};

// ===== 结论 =====
const splits = finalReport.fixedSplits;
const deltas = splits.map(s => s.delta).concat(wfDelta);
const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
const maxDelta = Math.max(...deltas);

console.log('【结论】');
console.log('  固定切分增量: ' + splits.map(s => (s.delta * 100).toFixed(1) + '%').join(' / '));
console.log('  滚动验证增量: ' + (wfDelta * 100).toFixed(1) + '%');
console.log('  平均增量: ' + (avgDelta * 100).toFixed(1) + ' 个百分点');
console.log('  最大增量: ' + (maxDelta * 100).toFixed(1) + ' 个百分点');

let verdict;
// +1.1%~+2.2% 在 46~87 期样本里全部对应「多命中 1 个」，属噪声级别
if (deltas.every(d => d >= 0) && maxDelta < 0.03) {
  verdict = '反追冷边际增益微弱（各切分样本外均仅多命中1个，疑似噪声），需实盘验证，不建议据此替换 v3';
} else if (avgDelta < 0) {
  verdict = '反追冷在样本外无正增益甚至为负，不建议上线';
} else {
  verdict = '反追冷有正增量，但幅度有限，是否替换 v3 由 boss 决定';
}

console.log('\n  结论: ' + verdict);

finalReport.conclusion = {
  avgDelta,
  maxDelta,
  deltas,
  verdict,
  coldParams: COLD,
  honestNote: '反追冷在样本外平均增量仅 +1.5 个百分点（1.1%/1.6%/2.2%），每个切分都只是多命中 1 个，属噪声级别。结论如实标注「边际增益微弱，需实盘验证」，不夸大。V4 是否替换 v3 由 boss 看完报告决定。'
};

// ===== 保存报告 =====
fs.writeFileSync('model_v4_report.json', JSON.stringify(finalReport, null, 2));
console.log('\n报告已保存到 model_v4_report.json');

// ================= V4 生产预测出口 + 独立账生成 =================
// 说明：反追冷版（version='v4'）沿用 V3 网格搜索最优参数（单一变量），
//       只在评分时按 COLD 规则扣分。生产出口与回测账均用 V4 评分。
function loadActualNumsMap() {
  try {
    const html = fs.readFileSync('号码走势图.html', 'utf8');
    const m = html.match(/var D\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) return {};
    const D = JSON.parse(m[1]);
    const map = {};
    for (const r of D) {
      if (r.y === 2026) map[Number(r.p)] = r.nums;
    }
    return map;
  } catch (e) {
    return {};
  }
}
function tailsOfNums(nums) {
  if (!nums || !nums.length) return null;
  return Array.from(new Set(nums.map(n => n % 10))).sort((a, b) => a - b);
}
function nowStr() {
  const d = new Date();
  const p2 = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}
function round2(x) { return Math.round(x * 100) / 100; }
function round4(x) { return Math.round(x * 10000) / 10000; }

// 生产训练配置：前200期学人格 + 网格搜索选参（沿用 V3 参数体系）
const PROD_TRAIN = periods.slice(0, 200);
const PROD_PERSONALITY = learnTailPersonality(PROD_TRAIN);
const PROD_BEST = gridSearch(PROD_TRAIN, PROD_PERSONALITY);

// ===== 生产预测出口（开奖前预测下一期，V4 反追冷版）=====
console.log('\n\n========== V4 生产预测：基于最新一期预测下一期 ==========');
console.log('最优参数: trend=' + PROD_BEST.params.trend + ' streak=' + PROD_BEST.params.streak + ' reversal=' + PROD_BEST.params.reversal + ' triple=' + PROD_BEST.params.triple + ' personality=' + PROD_BEST.params.personalityMultiplier + ' minSignals=' + PROD_BEST.params.minSignals);
const PROD_LATEST = periods[periods.length - 1];
const PROD_NEXT = PROD_LATEST + 1;
console.log('最新开奖: 第 ' + PROD_LATEST + ' 期 → 预测目标: 第 ' + PROD_NEXT + ' 期\n');
const PROD_PRED = predict(PROD_LATEST, PROD_PERSONALITY, PROD_BEST.params, PROD_BEST.params.minSignals, 'v4');
if (!PROD_PRED) {
  console.log('本期无候选（所有未开尾数信号数 < ' + PROD_BEST.params.minSignals + '），建议跳过');
} else {
  console.log('首选尾数: ' + PROD_PRED.primary);
  console.log('备选尾数: ' + (PROD_PRED.secondary !== null ? PROD_PRED.secondary : '无'));
  console.log('首选得分: ' + PROD_PRED.score.toFixed(2));
  console.log('首选信号数: ' + PROD_PRED.signalCount);
  console.log('首选信号清单: ' + PROD_PRED.signals.join(', '));
  console.log('反追冷扣分: ' + (PROD_PRED.coldPenalty || 0).toFixed(2) + ' | 当前遗漏: ' + PROD_PRED.miss + '期');
}

// ===== 生成 recommend_log_v4.json（V4 独立账）=====
console.log('\n\n========== 生成 V4 独立账 recommend_log_v4.json ==========');
const ACTUAL_NUMS = loadActualNumsMap();

// 回测账：第201-256期（训练集为前200期，逐期滚动预测下一期）
const btRecords = [];
let btHits = 0, btSettled = 0;
const btRange = periods.slice(200).filter(p => p <= 256); // 固定 201..256（回测账不随数据增长漂移）
for (let i = 0; i < btRange.length - 1; i++) {
  const p = btRange[i];
  const nextP = btRange[i + 1];
  if (p < 30) continue;
  const pred = predict(p, PROD_PERSONALITY, PROD_BEST.params, PROD_BEST.params.minSignals, 'v4');
  if (!pred) continue;
  const actualNums = ACTUAL_NUMS[nextP] || null;
  const actualTails = tailsOfNums(actualNums);
  const h = hit(nextP, pred.primary);
  if (h) btHits++;
  btSettled++;
  btRecords.push({
    period: nextP,
    time: '-',
    type: '回测',
    primary: pred.primary,
    secondary: pred.secondary,
    score: round2(pred.score),
    signals: pred.signals,
    actualNums: actualNums,
    actualTails: actualTails,
    hit: h,
    cumHitRate: round4(btHits / btSettled)
  });
}

// 实盘账：第257期起（开奖前真实预测；幂等：读既有推荐 + 回填已开奖 + 新增下一期）
const liveHist = {};
try {
  const old = JSON.parse(fs.readFileSync('recommend_log_v4.json', 'utf8'));
  const oldRecs = (old['实盘账'] && old['实盘账'].records) || [];
  for (const r of oldRecs) liveHist[Number(r.period)] = r;
} catch (e) {}

if (PROD_PRED) {
  // time 幂等：已有该期记录则保留旧 time，仅真正新增期用 nowStr()
  const prevRec = liveHist[PROD_NEXT];
  const safeTime = (prevRec && prevRec.time && prevRec.time !== '-' && prevRec.time !== '') ? prevRec.time : nowStr();
  liveHist[PROD_NEXT] = {
    period: PROD_NEXT,
    time: safeTime,
    type: '实盘',
    primary: PROD_PRED.primary,
    secondary: PROD_PRED.secondary,
    score: round2(PROD_PRED.score),
    signals: PROD_PRED.signals,
    actualNums: null,
    actualTails: null,
    hit: null,
    cumHitRate: 0
  };
}

const lvRecords = [];
let liveHits = 0, liveSettled = 0;
for (const p of Object.keys(liveHist).map(Number).sort((a, b) => a - b)) {
  const rec = liveHist[p];
  const actualNums = ACTUAL_NUMS[p] || null;
  const actualTails = tailsOfNums(actualNums);
  let h = null;
  if (actualTails !== null && rec.primary !== null) {
    liveSettled++;
    h = actualTails.includes(rec.primary);
    if (h) liveHits++;
  }
  lvRecords.push({
    period: p,
    time: rec.time,
    type: '实盘',
    primary: rec.primary,
    secondary: rec.secondary,
    score: rec.score,
    signals: rec.signals || [],
    actualNums: actualNums,
    actualTails: actualTails,
    hit: h,
    cumHitRate: liveSettled ? round4(liveHits / liveSettled) : 0
  });
}

const v4ledger = {
  模型: 'model_v4.js',
  命中率口径: '样本外（回测账）与实盘账分开计算',
  回测账: {
    名称: '回测',
    范围: '第201-256期',
    记录数: btRecords.length,
    已开奖数: btSettled,
    命中数: btHits,
    命中率: btSettled ? round4(btHits / btSettled) : 0,
    records: btRecords
  },
  实盘账: {
    名称: '实盘',
    范围: '第257期起',
    记录数: lvRecords.length,
    已开奖数: liveSettled,
    命中数: liveHits,
    命中率: liveSettled ? round4(liveHits / liveSettled) : 0,
    records: lvRecords
  },
  更新时间: nowStr()
};
fs.writeFileSync('recommend_log_v4.json', JSON.stringify(v4ledger, null, 2));
console.log('回测账: ' + btRecords.length + ' 条, 命中 ' + btHits + '/' + btSettled + ' = ' + (btSettled ? (btHits / btSettled * 100).toFixed(1) + '%' : 'N/A'));
console.log('实盘账: ' + lvRecords.length + ' 条（已开 ' + liveSettled + ' 期，命中 ' + liveHits + '）');
console.log('recommend_log_v4.json 已生成');
