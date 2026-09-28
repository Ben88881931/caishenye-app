#!/usr/bin/env node
"use strict";

const core = require("./model_core.js");
const ultimate = require("./ultimate_model.js");
const raw = require("./lottery_data.json");

const model = core.createModel(raw);
const options = Object.assign({}, ultimate.DEFAULT_OPTIONS, {
  startPeriod: Number(process.env.START_PERIOD || 31)
});

function pct(value) {
  return (value * 100).toFixed(2) + "%";
}

function printBacktest(name, result) {
  console.log(
    [
      name,
      "序列=" + result.sequences,
      "投入=" + result.staked.toFixed(2),
      "净收益=" + result.net.toFixed(2),
      "回报率=" + pct(result.roi),
      "最大回撤=" + result.maxDrawdown.toFixed(2),
      "最长连亏=" + result.maxLossRun + "期"
    ].join(" | ")
  );
}

const analysis = ultimate.analyze(raw, model, options);
console.log("终极模型 " + analysis.version);
console.log("数据范围 " + analysis.startPeriod + "-" + analysis.endPeriod + "，下一期 " + analysis.nextPeriod);
console.log("当前决策：" + analysis.decision.action + "，启用 " + (analysis.decision.keys.join("/") || "无"));

ultimate.KEYS.forEach((key) => {
  const item = analysis.items[key];
  const state = item.monitor;
  const window = item.window;
  console.log(
    [
      key + " " + item.label,
      "当前推荐=" + (item.currentPick ? "尾" + item.currentPick.tail : "空"),
      "状态=" + state.stateLabel,
      "分数=" + state.score.toFixed(1),
      "近期20=" + (state.recent20 == null ? "-" : pct(state.recent20)),
      "当前遗漏=" + state.currentOmission,
      "最高遗漏=" + state.maxOmission,
      "当前连中=" + state.currentHitStreak,
      "最高连中=" + state.maxHitStreak,
      "3期内命中=" + pct(window.hit3Rate),
      "第1/2/3期=" + window.first + "/" + window.second + "/" + window.third,
      "三期全错=" + window.miss,
      "建议=" + (state.pattern || "观望")
    ].join(" | ")
  );
});

console.log("");
console.log("追号模式回测（同一号码锁定追3期）");
Object.keys(ultimate.PATTERNS).forEach((key) => {
  printBacktest(key + " " + ultimate.PATTERNS[key].label, ultimate.runFixedBacktest(raw, model, key, options));
});

console.log("");
console.log("追号模式状态选择");
printBacktest("追号状态模型", ultimate.runStrategyBacktest(raw, model, options));

console.log("");
console.log("追推荐模式回测（每期新推荐独立追3期）");
["P6", "P7"].forEach((key) => {
  printBacktest("追推荐 " + key + " " + ultimate.PATTERNS[key].label, ultimate.runOverlappingBacktest(raw, model, key, options));
});
printBacktest("追推荐状态模型", ultimate.runRecommendationBacktest(raw, model, options));
