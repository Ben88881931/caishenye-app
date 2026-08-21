import json, re, os
import sys

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# 检查JSON数据
with open('lottery_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
numeric = {int(k): v for k, v in data.items() if k.isdigit()}
N = max(numeric.keys())
print(f'JSON最新期数: {N}')
print(f'234期二进制: {numeric.get(234, "无")}')

# 检查各HTML文件的RAW数据
files = ['开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html', '尾数分析器.html', '预估分析表.html']
print('\n=== HTML文件状态 ===')
for fn in files:
    if not os.path.exists(fn):
        print(f'{fn}: 不存在')
        continue
    with open(fn, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找RAW数据
    raw_match = re.search(r'var RAW\s*=\s*\{([^}]+)\}', content)
    if raw_match:
        raw_str = raw_match.group(1)
        periods = re.findall(r'"(\d+)"\s*:\s*"[01]{10}"', raw_str)
        if periods:
            max_p = max(int(p) for p in periods)
            print(f'{fn}: RAW最新={max_p}')
        else:
            print(f'{fn}: RAW为空')
    else:
        print(f'{fn}: 未找到RAW')
    
    # 检查N值
    n_match = re.search(r'var N\s*=\s*(\d+)', content)
    if n_match:
        print(f'  N值: {n_match.group(1)}')

# 检查是否有三层分析框架
print('\n=== 预估分析表特殊功能 ===')
with open('预估分析表.html', 'r', encoding='utf-8') as f:
    content = f.read()
print(f'三层分析框架: {"有" if "threeLayerBody" in content else "无"}')
print(f'推荐板块: {"有" if "recommendation" in content else "无"}')
