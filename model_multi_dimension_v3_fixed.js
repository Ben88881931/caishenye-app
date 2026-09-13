/**
 * 多维度交叉验证模型 v3 - 修复版
 * 
 * 修复内容：
 * 1. reversalSignal 数据泄露（严重）→ 只用当前期及之前数据
 * 2. 推荐率计算公式 bug → 分母改为实际预测次数
 * 3. 报告明确标注训练集/测试集
 */

const fs = require('fs');
const lotteryData = JSON.parse(fs.readFileSync('lottery_data.json', 'utf8'));

const periods = Object.keys(lotteryData).map(Number).filter(p => !isNaN(p)).sort((a, b) => a - b);
console.log('2026年数据: ' + periods.length + '期');

// ===== 基础函数 =====
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
    if (periods[i] > upto) break;
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
  
  // 【修复】只用当前期及之前的数据，判断"大遗漏后刚开出"
  // 不再向后看 countAfter（那是未来数据）
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

// ===== 综合评分 v3 =====
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

// ===== 预测函数 =====
function predictV3(p, personality, weights, minSignals = 2) {
  const scores = [];
  
  for (let d = 0; d < 10; d++) {
    if (hit(p, d)) continue;
    
    const result = multiDimensionScoreV3(d, p, personality, weights);
    scores.push({
      d,
      score: result.score,
      signals: result.signals,
      signalCount: result.signalCount,
      abScore: result.abScore,
      wbr: result.wbr,
      miss: result.miss
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
    miss: candidates[0].miss
  };
}

// ===== 主程序 =====
console.log('\n===== 多维度交叉验证模型 v3 - 修复版 =====\n');

const trainPeriods = periods.slice(0, 200);
const testPeriods = periods.slice(200);

console.log('训练集: 第1-200期 (' + trainPeriods.length + '期)');
console.log('测试集: 第201-' + periods[periods.length - 1] + '期 (' + testPeriods.length + '期)\n');

// 步骤1：学习尾号性格
console.log('【1】学习尾号性格（训练集）\n');
const personality = learnTailPersonality(trainPeriods);

for (let d = 0; d < 10; d++) {
  const p = personality[d];
  console.log('  尾' + d + ': ' + p.type + '型');
}

// 步骤2：参数网格搜索（训练集）
console.log('\n【2】参数网格搜索（训练集内）\n');

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
        for (const personality of personalityValues) {
          for (const minSignals of minSignalsValues) {
            paramGrid.push({ trend, streak, reversal, triple, personalityMultiplier: personality, minSignals });
          }
        }
      }
    }
  }
}

console.log('参数网格: ' + paramGrid.length + ' 组组合\n');

const cvResults = [];
let processed = 0;

for (const params of paramGrid) {
  let correct = 0, total = 0, recommended = 0;
  
  for (let i = 0; i < trainPeriods.length - 1; i++) {
    const p = trainPeriods[i];
    const nextP = trainPeriods[i + 1];
    
    if (p < 30) continue;
    
    const prediction = predictV3(p, personality, params);
    
    if (prediction) {
      recommended++;
      if (hit(nextP, prediction.primary)) correct++;
      total++;
    }
  }
  
  const hitRate = total > 0 ? correct / total : 0;
  const recommendRate = recommended / Math.max(1, trainPeriods.length - 1 - 29);
  
  cvResults.push({ params, hitRate, recommendRate, correct, total, recommended });
  
  processed++;
}

cvResults.sort((a, b) => b.hitRate - a.hitRate);

console.log('训练集结果（Top 5）:');
cvResults.slice(0, 5).forEach((r, i) => {
  console.log('  ' + (i + 1) + '. 命中率' + (r.hitRate * 100).toFixed(1) + '%, 推荐率' + (r.recommendRate * 100).toFixed(1) + '%');
});

const bestParams = cvResults[0].params;

// 步骤3：测试集验证
console.log('\n【3】测试集验证（第201-' + periods[periods.length - 1] + '期）\n');

let testCorrect = 0, testTotal = 0, testRecommended = 0;
const testDetails = [];

// 实际预测次数 = testPeriods.length - 1（每期预测下一期）
const totalAttempts = testPeriods.length - 1;

for (let i = 0; i < testPeriods.length - 1; i++) {
  const p = testPeriods[i];
  const nextP = testPeriods[i + 1];
  
  if (p < 30) continue;
  
  const prediction = predictV3(p, personality, bestParams);
  
  if (prediction) {
    testRecommended++;
    const hitResult = hit(nextP, prediction.primary);
    if (hitResult) testCorrect++;
    testTotal++;
    
    testDetails.push({
      period: nextP,
      primary: prediction.primary,
      score: prediction.score,
      signalCount: prediction.signalCount,
      signals: prediction.signals,
      hit: hitResult
    });
  }
}

const testHitRate = testTotal > 0 ? testCorrect / testTotal : 0;
// 【修复】推荐率 = 推荐期数 / 实际预测次数
const testRecommendRate = testRecommended / totalAttempts;

console.log('最优参数:');
console.log('  trend=' + bestParams.trend);
console.log('  streak=' + bestParams.streak);
console.log('  reversal=' + bestParams.reversal);
console.log('  triple=' + bestParams.triple);
console.log('  personalityMultiplier=' + bestParams.personalityMultiplier);
console.log('  minSignals=' + bestParams.minSignals);

console.log('\n测试集结果（样本外）:');
console.log('  实际预测次数: ' + totalAttempts);
console.log('  推荐期数: ' + testRecommended);
console.log('  命中: ' + testCorrect + '/' + testTotal);
console.log('  命中率: ' + (testHitRate * 100).toFixed(1) + '%');
console.log('  推荐率: ' + (testRecommendRate * 100).toFixed(1) + '%');

