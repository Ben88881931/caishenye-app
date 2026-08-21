import json, re

# 读取lottery_data.json
with open('lottery_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
numeric = {int(k): v for k, v in data.items() if k.isdigit()}
N = max(numeric.keys())
print(f'Latest period: {N}')

# 读取预估分析表
with open('预估分析表.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 var N = xxx
content = re.sub(r'var N = \d+', f'var N = {N}', content)
print(f'Updated N to {N}')

# 替换 var RAW = {...}
raw_pattern = r'var RAW = \{[^}]+\}'
new_raw_entries = []
for i in range(1, N + 1):
    new_raw_entries.append(f'"{i}": "{numeric[i]}"')
new_raw_str = 'var RAW = {' + ', '.join(new_raw_entries) + '}'
content = re.sub(raw_pattern, new_raw_str, content)
print('Updated RAW')

# 写回
with open('预估分析表.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done - 预估分析表已更新')
