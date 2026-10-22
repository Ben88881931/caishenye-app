#!/usr/bin/env node
"use strict";

const fs = require("fs");
const probability = require("./model_probability.js");
const raw = require("./lottery_data.json");
const SNAPSHOT_PATH = "probability_snapshots.json";
const SNAPSHOT_JS_PATH = "probability_snapshots.js";

function tailsOf(period) {
  return [...(raw[String(period)] || "")].reduce((out, bit, tail) => {
    if (bit === "1") out.push(tail);
    return out;
  }, []);
}

function loadState() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return { modelVersion: probability.VERSION, records: [], latestPeriod: null };
  }
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
}

function writeSnapshotJs(state) {
  fs.writeFileSync(
    SNAPSHOT_JS_PATH,
    "window.APP_PROBABILITY_SNAPSHOTS = " + JSON.stringify(state, null, 2) + ";\n",
    "utf8"
  );
}

function sync() {
  const periods = Object.keys(raw).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const latest = periods[periods.length - 1];
  const state = loadState();
  state.modelVersion = probability.VERSION;
  state.records = Array.isArray(state.records) ? state.records : [];

  for (const record of state.records) {
    if (record.settled || !raw[String(record.target)]) continue;
    const actualTails = tailsOf(record.target);
    record.actualTails = actualTails;
    record.settled = true;
    record.settledAt = new Date().toISOString();
    record.results = {
      top1: actualTails.includes(record.top3[0].tail),
      top3: record.top3.some((row) => actualTails.includes(row.tail))
    };
  }

  const target = latest + 1;
  if (!state.records.some((record) => Number(record.target) === target)) {
    const prediction = probability.analyze(raw, latest);
    state.records.push({
      modelVersion: probability.VERSION,
      generatedAt: new Date().toISOString(),
      basedOn: latest,
      target,
      rankingMetric: "window3Prob",
      settled: false,
      top3: prediction.top.map((row) => ({
        tail: row.tail,
        nextProb: Number(row.nextProb.toFixed(6)),
        window3Prob: Number(row.window3Prob.toFixed(6))
      })),
      allTails: prediction.rows.map((row) => ({
        tail: row.tail,
        nextProb: Number(row.nextProb.toFixed(6)),
        window3Prob: Number(row.window3Prob.toFixed(6))
      }))
    });
  }

  state.latestPeriod = latest;
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(state, null, 2), "utf8");
  writeSnapshotJs(state);
  const pending = state.records.filter((record) => !record.settled);
  const settled = state.records.filter((record) => record.settled);
  const top1Hits = settled.filter((record) => record.results && record.results.top1).length;
  const top3Hits = settled.filter((record) => record.results && record.results.top3).length;
  console.log(
    `动态概率快照已同步：已结算 ${settled.length} 期，待开奖 ${pending.length} 期，` +
    `Top1 ${top1Hits}/${settled.length}，Top3覆盖 ${top3Hits}/${settled.length}，下一期 ${target}`
  );
}

sync();
