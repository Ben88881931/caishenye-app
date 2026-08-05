#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财神爷小程序 - 每日数据更新脚本

用法:
    python update_daily.py <期数> <尾数1,尾数2,...>
    
示例:
    python update_daily.py 217 0,2,5,7,8,9
    
    表示第217期开出尾数 0,2,5,7,8,9
"""

import json
import sys
import os
import subprocess
from collections import defaultdict

# 工作目录
APP_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(APP_DIR)

# 数据文件
LOTTERY_JSON = "lottery_data.json"
HTML_FILES = [
    "开奖历史记录.html",
    "遗漏监控.html", 
    "遗漏颜色表.html",
    "尾数分析器.html",
]

def tails_to_binary(tails):
    """把尾数列表转成10位二进制字符串"""
    binary = ['0'] * 10
    for t in tails:
        if 0 <= t <= 9:
            binary[t] = '1'
    return ''.join(binary)

def load_lottery_data():
    """加载lottery_data.json"""
    with open(LOTTERY_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_lottery_data(data):
    """保存lottery_data.json"""
    with open(LOTTERY_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

def update_html_raw(html_file, new_period, binary_str):
    """更新HTML文件中的RAW数据"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到 var RAW={...} 的位置
    import re
    pattern = r'var RAW=\{([^}]+)\}'
    match = re.search(pattern, content)
    if not match:
        print(f"  警告: {html_file} 中未找到 var RAW")
        return False
    
    # 解析现有RAW
    raw_str = match.group(1)
    # 提取最后一个期数
    last_period_match = re.findall(r'"(\d+)":', raw_str)
    if last_period_match:
        last_period = int(last_period_match[-1])
        if new_period != last_period + 1:
            print(f"  警告: {html_file} 当前最新期={last_period}, 新期={new_period}")
    
    # 追加新数据
    new_entry = f',"{new_period}":"{binary_str}"'
    new_raw_str = raw_str + new_entry
    
    # 替换
    new_content = content[:match.start(1)] + new_raw_str + content[match.end(1):]
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def calc_segment_stats(raw_data, window_size):
    """计算分段统计 - 复制尾数分析器的JS逻辑"""
    N = len(raw_data)
    
    # 解析每期开出的尾数
    H = {}
    for k, v in raw_data.items():
        p = int(k)
        H[p] = [i for i in range(10) if v[i] == '1']
    
    def open_digit(d, p):
        return d in H.get(p, [])
    
    def classify(rate):
        if rate >= 70: return 'H'  # 热
        if rate >= 60: return 'W'  # 暖
        if rate >= 50: return 'N'  # 平
        if rate >= 40: return 'L'  # 凉
        if rate >= 30: return 'C'  # 冷
        return 'I'  # 冰
    
    # 计算每个数字的分段
    all_segs = []
    for st in range(1, N + 1, window_size):
        en = min(st + window_size - 1, N)
        tot = en - st + 1
        full = (tot == window_size)
        all_segs.append({'st': st, 'en': en, 'tot': tot, 'w': window_size, 'full': full})
    
    result = {}
    for d in range(10):
        segs = []
        for seg in all_segs:
            cnt = sum(1 for p in range(seg['st'], seg['en'] + 1) if open_digit(d, p))
            rate = (cnt / seg['tot'] * 100) if seg['tot'] else 0
            segs.append({**seg, 'cnt': cnt, 'rate': rate})
        result[d] = segs
    
    # 计算转换矩阵
    trans = defaultdict(lambda: defaultdict(int))
    for d in range(10):
        segs = result[d]
        for i in range(len(segs) - 1):
            cur_cls = classify(segs[i]['rate'])
            nxt_cls = classify(segs[i + 1]['rate'])
            key = cur_cls + nxt_cls
            # 下下段
            if i + 2 < len(segs):
                nnxt_cls = classify(segs[i + 2]['rate'])
                trans[key][nnxt_cls] += 1
            trans[key]['total'] = trans[key].get('total', 0) + 1
    
    # 计算每个数字的预测
    preds = defaultdict(list)
    for d in range(10):
        segs = result[d]
        for i in range(2, len(segs)):
            prev2_cls = classify(segs[i - 2]['rate'])
            prev1_cls = classify(segs[i - 1]['rate'])
            cur_cls = classify(segs[i]['rate'])
            key = prev2_cls + prev1_cls
            if key in trans and trans[key].get('total', 0) > 0:
                total = trans[key]['total']
                next_cls = cur_cls
                pct = round(trans[key].get(next_cls, 0) / total * 100)
                cls_names = {'H': '热', 'W': '暖', 'N': '平', 'L': '凉', 'C': '冷', 'I': '冰'}
                pred_str = f"{cls_names[prev2_cls]}->{cls_names[prev1_cls]}->{cls_names[next_cls]} {pct}%"
                preds[d].append(pred_str)
    
    # 计算统计
    stats = {}
    for d in range(10):
        segs = result[d]
        rates = [s['rate'] for s in segs]
        if not rates:
            continue
        
        # 按分类统计
        cls_counts = defaultdict(int)
        for r in rates:
            cls_counts[classify(r)] += 1
        
        most_cls = max(cls_counts, key=cls_counts.get)
        most_cnt = cls_counts[most_cls]
        cls_names = {'H': '热', 'W': '暖', 'N': '平', 'L': '凉', 'C': '冷', 'I': '冰'}
        
        # 计算频率对应的期数
        freq_period = 0
        for s in segs:
            if classify(s['rate']) == most_cls:
                freq_period = s['w']
                break
        
        stats[d] = {
            'max': round(max(rates)),
            'min': round(min(rates)),
            'avg': round(sum(rates) / len(rates)),
            'most': cls_names[most_cls],
            'most_cnt': most_cnt,
            'total': len(segs),
            'rule': f"最高{round(max(rates))}% 最低{round(min(rates))}% 最频{freq_period}期({most_cnt}次)"
        }
    
    # 计算冰点反弹信号
    ice_signals = []
    for d in range(10):
        segs = result[d]
        if len(segs) >= 2:
            prev_seg = segs[-2]
            cur_seg = segs[-1]
            prev_rate = prev_seg['rate']
            cur_rate = cur_seg['rate']
            # 冰点反弹: 上一段<30%, 当前段也低但开始回升
            if prev_rate < 30 and cur_rate > prev_rate + 10:
                ice_signals.append({
                    'digit': d,
                    'prev_rate': round(prev_rate),
                    'cur_rate': round(cur_rate),
                    'cur_st': cur_seg['st'],
                    'cur_en': cur_seg['en'],
                    'nxt_st': cur_seg['en'] + 1,
                    'nxt_en': min(cur_seg['en'] + window_size, N),
                    'total': cur_seg['tot'],
                    'hits': cur_seg['cnt'],
                    'hit_rate': round(cur_rate)
                })
    
    return {
        'trans': dict(trans),
        'preds': {str(k): v for k, v in preds.items()},
        'stats': {str(k): v for k, v in stats.items()},
        'segs': len(all_segs),
        'ice': ice_signals
    }

