#!/usr/bin/env node
"use strict";

const fs = require("fs");
const model = require("./model_probability.js");
const raw = require("./lottery_data.json");
const snapshots = JSON.parse(fs.readFileSync("probability_snapshots.json", "utf8"));
const latest = Math.max(...Object.keys(raw).map(Number));
const prediction = model.analyze(raw, latest);
const pending = (snapshots.records || []).filter((record) => !record.settled);
const target = latest + 1;
const uiText = fs.readFileSync("app.js", "utf8");
const failures = [];
function tailOf(period, tail) {
  return raw[String(period)] && raw[String(period)][tail] === "1";
}

function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) failures.push(label);
}

check(prediction.rows.length === 10, "动态概率必须覆盖尾0-尾9共10个号码");
check(prediction.top.length === 3, "动态概率必须输出前三名");
check(new Set(prediction.top.map((row) => row.tail)).size === 3, "概率前三名不得重复号码");
check(prediction.rows.every((row) => Number.isFinite(row.nextProb) && row.nextProb > 0 && row.nextProb < 1), "下一期概率必须在0到1之间");
check(prediction.rows.every((row) => Number.isFinite(row.window3Prob) && row.window3Prob > 0 && row.window3Prob < 1), "三期概率必须在0到1之间");
check(prediction.rows.every((row, index, rows) => index === 0 || rows[index - 1].nextProb >= row.nextProb), "概率结果必须按下一期概率降序排列");
check(prediction.rows.every((row) => {
  let streak = 0;
  for (let period = latest; period >= 1 && tailOf(period, row.tail); period--) streak++;
  return row.currentStreak === streak;
}), "页面的当前连出必须使用真实未截断值");
check(prediction.rows.some((row) => row.currentStreak > 5), "真实连出超过5期时不得在展示数据中封顶");
check(pending.length === 1 && Number(pending[0].target) === target, "必须只有一条下一期待开奖影子快照");
check(
  snapshots.records.every((record) => Array.isArray(record.allTails) && record.allTails.length === 10),
  "每期真实概率快照必须保存完整10个尾号"
);
check(
  snapshots.records.every((record) => new Set(record.allTails.map((row) => Number(row.tail))).size === 10),
  "每期真实概率快照的10个尾号不得重复或缺失"
);
check(
  snapshots.records.every((record) => record.allTails.every((row, index, rows) => (
    index === 0 || Number(rows[index - 1].nextProb) >= Number(row.nextProb)
  ))),
  "每期真实概率快照必须按下一期概率从高到低保存"
);
check(
  snapshots.records.every((record) => (
    record.top3.map((row) => Number(row.tail)).join(",") ===
    record.allTails.slice(0, 3).map((row) => Number(row.tail)).join(",")
  )),
  "每期真实概率快照前三名必须等于完整排序的前三项"
);
check(
  pending.length === 1 && pending[0].top3.map((row) => row.tail).join(",") === prediction.top.map((row) => row.tail).join(","),
  "待开奖影子快照前三名必须与固定模型输出一致"
);
check(!("D1" in prediction) && !("D2" in prediction), "动态概率模型不得继续输出旧D1/D2排名");
check(
  uiText.includes("function wmProbabilityHistoryRows") &&
  uiText.includes("PROB_MODEL.windowBacktest(rawYear") &&
  uiText.includes('if (line.kind === "probability") return wmProbabilityWindows(line, 3)') &&
  uiText.includes('if (line.kind === "probability") return wmProbabilityWindows(line, 2)'),
  "概率三线的动态概率、窗口热图、13线和下注执行表必须共用全历史回测窗口"
);

const appText = fs.readFileSync("data.js", "utf8");
const appData = JSON.parse(appText.slice(appText.indexOf("{"), appText.lastIndexOf("}") + 1));
function yearRawFor(year) {
  const out = {};
  appData.d.filter((row) => Number(row.y) === Number(year)).forEach((row) => {
    const bits = Array(10).fill("0");
    row.nums.forEach((num) => { bits[Number(num) % 10] = "1"; });
    out[String(row.p)] = bits.join("");
  });
  return out;
}
const testYears = [...new Set(appData.d.map((row) => Number(row.y)).filter(Number.isFinite))].sort((a, b) => b - a);
console.log(`测试历史年份：${testYears.join("/")}`);
for (const year of testYears) {
  const yearRaw = yearRawFor(year);
  const maxPeriod = Math.max(...Object.keys(yearRaw).map(Number));
  for (let rank = 0; rank < 3; rank++) {
    const records = model.windowBacktest(yearRaw, rank, 3);
    check(records.length > 0, year + "概率第" + (rank + 1) + "必须有测试窗口");
    check(records.every((record) => record.attempts.length >= 1 && record.attempts.length <= 3), year + "概率第" + (rank + 1) + "每窗只能记录第1-3期");
    check(records.every((record) => record.attempts.every((attempt) => attempt.period <= maxPeriod)), year + "概率第" + (rank + 1) + "不得出现未来期");
    check(records.every((record, index, list) => index === 0 || list[index - 1].startPeriod < record.startPeriod), year + "概率第" + (rank + 1) + "窗口必须按时间递增");
  }
}

console.log(`模型版本：${model.VERSION} · 目标期：${target} · 前三名：尾${prediction.top.map((row) => row.tail).join("/尾")}`);
console.log(`RESULT: ${failures.length ? "FAILED " + failures.length : "ALL PASS"}`);
process.exit(failures.length ? 1 : 0);
