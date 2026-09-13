#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 model_multi_dimension_v3_fixed_report.json（回测账）+ 号码走势图.html（实际号码）
+ 人工实盘预测（开奖前预测的首推/备选/得分/信号）生成完整的 recommend_log.json。

字段齐全，回测/实盘两本账分开，命中率分开算。

字段：期数 period / 时间 time / 类型 type / 首推 primary / 备选 secondary /
     得分 score / 信号 signals / 实际号码 actualNums / 实际尾数 actualTails /
     是否命中 hit / 累计命中率 cumHitRate

账本划分：
  - 回测账：period < 256（模型历史回测，来自 report 的 testResult.details）
  - 实盘账：period >= 256（开奖前真实预测，来自 recommend_log.json 既有 logs）

实际号码/尾数一律从号码走势图 var D 派生（单一数据源，不依赖人工填写，避免对不上）。
"""

import json
import re
from datetime import datetime


def tails_from_nums(nums):
    if not nums:
        return None
    return sorted(set(n % 10 for n in nums))


def main():
    # 1. 读号码走势图，提取 2026 年每期实际号码
    html = open('号码走势图.html', encoding='utf-8').read()
    m = re.search(r'var D\s*=\s*(\[[\s\S]*?\]);', html)
    D = json.loads(m.group(1))
    nums_by_period = {}
    for r in D:
        if r.get('y') == 2026:
            nums_by_period[int(r['p'])] = r['nums']

    # 2. 读模型回测明细
    report = json.load(open('model_multi_dimension_v3_fixed_report.json', encoding='utf-8'))
    details = report['testResult']['details']

    # 3. 读现有 recommend_log.json 的人工实盘预测（首推/备选/得分/信号/时间）
    #    兼容旧结构（logs）和新结构（实盘账.records），幂等读取
    live_input = {}
    try:
        old = json.load(open('recommend_log.json', encoding='utf-8'))
        if '实盘账' in old:
            for r in old['实盘账'].get('records', []):
                live_input[int(r['period'])] = {
                    '首推尾数': r.get('primary'),
                    '备选尾数': r.get('secondary'),
                    '首选得分': r.get('score'),
                    '首选信号清单': r.get('signals', []),
                    '日期时间': r.get('time', '-'),
                }
        elif 'logs' in old:
            for lg in old.get('logs', []):
                live_input[int(lg['期数'])] = lg
    except Exception:
        pass

    # 4. 构建回测账（period < 256）
    backtest_records = []
    backtest_hits = 0
    backtest_settled = 0
    for d in details:
        if d['period'] >= 256:
            continue
        backtest_settled += 1
        if d['hit']:
            backtest_hits += 1
        backtest_records.append({
            "period": d['period'],
            "time": "-",
            "type": "回测",
            "primary": d['primary'],
            "secondary": d.get('secondary'),
            "score": d['score'],
            "signals": d['signals'],
            "actualNums": nums_by_period.get(d['period']),
            "actualTails": tails_from_nums(nums_by_period.get(d['period'])),
            "hit": d['hit'],
            "cumHitRate": round(backtest_hits / backtest_settled, 4) if backtest_settled else 0,
        })

    # 5. 构建实盘账（period >= 256）
    live_records = []
    live_hits = 0
    live_settled = 0
    for p in sorted(live_input.keys()):
        lg = live_input[p]
        if p < 256:
            continue
        actual_nums = nums_by_period.get(p)
        actual_tails = tails_from_nums(actual_nums)
        primary = lg.get('首推尾数')
        # 命中判定：实际尾数已开且首推在其中
        if actual_tails is not None and primary is not None:
            live_settled += 1
            hit_val = primary in actual_tails
            if hit_val:
                live_hits += 1
        else:
            hit_val = None  # 未开奖
        live_records.append({
            "period": p,
            "time": lg.get('日期时间', '-'),
            "type": "实盘",
            "primary": primary,
            "secondary": lg.get('备选尾数'),
            "score": lg.get('首选得分'),
            "signals": lg.get('首选信号清单', []),
            "actualNums": actual_nums,
            "actualTails": actual_tails,
            "hit": hit_val,
            "cumHitRate": round(live_hits / live_settled, 4) if live_settled else 0,
        })

    # 6. 输出完整 recommend_log.json
    out = {
        "模型": "model_multi_dimension_v3_fixed.js",
        "命中率口径": "样本外（回测账）与实盘账分开计算",
        "回测账": {
            "名称": "回测",
            "范围": "第201-255期",
            "记录数": len(backtest_records),
            "已开奖数": backtest_settled,
            "命中数": backtest_hits,
            "命中率": round(backtest_hits / backtest_settled, 4) if backtest_settled else 0,
            "records": backtest_records,
        },
        "实盘账": {
            "名称": "实盘",
            "范围": "第256期起",
            "记录数": len(live_records),
            "已开奖数": live_settled,
            "命中数": live_hits,
            "命中率": round(live_hits / live_settled, 4) if live_settled else 0,
            "records": live_records,
        },
        "更新时间": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }

    json.dump(out, open('recommend_log.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print('回测账: %d 条, 命中 %d/%d = %.1f%%' % (
        len(backtest_records), backtest_hits, backtest_settled,
        backtest_hits / backtest_settled * 100 if backtest_settled else 0))
    print('实盘账: %d 条, 命中 %d/%d = %.1f%%' % (
        len(live_records), live_hits, live_settled,
        live_hits / live_settled * 100 if live_settled else 0))


if __name__ == '__main__':
    main()