import json, re
import sys

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

print("=" * 60)
print("小程序数据完整性检查")
print("=" * 60)

# 1. 检查 lottery_data.json
with open('lottery_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
json_count = len(data)
json_last = max(data.keys(), key=int)
print(f"\nlottery_data.json: {json_count}期, 最后={json_last}")

# 2. 检查所有HTML页面
pages = [
    '开奖历史记录.html',
    '尾数分析器.html', 
    '预估分析表.html',
    '遗漏监控.html',
    '遗漏颜色表.html',
    '号码走势图.html',
    '生肖走势图.html',
    '生肖开奖记录.html',
    '7号码开奖记录.html'
]

errors = []
for page in pages:
    with open(page, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # RAW格式 - 用 "数字":"10位二进制" 格式
    pairs = re.findall(r'"(\d+)"\s*:\s*"([01]{10})"', content)
    if pairs:
        last = max(pairs, key=lambda x: int(x[0]))
        count = len(pairs)
        status = "✓" if int(last[0]) == json_count else "✗"
        print(f"{status} {page}: {count}期, 最后={last[0]}")
        if int(last[0]) != json_count:
            errors.append(f"{page}: 期数不匹配 (期望{json_count}, 实际{last[0]})")
        continue
    
    # D数组格式
    m = re.search(r'var D\s*=\s*(\[[\s\S]*?\]);', content)
    if m:
        d = json.loads(m.group(1))
        p2026 = [x for x in d if x.get('y') == 2026]
        last = max(x.get('p', 0) for x in p2026) if p2026 else 0
        status = "✓" if last == json_count else "✗"
        print(f"{status} {page}: 2026年最新={last}")
        if last != json_count:
            errors.append(f"{page}: 期数不匹配 (期望{json_count}, 实际{last})")
        continue
    
    print(f"? {page}: 未找到数据")
    errors.append(f"{page}: 未找到数据")

print("\n" + "=" * 60)
if errors:
    print(f"发现 {len(errors)} 个错误:")
    for e in errors:
        print(f"  - {e}")
else:
    print("✓ 所有页面数据一致")
print("=" * 60)
