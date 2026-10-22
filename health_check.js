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
  const acted = settled.filter(r => r.models && r.models[key] && Array.isArray(r.models[key].picks) && r.models[key].picks.length > 0);
  const hits = acted.filter(r => r.results[key].hit === true).length;
  return { n: acted.length, settled: settled.length, skipped: settled.length - acted.length, hits, rate: acted.length ? hits / acted.length : 0 };
}

function snapshotPickSummary(key, index) {
  const settled = snapshotRecords.filter(r => r.settled && r.models && r.models[key] && r.models[key].picks && r.models[key].picks.length > 0);
  const hits = settled.filter(r => {
    const p = r.models[key].picks[index];
    return p && (r.actualTails || []).includes(p.tail);
  }).length;
  return { n: settled.length, hits, rate: settled.length ? hits / settled.length : 0 };
}

function snapshotBothSummary(key) {
  const settled = snapshotRecords.filter(r => r.settled && r.models && r.models[key] && r.models[key].picks && r.models[key].picks.length > 0);
  const hits = settled.filter(r => {
    const picks = r.models[key].picks;
    return picks.length >= 2 && picks.every(p => (r.actualTails || []).includes(p.tail));
  }).length;
  return { n: settled.length, hits, rate: settled.length ? hits / settled.length : 0 };
}

const snapDouble = snapshotSummary('doubleRecommendation');
const snapPending = snapshotRecords.filter(r => !r.settled).length;

console.log('===== v3 模型健康检查（分账）=====\n');
console.log('数据源: recommend_log.json');

console.log('\n--- 单期参考回测账（不下注，不作战略结论）---');
console.log('总数 ' + btRecords.length + ' 期, 命中 ' + bt['命中数'] + '/' + bt['已开奖数'] + ' = ' + pct(bt['命中率'] || 0));
console.log('近10期回测命中率: ' + bt10.hits + '/' + bt10.n + ' = ' + pct(bt10.rate));
console.log('近20期回测命中率: ' + bt20.hits + '/' + bt20.n + ' = ' + pct(bt20.rate));

console.log('\n--- 单期参考实盘账（不下注，只检查快照是否持续更新）---');
console.log('已开奖 ' + liveSettled.length + ' 期, 命中 ' + live.hits + '/' + live.n + ' = ' + pct(live.rate));
console.log('待开奖 ' + livePending.length + ' 期');
console.log('当前连续未中 ' + missStreak + ' 期');

console.log('\n--- 三期窗口账（唯一口径：窗口=短期策略单元）---');
const snapshotDoc = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const srcWindows = Array.isArray(snapshotDoc.sourceWindows) ? snapshotDoc.sourceWindows : [];
["D1", "D2"].forEach((sk) => {
  const mine = srcWindows.filter((w) => w.stream === sk && w.status !== "pending");
  const hit = mine.filter((w) => w.status === "hit").length;
  console.log('  ' + (sk === "D1" ? "首推 D1" : "备选 D2") + '：中' + hit + '窗 / 错' + (mine.length - hit) + '窗 · 窗口命中率 ' +
    (mine.length ? pct(hit / mine.length) : "-"));
});
console.log('  进行中窗口: ' + srcWindows.filter((w) => w.status === "pending").length + ' 个（下一期待开奖 ' + snapPending + ' 期）');

// 单期只用于诊断数据链路，不参与战略失效或建仓判断。
console.log('\n--- 单期参考状态 ---');
console.log('单期样本 ' + liveSettled.length + ' 期，单期命中 ' + pct(live.rate) + '；仅作观察，不按单期下注。');

const winD1 = srcWindows.filter((w) => w.stream === "D1" && w.status !== "pending");
const winD2 = srcWindows.filter((w) => w.stream === "D2" && w.status !== "pending");
const winD1Hit = winD1.filter((w) => w.status === "hit").length;
const winD2Hit = winD2.filter((w) => w.status === "hit").length;
console.log('\n--- 战略健康状态（唯一口径：三期窗口命中）---');
if (Math.min(winD1.length, winD2.length) < 20) {
  console.log('⏳ 真实快照窗口样本不足（D1 ' + winD1.length + ' 窗、D2 ' + winD2.length + ' 窗），暂不判断战略失效。');
} else if ((winD1Hit / winD1.length) < 0.85 || (winD2Hit / winD2.length) < 0.85) {
  console.log('⚠️ 预警：三期窗口命中率低于85%，需要人工复核。');
} else {
  console.log('✅ 战略窗口状态正常。');
}
console.log('【健康检查结果】战略主口径=三期窗口命中 D1 ' +
  winD1Hit + '/' + winD1.length + '、D2 ' + winD2Hit + '/' + winD2.length +
  '；单期 ' + pct(live.rate) + '（样本 ' + liveSettled.length + ' 期，仅诊断，不参与下单判断）');

const probSnapshots = JSON.parse(fs.readFileSync("probability_snapshots.json", "utf8"));
const probSettled = (probSnapshots.records || []).filter((record) => record.settled);
const probPending = (probSnapshots.records || []).filter((record) => !record.settled);
const probTop1 = probSettled.filter((record) => record.results && record.results.top1).length;
console.log("\n--- 动态概率新方法快照 ---");
console.log("模型版本: " + probSnapshots.modelVersion + "；已结算 " + probSettled.length + " 期，待开奖 " + probPending.length + " 期");
console.log("Top1: " + probTop1 + "/" + probSettled.length + "；294-296期保留切换前旧快照，新方法从297期开始");
