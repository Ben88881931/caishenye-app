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
    score_calibration_path = REPO / "score_calibration.js"
    snapshots_js_path = REPO / "snapshots.js"

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

        for func in ["renderZodWindow", "renderZodMonitor"]:
            if f"function {func}" not in app_text:
                fail(f"app.js 缺少生肖页面函数 {func}")
        else:
            pass_("生肖窗口/遗漏页面函数存在")

        for tab_id in ["zodwindow", "zodmonitor"]:
            if f'id: "{tab_id}"' not in app_text:
                fail(f"app.js 缺少导航标签 {tab_id}")
        else:
            pass_("生肖窗口/遗漏导航标签存在")

        for func in ["combinedPredictHistory", "weightedSnapshotHistory"]:
            if f"function {func}" not in app_text:
                fail(f"app.js 缺少下期预估历史函数 {func}")
        else:
            pass_("下期预估真实快照与全历史合并函数存在")
        if "for (var N = 1; N <= latest - 1; N++)" in app_text:
            pass_("下期预估回测从第1期起点开始")
        else:
            fail("下期预估回测没有从第1期起点开始")
        if "首推/备选结果" in app_text and "组合" in app_text and "真实快照" in app_text:
            pass_("下期预估历史使用双号推荐式滚动对错记录")
        else:
            fail("下期预估历史没有使用双号推荐式滚动对错记录")
        if "最高连中" in app_text and "最高连错" in app_text and "当前连中" in app_text and "当前连错" in app_text:
            pass_("下期预估含首推/备选/组合连中连错统计")
        else:
            fail("下期预估缺少连中连错统计")

        # 导航自定义排序检查
        if "function getVisibleTabs" in app_text:
            pass_("app.js 存在 getVisibleTabs")
        else:
            fail("app.js 缺少 getVisibleTabs")
        if "v2_tab_order" in app_text:
            pass_("app.js 使用 v2_tab_order 保存排序")
        else:
            fail("app.js 未使用 v2_tab_order 保存排序")
        if "function resetTabOrder" in app_text or "恢复默认" in app_text:
            pass_("app.js 存在恢复默认顺序逻辑")
        else:
            fail("app.js 缺少恢复默认顺序逻辑")
        if re.search(r"var TABS\s*=\s*\[", app_text):
            pass_("app.js 存在 TABS 定义")
        else:
            fail("app.js 未找到 TABS 定义")
        if "renderTabs" in app_text and "getVisibleTabs()" in app_text:
            pass_("renderTabs 通过 getVisibleTabs 生成导航")
        else:
            fail("renderTabs 未通过 getVisibleTabs 生成导航")

    index_path = REPO / "index.html"
    if not index_path.exists():
        fail("缺少 index.html")
    else:
        index_text = index_path.read_text(encoding="utf-8")
        core_pos = index_text.find("model_core.js")
        snap_pos = index_text.find("snapshots.js")
        app_pos = index_text.find("app.js")
        if core_pos < 0:
            fail("index.html 未加载 model_core.js")
        elif snap_pos < 0:
            fail("index.html 未加载 snapshots.js")
        elif app_pos < 0:
            fail("index.html 未加载 app.js")
        elif not (core_pos < snap_pos < app_pos):
            fail("index.html 加载顺序必须为 model_core.js → snapshots.js → app.js")
        else:
            pass_("model_core.js → snapshots.js → app.js 加载顺序正确")
        if "88d2a63" in index_text:
            fail("index.html 仍使用旧缓存版本 88d2a63，请更新为最新构建版本")
        else:
            pass_("index.html 无旧缓存版本 88d2a63")
        # 所有资源版本号必须一致
        m_versions = re.findall(r"(?:styles\.css|data\.js|model_core\.js|snapshots\.js|app\.js)\?v=([\w.-]+)", index_text)
        if not m_versions:
            fail("index.html 未找到带版本号的资源引用")
        else:
            unique_versions = set(m_versions)
            if len(unique_versions) != 1:
                fail("index.html 资源版本号不一致：" + ", ".join(sorted(unique_versions)))
            else:
                pass_(f"index.html 资源版本一致：{m_versions[0]}")

    for js_path in [model_core_path, supervisor_path, score_calibration_path, snapshots_js_path]:
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

    # snapshots.js 必须含 window.APP_SNAPSHOTS，且含五级/整体/组合/逐期字段
    if snapshots_js_path.exists():
        snap_js_text = snapshots_js_path.read_text(encoding="utf-8")
        if "window.APP_SNAPSHOTS" not in snap_js_text:
            fail("snapshots.js 缺少 window.APP_SNAPSHOTS")
        else:
            pass_("snapshots.js 含 window.APP_SNAPSHOTS")
            m2 = re.search(r"window\.APP_SNAPSHOTS\s*=\s*(\{[\s\S]*\});", snap_js_text)
            if not m2:
                fail("snapshots.js 无法解析 APP_SNAPSHOTS JSON")
            else:
                try:
                    snap_data = json.loads(m2.group(1))
                except Exception as e:
                    fail("snapshots.js JSON 解析失败：" + str(e))
                else:
                    grades = snap_data.get("grades", {})
                    all_grades_ok = True
                    for g in ["S", "A", "B", "C", "D"]:
                        if g not in grades:
                            fail(f"snapshots.js 缺少 {g} 级统计")
                            all_grades_ok = False
                            continue
                        single = grades[g].get("single", {})
                        for f in ["n", "hits", "miss"]:
                            if f not in single:
                                fail(f"snapshots.js {g}级.single 缺少 {f} 字段")
                                all_grades_ok = False
                    if all_grades_ok:
                        pass_("snapshots.js 含 S/A/B/C/D 五级及 single 字段")

                    detail = snap_data.get("detail")
                    if not isinstance(detail, list):
                        fail("snapshots.js detail 不是数组")
                    else:
                        ok_d = True
                        for rec in detail:
                            if not all(f in rec for f in ["target", "picks", "actualTails"]):
                                fail("snapshots.js detail 记录缺 target/picks/actualTails")
                                ok_d = False
                                break
                            for p in rec.get("picks", []):
                                if not all(f in p for f in ["tail", "score", "grade", "hit"]):
                                    fail("snapshots.js detail pick 缺 tail/score/grade/hit")
                                    ok_d = False
                                    break
                            if not ok_d:
                                break
                        if ok_d:
                            pass_("snapshots.js detail 含期数/尾号/分数/对错字段")

                    ov = snap_data.get("overallAtLeastOne")
                    if not isinstance(ov, dict) or "n" not in ov or "hits" not in ov:
                        fail("snapshots.js 缺少 overallAtLeastOne（双号整体至少中一）")
                    else:
                        pass_("snapshots.js 含双号整体至少中一统计")

                    if "combos" not in snap_data:
                        fail("snapshots.js 缺少 combos（等级组合统计）")
                    else:
                        pass_("snapshots.js 含等级组合统计")

                    weighted = snap_data.get("weightedRecords")
                    if not isinstance(weighted, list) or not weighted:
                        fail("snapshots.js 缺少 weightedRecords（下期预估快照）")
                    else:
                        ok_w = True
                        for rec in weighted:
                            if not all(f in rec for f in ["target", "settled", "picks", "actualTails"]):
                                fail("snapshots.js weightedRecords 记录字段不完整")
                                ok_w = False
                                break
                            for p in rec.get("picks", []):
                                if "tail" not in p:
                                    fail("snapshots.js weightedRecords pick 缺少 tail")
                                    ok_w = False
                                    break
                            if not ok_w:
                                break
                        if ok_w:
                            pass_("snapshots.js 含下期预估真实快照记录")

                    weighted_summary = snap_data.get("weightedSummary")
                    if not isinstance(weighted_summary, dict) or not all(f in weighted_summary for f in ["n", "hits", "miss"]):
                        fail("snapshots.js 缺少 weightedSummary")
                    else:
                        pass_("snapshots.js 含下期预估快照汇总")

                    buckets = snap_data.get("scoreBuckets")
                    if not isinstance(buckets, dict) or not buckets:
                        fail("snapshots.js 缺少 scoreBuckets（分数细分统计）")
                    else:
                        ok_b = all(
                            all(f in st for f in ["n", "hits", "miss", "rolls"])
                            for st in buckets.values()
                        )
                        if ok_b:
                            pass_("snapshots.js 分数细分含样本/命中/未中/逐期 rolls")
                        else:
                            fail("snapshots.js scoreBuckets 缺少 n/hits/miss/rolls 字段")

                    tags = snap_data.get("tags")
                    if not isinstance(tags, dict):
                        fail("snapshots.js 缺少 tags（信号标签统计）")
                    else:
                        ok_t = all(
                            all(f in st for f in ["n", "hits", "miss", "rolls"])
                            for st in tags.values()
                        )
                        if ok_t:
                            pass_("snapshots.js 标签统计含样本/命中/未中/逐期 rolls")
                        else:
                            fail("snapshots.js tags 缺少 n/hits/miss/rolls 字段")
    else:
        fail("缺少 snapshots.js，请运行 node model_supervisor.js sync")

    # 双号推荐五级强度等级必须统一定义在 model_core.js（禁止页面/监督脚本各算一套）
    if model_core_path.exists():
        core_text = model_core_path.read_text(encoding="utf-8")
        if "function gradeOf" in core_text and "GRADE_TIERS" in core_text:
            pass_("model_core.js 含统一等级函数 gradeOf / GRADE_TIERS")
        else:
            fail("model_core.js 缺少统一等级函数 gradeOf / GRADE_TIERS")
        for fn in ["scoreBucketOf", "riskOf", "wilson", "SCORE_BUCKETS"]:
            if f"function {fn}" in core_text or f"var {fn}" in core_text:
                pass_(f"model_core.js 含 {fn}")
            else:
                fail(f"model_core.js 缺少 {fn}")

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
