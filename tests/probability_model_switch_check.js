"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const model = require("../model_probability.js");
const raw = require("../lottery_data.json");
const snapshots = require("../probability_snapshots.json");

const pending = snapshots.records.find((record) => !record.settled);
const locked = model.analyze(raw, pending.basedOn);
const fresh = model.analyze(raw, pending.basedOn, { method: "new" });
const legacy296 = snapshots.records.find((record) => Number(record.target) === 296);

assert.equal(model.VERSION, "prob-v2-20261022-57152130");
assert.equal(legacy296.modelVersion, "prob-v1-20261020");
assert.deepEqual(
  legacy296.top3.map((row) => Number(row.tail)),
  [8, 3, 7],
  "the frozen 296 snapshot must remain unchanged"
);
assert.equal(locked.version, "prob-v2-20261022-57152130");
assert.deepEqual(
  locked.top.map((row) => Number(row.tail)),
  pending.top3.map((row) => Number(row.tail)),
  "the current saved snapshot must remain the displayed prediction"
);
assert.equal(fresh.version, "prob-v2-20261022-57152130");
assert.deepEqual(model.META.productionMethod.windows, [5, 7, 15, 21, 30]);
assert.ok(
  fresh.rows.every((row, index, rows) => (
    index === 0 || rows[index - 1].window3Prob >= row.window3Prob
  )),
  "new production ranking must use three-period weights"
);

assert.ok(fs.existsSync("probability_snapshots.js"), "snapshot JS bridge must exist");
const source = fs.readFileSync("probability_snapshots.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "probability_snapshots.js" });
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.window.APP_PROBABILITY_SNAPSHOTS)),
  snapshots,
  "probability snapshot JS must match the frozen JSON source"
);

console.log("PASS: probability model switch and snapshot bridge");
