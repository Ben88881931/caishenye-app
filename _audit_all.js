#!/usr/bin/env node
// 每日审计总入口：七项标准检查 + 全部硬护栏，任一 FAIL 就整体 FAIL（不许推送）
const { spawnSync } = require("child_process");
const postPush = process.argv.includes("--post-push");

const CHECKS = [
  { name: "score_calibration", cmd: ["node", "score_calibration.js"], blocker: true },
  { name: "ultimate_backtest", cmd: ["node", "ultimate_backtest.js"], blocker: true, expect: /自检 PASS/ },
  { name: "selector_backtest", cmd: ["node", "selector_backtest.js"], blocker: true },
  { name: "page_audit", cmd: ["node", "page_audit.js"], blocker: true, expect: /PAGE AUDIT PASSED/ },
  { name: "check_app", cmd: ["python", "check_app.py"], blocker: true, expect: /CHECK PASSED/ },
  { name: "health_check", cmd: ["node", "health_check.js"], blocker: true },
  { name: "supervisor_report", cmd: ["node", "model_supervisor.js", "report"], blocker: true },
  { name: "护栏·模型漂移", cmd: ["node", "_model_drift_check.js"], blocker: false, alarmOn2: true },
  { name: "护栏·未来期必须待定", cmd: ["node", "_future_tail_check.js"], blocker: true },
  { name: "护栏·跨页窗口一致", cmd: ["node", "_window_consistency.js"], blocker: true, expect: /不一致条数：0/ },
  { name: "护栏·记录只当年", cmd: ["node", "_record_scope_check.js"], blocker: true },
  { name: "护栏·当期尾号写全", cmd: ["node", "_hint_tail_check.js"], blocker: true },
  { name: "护栏·下注执行表", cmd: ["node", "_betexec_check.js"], blocker: true },
  { name: "护栏·翻页手势", cmd: ["node", "_swipe_check.js"], blocker: true },
  { name: "护栏·本地=远端", cmd: ["node", "_remote_sync_check.js"], blocker: postPush, skip: !postPush, skipNote: "推送后复核（加 --post-push 才跑）" },
];

const results = [];
for (const c of CHECKS) {
  if (c.skip) { results.push({ name: c.name, state: "SKIP", note: c.skipNote }); console.log("SKIP: " + c.name + " · " + c.skipNote); continue; }
  const r = spawnSync(c.cmd[0], c.cmd.slice(1), { encoding: "utf8", shell: false });
  const out = (r.stdout || "") + (r.stderr || "");
  const tail = out.trim().split("\n").slice(-1)[0] || "";
  const code = r.status == null ? 1 : r.status;
  let state = "PASS", note = tail.slice(0, 90);
  if (code === 0 && (!c.expect || c.expect.test(out))) state = "PASS";
  else if (code === 2 && c.alarmOn2) { state = "ALERT"; note = tail.slice(0, 90); }
  else { state = "FAIL"; note = (code === 2 ? "报警(exit2) " : "") + tail.slice(0, 90); }
  results.push({ name: c.name, state, note, blocker: c.blocker });
  console.log(state.padEnd(6) + c.name.padEnd(24) + note);
}

console.log("\n===== 审计汇总 =====");
results.forEach((r) => console.log("  " + r.state.padEnd(6) + r.name + (r.note ? "  · " + r.note : "")));
const blocked = results.filter((r) => r.state === "FAIL" && r.blocker);
const alerts = results.filter((r) => r.state === "ALERT");
const softFails = results.filter((r) => r.state === "FAIL" && !r.blocker);
console.log("\n阻断性问题 " + blocked.length + " 项 · 报警（不阻断） " + alerts.length + " 项 · 非阻断失败 " + softFails.length + " 项");
console.log("结论：" + (blocked.length ? "❌ 不许推送，先修阻断项" : "✅ 全部阻断项通过" + (alerts.length ? "（有报警项，见上，需人工判断）" : "")));
process.exit(blocked.length ? 1 : 0);
