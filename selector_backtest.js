#!/usr/bin/env node
"use strict";

const core = require("./model_core.js");
const selector = require("./model_selector.js");
const raw = require("./lottery_data.json");

const model = core.createModel(raw);
const baseOptions = Object.assign({}, selector.DEFAULT_OPTIONS, {
  startPeriod: Number(process.env.START_PERIOD || 31),
  endPeriod: process.env.END_PERIOD ? Number(process.env.END_PERIOD) : null
});

function pct(value) {
  return (value * 100).toFixed(2) + "%";
}

function printResult(name, result) {
  console.log(
    [
      name,
      "出手=" + result.bets,
      "命中率=" + pct(result.hitRate),
      "净收益=" + result.net.toFixed(2),
      "回报率=" + pct(result.roi),
      "最大回撤=" + result.maxDrawdown.toFixed(2),
      "观望=" + result.observed
    ].join(" | ")
  );
}

const analysis = selector.analyze(raw, model, baseOptions);
console.log("第四套调度模型 " + selector.VERSION);
console.log("数据截至 " + analysis.latestPeriod + "，预测 " + analysis.nextPeriod);
console.log("当前动作：" + analysis.decision.action + " | " + analysis.decision.rule + " | " + analysis.decision.reason);

console.log("");
console.log("推荐流状态");
["double", "weighted"].forEach((stream) => {
  const state = stream === "double" ? analysis.decision.double : analysis.decision.weighted;
  console.log(
    [
      state.label,
      "当前=" + (state.current ? "尾" + state.current.tail : "空"),
      "近20期=" + pct(state.recentHitRate),
      "相位差=" + pct(state.edge),
      "当前连中=" + state.currentHitStreak,
      "当前连错=" + state.currentMissStreak,
      "空推荐率=" + pct(state.emptyRate),
      "3期内命中=" + pct(state.threePeriod.hitRate)
    ].join(" | ")
  );
});

console.log("");
console.log("单期跟推荐回测");
printResult("死磕双号", selector.runBacktest(raw, model, "double", baseOptions));
printResult("死磕加权", selector.runBacktest(raw, model, "weighted", baseOptions));
printResult("第四套调度", selector.runBacktest(raw, model, "selector", baseOptions));

console.log("");
console.log("分段验证");
const end = analysis.latestPeriod;
const mid = Math.floor((31 + end) / 2);
printResult("前半段-死磕双号", selector.runBacktest(raw, model, "double", Object.assign({}, baseOptions, { endPeriod: mid })));
printResult("前半段-调度", selector.runBacktest(raw, model, "selector", Object.assign({}, baseOptions, { endPeriod: mid })));
printResult("后半段-死磕双号", selector.runBacktest(raw, model, "double", Object.assign({}, baseOptions, { startPeriod: mid + 1, endPeriod: end })));
printResult("后半段-调度", selector.runBacktest(raw, model, "selector", Object.assign({}, baseOptions, { startPeriod: mid + 1, endPeriod: end })));
