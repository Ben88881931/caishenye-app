import json, re
import sys

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# 读取数据
with open('lottery_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

numeric = {int(k): v for k, v in data.items() if k.isdigit()}
N = max(numeric.keys())
print(f'当前最新期数: {N}')

# 更新所有HTML文件
html_files = ['开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html', '尾数分析器.html', '预估分析表.html']

for html_file in html_files:
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 更新N值
    content = re.sub(r'var N = \d+', f'var N = {N}', content)
    
    # 更新RAW数据
    raw_pattern = r'var RAW = \{[^}]+\}'
    new_raw_entries = []
    for i in range(1, N + 1):
        new_raw_entries.append(f'"{i}": "{numeric[i]}"')
    new_raw_str = 'var RAW = {' + ', '.join(new_raw_entries) + '}'
    content = re.sub(raw_pattern, new_raw_str, content)
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'已更新 {html_file}')
