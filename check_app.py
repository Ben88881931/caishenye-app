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
    styles_path = REPO / "styles.css"
    model_core_path = REPO / "model_core.js"
    selector_path = REPO / "model_selector.js"
    probability_research_path = REPO / "probability_weight_research.js"
    probability_model_path = REPO / "model_probability.js"
    personality_model_path = REPO / "next_window_model.js"
    personality_data_path = REPO / "personality_model_data.js"
    personality_snapshots_js_path = REPO / "personality_snapshots.js"
    selector_backtest_path = REPO / "selector_backtest.js"
    page_audit_path = REPO / "page_audit.js"
    ultimate_model_path = REPO / "ultimate_model.js"
    ultimate_backtest_path = REPO / "ultimate_backtest.js"
    supervisor_path = REPO / "model_supervisor.js"
    snapshots_path = REPO / "prediction_snapshots.json"
    score_calibration_path = REPO / "score_calibration.js"
    snapshots_js_path = REPO / "snapshots.js"
    probability_snapshots_js_path = REPO / "probability_snapshots.js"

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
    styles_text = styles_path.read_text(encoding="utf-8") if styles_path.exists() else ""
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

        for func in ["backtestSignal", "calcGapStats"]:
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
        if "renderTabs" in app_text and "getVisibleTabs(" in app_text:
            pass_("renderTabs 通过 getVisibleTabs 生成导航")
        else:
            fail("renderTabs 未通过 getVisibleTabs 生成导航")
        if "var NAV_GROUPS" in app_text and '{ id: "all", label: "全部页面"' in app_text and "nav-subtabs" in app_text and "getVisibleTabs" in app_text:
            pass_("app.js 使用全部页面单级扁平导航")
        else:
            fail("app.js 未收敛为全部页面扁平导航")
        if (
            "navDragState" in app_text
            and "function startNavDrag" in app_text
            and "persistGroupOrderFromDom" in app_text
            and 'data-directory-group="' in app_text
            and "startDirectoryGroupSort" in app_text
            and "NAV_GROUP_ORDER_KEY" in app_text
            and "TABLE_COL_ORDER_KEY" in app_text
            and "applySavedTableColumnOrders" in app_text
            and "data-sort=\"up\"" not in app_text
            and "sort-btn" not in app_text
        ):
            pass_("app.js 支持目录长按排序、导航拖动排序和表头长按拖动排序")
        else:
            fail("app.js 缺少目录长按排序、导航拖动排序或表头长按排序")

        for func in ["renderUltimateMode", "renderChaseNumber", "renderOrderLog"]:
            if f"function {func}" not in app_text:
                fail(f"app.js 缺少终极模型函数 {func}")
        else:
            pass_("追号/追推荐/追三期下单页面函数存在")
        if (
            'id: "pick3"' in app_text
            and "PROB_MODEL.analyze" in app_text
            and "单期报告" in app_text
            and "window.CAISHEN_ULTIMATE" in app_text
        ):
            pass_("app.js 含动态概率模型、追三期下单和旧模型归档入口提示")
        else:
            fail("app.js 缺少调度/追号/追推荐/追三期下单导航")
        if "三期内追号码" in app_text and "三期内追推荐" in app_text and "执行提示" in app_text and "追三期下单" in app_text and "下单记录表" in app_text and "执行规则" in app_text and "双流三期内命中结构" in app_text:
            pass_("追号/追推荐/追三期下单及下单记录表区块完整")
        else:
            fail("追号/追推荐/追三期下单页面区块不完整")
        if (
            "仅建议，不代替执行" in app_text
            and "窗口照常记录" in app_text
            and "两个原始号源" in app_text
            and "不再二次筛选" in app_text
            and "MODEL.buildPrediction(analysis.endPeriod)" in app_text
            and "var gateTone" in app_text
        ):
            pass_("追号/追推荐页面观望与锁定文案分层正确")
        else:
            fail("追号/追推荐页面观望与锁定文案不清晰")
        index_text = (REPO / "index.html").read_text(encoding="utf-8")
        if (
            'data-top-nav' in index_text
            and 'data-top-context' not in index_text
            and 'data-top-tabs' in index_text
            and 'topTabs' in index_text
            and 'data-top-group' not in index_text
            and 'data-nav-drawer' in index_text
            and 'data-nav-handle' in index_text
            and 'data-nav-hide' in index_text
            and 'data-nav-edge' in index_text
            and 'nav-drawer__setting' in index_text
            and 'data-nav-search' in index_text
            and '{ id: "all", label: "全部页面"' in app_text
            and "function initNavDrawer" in app_text
            and "edgeGesture" in app_text
            and "verticalMoved" in app_text
            and "function setNavDrawer" in app_text
            and "function renderTopNavigation" in app_text
            and "data-top-tab" in app_text
            and "function bindTopNavLongPress" in app_text
            and "hasMultipleGroups" in app_text
            and 'navHandleEl.addEventListener("contextmenu"' in app_text
            and "NAV_HANDLE_TOP_KEY" in app_text
            and "NAV_HANDLE_HIDDEN_KEY" in app_text
            and "NAV_RECENT_KEY" in app_text
            and "function recentTabIds" in app_text
            and "closeNavDrawer()" in app_text
        ):
            pass_("顶部用工具类型标签加可排序的二级页面表头，左侧抽屉支持轻触、搜索、最近访问、拖动和隐藏恢复")
        else:
            fail("顶部分类表头缺失，或左侧抽屉缺少轻触、页面搜索、最近访问、自动收起、拖动或隐藏恢复逻辑")
        flow_ids = ["overview", "pick3", "formulas", "windowmult", "orderlog"]
        flow_pos = [app_text.find("{ id: " + chr(34) + fid + chr(34)) for fid in flow_ids]
        if all(pos >= 0 for pos in flow_pos) and flow_pos == sorted(flow_pos):
            pass_("导航按模型流程排序")
        else:
            fail("导航未按模型流程排序")
        if (
'id="ultimateLockCard"' in app_text
            and "ULT_CARD_HISTORY" in app_text
            and "ULT_RECORDS_START" in app_text
            and "card-followup" in app_text
        ):
            pass_("三期内记录与调度记录均紧接卡片下方展示")
        else:
            fail("三期内记录未紧接卡片下方展示")
        if "v2_simple_order_log" in app_text and "simpleOrderProfit" in app_text and "下单金额" in app_text and "固定 1.8" in app_text and "累计收益" in app_text and "data-order-tail" in app_text and "历史下单轨迹" in app_text and "窗口 · 本机下单" in app_text and "EXEC_LINES" in app_text and "13条独立线路" in app_text and "3期内命中率" in app_text and "首次命中分布" in app_text and "逐期下注金额与盈亏记录 · 每卡一个窗口" in app_text and "exec-line__scroll" in app_text and "本线公式（元）" in app_text and "等待尾" in app_text and "重新开出后再开新窗口" in app_text and "金额 ' + planText" not in app_text and "slice(-30).reverse()" not in app_text and "function renderOrderHint" not in app_text and "function renderFunds" not in app_text:
            pass_("下单记录表含号码轨迹、金额、固定赔率、自动结果、收益、三期锁定窗口和13条独立执行线路")
        else:
            fail("下单记录表缺少本地存储、倍率或收益计算")
        if "function renderFunds" not in app_text and "function renderOrderHint" not in app_text and "buildExecWindows" not in app_text and "FUND_CAPITAL" not in app_text and "本金锚定" not in app_text and "本金占用率" not in app_text and "本窗最大风险" in app_text and "有金额线路 / 全部线路" in app_text:
            pass_("执行提示/资金调度已删除，金额与风险统一收口到窗口报告")
        else:
            fail("执行提示/资金调度仍有残留代码或主页面缺少金额与风险")
        if "function renderFormulaTable" in app_text and "EXEC_FORMULA_AUDIT" in app_text and "训练 / 验证" in app_text and "不配仓" in app_text:
            pass_("公式表页面包含13线训练验证系数和配仓状态")
        else:
            fail("公式表页面缺少历史系数或配仓状态")
        if "function renderOverview" in app_text and "data-today-dashboard" in app_text and "data-dashboard-pick" in app_text and "data-dashboard-window-state" in app_text and "data-dashboard-shortcut" in app_text and "今日下注" in app_text and "function dailyPlanHistoryCardsHTML" in app_text and "data-plan-history-strip" in app_text and "data-plan-history-card" in app_text and "总下注" in app_text and "13线窗口状态" in app_text and "常用入口" in app_text and "function pageGuideHTML" in app_text and "today-page-map" in app_text and "PAGE_GUIDE_DISPLAY_GROUPS.forEach" in app_text and "data-overview-tab" in app_text and "pageGuideHTML()" in app_text and "function historyStackHTML" in app_text and "function stepGroupHistory" in app_text and "function stepTabHistory" in app_text and "orderedGroupAt" in app_text and "orderedTabAt" in app_text and "getConfiguredGroups()" in app_text and "var SWIPE_X = 48" in app_text and 'addEventListener("pointermove"' in app_text and "gesture-active" in app_text and "gestureClickGuard" in app_text and 'e.target.closest("input, select, textarea, a, [contenteditable=\'true\']")' in app_text and "pointerdown" in app_text and "pointerup" in app_text:
            pass_("今日驾驶舱集中展示候选、执行面、逐日下注滚动卡、窗口状态和页面职责，并保留整屏翻页手势")
        else:
            fail("今日驾驶舱缺少候选、执行面、逐日下注滚动卡、窗口状态、页面职责或整屏翻页手势")
        if (
            "var COMMON_SHORTCUTS" in app_text
            and "function pageQuickAccessHTML" in app_text
            and "data-page-quick-access" in app_text
            and "data-quick-recent" in app_text
            and "data-quick-common" in app_text
            and 'view.insertAdjacentHTML("beforeend", pageQuickAccessHTML())' in app_text
        ):
            pass_("除今日外的每个页面都显示最近访问和六个常用入口")
        else:
            fail("页面底部缺少统一的最近访问和常用入口快捷区")
        if "WM_BASE = 100" in app_text and "wmPlanText" in app_text and "每个号码的最优下注公式" in app_text and "lineBest" in app_text and "最优 " in app_text and "未通过" in app_text:
            pass_("窗口倍投测试100元起并逐线标注最优下注公式")
        else:
            fail("窗口倍投测试未按100元起或未逐线标注最优下注公式")
        if "function wmPositionForPlan" in app_text and "正式执行仓位 " in app_text and "今年测试仓位 " in app_text and "等待重开" in app_text and "空仓等待" in app_text:
            pass_("窗口倍投测试按每条线路窗口规律标注正式执行仓位和今年测试仓位")
        else:
            fail("窗口倍投测试未按每条线路窗口规律标注正式执行仓位和今年测试仓位")
        if "function wmYearStats" in app_text and "13线逐年测试对比" in app_text and "年度稳健最优" in app_text and "全周期收益最高" in app_text and "正收益年" in app_text and "最近3年" in app_text:
            pass_("窗口倍投测试逐年对比13线并区分年度稳健与全周期最优")
        else:
            fail("窗口倍投测试缺少逐年对比或最优公式口径不完整")
        if "var orderedLines = EXEC_LINES.slice();" in app_text and "wm-formula-panel" in app_text and "wm-formula-row" in app_text and "orderedLines.forEach" in app_text and "正式执行仓位" in app_text and "wmPositionForPlan(item, item.plan)" in app_text:
            pass_("窗口倍投测试按固定线路顺序合并显示公式和正式仓位")
        else:
            fail("窗口倍投测试公式和仓位仍被拆成过多卡片或未按固定线路顺序显示")
        if "function wmYearBest" in app_text and "年最优规律排名" in app_text and "今年最优" in app_text and "今年测试仓位" in app_text and "全周期验证" in app_text and "13线规律中心" in app_text:
            pass_("窗口倍投测试标注今年最优规律、测试仓位和正式版候选状态")
        else:
            fail("窗口倍投测试缺少今年最优规律或正式版候选标注")
        if "function modelPairStrip" in app_text and "PROB_MODEL.analyze" in app_text and 'var lineNames = ["A", "B", "C"]' in app_text and 'return lineNames[index] + row.tail;' in app_text and 'var statusLabel = result.legacyLocked ? "296锁定" : "正式候选"' in app_text and "model-pair-card--p3" in app_text and "前三名概率接近" in app_text and "modelPairStrip(latest + 1)" in app_text and "font-size: 30px" in styles_text:
            pass_("所有页面顶部把A/B/C加当期尾号作为主标题，并保留296期锁定快照")
        else:
            fail("页面顶部缺少新方法三期前三名或296期锁定快照")
        if (
            "function renderBetExec" in app_text
            and "data-bet-exec-task" in app_text
            and 'data-bet-task-panel="today"' in app_text
            and 'data-bet-task-panel="windows"' in app_text
            and 'data-bet-task-panel="profit"' in app_text
            and 'data-bet-task-panel="research"' in app_text
            and "今日规划 · 第" in app_text
            and "自己的最优公式 line.plan" in app_text
            and "本期计划金额" in app_text
            and "本窗最大风险" in app_text
        ):
            pass_("下注执行表默认只显示今日规划，其余任务拆成当前窗口、逐期盈亏和研究明细")
        else:
            fail("下注执行表未按今日规划、当前窗口、逐期盈亏和研究明细拆成任务页签")
        if "function wmPositionForPlan" in app_text and "正式执行公式" in app_text and "正式执行仓位" in app_text and "今年测试仓位" in app_text and "wmPositionForPlan(item, item.plan)" in app_text and "wmPositionForPlan(line, line.plan)" in app_text:
            pass_("正式执行仓位统一以公式表line.plan为准")
        else:
            fail("页面正式执行仓位口径不一致")
        if not 'id: "fixedD1"' in app_text and not 'id: "fixedD2"' in app_text and not 'id: "recD1"' in app_text and not 'id: "recD2"' in app_text:
            pass_("旧D1/D2四条推荐线已从正式执行线路移除")
        else:
            fail("当下窗口D1/D2仓位缺少尾号或仍重复显示来源标签")
        if "MODEL.bounceCritical " in app_text and "BOUNCE[" not in app_text:
            pass_("页面运行使用MODEL.bounceCritical，无未定义BOUNCE引用")
        else:
            fail("页面仍引用未定义BOUNCE或未使用MODEL.bounceCritical")
        if "position-card-grid" in app_text and "position-card--execution" in app_text and "position-card--funds" not in app_text:
            pass_("当前仓位卡片使用统一尺寸样式")
        else:
            fail("当前仓位卡片未使用统一尺寸样式")
        if "wm-line-selector" in app_text:
            pass_("窗口倍投测试13线按钮使用响应式网格容器")
        else:
            fail("窗口倍投测试13线按钮未使用响应式网格容器")
        if "background:#2563eb;color:#fff;border-color:#1d4ed8" in app_text and "box-shadow:0 0 0 2px #bfdbfe" in app_text:
            pass_("窗口倍投测试13线按钮选中态使用蓝色高亮")
        else:
            fail("窗口倍投测试13线按钮选中态仍为黑色或缺少高亮")
        if "function autoSettleSimpleOrders" in app_text and "settleSimpleOrder" in app_text:
            pass_("下单记录表含自动结算")
        else:
            fail("下单记录表缺少自动结算")
        if "function renderUltimateMode" in app_text and "window.CAISHEN_SELECTOR" in app_text and "buildThreePeriodCorrectScrollHTML" in app_text:
            pass_("三期内追推荐窗口代码存在")
        else:
            fail("三期内追推荐窗口代码不完整")

    index_path = REPO / "index.html"
    if not index_path.exists():
        fail("缺少 index.html")
    else:
        index_text = index_path.read_text(encoding="utf-8")
        core_pos = index_text.find("model_core.js")
        selector_pos = index_text.find("model_selector.js")
        probability_research_pos = index_text.find("probability_weight_research.js")
        probability_pos = index_text.find("model_probability.js")
        personality_model_pos = index_text.find("personality_model_data.js")
        personality_snapshots_pos = index_text.find("personality_snapshots.js")
        ultimate_pos = index_text.find("ultimate_model.js")
        snap_pos = index_text.find('src="snapshots.js')
        probability_snap_pos = index_text.find('src="probability_snapshots.js')
        app_pos = index_text.find('src="app.js')
        if core_pos < 0:
            fail("index.html 未加载 model_core.js")
        elif selector_pos < 0:
            fail("index.html 未加载 model_selector.js")
        elif probability_research_pos < 0:
            fail("index.html 未加载 probability_weight_research.js")
        elif probability_pos < 0:
            fail("index.html 未加载 model_probability.js")
        elif personality_model_pos < 0:
            fail("index.html 未加载 personality_model_data.js")
        elif personality_snapshots_pos < 0:
            fail("index.html 未加载 personality_snapshots.js")
        elif ultimate_pos < 0:
            fail("index.html 未加载 ultimate_model.js")
        elif snap_pos < 0:
            fail("index.html 未加载 snapshots.js")
        elif probability_snap_pos < 0:
            fail("index.html 未加载 probability_snapshots.js")
        elif app_pos < 0:
            fail("index.html 未加载 app.js")
        elif not (core_pos < selector_pos < probability_research_pos < probability_pos < personality_model_pos < personality_snapshots_pos < ultimate_pos < snap_pos < probability_snap_pos < app_pos):
            fail("index.html 加载顺序必须为 model_core.js → model_selector.js → probability_weight_research.js → model_probability.js → personality_model_data.js → personality_snapshots.js → ultimate_model.js → snapshots.js → probability_snapshots.js → app.js")
        else:
            pass_("模型脚本、普通快照和概率快照加载顺序正确")
        if "88d2a63" in index_text:
            fail("index.html 仍使用旧缓存版本 88d2a63，请更新为最新构建版本")
        else:
            pass_("index.html 无旧缓存版本 88d2a63")
        # 所有资源版本号必须一致
        m_versions = re.findall(r"(?:styles\.css|data\.js|model_core\.js|model_selector\.js|probability_weight_research\.js|model_probability\.js|personality_model_data\.js|personality_snapshots\.js|ultimate_model\.js|snapshots\.js|probability_snapshots\.js|app\.js)\?v=([\w.-]+)", index_text)
        if not m_versions:
            fail("index.html 未找到带版本号的资源引用")
        else:
            unique_versions = set(m_versions)
            if len(unique_versions) != 1:
                fail("index.html 资源版本号不一致：" + ", ".join(sorted(unique_versions)))
            else:
                pass_(f"index.html 资源版本一致：{m_versions[0]}")

    for js_path in [model_core_path, selector_path, probability_research_path, probability_model_path, personality_model_path, personality_data_path, personality_snapshots_js_path, probability_snapshots_js_path, selector_backtest_path, page_audit_path, ultimate_model_path, ultimate_backtest_path, supervisor_path, score_calibration_path, snapshots_js_path]:
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

    if selector_path.exists():
        selector_text = selector_path.read_text(encoding="utf-8")
        for token in ["buildSignals", "streamState", "independentConfidence", "conditionalTable", "decide", "streams: { D1", "analyze", "runBacktest", "runConfidenceBacktest", "runThreePeriodBacktest", "runThreePeriodStreamBacktest", "minDoubleScore"]:
            if token in selector_text:
                pass_(f"model_selector.js 含 {token}")
            else:
                fail(f"model_selector.js 缺少 {token}")
    else:
        fail("缺少 model_selector.js")

    if page_audit_path.exists():
        page_audit_text = page_audit_path.read_text(encoding="utf-8")
        for token in ["PAGE AUDIT PASSED", "sourceWindows", "sourceWindowSummary", "threePeriodRecords", "每条号源最多只有一个进行中的三期窗口", "历史回测"]:
            if token in page_audit_text:
                pass_(f"page_audit.js 含 {token}")
            else:
                fail(f"page_audit.js 缺少 {token}")
    else:
        fail("缺少 page_audit.js")
    if ultimate_model_path.exists():
        ultimate_text = ultimate_model_path.read_text(encoding="utf-8")
        for token in ["monitorFromHistory", "settleOrder", "windowStats", "runFixedBacktest", "runStrategyBacktest", "runOverlappingBacktest", "runRecommendationBacktest", "skipBelow", "aggressiveAt", "p8At"]:
            if token in ultimate_text:
                pass_(f"ultimate_model.js 含 {token}")
            else:
                fail(f"ultimate_model.js 缺少 {token}")
    else:
        fail("缺少 ultimate_model.js")

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

                    if not isinstance(snap_data.get("sourceWindows"), list):
                        fail("snapshots.js 缺少 D1/D2 原始号源真实窗口")
                    else:
                        pass_("snapshots.js 含 D1/D2 原始号源真实窗口，状态机每流仅一个进行中窗口")
                    if not isinstance(snap_data.get("threePeriodRecords"), list):
                        fail("snapshots.js 缺少三期内追号码真实快照")
                    else:
                        pass_("snapshots.js 含三期内追号码真实快照")
                    three_summary = snap_data.get("threePeriodSummary")
                    if not isinstance(three_summary, dict) or not all(f in three_summary for f in ["n", "acted", "settled", "pending", "skipped", "hits", "miss", "hit3Rate"]):
                        fail("snapshots.js 缺少三期内追号码汇总")
                    else:
                        pass_("snapshots.js 含三期内追号码汇总")

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

    # 双号追热五级强度等级必须统一定义在 model_core.js（禁止页面/监督脚本各算一套）
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
