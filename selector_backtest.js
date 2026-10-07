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
console.log("双号推荐流状态");
["D1", "D2"].forEach((stream) => {
  const state = analysis.decision.streams[stream];
  const confidence = state.confidence || {};
  console.log(
    [
      state.label,
      "当前=" + (state.current ? "尾" + state.current.tail : "空"),
      "独立概率=" + (confidence.pCorrect == null ? "无信号" : pct(confidence.pCorrect)),
      "置信度=" + (confidence.score == null ? "-" : confidence.score.toFixed(1)),
      "建议=" + (confidence.action || "无信号"),
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
printResult("第四套调度", selector.runBacktest(raw, model, "selector", baseOptions));

const threePeriod = selector.runThreePeriodBacktest(raw, model, baseOptions);
console.log(
  [
    "调度锁定追3期",
    "批次=" + threePeriod.n,
    "3期中=" + threePeriod.hits,
    "命中率=" + pct(threePeriod.hitRate),
    "第1/2/3期=" + threePeriod.first + "/" + threePeriod.second + "/" + threePeriod.third,
    "三期全错=" + threePeriod.miss,
    "来源双号=" + threePeriod.sources.double
  ].join(" | ")
);

console.log("双号推荐流独立追3期");
["D1", "D2"].forEach((stream) => {
  const result = selector.runThreePeriodStreamBacktest(raw, model, stream, baseOptions);
  console.log(
    [
      result.label,
      "批次=" + result.n,
      "3期中=" + result.hits,
      "命中率=" + pct(result.hitRate),
      "第1/2/3期=" + result.first + "/" + result.second + "/" + result.third,
      "三期全错=" + result.miss
    ].join(" | ")
  );
});

console.log("");
console.log("双号推荐流独立置信回测");
["D1", "D2"].forEach((stream) => {
  printResult(stream, selector.runConfidenceBacktest(raw, model, stream, baseOptions));
});

console.log("");
console.log("分段验证");
const end = analysis.latestPeriod;
const mid = Math.floor((31 + end) / 2);
printResult("前半段-死磕双号", selector.runBacktest(raw, model, "double", Object.assign({}, baseOptions, { endPeriod: mid })));
printResult("前半段-调度", selector.runBacktest(raw, model, "selector", Object.assign({}, baseOptions, { endPeriod: mid })));
printResult("后半段-死磕双号", selector.runBacktest(raw, model, "double", Object.assign({}, baseOptions, { startPeriod: mid + 1, endPeriod: end })));
printResult("后半段-调度", selector.runBacktest(raw, model, "selector", Object.assign({}, baseOptions, { startPeriod: mid + 1, endPeriod: end })));
