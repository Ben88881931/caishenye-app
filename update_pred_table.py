#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""更新预估分析表的RAW数据"""

import json
import re

# 读取真实的lottery数据
with open('lottery_data.json', 'r', encoding='utf-8') as f:
    lottery_data = json.load(f)

# 读取预估分析表.html
with open('预估分析表.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 将lottery_data转换为RAW格式
raw_data = {}
for period, binary in lottery_data.items():
    raw_data[period] = binary

# 替换HTML中的RAW变量
pattern = r'var\s+RAW\s*=\s*\{[^}]*\}'
replacement = f'var RAW = {json.dumps(raw_data, ensure_ascii=False)}'
new_content = re.sub(pattern, replacement, html_content)

# 写回文件
with open('预估分析表.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✓ 预估分析表RAW数据已更新")
