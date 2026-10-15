// 逐线"错1个窗口后 vs 平时"的显著性 + 需要多少样本才能确认
const data = [
  ["尾0", 0.867, 91, 0.80], ["尾1", 0.923, 62, 0.95], ["尾2", 0.918, 68, 0.94], ["尾3", 0.919, 64, 0.92],
  ["尾4", 0.907, 72, 0.93], ["尾5", 0.913, 70, 0.86], ["尾6", 0.926, 61, 0.93], ["尾7", 0.916, 67, 0.94],
  ["尾8", 0.905, 75, 0.87], ["尾9", 0.900, 82, 0.91], ["追号码D1", 0.912, 69, 0.88], ["追号码D2", 0.914, 67, 0.96],
  ["追推荐D1", 0.920, 64, 0.92], ["追推荐D2", 0.918, 66, 0.88],
];
function binomTwoSided(k, n, p0) {
  const le = (kk) => { let s = 0, c = 1; for (let i = 0; i <= kk; i++) { if (i > 0) c = c * (n - i + 1) / i; s += c * Math.pow(p0, i) * Math.pow(1 - p0, n - i); } return s; };
  return Math.min(1, 2 * Math.min(le(k), 1 - le(k - 1)));
}
function needN(p0, p1, zA) { const zB = 0.84; return Math.round(Math.pow(zA * Math.sqrt(p0 * (1 - p0)) + zB * Math.sqrt(p1 * (1 - p1)), 2) / Math.pow(p1 - p0, 2)); }
console.log("线路 | 平时 | 错1后 | 差 | 样本 | p值 | 校正门槛 | 要证明这个差异需要样本");
data.forEach(([lb, base, n, after]) => {
  const k = Math.round(after * n);
  const pv = binomTwoSided(k, n, base);
  const need = needN(base, after, 3.05);
  console.log(lb + " | " + (base * 100).toFixed(1) + "% | " + (after * 100).toFixed(0) + "% | " +
    ((after - base) * 100 >= 0 ? "+" : "") + ((after - base) * 100).toFixed(1) + "pp | " + n + " | " +
    pv.toFixed(3) + " | 0.0036 | 约" + need + " 次");
});
