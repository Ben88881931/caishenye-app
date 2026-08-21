#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动迭代分析脚本
每期开奖后自动运行，分析预测准确率，优化策略参数
"""

import json
from collections import Counter, defaultdict
import sys

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

def load_data():
    with open('lottery_data.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_recent(data, n=20):
    """分析最近n期数据"""
    periods = sorted(data.keys(), key=int)[-n:]
    
    # 统计各尾数出现频率
    tail_freq = Counter()
    for period in periods:
        binary = data[period]
        tails = [i for i, b in enumerate(binary) if b == '1']
        tail_freq.update(tails)
    
    return tail_freq, periods

def find_cold_hot(tail_freq, threshold_cold=3, threshold_hot=7):
    """找出冷热尾数"""
    cold = [i for i in range(10) if tail_freq.get(i, 0) < threshold_cold]
    hot = [i for i in range(10) if tail_freq.get(i, 0) >= threshold_hot]
    return cold, hot

def check_rebound_pattern(data, tail, lookback=30):
    """检查尾数反弹规律"""
    periods = sorted(data.keys(), key=int)
    
    # 统计历史上该尾数连续遗漏后的反弹情况
    miss_count = 0
    rebound_after_miss = defaultdict(int)
    
    for i in range(len(periods) - lookback, len(periods)):
        period = periods[i]
        binary = data[period]
        
        if binary[tail] == '1':
            if miss_count > 0:
                rebound_after_miss[miss_count] += 1
            miss_count = 0
        else:
            miss_count += 1
    
    return rebound_after_miss

def optimize_parameters(data):
    """优化策略参数 - 正确的评估指标"""
    windows = [5, 7, 10, 15, 20]
    results = {}
    
    periods = sorted(data.keys(), key=int)
    
    for w in windows:
        # 策略1：热号跟踪（前w期出现>=3次的尾数）
        hot_precision = []  # 精确度：预测的尾数中有多少真的出现了
        hot_recall = []     # 召回率：实际出现的尾数中有多少被预测到了
        hot_f1 = []         # F1分数：精确度和召回率的调和平均
        
        # 策略2：冷号反弹（前w期出现0次的尾数）
        cold_precision = []
        cold_recall = []
        cold_f1 = []
        
        # 随机基准
        random_precision = []
        random_recall = []
        random_f1 = []
        
        # 滑动窗口预测
        for i in range(w, len(periods) - w):
            prev_periods = periods[i-w:i]
            next_periods = periods[i:i+w]
            
            # 统计前w期各尾数出现次数
            prev_counts = Counter()
            for p in prev_periods:
                binary = data[p]
                tails = [j for j, b in enumerate(binary) if b == '1']
                prev_counts.update(tails)
            
            # 统计后w期实际出现的尾数
            next_tails = set()
            for p in next_periods:
                binary = data[p]
                tails = [j for j, b in enumerate(binary) if b == '1']
                next_tails.update(tails)
            
            # 策略1：热号（出现>=3次）
            hot_predicted = set(t for t, c in prev_counts.items() if c >= 3)
            if hot_predicted and next_tails:
                precision = len(hot_predicted & next_tails) / len(hot_predicted)
                recall = len(hot_predicted & next_tails) / len(next_tails)
                f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
                hot_precision.append(precision)
                hot_recall.append(recall)
                hot_f1.append(f1)
            
            # 策略2：冷号（出现0次）
            cold_predicted = set(t for t in range(10) if prev_counts.get(t, 0) == 0)
            if cold_predicted and next_tails:
                precision = len(cold_predicted & next_tails) / len(cold_predicted)
                recall = len(cold_predicted & next_tails) / len(next_tails)
                f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
                cold_precision.append(precision)
                cold_recall.append(recall)
                cold_f1.append(f1)
            
            # 随机基准：随机选5个尾数
            import random
            random.seed(i)
            random_predicted = set(random.sample(range(10), 5))
            if random_predicted and next_tails:
                precision = len(random_predicted & next_tails) / len(random_predicted)
                recall = len(random_predicted & next_tails) / len(next_tails)
                f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
                random_precision.append(precision)
                random_recall.append(recall)
                random_f1.append(f1)
        
        results[w] = {
            'hot_f1': sum(hot_f1) / len(hot_f1) if hot_f1 else 0,
            'cold_f1': sum(cold_f1) / len(cold_f1) if cold_f1 else 0,
            'random_f1': sum(random_f1) / len(random_f1) if random_f1 else 0,
            'hot_precision': sum(hot_precision) / len(hot_precision) if hot_precision else 0,
            'hot_recall': sum(hot_recall) / len(hot_recall) if hot_recall else 0,
            'cold_precision': sum(cold_precision) / len(cold_precision) if cold_precision else 0,
            'cold_recall': sum(cold_recall) / len(cold_recall) if cold_recall else 0,
            'samples': len(hot_f1)
        }
    
    return results

def analyze_strategy_effectiveness(data):
    """分析当前策略的有效性"""
    periods = sorted(data.keys(), key=int)
    
    # 分析1：热号惯性
    hot_streak = 0  # 热号继续热的次数
    hot_total = 0   # 热号总次数
    
    # 分析2：冷号反弹
    cold_rebound = 0  # 冷号反弹的次数
    cold_total = 0    # 冷号总次数
    
    for i in range(15, len(periods)):
        # 计算前15期各尾数出现次数
        prev_counts = Counter()
        for p in periods[i-15:i]:
            binary = data[p]
            tails = [j for j, b in enumerate(binary) if b == '1']
            prev_counts.update(tails)
        
        # 找出热号（>=10次）和冷号（<=5次）
        hot_tails = set(t for t, c in prev_counts.items() if c >= 10)
        cold_tails = set(t for t, c in prev_counts.items() if c <= 5)
        
        # 统计后15期实际出现的尾数
        next_tails = set()
        for p in periods[i:i+15]:
            binary = data[p]
            tails = [j for j, b in enumerate(binary) if b == '1']
            next_tails.update(tails)
        
        # 热号惯性：热号在后15期继续出现
        if hot_tails:
            hot_hit = len(hot_tails & next_tails)
            hot_streak += hot_hit
            hot_total += len(hot_tails)
        
        # 冷号反弹：冷号在后15期出现
        if cold_tails:
            cold_hit = len(cold_tails & next_tails)
            cold_rebound += cold_hit
            cold_total += len(cold_tails)
    
    hot_rate = hot_streak / hot_total if hot_total > 0 else 0
    cold_rate = cold_rebound / cold_total if cold_total > 0 else 0
    
    return {
        'hot_rate': hot_rate,
        'cold_rate': cold_rate,
        'hot_streak': hot_streak,
        'hot_total': hot_total,
        'cold_rebound': cold_rebound,
        'cold_total': cold_total
    }

def analyze_strategy_effectiveness(data):
    """分析当前策略的有效性"""
    periods = sorted(data.keys(), key=int)
    
    # 分析1：热号惯性
    hot_streak = 0  # 热号继续热的次数
    hot_total = 0   # 热号总次数
    
    # 分析2：冷号反弹
    cold_rebound = 0  # 冷号反弹的次数
    cold_total = 0    # 冷号总次数
    
    for i in range(15, len(periods)):
        # 计算前15期各尾数出现次数
        prev_counts = Counter()
        for p in periods[i-15:i]:
            binary = data[p]
            tails = [j for j, b in enumerate(binary) if b == '1']
            prev_counts.update(tails)
        
        # 找出热号（>=10次）和冷号（<=5次）
        hot_tails = set(t for t, c in prev_counts.items() if c >= 10)
        cold_tails = set(t for t, c in prev_counts.items() if c <= 5)
        
        # 统计后15期实际出现的尾数
        next_tails = set()
        for p in periods[i:i+15]:
            binary = data[p]
            tails = [j for j, b in enumerate(binary) if b == '1']
            next_tails.update(tails)
        
        # 热号惯性：热号在后15期继续出现
        if hot_tails:
            hot_hit = len(hot_tails & next_tails)
            hot_streak += hot_hit
            hot_total += len(hot_tails)
        
        # 冷号反弹：冷号在后15期出现
        if cold_tails:
            cold_hit = len(cold_tails & next_tails)
            cold_rebound += cold_hit
            cold_total += len(cold_tails)
    
    hot_rate = hot_streak / hot_total if hot_total > 0 else 0
    cold_rate = cold_rebound / cold_total if cold_total > 0 else 0
    
    return {
        'hot_rate': hot_rate,
        'cold_rate': cold_rate,
        'hot_streak': hot_streak,
        'hot_total': hot_total,
        'cold_rebound': cold_rebound,
        'cold_total': cold_total
    }

def main():
    data = load_data()
    
    print("=" * 60)
    print("自动迭代分析报告")
    print("=" * 60)
    
    # 1. 分析最近20期
    tail_freq, periods = analyze_recent(data, 20)
    print(f"\n最近20期（{periods[0]}-{periods[-1]}）尾数分布:")
    for i in range(10):
        count = tail_freq.get(i, 0)
        bar = "█" * count
        print(f"尾{i}: {count:2d}次 {bar}")
    
    # 2. 找出冷热尾数
    cold, hot = find_cold_hot(tail_freq)
    print(f"\n冷号（<3次）: {cold}")
    print(f"热号（>=7次）: {hot}")
    
    # 3. 检查冷号反弹规律
    print("\n冷号反弹规律分析:")
    for tail in cold:
        pattern = check_rebound_pattern(data, tail)
        if pattern:
            print(f"尾{tail}: 遗漏后反弹情况 {dict(pattern)}")
    
    # 4. 优化参数（严格版）
    print("\n窗口预测准确率（严格版）:")
    accuracy = optimize_parameters(data)
    print(f"{'窗口':>6} | {'热号F1':>8} | {'冷号F1':>8} | {'随机F1':>8} | 样本数")
    print("-" * 50)
    for w, r in accuracy.items():
        print(f"{w:>4}期 | {r['hot_f1']:>7.1%} | {r['cold_f1']:>7.1%} | {r['random_f1']:>7.1%} | {r['samples']:>4}")
    
    # 5. 分析策略有效性
    print("\n" + "=" * 60)
    print("策略有效性分析")
    print("=" * 60)
    
    strategy = analyze_strategy_effectiveness(data)
    print(f"\n热号惯性: {strategy['hot_rate']:.1%} ({strategy['hot_streak']}/{strategy['hot_total']})")
    print(f"冷号反弹: {strategy['cold_rate']:.1%} ({strategy['cold_rebound']}/{strategy['cold_total']})")
    
    # 6. 提出改进建议
    print("\n" + "=" * 60)
    print("改进建议:")
    print("=" * 60)
    
    if strategy['hot_rate'] > 0.7:
        print("\n✓ 热号惯性有效（>70%）")
        print("  - 建议保持热号跟踪策略")
    else:
        print("\n✗ 热号惯性较弱")
        print("  - 建议调整热号阈值或增加其他特征")
    
    if strategy['cold_rate'] > 0.5:
        print("\n✓ 冷号反弹有效（>50%）")
        print("  - 建议关注冷号反弹机会")
    else:
        print("\n✗ 冷号反弹较弱")
        print("  - 建议调整反弹临界点参数")
    
    if cold:
        print(f"\n当前冷号: {cold}")
        print("  - 建议加入监控列表")
    
    if hot:
        print(f"\n当前热号: {hot}")
        print("  - 建议继续跟踪惯性")
    
    print("\n" + "=" * 60)
    print("下一步行动:")
    print("=" * 60)
    print("1. 更新三层分析框架参数")
    print("2. 优化预估算法")
    print("3. 添加新的分析维度")
    print("4. 定期运行此脚本进行自我迭代")

if __name__ == '__main__':
    main()
