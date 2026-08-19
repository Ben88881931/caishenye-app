# -*- coding: utf-8 -*-
"""
每期自动报告系统
输入：当期开奖尾数
输出：本期反省 + 下期预测（三层框架）
"""
import json, sys, os

os.chdir(r"C:\Users\Administrator\caishenye-app")

# === 加载数据 ===
# 往年规律
R = json.load(open(r"C:\Users\Administrator\.sosoagent\workspaces\agent-620594\createContent\lottery5y\records.js.json", encoding='utf-8'))
def tails(r): return sorted(set(n%10 for n in r['nums']))
S_hist = {}
for i,r in enumerate(R):
    if r['y'] <= 2025: S_hist[i+1] = set(tails(r))
N_hist = max(S_hist.keys())

# 当前数据
data = json.load(open('lottery_data.json', encoding='utf-8'))
S = {}
for k in data:
    if k.isdigit(): S[int(k)] = set(i for i in range(10) if data[k][i] == '1')

# === 往年规律挖掘 ===
def build_rules():
    rules = {}
    for d in range(10):
        rules[d] = {'cold_rebound': [0,0], 'hot_stay': [0,0], 'cold_short_rebound': [0,0,0]}
    
    for end in range(N_hist, 30, -15):
        start = end - 14
        if start < 1: break
        prev_end = end - 15
        prev_start = prev_end - 14
        if prev_start < 1: break
        
        for d in range(10):
            cnt_prev = sum(1 for p in range(prev_start, prev_end+1) if d in S_hist[p])
            cnt_cur = sum(1 for p in range(start, end+1) if d in S_hist[p])
            w5_prev = sum(1 for p in range(prev_end-4, prev_end+1) if d in S_hist[p])
            
            # 冷→热反弹
            if cnt_prev <= 5:
                rules[d]['cold_rebound'][1] += 1
                if cnt_cur >= 10: rules[d]['cold_rebound'][0] += 1
                # 短期冷→反弹
                if w5_prev <= 1:
                    rules[d]['cold_short_rebound'][1] += 1
                    if cnt_cur >= 10: rules[d]['cold_short_rebound'][0] += 1
                    elif cnt_cur >= 6: rules[d]['cold_short_rebound'][2] += 1
            
            # 热→继续热
            if cnt_prev >= 10:
                rules[d]['hot_stay'][1] += 1
                if cnt_cur >= 10: rules[d]['hot_stay'][0] += 1
    
    return rules

rules = build_rules()

# === 本期反省 ===
def reflect(period, picked):
    if period not in S:
        return "本期数据未录入"
    actual = S[period]
    hit = [d for d in picked if d in actual]
    miss = [d for d in picked if d not in actual]
    return actual, hit, miss

# === 下期预测 ===
def predict(period):
    # 第一步：15段大方向
    cnt15 = {}
    for d in range(10):
        cnt15[d] = sum(1 for p in range(period-14, period+1) if d in S[p])
    
    # 第二步：短期时机
    w5 = {}
    w3 = {}
    for d in range(10):
        w5[d] = sum(1 for p in range(period-4, period+1) if d in S[p])
        w3[d] = sum(1 for p in range(period-2, period+1) if d in S[p])
    
    # 第三步：往年规律
    result = {'hot_chase': [], 'cold_rebound': [], 'cold_weak': []}
    
    for d in range(10):
        r = rules[d]
        if cnt15[d] >= 10:
            hot_pct = r['hot_stay'][0]/max(r['hot_stay'][1],1)*100
            # 热号追：15段热 + (往年热→热稳定 即>=85% 或 近5期密集>=3)
            if hot_pct >= 85 or w5[d] >= 3:
                result['hot_chase'].append((d, cnt15[d], w5[d], hot_pct))
        elif cnt15[d] <= 5:
            if w5[d] <= 1:
                rebound_pct = r['cold_short_rebound'][0]/max(r['cold_short_rebound'][1],1)*100
                escape_pct = (r['cold_short_rebound'][0]+r['cold_short_rebound'][2])/max(r['cold_short_rebound'][1],1)*100
                if escape_pct >= 70:
                    result['cold_rebound'].append((d, cnt15[d], w5[d], rebound_pct, escape_pct))
                else:
                    result['cold_weak'].append((d, cnt15[d], w5[d], rebound_pct, escape_pct))
    
    return result, cnt15, w5, w3

# === 主流程 ===
if len(sys.argv) >= 3:
    period = int(sys.argv[1])
    raw = sys.argv[2]
    parts = [x.strip() for x in raw.split(',') if x.strip()]
    nums = [int(p) for p in parts]
    if len(nums) == 7 and any(n > 9 for n in nums):
        tails_input = sorted(set(n % 10 for n in nums))
    else:
        tails_input = sorted(set(nums))
else:
    # 默认用上期预测来反省
    period = 231
    tails_input = None

# 上期预测（230期推荐的号）
last_picks = [2, 5, 6, 8, 9]

# 反省
if tails_input:
    actual, hit, miss = reflect(period, last_picks[:5])
    print("=" * 50)
    print("第%d期 反省报告" % period)
    print("=" * 50)
    print("上期推荐: %s" % sorted(last_picks[:5]))
    print("实际开出: %s" % sorted(actual))
    print("命中: %s (%d个)" % (sorted(hit), len(hit)))
    print("漏掉: %s" % sorted(miss))

# 预测
pred, cnt15, w5, w3 = predict(period if tails_input else period-1)
next_period = (period if tails_input else period-1) + 1

print()
print("=" * 50)
print("第%d期 预测报告" % next_period)
print("=" * 50)

print()
print("【15段冷热】(第%d-%d期)" % (next_period-15, next_period-1))
for d in range(10):
    if cnt15[d] >= 10: tag = '热'
    elif cnt15[d] <= 5: tag = '冷'
    else: tag = '中'
    print("  尾%d: %d/15 %s  近5=%d/5  近3=%d/3" % (d, cnt15[d], tag, w5[d], w3[d]))

print()
print("【追热惯性】")
for d, c, w, pct in sorted(pred['hot_chase'], key=lambda x: -x[3]):
    print("  尾%d: 15段%d/15热 近5=%d/5 往年热→热=%.0f%%" % (d, c, w, pct))

print()
print("【追冷反弹】")
for d, c, w, rpct, epct in sorted(pred['cold_rebound'], key=lambda x: -x[4]):
    print("  尾%d: 15段%d/15冷 近5=%d/5 往年反弹=%.0f%% 脱离冷区=%.0f%%" % (d, c, w, rpct, epct))

print()
print("【冷号但反弹弱】")
for d, c, w, rpct, epct in sorted(pred['cold_weak'], key=lambda x: x[3]):
    print("  尾%d: 15段%d/15冷 近5=%d/5 往年反弹=%.0f%% 脱离冷区=%.0f%%" % (d, c, w, rpct, epct))

# 最终推荐
hot = [d for d,_,_,_ in pred['hot_chase']]
cold = [d for d,_,_,_,_ in pred['cold_rebound']]
final = hot + cold
print()
print("【第%d期推荐】%s" % (next_period, final[:5] if len(final) >= 5 else final))