import re

with open('财神爷-追投跟踪.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 找到fetch部分
fetch_match = re.search(r'fetch\(["\']([^"\']+)["\']', c)
if fetch_match:
    print('Fetches:', fetch_match.group(1))
else:
    print('No fetch found')

# 检查数据源
if 'var DATA' in c or 'var records' in c:
    print('Has embedded data')
