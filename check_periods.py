import re
import sys

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

files = ['开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html', '尾数分析器.html', '预估分析表.html']
for fn in files:
    try:
        with open(fn, 'r', encoding='utf-8') as f:
            content = f.read()
        periods = re.findall(r'"(\d+)":', content)
        if periods:
            max_p = max(int(p) for p in periods)
            print(f'{fn}: 最新期数={max_p}')
        else:
            print(f'{fn}: 未找到期数')
    except Exception as e:
        print(f'{fn}: 错误 - {e}')
