#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 lottery_data.json + 号码走势图.html 生成根目录 data.js（供 GitHub Actions 自动同步）。"""

import json
import os
import re

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
    print("synced %d periods, latest %d, %d records" % (len(raw), max(int(k) for k in raw), len(d)))


if __name__ == "__main__":
    main()
