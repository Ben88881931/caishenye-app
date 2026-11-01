#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 lottery_data.json + 号码走势图.html 生成根目录 data.js（供 GitHub Actions 自动同步）。"""

import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    raw = json.load(open(os.path.join(HERE, "lottery_data.json"), encoding="utf-8"))
    raw = {k: v for k, v in raw.items() if k.isdigit()}
    raw = {k: raw[k] for k in sorted(raw, key=int)}

    html = open(os.path.join(HERE, "号码走势图.html"), encoding="utf-8").read()
    m = re.search(r"var D\s*=\s*(\[[\s\S]*?\]);", html)
    if not m:
        raise SystemExit("号码走势图.html 中未找到 var D")
    d = json.loads(m.group(1))

    out = "window.APP_DATA = " + json.dumps({"raw": raw, "d": d}, ensure_ascii=False) + ";\n"
    open(os.path.join(HERE, "data.js"), "w", encoding="utf-8").write(out)
    subprocess.run(["node", os.path.join(HERE, "build_personality_model.js")], cwd=HERE, check=True)
    subprocess.run(
        [sys.executable, os.path.join(HERE, "build_training_database.py")],
        cwd=HERE,
        check=True,
    )
    manifest_path = os.path.join(HERE, "training", "manifest.json")
    with open(manifest_path, encoding="utf-8") as manifest_file:
        manifest = json.load(manifest_file)
    latest_period = max(int(k) for k in raw)
    if int(manifest.get("latestPeriod") or 0) != latest_period:
        raise SystemExit(
            "training/manifest.json latestPeriod %s != data latestPeriod %s"
            % (manifest.get("latestPeriod"), latest_period)
        )
    print("synced %d periods, latest %d, %d records" % (len(raw), max(int(k) for k in raw), len(d)))


if __name__ == "__main__":
    main()
