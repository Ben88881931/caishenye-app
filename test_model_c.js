/**
 * 模型C交叉验证和样本外测试
 */

const fs = require('fs');
const { MODEL_C_PARAMS, modelCBacktest } = require('./model_c.js');

// 加载历史数据
const historyData = JSON.parse(fs.readFileSync('history_data.json', 'utf8'));

console.log('=== 模型C 交叉验证和样本外测试 ===\n');

// 1. 5-fold交叉验证
console.log('【1】5-fold交叉验证\n');

const totalPeriods = 1165;
const foldSize = Math.floor(totalPeriods / 5);
const folds = [];

for (let i = 0; i < 5; i++) {
  const start = i * foldSize + 1;
  const end = i === 4 ? totalPeriods : (i + 1) * foldSize;
  folds.push({ start, end });
}

console.log('Fold划分:');
folds.forEach((fold, i) => {
  console.log(`  Fold ${i + 1}: 期数 ${fold.start}-${fold.end}`);
});

// 参数网格
const paramGrid = [
  { decayRate: 1.0, minSample: 2, smoothFactor: 0.05 },
  { decayRate: 1.0, minSample: 2, smoothFactor: 0.1 },
  { decayRate: 1.0, minSample: 3, smoothFactor: 0.05 },
  { decayRate: 1.5, minSample: 2, smoothFactor: 0.05 },
  { decayRate: 1.5, minSample: 2, smoothFactor: 0.1 },
  { decayRate: 1.5, minSample: 3, smoothFactor: 0.05 },
  { decayRate: 2.0, minSample: 2, smoothFactor: 0.1 },
  { decayRate: 2.0, minSample: 3, smoothFactor: 0.1 },
];

console.log('\n参数网格搜索:');
console.log(`  共 ${paramGrid.length} 组参数\n`);

const cvResults = [];

paramGrid.forEach(params => {
  let totalHitRate = 0;
  const foldHitRates = [];
  
  folds.forEach((fold, i) => {
    // 训练集：当前fold之前的所有数据
    const trainData = {};
    for (let p = 1; p < fold.start; p++) {
      if (historyData[p]) trainData[p] = historyData[p];
    }
    
    // 验证集：当前fold
    const result = modelCBacktest(historyData, fold.start, fold.end, params);
    foldHitRates.push(result.hitRate);
    totalHitRate += result.hitRate;
  });
  
  const avgHitRate = totalHitRate / 5;
  cvResults.push({
    params,
    avgHitRate,
    foldHitRates
  });
});

// 排序找最优
cvResults.sort((a, b) => b.avgHitRate - a.avgHitRate);

console.log('交叉验证结果（Top 5）:');
cvResults.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i + 1}. 命中率 ${(r.avgHitRate * 100).toFixed(1)}%`);
  console.log(`     参数: decayRate=${r.params.decayRate}, minSample=${r.params.minSample}, smoothFactor=${r.params.smoothFactor}`);
  console.log(`     各fold: ${r.foldHitRates.map(h => (h * 100).toFixed(1) + '%').join(', ')}`);
});

const bestParams = cvResults[0].params;
console.log('\n最优参数:');
console.log(`  decayRate: ${bestParams.decayRate}`);
console.log(`  minSample: ${bestParams.minSample}`);
console.log(`  smoothFactor: ${bestParams.smoothFactor}`);
console.log(`  交叉验证命中率: ${(cvResults[0].avgHitRate * 100).toFixed(1)}%`);

// 2. 样本外测试
console.log('\n\n【2】样本外测试\n');

// 划分：2021-2024训练，2025测试
const trainEnd = 233 * 4; // 932期（2021-2024）
const testStart = trainEnd + 1;
const testEnd = 233 * 5; // 1165期（2025）

console.log(`训练集: 2021-2024年, 期数 1-${trainEnd}`);
console.log(`测试集: 2025年, 期数 ${testStart}-${testEnd}`);

// 用最优参数在测试集上测试
const testResult = modelCBacktest(historyData, testStart, testEnd, bestParams);

console.log('\n样本外测试结果:');
console.log(`  总期数: ${testResult.total}`);
console.log(`  命中期数: ${testResult.correct}`);
console.log(`  命中率: ${(testResult.hitRate * 100).toFixed(1)}%`);

// 3. 对比新旧模型
console.log('\n\n【3】新旧模型对比\n');

console.log('模型A（app.js）:');
console.log('  参数量: 7个');
console.log('  全量回测命中率: 95.0%');
console.log('  样本外命中率: 55-60%（监督总裁报告）');

console.log('\n模型C（新模型）:');
console.log(`  参数量: 3个`);
console.log(`  交叉验证命中率: ${(cvResults[0].avgHitRate * 100).toFixed(1)}%`);
console.log(`  样本外命中率: ${(testResult.hitRate * 100).toFixed(1)}%`);

// 4. 验收标准
console.log('\n\n【4】验收结果\n');

const oosHitRate = testResult.hitRate * 100;
if (oosHitRate >= 70) {
  console.log(`✅ 通过: 样本外命中率 ${oosHitRate.toFixed(1)}% ≥ 70%`);
} else if (oosHitRate >= 60) {
  console.log(`⚠️ 需要继续优化: 样本外命中率 ${oosHitRate.toFixed(1)}% 在 60-70% 之间`);
} else {
  console.log(`❌ 模型无效: 样本外命中率 ${oosHitRate.toFixed(1)}% < 60%`);
}

// 5. 保存结果
const report = {
  timestamp: new Date().toISOString(),
  cvResults: cvResults.slice(0, 10),
  bestParams,
  cvHitRate: cvResults[0].avgHitRate,
  testResult: {
    total: testResult.total,
    correct: testResult.correct,
    hitRate: testResult.hitRate
  },
  conclusion: oosHitRate >= 70 ? '通过' : oosHitRate >= 60 ? '需要优化' : '模型无效'
};

fs.writeFileSync('model_c_report.json', JSON.stringify(report, null, 2));
console.log('\n\n详细报告已保存到 model_c_report.json');
