/**
 * 财神爷小程序 - 模型健康检查（分账版）
 *
 * 数据源：recommend_log.json（唯一权威留痕）
 * 统计回测账与实盘账各自的命中率，分开计算，绝不混报。
 *
 * 运行：node health_check.js
 *
 * 口径：
 * - 回测账：第201-255期样本外回测（含近10期/近20期回测命中率）
 * - 实盘账：第256期起开奖前真实预测（命中率单独算）
 * - 连续未中：仅统计实盘账（真实战绩）
 */

const fs = require('fs');

const path = 'recommend_log.json';
if (!fs.existsSync(path)) {
  console.log('ERROR: 未找到 ' + path + '，请先运行 node model_multi_dimension_v3_fixed.js 再 python3 build_recommend_log.py');
  process.exit(1);
}

const log = JSON.parse(fs.readFileSync(path, 'utf8'));
const bt = log['回测账'] || { records: [] };
const lv = log['实盘账'] || { records: [] };

const btRecords = bt.records || [];
const lvRecords = lv.records || [];

function hitRate(arr) {
  const settled = arr.filter(d => d.hit === true || d.hit === false);
  const hits = settled.filter(d => d.hit === true).length;
  return { n: settled.length, hits, rate: settled.length ? hits / settled.length : 0 };
}

function pct(x) { return (x * 100).toFixed(1) + '%'; }

// 实盘已开奖记录（hit 非 null）
const liveSettled = lvRecords.filter(d => d.hit === true || d.hit === false);
// 实盘未开奖记录
const livePending = lvRecords.filter(d => d.hit === null || d.hit === undefined);

// 实盘连续未中（从最新往前数，未开奖跳过）
let missStreak = 0;
for (let i = lvRecords.length - 1; i >= 0; i--) {
  const d = lvRecords[i];
  if (d.hit === null || d.hit === undefined) continue;
  if (d.hit) break;
  missStreak++;
}

// 回测近10期/近20期命中率
const bt10 = hitRate(btRecords.slice(-10));
const bt20 = hitRate(btRecords.slice(-20));

// 实盘命中率
const live = hitRate(liveSettled);

// 真实预测快照账（开奖前保存，开奖后结算）
const snapshotPath = 'prediction_snapshots.json';
let snapshotRecords = [];
if (fs.existsSync(snapshotPath)) {
  try {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    snapshotRecords = snapshot.records || [];
  } catch (e) {
    snapshotRecords = [];
  }
}

function snapshotSummary(key) {
  const settled = snapshotRecords.filter(r => r.settled && r.results && r.results[key]);
  const hits = settled.filter(r => r.results[key].hit === true).length;
  return { n: settled.length, hits, rate: settled.length ? hits / settled.length : 0 };
}

const snapDouble = snapshotSummary('doubleRecommendation');
const snapWeighted = snapshotSummary('weightedBounce');
const snapPending = snapshotRecords.filter(r => !r.settled).length;

console.log('===== v3 模型健康检查（分账）=====\n');
console.log('数据源: recommend_log.json');

console.log('\n--- 回测账（第201-255期样本外）---');
console.log('总数 ' + btRecords.length + ' 期, 命中 ' + bt['命中数'] + '/' + bt['已开奖数'] + ' = ' + pct(bt['命中率'] || 0));
console.log('近10期回测命中率: ' + bt10.hits + '/' + bt10.n + ' = ' + pct(bt10.rate));
console.log('近20期回测命中率: ' + bt20.hits + '/' + bt20.n + ' = ' + pct(bt20.rate));

console.log('\n--- 实盘账（第256期起开奖前真实预测）---');
console.log('已开奖 ' + liveSettled.length + ' 期, 命中 ' + live.hits + '/' + live.n + ' = ' + pct(live.rate));
console.log('待开奖 ' + livePending.length + ' 期');
console.log('当前连续未中 ' + missStreak + ' 期');

console.log('\n--- 真实快照账（开奖前保存，开奖后结算）---');
console.log('双号推荐: ' + snapDouble.hits + '/' + snapDouble.n + ' = ' + pct(snapDouble.rate));
console.log('加权反弹: ' + snapWeighted.hits + '/' + snapWeighted.n + ' = ' + pct(snapWeighted.rate));
console.log('待开奖: ' + snapPending + ' 期');

// 预警判断（实盘样本不足时不作结论）
const ALERT_THRESHOLD = 0.65;
console.log('\n--- 健康状态 ---');
if (liveSettled.length < 10) {
  console.log('⏳ 实盘样本不足（当前 ' + liveSettled.length + ' 期），需攒够 10-20 期才有真实战绩，暂不作结论');
} else if (live.rate < ALERT_THRESHOLD) {
  console.log('⚠️ 预警：实盘命中率 ' + pct(live.rate) + ' 低于 65%，模型可能失效');
} else if (missStreak >= 3) {
  console.log('⚠️ 预警：实盘连续未中 ' + missStreak + ' 期');
} else {
  console.log('✅ 状态正常：实盘 ' + pct(live.rate) + '，回测 ' + pct(bt['命中率'] || 0));
}

console.log('\n【健康检查结果】回测 ' + pct(bt['命中率'] || 0) + '，旧实盘 ' + pct(live.rate) + '（样本 ' + liveSettled.length + ' 期），真实快照双号 ' + snapDouble.hits + '/' + snapDouble.n + '，加权 ' + snapWeighted.hits + '/' + snapWeighted.n);
