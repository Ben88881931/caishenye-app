/**
 * 模型C：简化版遗漏反弹模型
 * 
 * 设计目标：
 * - 减少参数数量（3-4个）
 * - 用连续评分代替二进制阈值
 * - 避免过拟合
 * 
 * 核心逻辑：
 * - 计算每个尾数的遗漏期数
 * - 遗漏越久，得分越高（线性衰减）
 * - 选择得分最高的尾数
 */

// 模型C参数（3个）
const MODEL_C_PARAMS = {
  decayRate: 1.5,      // 衰减因子（控制近期权重）
  minSample: 2,        // 最小样本数
  smoothFactor: 0.1    // 平滑因子（避免极端值）
};

/**
 * 计算尾数d在period期的得分
 * @param {number} d - 尾数 0-9
 * @param {number} period - 当前期数
 * @param {object} data - 历史数据 {period: {binary: '...'}}
 * @param {object} params - 模型参数
 * @returns {number} 得分
 */
function modelCScore(d, period, data, params = MODEL_C_PARAMS) {
  const { decayRate, minSample, smoothFactor } = params;
  
  // 收集尾数d的历史出现位置
  const appearances = [];
  for (let p = 1; p < period; p++) {
    if (!data[p]) continue;
    const binary = data[p].binary;
    if (binary[d] === '1') {
      appearances.push(p);
    }
  }
  
  // 样本不足
  if (appearances.length < minSample) {
    return 0;
  }
  
  // 计算当前遗漏期数
  const lastAppearance = appearances[appearances.length - 1];
  const currentMiss = period - lastAppearance;
  
  // 计算历史平均遗漏
  const gaps = [];
  for (let i = 1; i < appearances.length; i++) {
    gaps.push(appearances[i] - appearances[i - 1]);
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  
  // 计算反弹概率（连续函数）
  // 遗漏越接近平均遗漏，反弹概率越高
  const missRatio = currentMiss / avgGap;
  
  // 使用sigmoid-like函数，避免极端值
  const bounceProb = 1 - Math.exp(-missRatio * smoothFactor);
  
  // 加权历史反弹率（近期权重更高）
  let weightedBounce = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < gaps.length; i++) {
    const distance = appearances.length - 1 - i;
    const weight = Math.max(1, 10 - distance / decayRate);
    const actualBounce = gaps[i] >= avgGap ? 1 : 0;
    weightedBounce += weight * actualBounce;
    totalWeight += weight;
  }
  
  if (totalWeight === 0) return 0;
  
  const historicalBounceRate = weightedBounce / totalWeight;
  
  // 最终得分 = 反弹概率 * 历史反弹率
  return bounceProb * historicalBounceRate;
}

/**
 * 预测下一期的尾数
 * @param {number} period - 当前期数
 * @param {object} data - 历史数据
 * @param {object} params - 模型参数
 * @returns {object} {primary: 首选尾数, secondary: 备选尾数, scores: 所有尾数得分}
 */
function modelCPredict(period, data, params = MODEL_C_PARAMS) {
  const scores = [];
  
  for (let d = 0; d < 10; d++) {
    // 跳过当前期已开出的尾数
    if (data[period] && data[period].binary[d] === '1') {
      continue;
    }
    
    const score = modelCScore(d, period, data, params);
    scores.push({ d, score });
  }
  
  // 按得分排序
  scores.sort((a, b) => b.score - a.score);
  
  return {
    primary: scores[0]?.d,
    secondary: scores[1]?.d,
    scores: scores
  };
}

/**
 * 检查预测是否命中
 * @param {object} prediction - 预测结果
 * @param {string} nextBinary - 下一期的二进制
 * @returns {boolean}
 */
function modelCCheck(prediction, nextBinary) {
  if (!nextBinary) return false;
  return nextBinary[prediction.primary] === '1';
}

/**
 * 回测
 * @param {object} data - 历史数据
 * @param {number} startPeriod - 起始期数
 * @param {number} endPeriod - 结束期数
 * @param {object} params - 模型参数
 * @returns {object} 回测结果
 */
function modelCBacktest(data, startPeriod, endPeriod, params = MODEL_C_PARAMS) {
  let correct = 0;
  let total = 0;
  const details = [];
  
  for (let p = startPeriod; p < endPeriod; p++) {
    if (!data[p] || !data[p + 1]) continue;
    
    const prediction = modelCPredict(p, data, params);
    const hit = modelCCheck(prediction, data[p + 1].binary);
    
    if (hit) correct++;
    total++;
    
    details.push({
      period: p + 1,
      primary: prediction.primary,
      actual: data[p + 1].binary,
      hit: hit
    });
  }
  
  return {
    correct,
    total,
    hitRate: total > 0 ? correct / total : 0,
    details
  };
}

// 导出
if (typeof module !== 'undefined') {
  module.exports = {
    MODEL_C_PARAMS,
    modelCScore,
    modelCPredict,
    modelCCheck,
    modelCBacktest
  };
}