// 步骤4：参数敏感性分析（明确标注训练集）
console.log('\n【4】参数敏感性分析（训练集内，仅供参考，不用于验收）\n');

function analyzeSensitivity(paramName, values) {
  console.log('\n' + paramName + ' 敏感性 [训练集]:');
  
  for (const val of values) {
    const filtered = cvResults.filter(r => r.params[paramName] === val);
    if (filtered.length === 0) continue;
    
    const avgHitRate = filtered.reduce((sum, r) => sum + r.hitRate, 0) / filtered.length;
    const maxHitRate = Math.max(...filtered.map(r => r.hitRate));
    
    console.log('  ' + paramName + '=' + val + ': 平均' + (avgHitRate * 100).toFixed(1) + '%, 最高' + (maxHitRate * 100).toFixed(1) + '%');
  }
}

analyzeSensitivity('trend', trendValues);
analyzeSensitivity('streak', streakValues);
analyzeSensitivity('reversal', reversalValues);
analyzeSensitivity('triple', tripleValues);
analyzeSensitivity('personalityMultiplier', personalityValues);
analyzeSensitivity('minSignals', minSignalsValues);

// 步骤5：信号数量分析（测试集）
console.log('\n【5】信号数量分析（测试集）\n');

const signalDist = {};
testDetails.forEach(d => {
  const count = d.signalCount;
  if (!signalDist[count]) signalDist[count] = { total: 0, hit: 0 };
  signalDist[count].total++;
  if (d.hit) signalDist[count].hit++;
});

console.log('信号数量分布 [测试集]:');
Object.keys(signalDist).sort((a, b) => a - b).forEach(count => {
  const stat = signalDist[count];
  const rate = stat.total > 0 ? stat.hit / stat.total : 0;
  console.log('  ' + count + '个信号: ' + (rate * 100).toFixed(1) + '% (' + stat.hit + '/' + stat.total + ')');
});

// 步骤6：验收（只看测试集）
console.log('\n【6】验收结果（只看测试集/样本外）\n');

console.log('目标1: 命中率 > 65% [测试集]');
if (testHitRate > 0.65) {
  console.log('  ✅ 通过: ' + (testHitRate * 100).toFixed(1) + '% > 65%');
} else {
  console.log('  ❌ 未达标: ' + (testHitRate * 100).toFixed(1) + '% <= 65%');
}

console.log('\n目标2: 推荐率 >= 30% [测试集]');
if (testRecommendRate >= 0.30) {
  console.log('  ✅ 通过: ' + (testRecommendRate * 100).toFixed(1) + '% >= 30%');
} else {
  console.log('  ❌ 未达标: ' + (testRecommendRate * 100).toFixed(1) + '% < 30%');
}

// 保存报告
const report = {
  timestamp: new Date().toISOString(),
  modelVersion: 'v3-fixed - 修复数据泄露+推荐率bug+报告标注',
  dataRange: '2026年第1-' + periods[periods.length - 1] + '期',
  trainRange: '第1-200期',
  testRange: '第201-' + periods[periods.length - 1] + '期',
  fixes: [
    'reversalSignal 只用当前期及之前数据，移除 countAfter 未来数据',
    '推荐率分母改为 testPeriods.length - 1（实际预测次数）',
    '报告明确标注训练集/测试集'
  ],
  personality,
  bestParams,
  trainResult: {
    note: '训练集内结果，仅用于调参，不用于验收',
    topParams: cvResults.slice(0, 10).map(r => ({
      params: r.params, hitRate: r.hitRate, recommendRate: r.recommendRate
    }))
  },
  testResult: {
    note: '样本外测试，用于验收',
    totalAttempts: totalAttempts,
    recommended: testRecommended,
    recommendRate: testRecommendRate,
    correct: testCorrect,
    total: testTotal,
    hitRate: testHitRate,
    details: testDetails
  },
  signalDist,
  conclusion: {
    hitRatePass: testHitRate > 0.65,
    recommendRatePass: testRecommendRate >= 0.30
  }
};

fs.writeFileSync('model_multi_dimension_v3_fixed_report.json', JSON.stringify(report, null, 2));
console.log('\n报告已保存到 model_multi_dimension_v3_fixed_report.json');

// ===== 生产预测出口（开奖前预测下一期）=====
console.log('\n\n========== 生产预测：基于最新一期预测下一期 ==========\n');
const latestPeriod = periods[periods.length - 1];
const nextPeriod = latestPeriod + 1;
console.log('最新一期: 第 ' + latestPeriod + ' 期');
console.log('预测目标: 第 ' + nextPeriod + ' 期\n');

// 用训练集(前200期)学到的 personality + 训练集网格搜索的最优参数 bestParams
const prodPrediction = predictV3(latestPeriod, personality, bestParams, bestParams.minSignals);

if (!prodPrediction) {
  console.log('本期无候选（所有未开尾数信号数 < ' + bestParams.minSignals + '），建议跳过');
} else {
  console.log('首选尾数: ' + prodPrediction.primary);
  console.log('备选尾数: ' + (prodPrediction.secondary !== null ? prodPrediction.secondary : '无'));
  console.log('首选得分: ' + prodPrediction.score.toFixed(2));
  console.log('首选信号数: ' + prodPrediction.signalCount);
  console.log('首选信号清单: ' + prodPrediction.signals.join(', '));
  console.log('首选 AB得分: ' + prodPrediction.abScore + ' | 反弹率: ' + (prodPrediction.wbr * 100).toFixed(0) + '% | 遗漏: ' + prodPrediction.miss + '期');
}