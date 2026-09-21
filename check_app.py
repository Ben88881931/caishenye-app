#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""财神爷小程序每日自检脚本。

检查数据连续性、号码完整性、data.js 是否与数据源一致，
并确认 app.js 语法和关键预测函数存在。
"""

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
ERRORS = []


def fail(msg):
    ERRORS.append(msg)
    print("FAIL:", msg)


def pass_(msg):
    print("PASS:", msg)


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main():
    raw_path = REPO / "lottery_data.json"
    html_path = REPO / "号码走势图.html"
    data_path = REPO / "data.js"
    app_path = REPO / "app.js"
    model_core_path = REPO / "model_core.js"
    supervisor_path = REPO / "model_supervisor.js"
    snapshots_path = REPO / "prediction_snapshots.json"

    if not raw_path.exists():
        fail("缺少 lottery_data.json")
        return 1

    raw = load_json(raw_path)
    raw = {k: v for k, v in raw.items() if k.isdigit()}
    numeric = {int(k): v for k, v in raw.items()}
    periods = sorted(numeric)
    if not periods:
        fail("lottery_data.json 没有期数")
        return 1

    for i in range(1, len(periods)):
        if periods[i] != periods[i - 1] + 1:
            fail(f"期数不连续：{periods[i - 1]} -> {periods[i]}")
            break
    else:
        pass_(f"期数连续：{periods[0]}-{periods[-1]}，共{len(periods)}期")

    for p in periods:
        b = raw[str(p)]
        if len(b) != 10 or any(ch not in "01" for ch in b):
            fail(f"第{p}期二进制非法：{b}")
            break
    else:
        pass_("所有尾数二进制均为10位01字符串")

    html = html_path.read_text(encoding="utf-8") if html_path.exists() else ""
    m = re.search(r"var D\s*=\s*(\[[\s\S]*?\]);", html)
    if not m:
        fail("号码走势图.html 中未找到 var D")
    else:
        d = json.loads(m.group(1))
        for r in d:
            nums = r.get("nums", [])
            zods = r.get("zods", [])
            if len(nums) != 7 or len(set(nums)) != 7:
                fail(f"D记录 p={r.get('p')} 号码不是7个不同数字")
                break
            if any(n < 1 or n > 49 for n in nums):
                fail(f"D记录 p={r.get('p')} 号码超出1-49")
                break
            if len(zods) != 7:
                fail(f"D记录 p={r.get('p')} 生肖不是7个")
                break
        else:
            pass_(f"号码走势图 D 共{len(d)}条，号码/生肖格式正常")

        latest_year_record = d[-1] if d else None
        latest_raw = periods[-1]
        if latest_year_record and latest_year_record.get("p") != latest_raw:
            fail(f"D最后一条 p={latest_year_record.get('p')}，但 raw 最新期={latest_raw}")
        else:
            pass_(f"D最后一条期数={latest_raw}")

        expected = {
            "raw": {str(k): raw[str(k)] for k in periods},
            "d": d,
        }
        if data_path.exists():
            data_text = data_path.read_text(encoding="utf-8")
            dm = re.search(r"window\.APP_DATA\s*=\s*(\{.*\});", data_text)
            if not dm:
                fail("data.js 中未找到 window.APP_DATA")
            else:
                actual = json.loads(dm.group(1))
                if actual == expected:
                    pass_("data.js 与 lottery_data.json / 号码走势图.html 一致")
                else:
                    fail("data.js 与数据源不一致，需要运行 python sync.py")
        else:
            fail("缺少 data.js")

    app_text = app_path.read_text(encoding="utf-8") if app_path.exists() else ""
    if not app_text:
        fail("缺少 app.js")
    else:
        try:
            subprocess.run(["node", "--check", str(app_path)], check=True, capture_output=True, text=True)
            pass_("app.js 语法检查通过")
        except FileNotFoundError:
            print("WARN: 未找到 node，跳过 app.js 语法检查")
        except subprocess.CalledProcessError as e:
            fail("app.js 语法错误：" + (e.stderr or "").strip())

        for func in ["renderPredict", "missRebound", "backtestSignal", "calcGapStats"]:
            if f"function {func}" not in app_text:
                fail(f"app.js 缺少关键函数 {func}")
        else:
            pass_("预测关键函数存在")

    index_path = REPO / "index.html"
    if not index_path.exists():
        fail("缺少 index.html")
    else:
        index_text = index_path.read_text(encoding="utf-8")
        core_pos = index_text.find("model_core.js")
        app_pos = index_text.find("app.js")
        if core_pos < 0:
            fail("index.html 未加载 model_core.js")
        elif app_pos < 0 or core_pos > app_pos:
            fail("index.html 中 model_core.js 必须在 app.js 之前加载")
        else:
            pass_("model_core.js 加载顺序正确")

    for js_path in [model_core_path, supervisor_path]:
        if not js_path.exists():
            fail(f"缺少 {js_path.name}")
            continue
        try:
            subprocess.run(["node", "--check", str(js_path)], check=True, capture_output=True, text=True)
            pass_(f"{js_path.name} 语法检查通过")
        except FileNotFoundError:
            print(f"WARN: 未找到 node，跳过 {js_path.name} 语法检查")
        except subprocess.CalledProcessError as e:
            fail(f"{js_path.name} 语法错误：" + (e.stderr or "").strip())

    # 双号推荐五级强度等级必须统一定义在 model_core.js（禁止页面/监督脚本各算一套）
    if model_core_path.exists():
        core_text = model_core_path.read_text(encoding="utf-8")
        if "function gradeOf" in core_text and "GRADE_TIERS" in core_text:
            pass_("model_core.js 含统一等级函数 gradeOf / GRADE_TIERS")
        else:
            fail("model_core.js 缺少统一等级函数 gradeOf / GRADE_TIERS")

    # 逐期记录：结算结果必须含每个尾号命中详情（perPick）
    if supervisor_path.exists():
        sup_text = supervisor_path.read_text(encoding="utf-8")
        if "perPick" in sup_text:
            pass_("model_supervisor.js 结算含逐尾号命中记录 perPick")
        else:
            fail("model_supervisor.js 缺少逐尾号命中记录 perPick")

    if not snapshots_path.exists():
        fail("缺少 prediction_snapshots.json，请运行 node model_supervisor.js sync")
    else:
        try:
            snapshots = load_json(snapshots_path)
            records = snapshots.get("records", [])
            pending = [r for r in records if not r.get("settled")]
            if not pending:
                fail("预测快照没有待开奖记录，请运行 node model_supervisor.js sync")
            else:
                target = pending[-1].get("target")
                if target != latest_raw + 1:
                    fail(f"快照下一期={target}，数据源最新期={latest_raw}")
                else:
                    pass_(f"真实预测快照下一期={target}，待开奖={len(pending)}")
        except Exception as e:
            fail("prediction_snapshots.json 解析失败：" + str(e))

    if ERRORS:
        print("CHECK FAILED")
        for e in ERRORS:
            print(" -", e)
        return 1
    print("CHECK PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
