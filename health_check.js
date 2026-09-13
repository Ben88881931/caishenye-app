/**
 * 财神爷小程序 - 模型健康检查
 * 
 * 统计生产模型 v3（model_multi_dimension_v3_fixed.js）近10期、近20期命中率，
 * 用于实盘观察期监控真实命中率。
 * 
 * 运行：node health_check.js
 * 
 * 监控指标（v2.0 文档要求）：
 * - 近10期命中率（样本外期望 73.9%，低于 65% 需警惕）
 * - 近20期命中率（样本外期望 73.9%，低于 65% 需警惕）
 * - 连续未中次数（≥3 次需预警）
 */

const fs = require('fs');

const reportPath = 'model_multi_dimension_v3_fixed_report.json';

if (!fs.existsSync(reportPath)) {
  console.log('ERROR: 未找到 ' + reportPath + '，请先运行 node model_multi_dimension_v3_fixed.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const details = report.testResult.details;

// 按 period 排序（确保顺序）
details.sort((a, b) => a.period - b.period);

function hitRate(arr) {
  if (arr.length === 0) return { n: 0, hits: 0, rate: 0 };
  const hits = arr.filter(d => d.hit).length;
  return { n: arr.length, hits, rate: hits / arr.length };
}

const last10 = details.slice(-10);
const last20 = details.slice(-20);

// 连续未中统计
let missStreak = 0;
for (let i = details.length - 1; i >= 0; i--) {
  if (details[i].hit) break;
  missStreak++;
}

const r10 = hitRate(last10);
const r20 = hitRate(last20);

console.log('===== v3 模型健康检查 =====\n');
console.log('数据范围: 第 ' + details[0].period + ' - ' + details[details.length - 1].period + ' 期');
console.log('共 ' + details.length + ' 期推荐记录\n');

console.log('--- 近10期命中率 ---');
console.log('命中 ' + r10.hits + ' / ' + r10.n + ' = ' + (r10.rate * 100).toFixed(1) + '%');

console.log('\n--- 近20期命中率 ---');
console.log('命中 ' + r20.hits + ' / ' + r20.n + ' = ' + (r20.rate * 100).toFixed(1) + '%');

console.log('\n--- 连续未中 ---');
console.log('当前连续未中 ' + missStreak + ' 期');

// 预警判断（v2.0：样本外期望 73.9%，低于65%预警）
const ALERT_THRESHOLD = 0.65;
console.log('\n--- 健康状态 ---');
if (r10.rate < ALERT_THRESHOLD) {
  console.log('⚠️ 预警：近10期命中率 ' + (r10.rate * 100).toFixed(1) + '% 低于65%');
} else if (missStreak >= 3) {
  console.log('⚠️ 预警：连续未中 ' + missStreak + ' 期，需关注');
} else {
  console.log('✅ 状态正常：近10期 ' + (r10.rate * 100).toFixed(1) + '%，近20期 ' + (r20.rate * 100).toFixed(1) + '%');
}

// 输出健康检查结果
console.log('\n【健康检查结果】近10期命中率 ' + (r10.rate * 100).toFixed(1) + '%，近20期命中率 ' + (r20.rate * 100).toFixed(1) + '%');