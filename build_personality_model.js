"use strict";

const fs = require("node:fs");
const vm = require("node:vm");
const personality = require("./next_window_model.js");
const probabilityModel = require("./model_probability.js");

function readSnapshots() {
  if (!fs.existsSync("personality_snapshots.json")) {
    return { version: "personality-snapshots-v1", records: [] };
  }
  return JSON.parse(fs.readFileSync("personality_snapshots.json", "utf8"));
}

function settleSnapshots(snapshots, d) {
  let changed = false;
  snapshots.records.forEach((record) => {
    if (record.superseded) return;
    record.lines.forEach((line) => {
      if (line.status !== "pending") return;
      line.attempts = Array.isArray(line.attempts) ? line.attempts : [];
      while (line.attempts.length < 3) {
        const localPeriod = Number(record.target) + line.attempts.length;
        const actual = d.find((row) => Number(row.y) === Number(record.year) && Number(row.p) === localPeriod);
        if (!actual) break;
        const hit = (actual.nums || []).some((num) => Number(num) % 10 === Number(line.tail));
        line.attempts.push({
          period: localPeriod,
          tail: Number(line.tail),
          hit,
        });
        changed = true;
        if (hit) {
          line.status = "hit";
          line.hitIndex = line.attempts.length;
          break;
        }
      }
      if (line.status === "pending" && line.attempts.length === 3) {
        line.status = "miss";
        line.hitIndex = 0;
      }
    });
  });
  return { snapshots, changed };
}

function appendCurrentSnapshot(snapshots, model, appData) {
  const latest = appData.d[appData.d.length - 1];
  const targetGlobal = appData.d.length + 1;
  const targetLocal = Number(latest.p) + 1;
  const sameVersion = snapshots.records.some((record) => (
    Number(record.year) === Number(latest.y) &&
    Number(record.target) === targetLocal &&
    record.version === model.version
  ));
  if (sameVersion) return false;
  snapshots.records.forEach((record) => {
    if (Number(record.year) === Number(latest.y) && Number(record.target) === targetLocal) {
      record.superseded = true;
      record.supersededBy = model.version;
    }
  });

  const candidates = model.ranking.map((line) => ({
    id: line.id,
    label: line.label,
    tail: line.current.tail,
    predictedRate: line.current.predictedRate,
    baseline: line.current.baseline,
    edge: line.current.edge,
    state: line.current.state,
    attempts: [],
    status: "pending",
    hitIndex: null,
  }));
  snapshots.records.push({
    version: model.version,
    generatedAt: model.generatedAt,
    year: Number(latest.y),
    basedOn: Number(latest.p),
    target: targetLocal,
    targetGlobal,
    candidates: candidates.map((line) => line.id),
    top3: candidates.slice(0, 3).map((line) => line.id),
    lines: candidates,
  });
  return true;
}

const dataSandbox = { window: {} };
vm.runInNewContext(fs.readFileSync("data.js", "utf8"), dataSandbox, { filename: "data.js" });
const appData = dataSandbox.window.APP_DATA;
const model = personality.build({
  raw: appData.raw,
  d: appData.d,
  probabilityModel,
  asOfPeriod: appData.d.length,
});
model.generatedAt = new Date().toISOString();

const settled = settleSnapshots(readSnapshots(), appData.d);
const snapshots = settled.snapshots;
const appended = appendCurrentSnapshot(snapshots, model, appData);
snapshots.latestPeriod = Number(appData.d[appData.d.length - 1].p);
if (settled.changed || appended || !snapshots.updatedAt) snapshots.updatedAt = model.generatedAt;

fs.writeFileSync("personality_model.json", JSON.stringify(model, null, 2) + "\n", "utf8");
fs.writeFileSync(
  "personality_model_data.js",
  "window.APP_PERSONALITY_MODEL = " + JSON.stringify(model, null, 2) + ";\n",
  "utf8"
);
fs.writeFileSync("personality_snapshots.json", JSON.stringify(snapshots, null, 2) + "\n", "utf8");
fs.writeFileSync(
  "personality_snapshots.js",
  "window.APP_PERSONALITY_SNAPSHOTS = " + JSON.stringify(snapshots, null, 2) + ";\n",
  "utf8"
);

console.log(
  `built per-line personality model: latest ${appData.d[appData.d.length - 1].p}, ` +
  `${model.lines.length} lines, top ${model.ranking[0].label} ` +
  `${(model.ranking[0].current.predictedRate * 100).toFixed(1)}%`
);
