#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财神爷小程序 - 每日数据更新脚本（含全量检测）

用法:
    python update_daily.py <期数> <尾数1,尾数2,...>
    
示例:
    python update_daily.py 217 0,1,2,4,6,7
"""

import json
import sys
import os
import subprocess
import re
from collections import defaultdict

APP_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(APP_DIR)

LOTTERY_JSON = "lottery_data.json"
HTML_FILES = [
    "开奖历史记录.html",
    "遗漏监控.html",
    "遗漏颜色表.html",
    "尾数分析器.html",
]
ERRORS = []

def log(msg):
    print(msg)

def err(msg):
    ERRORS.append(msg)
    print(f"  ✗ {msg}")

def tails_to_binary(tails):
    binary = ['0'] * 10
    for t in tails:
        if 0 <= t <= 9:
            binary[t] = '1'
    return ''.join(binary)

def load_lottery_data():
    with open(LOTTERY_JSON, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    # 兼容新旧格式，只返回数字key的数据
    if 'data' in raw and isinstance(raw['data'], dict):
        data = {}
        for k, v in raw.items():
            if k.isdigit():
                data[k] = v
        for k, v in raw.get('data', {}).items():
            if k.isdigit():
                data[k] = v
        return data
    return {k: v for k, v in raw.items() if k.isdigit()}

def save_lottery_data(data):
    with open(LOTTERY_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

def update_html_raw(html_file, period, binary_str):
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = r'var RAW=\{([^}]+)\}'
    match = re.search(pattern, content)
    if not match:
        err(f"{html_file} 中未找到 var RAW")
        return False
    raw_str = match.group(1)
    last_periods = re.findall(r'"(\d+)":', raw_str)
    if last_periods:
        last_p = int(last_periods[-1])
        if period != last_p + 1:
            err(f"{html_file} 期数不连续: 当前最新={last_p}, 新期={period}")
            return False
    new_entry = f',"{period}":"{binary_str}"'
    new_raw_str = raw_str + new_entry
    new_content = content[:match.start(1)] + new_raw_str + content[match.end(1):]
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True

def calc_segment_stats(raw_data, window_size):
    numeric = {k: v for k, v in raw_data.items() if k.isdigit()}
    N = len(numeric)
    H = {}
    for k, v in numeric.items():
        p = int(k)
        H[p] = [i for i in range(10) if v[i] == '1']
    
    def open_digit(d, p):
        return d in H.get(p, [])
    
    def classify(rate):
        if rate >= 70: return 'H'
        if rate >= 60: return 'W'
        if rate >= 50: return 'N'
        if rate >= 40: return 'L'
        if rate >= 30: return 'C'
        return 'I'
    
    cls_names = {'H': '热', 'W': '暖', 'N': '平', 'L': '凉', 'C': '冷', 'I': '冰'}
    
    all_segs = []
    for st in range(1, N + 1, window_size):
        en = min(st + window_size - 1, N)
        tot = en - st + 1
        full = (tot == window_size)
        all_segs.append({'st': st, 'en': en, 'tot': tot, 'w': window_size, 'full': full})
    
    digit_segs = {}
    for d in range(10):
        segs = []
        for seg in all_segs:
            cnt = sum(1 for p in range(seg['st'], seg['en'] + 1) if open_digit(d, p))
            rate = (cnt / seg['tot'] * 100) if seg['tot'] else 0
            segs.append({**seg, 'cnt': cnt, 'rate': rate})
        digit_segs[d] = segs
    
    trans = {}
    for d in range(10):
        segs = digit_segs[d]
        for i in range(len(segs) - 2):
            c1 = classify(segs[i]['rate'])
            c2 = classify(segs[i+1]['rate'])
            c3 = classify(segs[i+2]['rate'])
            key = c1 + c2
            if key not in trans:
                trans[key] = defaultdict(int)
            trans[key][c3] += 1
            trans[key]['total'] += 1
    
    trans = {k: dict(v) for k, v in trans.items()}
    
    preds = defaultdict(list)
    for d in range(10):
        segs = digit_segs[d]
        for i in range(2, len(segs)):
            prev2_cls = classify(segs[i-2]['rate'])
            prev1_cls = classify(segs[i-1]['rate'])
            cur_cls = classify(segs[i]['rate'])
            key = prev2_cls + prev1_cls
            if key in trans and trans[key].get('total', 0) > 0:
                total = trans[key]['total']
                pct = round(trans[key].get(cur_cls, 0) / total * 100)
                pred_str = f"{cls_names[prev2_cls]}->{cls_names[prev1_cls]}->{cls_names[cur_cls]} {pct}%"
                preds[d].append(pred_str)
    
    stats = {}
    for d in range(10):
        segs = digit_segs[d]
        rates = [s['rate'] for s in segs]
        if not rates:
            continue
        cls_counts = defaultdict(int)
        for r in rates:
            cls_counts[classify(r)] += 1
        most_cls = max(cls_counts, key=cls_counts.get)
        most_cnt = cls_counts[most_cls]
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
    
    # 冰点反弹预测（当前处于冰点，预测下一段是否反弹）
    ice_signals = []
    for d in range(10):
        segs = digit_segs[d]
        if len(segs) >= 1:
            cur_seg = segs[-1]
            cur_rate = cur_seg['rate']
            # 当前段处于冰点（<30%）
            if cur_rate < 30:
                # 统计历史上冰点后反弹的概率
                ice_rebound_count = 0
                ice_total_count = 0
                for i in range(len(segs) - 1):
                    if segs[i]['rate'] < 30:
                        ice_total_count += 1
                        # 下一段比当前段高，视为反弹
                        if segs[i + 1]['rate'] > segs[i]['rate']:
                            ice_rebound_count += 1
                rebound_prob = round(ice_rebound_count / ice_total_count * 100) if ice_total_count > 0 else 0
                ice_signals.append({
                    'digit': d,
                    'cur_rate': round(cur_rate),
                    'cur_st': cur_seg['st'],
                    'cur_en': cur_seg['en'],
                    'nxt_st': cur_seg['en'] + 1,
                    'nxt_en': min(cur_seg['en'] + window_size, N),
                    'rebound_prob': rebound_prob,
                    'ice_total': ice_total_count,
                    'rebound_count': ice_rebound_count
                })
    
    # 趋势预测（基于最近2段模式，预测下一段升/降）
    trend_preds = {}
    for d in range(10):
        segs = digit_segs[d]
        if len(segs) >= 2:
            prev2_cls = classify(segs[-2]['rate'])
            prev1_cls = classify(segs[-1]['rate'])
            key = prev2_cls + prev1_cls
            if key in trans and trans[key].get('total', 0) > 0:
                total = trans[key]['total']
                # 计算上升概率（下一段比当前段高）
                up_prob = 0
                down_prob = 0
                for cls_key, count in trans[key].items():
                    if cls_key == 'total':
                        continue
                    # 分类对应的数值等级
                    cls_values = {'H': 5, 'W': 4, 'N': 3, 'L': 2, 'C': 1, 'I': 0}
                    cur_value = cls_values.get(prev1_cls, 0)
                    next_value = cls_values.get(cls_key, 0)
                    if next_value > cur_value:
                        up_prob += count
                    elif next_value < cur_value:
                        down_prob += count
                up_pct = round(up_prob / total * 100)
                down_pct = round(down_prob / total * 100)
                trend_preds[d] = {
                    'pattern': f"{cls_names[prev2_cls]}→{cls_names[prev1_cls]}",
                    'up': up_pct,
                    'down': down_pct,
                    'total': total
                }
    
    # 窗口次数预测（基于最近2段模式，预测下一段开出次数）
    cnt_preds = {}
    for d in range(10):
        segs = digit_segs[d]
        if len(segs) >= 2:
            prev2_cls = classify(segs[-2]['rate'])
            prev1_cls = classify(segs[-1]['rate'])
            key = prev2_cls + prev1_cls
            
            # 构建次数转换矩阵
            cnt_trans = {}
            for i in range(2, len(segs)):
                k = classify(segs[i-2]['rate']) + classify(segs[i-1]['rate'])
                if k not in cnt_trans:
                    cnt_trans[k] = {}
                c = segs[i]['cnt']
                cnt_trans[k][c] = cnt_trans[k].get(c, 0) + 1
            
            if key in cnt_trans:
                total = sum(cnt_trans[key].values())
                if total >= 3:  # 样本量足够
                    # 找最可能的次数
                    best_cnt = max(cnt_trans[key], key=lambda k: cnt_trans[key][k])
                    best_prob = cnt_trans[key][best_cnt] / total * 100
                    # 计算期望值
                    expected = sum(c * times for c, times in cnt_trans[key].items()) / total
                    cnt_preds[d] = {
                        'pattern': f"{cls_names[prev2_cls]}->{cls_names[prev1_cls]}",
                        'predict_cnt': best_cnt,
                        'predict_prob': round(best_prob),
                        'expected': round(expected, 1),
                        'sample': total
                    }
    
    return {
        'trans': trans,
        'preds': {str(k): v for k, v in preds.items()},
        'stats': {str(k): v for k, v in stats.items()},
        'segs': len(all_segs),
        'ice': ice_signals,
        'trend': {str(k): v for k, v in trend_preds.items()},
        'cnt_pred': {str(k): v for k, v in cnt_preds.items()}
    }

def update_analyzer_alldata(html_file, raw_data):
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    windows = [5, 7, 10, 15, 20, 27, 30]
    all_data = {}
    all_ice = {}
    all_cnt_pred = {}
    
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
        if stats['cnt_pred']:
            all_cnt_pred[str(w)] = stats['cnt_pred']
    
    pattern = r'var ALLDATA=\{.*?\};'
    alldata_json = json.dumps(all_data, ensure_ascii=False, separators=(',', ':'))
    content = re.sub(pattern, f'var ALLDATA={alldata_json};', content, flags=re.DOTALL)
    
    pattern = r'var ICE=\{.*?\};'
    ice_json = json.dumps(all_ice, ensure_ascii=False, separators=(',', ':'))
    content = re.sub(pattern, f'var ICE={ice_json};', content, flags=re.DOTALL)
    
    pattern = r'var CNTDATA=\{.*?\};'
    cnt_json = json.dumps(all_cnt_pred, ensure_ascii=False, separators=(',', ':'))
    content = re.sub(pattern, f'var CNTDATA={cnt_json};', content, flags=re.DOTALL)
    
    # 计算并写入预测模型v2.0数据
    pred = calc_prediction(raw_data)
    pred_data = {
        'next_period': pred['next_period'],
        'alert_level': pred['alert_level'],
        'skip': pred['skip'],
        'reason': pred['reason'],
        'best': pred['best'],
        'safe': pred['safe'],
        'recommend': pred['recommend'],
        'cautious': pred['cautious'],
        'warning': pred['warning'],
        'candidates': pred['candidates']
    }
    pattern = r'var PREDICTDATA=\{.*?\};'
    pred_json = json.dumps(pred_data, ensure_ascii=False, separators=(',', ':'))
    content = re.sub(pattern, f'var PREDICTDATA={pred_json};', content, flags=re.DOTALL)
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)

def verify_consistency(raw_data):
    log("\n[检测1] RAW数据一致性...")
    for html_file in HTML_FILES:
        if not os.path.exists(html_file):
            err(f"{html_file} 不存在")
            continue
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'var RAW=\{([^}]+)\}', content)
        if not match:
            err(f"{html_file} 中未找到 var RAW")
            continue
        raw_str = match.group(1)
        html_raw = {}
        for m in re.finditer(r'"(\d+)":"([01]{10})"', raw_str):
            html_raw[m.group(1)] = m.group(2)
        
        numeric_json = {k: v for k, v in raw_data.items() if k.isdigit()}
        for k, v in numeric_json.items():
            if k not in html_raw:
                err(f"{html_file} 缺少第{k}期")
            elif html_raw[k] != v:
                err(f"{html_file} 第{k}期数据不匹配: JSON={v}, HTML={html_raw[k]}")
        
        if len(html_raw) == len(numeric_json):
            log(f"  ✓ {html_file} ({len(html_raw)}期)")
        else:
            err(f"{html_file} 期数不匹配: JSON={len(numeric_json)}, HTML={len(html_raw)}")

def verify_binary(period, tails, binary):
    log(f"\n[检测2] 二进制转换验证...")
    expected_tails = [i for i in range(10) if binary[i] == '1']
    if sorted(expected_tails) == sorted(tails):
        log(f"  ✓ 尾数{tails} → 二进制{binary} 正确")
    else:
        err(f"二进制不匹配: 尾数{tails} → 期望{expected_tails}")

def verify_period_continuity(raw_data):
    log(f"\n[检测3] 期数连续性...")
    periods = sorted([int(k) for k in raw_data.keys() if k.isdigit()])
    for i in range(1, len(periods)):
        if periods[i] != periods[i-1] + 1:
            err(f"期数不连续: {periods[i-1]} → {periods[i]}")
            return
    log(f"  ✓ 第{periods[0]}期 到 第{periods[-1]}期，共{len(periods)}期，无断档")

def verify_alldata(html_file, raw_data):
    log(f"\n[检测4] ALLDATA回测验证...")
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'var ALLDATA=(\{.*?\});', content)
    if not match:
        err(f"{html_file} 中未找到 ALLDATA")
        return
    
    try:
        html_alldata = json.loads(match.group(1))
    except:
        err("ALLDATA JSON解析失败")
        return
    
    windows = [5, 7, 10, 15, 20, 27, 30]
    for w in windows:
        stats = calc_segment_stats(raw_data, w)
        expected = {
            'trans': stats['trans'],
            'preds': stats['preds'],
            'stats': stats['stats'],
            'segs': stats['segs']
        }
        w_key = str(w)
        if w_key not in html_alldata:
            err(f"窗口{w}期 ALLDATA缺失")
            continue
        
        if html_alldata[w_key].get('segs') != expected['segs']:
            err(f"窗口{w}期 segs不匹配: HTML={html_alldata[w_key].get('segs')}, 重算={expected['segs']}")
        
        for d in range(10):
            d_key = str(d)
            html_stat = html_alldata[w_key].get('stats', {}).get(d_key)
            exp_stat = expected['stats'].get(d_key)
            if html_stat and exp_stat:
                if html_stat.get('max') != exp_stat['max'] or html_stat.get('min') != exp_stat['min']:
                    err(f"窗口{w}期 尾{d} stats不匹配")
    
    log(f"  ✓ ALLDATA {len(windows)}个窗口全部验证通过")

def verify_ice(html_file, raw_data):
    log(f"\n[检测5] 冰点信号验证...")
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'var ICE=(\{.*?\});', content)
    if not match:
        err("未找到 ICE 数据")
        return
    
    try:
        html_ice = json.loads(match.group(1))
    except:
        err("ICE JSON解析失败")
        return
    
    total_signals = sum(len(v) for v in html_ice.values())
    log(f"  ✓ 冰点信号: {total_signals}个")
    for w, signals in html_ice.items():
        for s in signals:
            log(f"    窗口{w}期: 尾{s['digit']} 当前{s['cur_rate']}% 反弹概率{s['rebound_prob']}%")

def calc_prediction(raw_data):
    """计算下期预测（模型v2.0：含预警机制）"""
    keys = sorted([k for k in raw_data.keys() if k.isdigit()], key=int)
    N = len(keys)
    
    def classify(rate):
        if rate >= 70: return 'H'
        if rate >= 60: return 'W'
        if rate >= 50: return 'N'
        if rate >= 40: return 'L'
        if rate >= 30: return 'C'
        return 'I'
    cls_names = {'H': '热', 'W': '暖', 'N': '平', 'L': '凉', 'C': '冷', 'I': '冰'}
    
    # 1. 计算全局反转率（上期未出→本期出）
    rev_count = {d: 0 for d in range(10)}
    rev_total = {d: 0 for d in range(10)}
    for i in range(1, N):
        for d in range(10):
            if raw_data[keys[i-1]][d] == '0':
                rev_total[d] += 1
                if raw_data[keys[i]][d] == '1':
                    rev_count[d] += 1
    
    # 2. 计算遗漏≥2期反转率
    rev2_count = {d: 0 for d in range(10)}
    rev2_total = {d: 0 for d in range(10)}
    for i in range(2, N):
        if raw_data[keys[i-1]][d] == '0' and raw_data[keys[i-2]][d] == '0':
            rev2_total[d] += 1
            if raw_data[keys[i]][d] == '1':
                rev2_count[d] += 1
    
    # 3. 当前遗漏期数
    miss = {}
    for d in range(10):
        m = 0
        for i in range(N-1, -1, -1):
            if raw_data[keys[i]][d] == '0':
                m += 1
            else:
                break
        miss[d] = m
    
    # 4. 5期窗口状态
    segs5 = {}
    for d in range(10):
        segs = []
        for st in range(1, N+1, 5):
            en = min(st + 4, N)
            cnt = sum(1 for p in range(st, en+1) if raw_data[keys[p-1]][d] == '1')
            rate = cnt / (en - st + 1) * 100
            segs.append({'cnt': cnt, 'rate': rate, 'cls': classify(rate)})
        segs5[d] = segs
    
    # 上期开出/未出
    prev_bin = raw_data[keys[-1]]
    missed_digits = [d for d in range(10) if prev_bin[d] == '0']
    
    # 5. 构建每个尾数的完整分析
    candidates = []
    for d in range(10):
        rev_rate = round(rev_count[d] / rev_total[d] * 100, 1) if rev_total[d] > 0 else 0
        rev2_rate = round(rev2_count[d] / rev2_total[d] * 100, 1) if rev2_total[d] > 0 else 0
        
        # 5期窗口当前状态
        cur_seg5 = segs5[d][-1] if segs5[d] else None
        cls5 = cur_seg5['cls'] if cur_seg5 else 'I'
        rate5 = round(cur_seg5['rate'], 1) if cur_seg5 else 0
        
        candidates.append({
            'digit': d,
            'rev_rate': rev_rate,
            'rev2_rate': rev2_rate,
            'rev_hit': rev_count[d],
            'rev_total': rev_total[d],
            'miss': miss[d],
            'cls5': cls5,
            'rate5': rate5,
            'warm5': cls5 in ['W', 'L'],
        })
    
    # 6. 应用预警规则，分级推荐
    # 🟢 安全级: 反转率≥60% + 遗漏≥3期 → 0%失败
    # 🟡 推荐级: 反转率≥55% + 遗漏≥3期 → 1.7%失败
    # 🔵 谨慎级: 反转率≥55% + 遗漏≥2期 + 5期窗口暖(W) → 0%失败
    # 🔴 预警: 遗漏=2期 + 5期窗口冰(I) → 高风险
    
    safe = []       # 安全级
    recommend = []  # 推荐级
    cautious = []   # 谨慎级
    warning = []    # 预警级
    
    for c in candidates:
        c['level'] = None
        c['warning'] = None
        
        if c['rev_rate'] >= 60 and c['miss'] >= 3:
            c['level'] = 'safe'
            c['fail_rate'] = 0
            safe.append(c)
        elif c['rev_rate'] >= 55 and c['miss'] >= 3:
            c['level'] = 'recommend'
            c['fail_rate'] = 1.7
            recommend.append(c)
        elif c['rev_rate'] >= 55 and c['miss'] >= 2 and c['cls5'] == 'W':
            c['level'] = 'cautious'
            c['fail_rate'] = 0
            cautious.append(c)
        else:
            # 检查预警信号
            if c['miss'] >= 2 and c['cls5'] == 'I':
                c['warning'] = '遗漏≥2期+5期窗口冰点'
                warning.append(c)
    
    # 排序
    safe.sort(key=lambda x: -x['rev_rate'])
    recommend.sort(key=lambda x: -x['rev_rate'])
    cautious.sort(key=lambda x: -x['rev_rate'])
    
    result = {
        'next_period': N + 1,
        'prev_opened': [d for d in range(10) if prev_bin[d] == '1'],
        'prev_missed': missed_digits,
        'candidates': candidates,
        'safe': safe,
        'recommend': recommend,
        'cautious': cautious,
        'warning': warning,
        'best': None,
        'skip': False,
        'reason': '',
        'alert_level': 'green',  # green/yellow/red
    }
    
    if safe:
        result['best'] = safe[0]
        result['alert_level'] = 'green'
        result['reason'] = f"🟢安全级: 反转率{safe[0]['rev_rate']}%≥60% + 遗漏{safe[0]['miss']}期≥3期 → 历史0%失败"
    elif recommend:
        result['best'] = recommend[0]
        result['alert_level'] = 'green'
        result['reason'] = f"🟡推荐级: 反转率{recommend[0]['rev_rate']}%≥55% + 遗漏{recommend[0]['miss']}期≥3期 → 历史1.7%失败"
    elif cautious:
        result['best'] = cautious[0]
        result['alert_level'] = 'yellow'
        result['reason'] = f"🔵谨慎级: 反转率{cautious[0]['rev_rate']}%≥55% + 遗漏{cautious[0]['miss']}期≥2期 + 5期窗口暖(W) → 历史0%失败"
    else:
        result['skip'] = True
        result['alert_level'] = 'red'
        result['reason'] = '🔴无尾数满足安全条件，建议跳过'
    
    return result

def show_prediction(raw_data):
    """显示预测结果（模型v2.0：含预警机制）"""
    log(f"\n{'='*50}")
    log(f"📊 下期预测分析（模型v2.0：含预警机制）")
    log(f"{'='*50}")
    
    pred = calc_prediction(raw_data)
    
    log(f"\n上期开出: {pred['prev_opened']}")
    log(f"上期未出: {pred['prev_missed']}")
    
    log(f"\n各尾数分析:")
    log(f"  尾数 | 遗漏 | 反转率 | 5期窗口 | 等级")
    log(f"  -----|------|--------|---------|-----")
    for c in pred['candidates']:
        mark = ''
        if c.get('level') == 'safe':
            mark = '🟢'
        elif c.get('level') == 'recommend':
            mark = '🟡'
        elif c.get('level') == 'cautious':
            mark = '🔵'
        elif c.get('warning'):
            mark = '🔴'
        else:
            mark = '  '
        log(f"  {mark}尾{c['digit']}  | {c['miss']}期  | {c['rev_rate']}% | {c['cls5']}({c['rate5']}%) | {c.get('level', '-') or '观察'}")
    
    log(f"\n预警规则:")
    log(f"  🟢安全级: 反转率≥60% + 遗漏≥3期 → 0%失败")
    log(f"  🟡推荐级: 反转率≥55% + 遗漏≥3期 → 1.7%失败")
    log(f"  🔵谨慎级: 反转率≥55% + 遗漏≥2期 + 5期窗口暖(W) → 0%失败")
    log(f"  🔴预警: 遗漏≥2期 + 5期窗口冰(I) → 高风险")
    
    if pred['skip']:
        log(f"\n🚫 建议: 跳过不下注")
        log(f"   原因: {pred['reason']}")
    else:
        best = pred['best']
        level_emoji = {'safe': '🟢', 'recommend': '🟡', 'cautious': '🔵'}.get(best['level'], '')
        log(f"\n{level_emoji} 推荐: 尾{best['digit']}")
        log(f"   反转率: {best['rev_rate']}%")
        log(f"   遗漏期数: {best['miss']}期")
        log(f"   5期窗口: {best['cls5']}({best['rate5']}%)")
        log(f"   历史失败率: {best.get('fail_rate', '?')}%")
        log(f"   原因: {pred['reason']}")
        
        if pred['alert_level'] == 'green':
            log(f"\n💰 下注方案（1.8x赔率）:")
            log(f"   第1期: 1000元 → 中了+800元")
            log(f"   第2期: 2250元 → 中了+800元")
            log(f"   第3期: 30000元 → 中了+20750元")
            log(f"   3期不中: -33250元")
        elif pred['alert_level'] == 'yellow':
            log(f"\n⚠️ 谨慎级建议:")
            log(f"   可考虑减半下注或跳过")
    
    # 显示预警信号
    if pred['warning']:
        log(f"\n🔴 预警信号:")
        for w in pred['warning']:
            log(f"   尾{w['digit']}: {w['warning']}")
    
    log(f"\n{'='*50}")
    return pred

def git_push(period):
    try:
        subprocess.run(['git', 'add', '.'], check=True)
        subprocess.run(['git', 'commit', '-m', f'更新第{period}期数据'], check=True)
        result = subprocess.run(['git', 'push'], capture_output=True, text=True)
        if result.returncode != 0:
            log(f"  push被拒，尝试pull rebase...")
            subprocess.run(['git', 'pull', '--rebase'], check=True)
            subprocess.run(['git', 'push'], check=True)
        log(f"\n  ✓ Git push 成功")
        return True
    except subprocess.CalledProcessError as e:
        err(f"Git 操作失败: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    
    period = int(sys.argv[1])
    tails = [int(x.strip()) for x in sys.argv[2].split(',')]
    
    log(f"{'='*50}")
    log(f"财神爷小程序 - 每日更新（含全量检测）")
    log(f"{'='*50}")
    log(f"期数: {period}")
    log(f"尾数: {tails}")
    
    binary = tails_to_binary(tails)
    log(f"二进制: {binary}")
    
    verify_binary(period, tails, binary)
    
    log(f"\n[更新] lottery_data.json...")
    data = load_lottery_data()
    data[str(period)] = binary
    save_lottery_data(data)
    log(f"  ✓ 已添加第{period}期")
    
    verify_period_continuity(data)
    
    log(f"\n[更新] HTML文件RAW数据...")
    for html_file in HTML_FILES:
        if os.path.exists(html_file):
            update_html_raw(html_file, period, binary)
            log(f"  ✓ {html_file}")
        else:
            err(f"{html_file} 不存在")
    
    verify_consistency(data)
    
    log(f"\n[更新] 重算尾数分析器ALLDATA...")
    if os.path.exists("尾数分析器.html"):
        update_analyzer_alldata("尾数分析器.html", data)
        log(f"  ✓ ALLDATA 已更新")
    
    verify_alldata("尾数分析器.html", data)
    verify_ice("尾数分析器.html", data)
    
    log(f"\n{'='*50}")
    if ERRORS:
        log(f"⚠️ 发现 {len(ERRORS)} 个错误，中止推送:")
        for e in ERRORS:
            log(f"  - {e}")
        log(f"请检查后手动推送")
        sys.exit(1)
    else:
        log(f"✓ 全部检测通过，开始推送...")
        git_push(period)
        
        # 显示下期预测
        show_prediction(data)
        
        log(f"\n{'='*50}")
        log(f"第{period}期数据已推送到 GitHub")
        log(f"{'='*50}")

if __name__ == '__main__':
    main()
