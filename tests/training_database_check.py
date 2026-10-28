#!/usr/bin/env python3
"""Contract checks for the reproducible local training database."""

import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "build_training_database.py"


def query_one(connection, sql, params=()):
    row = connection.execute(sql, params).fetchone()
    return row[0] if row else None


def main():
    assert BUILDER.exists(), "build_training_database.py is missing"

    training_dir = ROOT / "training"
    training_dir.mkdir(exist_ok=True)
    suffix = f"-{os.getpid()}"
    output = training_dir / f"training-check{suffix}.sqlite"
    manifest_path = training_dir / f"training-check{suffix}.json"
    try:
        completed = subprocess.run(
            [sys.executable, str(BUILDER), "--output", str(output), "--manifest", str(manifest_path)],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        assert completed.returncode == 0, completed.stderr or completed.stdout
        assert output.exists(), "database was not generated"
        assert manifest_path.exists(), "manifest was not generated"

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        connection = sqlite3.connect(output)
        try:
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            expected_tables = {
                "metadata",
                "periods",
                "lines",
                "personality_snapshots",
                "personality_predictions",
                "probability_snapshots",
                "probability_predictions",
                "core_snapshots",
                "core_picks",
                "model_line_features",
                "model_reviews",
                "training_examples",
                "historical_windows",
            }
            assert expected_tables.issubset(tables), expected_tables - tables

            views = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'view'"
                )
            }
            assert {
                "v_monthly_activity",
                "v_half_month_activity",
                "v_line_training_summary",
                "v_historical_monthly_behavior",
                "v_historical_half_month_behavior",
            }.issubset(views)

            assert query_one(connection, "SELECT COUNT(*) FROM periods") == manifest["counts"]["periods"]
            assert query_one(connection, "SELECT COUNT(*) FROM lines") == 13
            assert query_one(connection, "SELECT COUNT(*) FROM personality_predictions") > 0
            assert query_one(connection, "SELECT COUNT(*) FROM probability_predictions") > 0
            assert query_one(connection, "SELECT COUNT(*) FROM core_picks") > 0
            assert query_one(connection, "SELECT COUNT(*) FROM training_examples") > 0
            assert query_one(connection, "SELECT COUNT(*) FROM historical_windows") > 10000

            duplicate_predictions = query_one(
                connection,
                """
                SELECT COUNT(*) FROM (
                  SELECT snapshot_id, line_id, COUNT(*) AS n
                  FROM personality_predictions
                  GROUP BY snapshot_id, line_id
                  HAVING n > 1
                )
                """,
            )
            assert duplicate_predictions == 0

            future_leaks = query_one(
                connection,
                "SELECT COUNT(*) FROM personality_predictions WHERE based_on >= target",
            )
            assert future_leaks == 0

            orphan_predictions = query_one(
                connection,
                """
                SELECT COUNT(*)
                FROM personality_predictions p
                LEFT JOIN periods t ON t.global_period = p.target_global
                WHERE p.actual_hit IS NOT NULL
                  AND t.global_period IS NULL
                """,
            )
            assert orphan_predictions == 0

            monthly = connection.execute(
                """
                SELECT line_id, year, month, windows, hits, hit_rate
                FROM v_monthly_activity
                WHERE windows > 0
                ORDER BY line_id, year, month
                LIMIT 20
                """
            ).fetchall()
            assert monthly
            assert all(0 <= row[5] <= 1 for row in monthly)

            half_month = connection.execute(
                """
                SELECT line_id, year, month, half, windows, hits, hit_rate
                FROM v_half_month_activity
                WHERE windows > 0
                ORDER BY line_id, year, month, half
                LIMIT 20
                """
            ).fetchall()
            assert half_month
            assert all(row[3] in (1, 2) for row in half_month)
            assert all(0 <= row[6] <= 1 for row in half_month)

            historical_monthly = connection.execute(
                """
                SELECT line_id, year, month, windows, hits, hit_rate
                FROM v_historical_monthly_behavior
                WHERE windows > 0
                ORDER BY line_id, year, month
                LIMIT 20
                """
            ).fetchall()
            assert historical_monthly
            assert all(0 <= row[5] <= 1 for row in historical_monthly)

            source_hashes = dict(
                connection.execute(
                    "SELECT key, value FROM metadata WHERE key LIKE 'source_sha256:%'"
                )
            )
            for required in (
                "data.js",
                "personality_snapshots.json",
                "probability_snapshots.json",
                "prediction_snapshots.json",
                "personality_model.json",
            ):
                assert f"source_sha256:{required}" in source_hashes
        finally:
            connection.close()
    finally:
        output.unlink(missing_ok=True)
        manifest_path.unlink(missing_ok=True)

    print("PASS: training database schema, provenance, monthly and half-month views")


if __name__ == "__main__":
    main()
