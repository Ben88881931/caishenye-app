#!/usr/bin/env python3
"""Build a reproducible SQLite training database from immutable app snapshots."""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCHEMA_VERSION = "training-schema-v1"
SOURCE_FILES = (
    "data.js",
    "personality_snapshots.json",
    "probability_snapshots.json",
    "prediction_snapshots.json",
    "personality_model.json",
)


def load_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def load_app_data():
    text = (ROOT / "data.js").read_text(encoding="utf-8")
    match = re.search(r"window\.APP_DATA\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        raise RuntimeError("data.js does not contain window.APP_DATA")
    return json.loads(match.group(1))


def sha256_file(path):
    digest = hashlib.sha256()
    with (ROOT / path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_text(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def stable_id(prefix, *parts):
    payload = "|".join(str(part) for part in parts)
    return prefix + "-" + hashlib.sha1(payload.encode("utf-8")).hexdigest()[:20]


def draw_date(year, period):
    return date(int(year), 1, 1) + timedelta(days=int(period) - 1)


def optional_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def optional_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def create_schema(connection):
    connection.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE periods (
          global_period INTEGER PRIMARY KEY,
          raw_period INTEGER NOT NULL,
          year INTEGER NOT NULL,
          local_period INTEGER NOT NULL,
          draw_date TEXT NOT NULL,
          numbers_json TEXT NOT NULL,
          tails_json TEXT NOT NULL,
          tail_binary TEXT NOT NULL,
          zodiacs_json TEXT,
          tai TEXT,
          UNIQUE(year, local_period)
        );

        CREATE TABLE lines (
          line_id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          label TEXT NOT NULL
        );

        CREATE TABLE personality_snapshots (
          snapshot_id TEXT PRIMARY KEY,
          model_version TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          year INTEGER NOT NULL,
          based_on INTEGER NOT NULL,
          target INTEGER NOT NULL,
          target_global INTEGER,
          top3_json TEXT NOT NULL,
          candidates_json TEXT NOT NULL,
          superseded INTEGER NOT NULL DEFAULT 0,
          superseded_by TEXT
        );

        CREATE TABLE personality_predictions (
          prediction_id TEXT PRIMARY KEY,
          snapshot_id TEXT NOT NULL REFERENCES personality_snapshots(snapshot_id),
          line_id TEXT NOT NULL REFERENCES lines(line_id),
          rank INTEGER NOT NULL,
          label TEXT,
          tail INTEGER NOT NULL,
          predicted_rate REAL,
          baseline REAL,
          edge REAL,
          state TEXT,
          risk_pattern TEXT,
          risk_levels_json TEXT,
          cascade_decision TEXT,
          forward_rate REAL,
          forward_hits INTEGER,
          forward_samples INTEGER,
          reverse_rate REAL,
          reverse_hits INTEGER,
          reverse_samples INTEGER,
          status TEXT NOT NULL,
          hit_index INTEGER,
          attempts_json TEXT NOT NULL,
          based_on INTEGER NOT NULL,
          target INTEGER NOT NULL,
          target_global INTEGER,
          actual_tails_json TEXT,
          actual_hit INTEGER,
          UNIQUE(snapshot_id, line_id)
        );

        CREATE TABLE probability_snapshots (
          snapshot_id TEXT PRIMARY KEY,
          model_version TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          year INTEGER,
          based_on INTEGER NOT NULL,
          target INTEGER NOT NULL,
          target_global INTEGER,
          settled INTEGER NOT NULL,
          ranking_metric TEXT,
          top3_json TEXT NOT NULL,
          actual_tails_json TEXT,
          settled_at TEXT,
          results_json TEXT
        );

        CREATE TABLE probability_predictions (
          snapshot_id TEXT NOT NULL REFERENCES probability_snapshots(snapshot_id),
          rank INTEGER NOT NULL,
          tail INTEGER NOT NULL,
          next_prob REAL,
          window3_prob REAL,
          actual_hit INTEGER,
          PRIMARY KEY(snapshot_id, rank)
        );

        CREATE TABLE core_snapshots (
          snapshot_id TEXT PRIMARY KEY,
          model_version TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          year INTEGER,
          based_on INTEGER NOT NULL,
          target INTEGER NOT NULL,
          target_global INTEGER,
          settled INTEGER NOT NULL,
          actual_period INTEGER,
          actual_tails_json TEXT,
          settled_at TEXT,
          results_json TEXT
        );

        CREATE TABLE core_picks (
          snapshot_id TEXT NOT NULL REFERENCES core_snapshots(snapshot_id),
          stream TEXT NOT NULL,
          rank INTEGER NOT NULL,
          tail INTEGER NOT NULL,
          score REAL,
          tag TEXT,
          actual_hit INTEGER,
          PRIMARY KEY(snapshot_id, stream, rank)
        );

        CREATE TABLE model_line_features (
          model_version TEXT NOT NULL,
          line_id TEXT NOT NULL REFERENCES lines(line_id),
          ranking_position INTEGER NOT NULL,
          label TEXT NOT NULL,
          kind TEXT NOT NULL,
          long_term_json TEXT NOT NULL,
          yearly_json TEXT NOT NULL,
          validation_json TEXT NOT NULL,
          current_json TEXT NOT NULL,
          PRIMARY KEY(model_version, line_id)
        );

        CREATE TABLE model_reviews (
          review_number INTEGER PRIMARY KEY,
          model_version TEXT NOT NULL,
          status TEXT NOT NULL,
          policy_json TEXT NOT NULL,
          last_reviewed_period INTEGER NOT NULL,
          last_reviewed_at TEXT NOT NULL,
          next_review_period INTEGER NOT NULL,
          next_review_at TEXT NOT NULL,
          metrics_json TEXT NOT NULL,
          previous_metrics_json TEXT,
          rule_replacement TEXT
        );

        CREATE TABLE training_examples (
          example_id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          snapshot_id TEXT NOT NULL,
          model_version TEXT NOT NULL,
          line_id TEXT NOT NULL REFERENCES lines(line_id),
          target_global INTEGER,
          target_year INTEGER,
          target_local_period INTEGER,
          target_date TEXT,
          features_json TEXT NOT NULL,
          predicted_rate REAL,
          baseline REAL,
          edge REAL,
          actual_tails_json TEXT,
          actual_hit INTEGER
        );

        CREATE TABLE historical_windows (
          window_id TEXT PRIMARY KEY,
          line_id TEXT NOT NULL REFERENCES lines(line_id),
          start_global INTEGER NOT NULL REFERENCES periods(global_period),
          start_year INTEGER NOT NULL,
          start_local_period INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_global INTEGER NOT NULL REFERENCES periods(global_period),
          end_year INTEGER NOT NULL,
          end_local_period INTEGER NOT NULL,
          end_date TEXT NOT NULL,
          attempts_json TEXT NOT NULL,
          hit_index INTEGER NOT NULL,
          hit INTEGER NOT NULL
        );

        CREATE INDEX idx_personality_predictions_target
          ON personality_predictions(target_global, line_id);
        CREATE INDEX idx_probability_predictions_tail
          ON probability_predictions(tail);
        CREATE INDEX idx_core_picks_tail
          ON core_picks(tail);
        CREATE INDEX idx_training_examples_target
          ON training_examples(target_global, line_id);
        CREATE INDEX idx_historical_windows_line_date
          ON historical_windows(line_id, start_date, end_date);

        CREATE VIEW v_monthly_activity AS
        SELECT
          e.line_id,
          p.year,
          CAST(strftime('%m', p.draw_date) AS INTEGER) AS month,
          COUNT(*) AS windows,
          SUM(e.actual_hit) AS hits,
          AVG(e.actual_hit) AS hit_rate,
          AVG(e.predicted_rate) AS mean_predicted_rate
        FROM training_examples e
        JOIN periods p ON p.global_period = e.target_global
        WHERE e.actual_hit IS NOT NULL
        GROUP BY e.line_id, p.year, CAST(strftime('%m', p.draw_date) AS INTEGER);

        CREATE VIEW v_half_month_activity AS
        SELECT
          e.line_id,
          p.year,
          CAST(strftime('%m', p.draw_date) AS INTEGER) AS month,
          CASE WHEN CAST(strftime('%d', p.draw_date) AS INTEGER) <= 15 THEN 1 ELSE 2 END AS half,
          COUNT(*) AS windows,
          SUM(e.actual_hit) AS hits,
          AVG(e.actual_hit) AS hit_rate,
          AVG(e.predicted_rate) AS mean_predicted_rate
        FROM training_examples e
        JOIN periods p ON p.global_period = e.target_global
        WHERE e.actual_hit IS NOT NULL
        GROUP BY
          e.line_id,
          p.year,
          CAST(strftime('%m', p.draw_date) AS INTEGER),
          CASE WHEN CAST(strftime('%d', p.draw_date) AS INTEGER) <= 15 THEN 1 ELSE 2 END;

        CREATE VIEW v_line_training_summary AS
        SELECT
          line_id,
          COUNT(*) AS examples,
          SUM(CASE WHEN actual_hit IS NOT NULL THEN 1 ELSE 0 END) AS settled_examples,
          SUM(COALESCE(actual_hit, 0)) AS hits,
          AVG(actual_hit) AS hit_rate,
          AVG(predicted_rate) AS mean_predicted_rate,
          AVG(edge) AS mean_edge
        FROM training_examples
        GROUP BY line_id;

        CREATE VIEW v_historical_monthly_behavior AS
        SELECT
          line_id,
          start_year AS year,
          CAST(strftime('%m', start_date) AS INTEGER) AS month,
          COUNT(*) AS windows,
          SUM(hit) AS hits,
          AVG(hit) AS hit_rate,
          AVG(CASE WHEN hit_index = 1 THEN 1 ELSE 0 END) AS first_stage_rate,
          AVG(CASE WHEN hit_index = 2 THEN 1 ELSE 0 END) AS second_stage_rate,
          AVG(CASE WHEN hit_index = 3 THEN 1 ELSE 0 END) AS third_stage_rate
        FROM historical_windows
        GROUP BY line_id, start_year, CAST(strftime('%m', start_date) AS INTEGER);

        CREATE VIEW v_historical_half_month_behavior AS
        SELECT
          line_id,
          start_year AS year,
          CAST(strftime('%m', start_date) AS INTEGER) AS month,
          CASE WHEN CAST(strftime('%d', start_date) AS INTEGER) <= 15 THEN 1 ELSE 2 END AS half,
          COUNT(*) AS windows,
          SUM(hit) AS hits,
          AVG(hit) AS hit_rate,
          AVG(CASE WHEN hit_index = 1 THEN 1 ELSE 0 END) AS first_stage_rate,
          AVG(CASE WHEN hit_index = 2 THEN 1 ELSE 0 END) AS second_stage_rate,
          AVG(CASE WHEN hit_index = 3 THEN 1 ELSE 0 END) AS third_stage_rate
        FROM historical_windows
        GROUP BY
          line_id,
          start_year,
          CAST(strftime('%m', start_date) AS INTEGER),
          CASE WHEN CAST(strftime('%d', start_date) AS INTEGER) <= 15 THEN 1 ELSE 2 END;
        """
    )


def build(output_path, manifest_path):
    app_data = load_app_data()
    records = app_data.get("d", [])
    raw = app_data.get("raw", {})
    if not records:
        raise RuntimeError("data.js has no draw records")

    output_path = Path(output_path)
    manifest_path = Path(manifest_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    temp_manifest = manifest_path.with_suffix(manifest_path.suffix + ".tmp")
    if temp_path.exists():
        temp_path.unlink()
    if temp_manifest.exists():
        temp_manifest.unlink()

    personality = load_json("personality_snapshots.json")
    probability = load_json("probability_snapshots.json")
    core = load_json("prediction_snapshots.json")
    personality_model = load_json("personality_model.json")

    connection = sqlite3.connect(temp_path)
    try:
        create_schema(connection)
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        period_index = {}
        period_by_global = {}
        period_rows = []
        for global_period, row in enumerate(records, start=1):
            year = int(row["y"])
            local_period = int(row["p"])
            tails = sorted({int(number) % 10 for number in row.get("nums", [])})
            binary = raw.get(str(global_period))
            if binary is None:
                binary = "".join("1" if tail in tails else "0" for tail in range(10))
            period_index[(year, local_period)] = global_period
            period_row = (
                global_period,
                global_period,
                year,
                local_period,
                draw_date(year, local_period).isoformat(),
                json_text(row.get("nums", [])),
                json_text(tails),
                binary,
                json_text(row.get("zods", [])),
                row.get("tai"),
            )
            period_rows.append(period_row)
            period_by_global[global_period] = period_row
        connection.executemany(
            "INSERT INTO periods VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            period_rows,
        )

        lines = {}
        for line in personality_model.get("lines", []):
            lines[line["id"]] = (line["kind"], line["label"])
        for line in personality.get("records", []):
            for prediction in line.get("lines", []):
                lines[prediction["id"]] = (
                    "probability" if str(prediction["id"]).startswith("prob") else "tail",
                    prediction.get("label", prediction["id"]),
                )
        for line_id in sorted(lines):
            connection.execute(
                "INSERT INTO lines(line_id, kind, label) VALUES (?, ?, ?)",
                (line_id, lines[line_id][0], lines[line_id][1]),
            )

        historical_rows = []
        for tail in range(10):
            line_id = f"tail{tail}"
            for start_global in range(1, len(records) - 1):
                attempts = []
                hit_index = 0
                for offset in range(3):
                    global_period = start_global + offset
                    period = period_by_global[global_period]
                    nums = json.loads(period[5])
                    hit = 1 if any(int(number) % 10 == tail for number in nums) else 0
                    if hit and hit_index == 0:
                        hit_index = offset + 1
                    attempts.append(
                        {
                            "global_period": global_period,
                            "year": period[2],
                            "local_period": period[3],
                            "date": period[4],
                            "tail": tail,
                            "hit": bool(hit),
                        }
                    )
                start_period = period_by_global[start_global]
                end_period = period_by_global[start_global + 2]
                historical_rows.append(
                    (
                        stable_id("historical-window", line_id, start_global),
                        line_id,
                        start_global,
                        start_period[2],
                        start_period[3],
                        start_period[4],
                        start_global + 2,
                        end_period[2],
                        end_period[3],
                        end_period[4],
                        json_text(attempts),
                        hit_index,
                        1 if hit_index > 0 else 0,
                    )
                )
        connection.executemany(
            "INSERT INTO historical_windows VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            historical_rows,
        )

        personality_snapshot_rows = []
        personality_prediction_rows = []
        training_rows = []
        snapshot_index = {}
        for record in personality.get("records", []):
            generated_at = record.get("generatedAt") or personality.get("updatedAt") or now
            model_version = record.get("version", "unknown")
            year = int(record["year"])
            target = int(record["target"])
            target_global = optional_int(record.get("targetGlobal"))
            if target_global is None:
                target_global = period_index.get((year, target))
            snapshot_id = stable_id(
                "personality",
                model_version,
                year,
                target,
                generated_at,
                json_text(record.get("top3", [])),
            )
            snapshot_index[(model_version, year, target)] = snapshot_id
            superseded = 1 if record.get("superseded") else 0
            personality_snapshot_rows.append(
                (
                    snapshot_id,
                    model_version,
                    generated_at,
                    year,
                    int(record.get("basedOn", target - 1)),
                    target,
                    target_global,
                    json_text(record.get("top3", [])),
                    json_text(record.get("candidates", [])),
                    superseded,
                    record.get("supersededBy"),
                )
            )
            target_period = next(
                (
                    period
                    for period in period_rows
                    if period[0] == target_global
                ),
                None,
            )
            actual_tails = json.loads(target_period[6]) if target_period else None
            for rank, prediction in enumerate(record.get("lines", []), start=1):
                line_id = prediction["id"]
                tail = int(prediction["tail"])
                actual_hit = (
                    1 if actual_tails is not None and tail in actual_tails
                    else (0 if actual_tails is not None else None)
                )
                forward = prediction.get("forward") or {}
                reverse = prediction.get("reverse") or {}
                risk_levels = prediction.get("riskLevels")
                personality_prediction_rows.append(
                    (
                        stable_id("personality-prediction", snapshot_id, line_id),
                        snapshot_id,
                        line_id,
                        rank,
                        prediction.get("label"),
                        tail,
                        optional_float(prediction.get("predictedRate")),
                        optional_float(prediction.get("baseline")),
                        optional_float(prediction.get("edge")),
                        prediction.get("state"),
                        prediction.get("riskPattern"),
                        json_text(risk_levels) if risk_levels is not None else None,
                        prediction.get("cascadeDecision"),
                        optional_float(forward.get("predictedRate")),
                        optional_int(forward.get("hits")),
                        optional_int(forward.get("samples")),
                        optional_float(reverse.get("predictedRate")),
                        optional_int(reverse.get("hits")),
                        optional_int(reverse.get("samples")),
                        prediction.get("status", "pending"),
                        optional_int(prediction.get("hitIndex")),
                        json_text(prediction.get("attempts", [])),
                        int(record.get("basedOn", target - 1)),
                        target,
                        target_global,
                        json_text(actual_tails) if actual_tails is not None else None,
                        actual_hit,
                    )
                )
                training_rows.append(
                    (
                        stable_id("training-personality", snapshot_id, line_id),
                        "personality_snapshot",
                        snapshot_id,
                        model_version,
                        line_id,
                        target_global,
                        year,
                        target,
                        draw_date(year, target).isoformat() if target_global else None,
                        json_text(
                            {
                                "baseline": prediction.get("baseline"),
                                "edge": prediction.get("edge"),
                                "state": prediction.get("state"),
                                "risk_pattern": prediction.get("riskPattern"),
                                "risk_levels": risk_levels,
                                "cascade_decision": prediction.get("cascadeDecision"),
                                "forward": forward,
                                "reverse": reverse,
                            }
                        ),
                        optional_float(prediction.get("predictedRate")),
                        optional_float(prediction.get("baseline")),
                        optional_float(prediction.get("edge")),
                        json_text(actual_tails) if actual_tails is not None else None,
                        actual_hit,
                    )
                )
        connection.executemany(
            "INSERT INTO personality_snapshots VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            personality_snapshot_rows,
        )
        connection.executemany(
            "INSERT INTO personality_predictions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            personality_prediction_rows,
        )

        probability_snapshot_rows = []
        probability_prediction_rows = []
        for record in probability.get("records", []):
            generated_at = record.get("generatedAt") or probability.get("updatedAt") or now
            year = int(str(generated_at)[:4]) if str(generated_at)[:4].isdigit() else None
            target = int(record["target"])
            target_global = period_index.get((year, target)) if year else None
            snapshot_id = stable_id(
                "probability",
                record.get("modelVersion", "unknown"),
                generated_at,
                target,
                json_text(record.get("top3", [])),
            )
            actual_tails = [int(value) for value in record.get("actualTails", [])]
            probability_snapshot_rows.append(
                (
                    snapshot_id,
                    record.get("modelVersion", probability.get("modelVersion", "unknown")),
                    generated_at,
                    year,
                    int(record.get("basedOn", target - 1)),
                    target,
                    target_global,
                    1 if record.get("settled") else 0,
                    record.get("rankingMetric"),
                    json_text(record.get("top3", [])),
                    json_text(actual_tails) if actual_tails else None,
                    record.get("settledAt"),
                    json_text(record.get("results")) if record.get("results") is not None else None,
                )
            )
            all_tails = record.get("allTails")
            if not all_tails:
                all_tails = record.get("top3", [])
            for rank, prediction in enumerate(all_tails, start=1):
                tail = int(prediction["tail"])
                actual_hit = 1 if actual_tails and tail in actual_tails else (
                    0 if actual_tails else None
                )
                probability_prediction_rows.append(
                    (
                        snapshot_id,
                        rank,
                        tail,
                        optional_float(prediction.get("nextProb")),
                        optional_float(prediction.get("window3Prob")),
                        actual_hit,
                    )
                )
        connection.executemany(
            "INSERT INTO probability_snapshots VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            probability_snapshot_rows,
        )
        connection.executemany(
            "INSERT INTO probability_predictions VALUES (?, ?, ?, ?, ?, ?)",
            probability_prediction_rows,
        )

        core_snapshot_rows = []
        core_pick_rows = []
        for record in core.get("records", []):
            generated_at = record.get("generatedAt") or core.get("updatedAt") or now
            year = int(str(generated_at)[:4]) if str(generated_at)[:4].isdigit() else None
            target = int(record["target"])
            target_global = period_index.get((year, target)) if year else None
            snapshot_id = stable_id(
                "core",
                record.get("modelVersion", "unknown"),
                generated_at,
                target,
                json_text(record.get("models", {})),
            )
            actual_tails = [int(value) for value in record.get("actualTails", [])]
            core_snapshot_rows.append(
                (
                    snapshot_id,
                    record.get("modelVersion", core.get("modelVersion", "unknown")),
                    generated_at,
                    year,
                    int(record.get("basedOn", target - 1)),
                    target,
                    target_global,
                    1 if record.get("settled") else 0,
                    optional_int(record.get("actualPeriod")),
                    json_text(actual_tails) if actual_tails else None,
                    record.get("settledAt"),
                    json_text(record.get("results")) if record.get("results") is not None else None,
                )
            )
            for stream, model in (record.get("models") or {}).items():
                picks = model.get("picks", []) if isinstance(model, dict) else []
                for rank, pick in enumerate(picks, start=1):
                    tail = int(pick["tail"])
                    core_pick_rows.append(
                        (
                            snapshot_id,
                            stream,
                            rank,
                            tail,
                            optional_float(pick.get("score")),
                            pick.get("tag"),
                            1 if actual_tails and tail in actual_tails else (
                                0 if actual_tails else None
                            ),
                        )
                    )
        connection.executemany(
            "INSERT INTO core_snapshots VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            core_snapshot_rows,
        )
        connection.executemany(
            "INSERT INTO core_picks VALUES (?, ?, ?, ?, ?, ?, ?)",
            core_pick_rows,
        )

        feature_rows = []
        ranking_positions = {
            item["id"]: int(item.get("rank", index + 1))
            for index, item in enumerate(personality_model.get("ranking", []))
        }
        for line in personality_model.get("lines", []):
            feature_rows.append(
                (
                    personality_model["version"],
                    line["id"],
                    ranking_positions.get(line["id"], 0),
                    line.get("label", line["id"]),
                    line.get("kind", ""),
                    json_text(line.get("longTerm", {})),
                    json_text(line.get("yearly", [])),
                    json_text(line.get("validation", [])),
                    json_text(line.get("current", {})),
                )
            )
        connection.executemany(
            "INSERT INTO model_line_features VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            feature_rows,
        )

        review = personality_model.get("review")
        if review:
            connection.execute(
                "INSERT INTO model_reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    int(review["reviewNumber"]),
                    personality_model["version"],
                    review.get("status", "unknown"),
                    json_text(review.get("policy", {})),
                    int(review["lastReviewedPeriod"]),
                    review["lastReviewedAt"],
                    int(review["nextReviewPeriod"]),
                    review["nextReviewAt"],
                    json_text(review.get("metrics", {})),
                    json_text(review.get("previousMetrics"))
                    if review.get("previousMetrics") is not None
                    else None,
                    review.get("ruleReplacement"),
                ),
            )

        connection.executemany(
            "INSERT INTO training_examples VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            training_rows,
        )

        metadata = {
            "schema_version": SCHEMA_VERSION,
            "generated_at": now,
            "latest_period": str(records[-1]["p"]),
            "latest_year": str(records[-1]["y"]),
            "personality_model_version": personality_model["version"],
        }
        for source in SOURCE_FILES:
            metadata[f"source_sha256:{source}"] = sha256_file(source)
        connection.executemany(
            "INSERT INTO metadata(key, value) VALUES (?, ?)",
            sorted(metadata.items()),
        )
        connection.commit()

        counts = {
            "periods": connection.execute("SELECT COUNT(*) FROM periods").fetchone()[0],
            "lines": connection.execute("SELECT COUNT(*) FROM lines").fetchone()[0],
            "personality_snapshots": connection.execute(
                "SELECT COUNT(*) FROM personality_snapshots"
            ).fetchone()[0],
            "personality_predictions": connection.execute(
                "SELECT COUNT(*) FROM personality_predictions"
            ).fetchone()[0],
            "probability_snapshots": connection.execute(
                "SELECT COUNT(*) FROM probability_snapshots"
            ).fetchone()[0],
            "probability_predictions": connection.execute(
                "SELECT COUNT(*) FROM probability_predictions"
            ).fetchone()[0],
            "core_snapshots": connection.execute(
                "SELECT COUNT(*) FROM core_snapshots"
            ).fetchone()[0],
            "core_picks": connection.execute("SELECT COUNT(*) FROM core_picks").fetchone()[0],
            "model_line_features": connection.execute(
                "SELECT COUNT(*) FROM model_line_features"
            ).fetchone()[0],
            "model_reviews": connection.execute("SELECT COUNT(*) FROM model_reviews").fetchone()[0],
            "training_examples": connection.execute(
                "SELECT COUNT(*) FROM training_examples"
            ).fetchone()[0],
            "historical_windows": connection.execute(
                "SELECT COUNT(*) FROM historical_windows"
            ).fetchone()[0],
        }
    finally:
        connection.close()

    os.replace(temp_path, output_path)
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": metadata["generated_at"],
        "database": output_path.name,
        "latestPeriod": int(metadata["latest_period"]),
        "latestYear": int(metadata["latest_year"]),
        "personalityModelVersion": metadata["personality_model_version"],
        "counts": counts,
        "sourceHashes": {
            source: metadata[f"source_sha256:{source}"]
            for source in SOURCE_FILES
        },
    }
    temp_manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temp_manifest, manifest_path)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        default=str(ROOT / "training" / "caishenye_training.sqlite"),
    )
    parser.add_argument(
        "--manifest",
        default=str(ROOT / "training" / "manifest.json"),
    )
    args = parser.parse_args()
    try:
        manifest = build(args.output, args.manifest)
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        raise
    print(
        "built training database: latest {latestPeriod}, "
        "{personality_predictions} personality predictions, "
        "{training_examples} training examples".format(**manifest["counts"], **manifest)
    )


if __name__ == "__main__":
    main()
