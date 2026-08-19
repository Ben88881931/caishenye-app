# -*- coding: utf-8 -*-
"""
AI选号系统 v1.0
每期开奖前：综合多维度分析，给出选号建议
每期开奖后：自动反省，调整下一期策略
"""
import json, os
from collections import Counter

os.chdir(r"C:\Users\Administrator\caishenye-app")
data = json.load(open('lottery_data.json', encoding='utf-8'))
keys = sorted([int(k) for k in data.keys() if k.isdigit()])
N = len(keys)

# 构建每期数据
S = {}  # 每期开出尾数集合
for k in keys:
    S[k] = set(i for i in range(10) if data[str(k)][i] == '1')

# ============================================================
# 多维分析引擎
# ============================================================
def current_miss(period):
    """当前各尾数遗漏期数"""
    miss = {}
    for d in range(10):
        m = 0
        for p in range(period, 0, -1):
            if p in S and d in S[p]: break
            m += 1
        miss[d] = m
    return miss

def near_freq(period, window=10):
    """近N期各尾数开出次数"""
    freq = {}
    for d in range(10):
        freq[d] = sum(1 for p in range(period-window+1, period+1) if p in S and d in S[p])
    return freq

def reversal_rate(period):
    """各尾数反转率：遗漏后下一期开出的概率"""
    rev = {}
    for d in range(10):
        hit = tot = 0
        for p in range(2, period+1):
            if p in S and p-1 in S:
                if d not in S[p-1]:
                    tot += 1
                    if d in S[p]: hit += 1
        rev[d] = hit/tot*100 if tot > 0 else 0
    return rev

def long_rate(period):
    """各尾数长期开出率"""
    lr = {}
    for d in range(10):
        lr[d] = sum(1 for p in range(1, period+1) if p in S and d in S[p]) / period * 100
    return lr

def oscillate_index(period, window=15):
    """震荡指数：近window期开出次数振幅"""
    osc = {}
    for d in range(10):
        cnt = sum(1 for p in range(period-window+1, period+1) if p in S and d in S[p])
        # 震荡指数：越接近均值越震荡，越极端越稳定
        osc[d] = abs(cnt - window*0.55)  # 偏离预期的程度
    return osc

def streak_info(period):
    """连出/连遗状态"""
    info = {}
    for d in range(10):
        # 连出
        streak_on = 0
        for p in range(period, 0, -1):
            if p in S and d in S[p]: streak_on += 1
            else: break
        # 连遗
        streak_off = 0
        for p in range(period, 0, -1):
            if p in S and d in S[p]: break
            streak_off += 1
        info[d] = {'on': streak_on, 'off': streak_off}
    return info

# ============================================================
# 综合评分引擎（每期根据最新数据动态计算）
# ============================================================
def score_all(period):
    """对每个尾数打分，返回排序"""
    miss = current_miss(period)
    freq10 = near_freq(period, 10)
    freq5 = near_freq(period, 5)
    rev = reversal_rate(period)
    lr = long_rate(period)
    osc = oscillate_index(period)
    stk = streak_info(period)
    
    scores = {}
    for d in range(10):
        score = 0.0
        
        # 1. 遗漏深度（遗漏越深，反弹概率越高，但超过一定阈值反而危险）
        if miss[d] == 0:
            score += 0  # 刚开出，不考虑
        elif miss[d] == 1:
            score += 5  # 遗漏1期，反弹概率高
        elif miss[d] == 2:
            score += 3  # 遗漏2期，中等
        elif miss[d] == 3:
            score += 8  # 遗漏3期，强反弹信号
        elif miss[d] >= 4 and miss[d] <= 6:
            score += 10  # 舒适区反弹
        else:
            score -= 5  # 遗漏太久，危险
        
        # 2. 近期热度（近5期）
        score += freq5[d] * 2
        
        # 3. 反转率
        if rev[d] >= 60: score += 6
        elif rev[d] >= 55: score += 3
        elif rev[d] < 50: score -= 3
        
        # 4. 长期偏离（偏低有回归空间）
        if lr[d] < 50: score += 4
        elif lr[d] > 65: score -= 2
        
        # 5. 连出过头需要刹车
        if stk[d]['on'] >= 3: score -= 4
        
        # 6. 震荡指数（极度偏离中枢的反而稳定）
        if osc[d] < 1: score += 2
        
        scores[d] = score
    
    # 排名
    ranked = sorted(scores.items(), key=lambda x: -x[1])
    return ranked, scores, miss, freq10, rev, lr, stk

# ============================================================
# 主流程：当前预测
# ============================================================
period = keys[-1]
print("=" * 80)
print(f"第{period}期 综合评分选号报告")
print("=" * 80)

ranked, scores, miss, freq10, rev, lr, stk = score_all(period)

print(f"\n上期({period})开出: {sorted(S[period])}")
print(f"\n各尾数详细评分:")
print(f"{'尾数':>4} {'遗漏':>4} {'近10期':>6} {'反转率':>7} {'长期率':>7} {'连出':>4} {'连遗':>4} {'综合分':>7}")
for d in range(10):
    print(f"{d:>4} {miss[d]:>4} {freq10[d]:>6} {rev[d]:>6.1f}% {lr[d]:>6.1f}% {stk[d]['on']:>4} {stk[d]['off']:>4} {scores[d]:>7.1f}")

print(f"\n综合排名:")
for i, (d, sc) in enumerate(ranked):
    bar = '█' * int(sc/2) if sc > 0 else ''
    print(f"  {i+1}. 尾{d} 得分{sc:.1f} {bar}")

# 5选3推荐
top5 = [d for d, _ in ranked[:5]]
print(f"\n231期 5选3推荐: {top5}")
print(f"中奖规则: 中3个=6倍, 中4个=24倍, 中5个=60倍")

# 反思：228-230期各策略表现
print()
print("=" * 80)
print("近3期反省（228-230期）")
print("=" * 80)
for p in [228, 229, 230]:
    if p not in S: continue
    prev = p - 1
    if prev not in S: continue
    actual = S[p]
    prev_miss = current_miss(prev)
    prev_freq = near_freq(prev, 8)
    prev_top5 = sorted(range(10), key=lambda d: -prev_freq[d])[:5]
    match = sum(1 for d in prev_top5 if d in actual)
    print(f"  第{p}期: 追热预测{prev_top5} → 实际出{sorted(actual)} → 中{match}个 → {'✅' if match>=3 else '❌'}")

# 保存当前预测到文件
pred = {
    'period': period + 1,
    'top5': top5,
    'scores': {str(d): round(sc, 1) for d, sc in scores.items()},
    'miss': miss,
    'rev': {str(d): round(r, 1) for d, r in rev.items()},
    'generated': '2026-08-19'
}
with open('current_prediction.json', 'w', encoding='utf-8') as f:
    json.dump(pred, f, ensure_ascii=False, indent=2)
print(f"\n预测已保存到 current_prediction.json")