def update_analyzer_alldata(html_file, raw_data):
    """更新尾数分析器的ALLDATA"""
    import re
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 计算各窗口的ALLDATA
    windows = [5, 7, 10, 15, 20, 27, 30]
    all_data = {}
    all_ice = {}
    
    for w in windows:
        stats = calc_segment_stats(raw_data, w)
        all_data[str(w)] = {
            'trans': stats['trans'],
            'preds': stats['preds'],
            'stats': stats['stats'],
            'segs': stats['segs']
        }
        if stats['ice']:
            all_ice[str(w)] = stats['ice']
    
    # 替换 ALLDATA
    pattern = r'var ALLDATA=\{.*?\};'
    alldata_json = json.dumps(all_data, ensure_ascii=False, separators=(',', ':'))
    new_alldata = f'var ALLDATA={alldata_json};'
    content = re.sub(pattern, new_alldata, content, flags=re.DOTALL)
    
    # 替换 ICE
    pattern = r'var ICE=\{.*?\};'
    ice_json = json.dumps(all_ice, ensure_ascii=False, separators=(',', ':'))
    new_ice = f'var ICE={ice_json};'
    content = re.sub(pattern, new_ice, content, flags=re.DOTALL)
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)

def git_push(period):
    """Git add, commit, push"""
    try:
        subprocess.run(['git', 'add', '.'], check=True)
        subprocess.run(['git', 'commit', '-m', f'更新第{period}期数据'], check=True)
        subprocess.run(['git', 'push'], check=True)
        print(f"✓ Git push 成功")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Git 操作失败: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    
    period = int(sys.argv[1])
    tails = [int(x.strip()) for x in sys.argv[2].split(',')]
    
    print(f"=== 财神爷小程序 - 每日更新 ===")
    print(f"期数: {period}")
    print(f"尾数: {tails}")
    
    # 转二进制
    binary = tails_to_binary(tails)
    print(f"二进制: {binary}")
    
    # 1. 更新 lottery_data.json
    print(f"\n[1/3] 更新 {LOTTERY_JSON}...")
    data = load_lottery_data()
    data[str(period)] = binary
    save_lottery_data(data)
    print(f"  ✓ 已添加第{period}期")
    
    # 2. 更新各HTML文件的RAW
    print(f"\n[2/3] 更新HTML文件RAW数据...")
    for html_file in HTML_FILES:
        if os.path.exists(html_file):
            print(f"  更新 {html_file}...")
            update_html_raw(html_file, period, binary)
            print(f"  ✓ {html_file}")
        else:
            print(f"  ✗ {html_file} 不存在")
    
    # 3. 重算尾数分析器的ALLDATA
    print(f"\n[3/3] 重算尾数分析器ALLDATA...")
    if os.path.exists("尾数分析器.html"):
        update_analyzer_alldata("尾数分析器.html", data)
        print(f"  ✓ ALLDATA 已更新")
    
    # 4. Git push
    print(f"\n[4/4] Git push...")
    git_push(period)
    
    print(f"\n=== 更新完成 ===")
    print(f"第{period}期数据已推送到 GitHub")

if __name__ == '__main__':
    main()
