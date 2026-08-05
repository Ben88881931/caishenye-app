import re

files = ['尾数分析器.html', '开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    # 删除所有财神爷相关的导航链接
    c = re.sub(r'\s*<a href="财神爷-追投跟踪\.html"[^>]*>财神爷下单</a>', '', c)
    c = re.sub(r'\s*<a href="财神爷-数据记录\.html"[^>]*>财神爷数据记录</a>', '', c)
    
    # 确保只有一个下单系统链接
    if '下单系统' not in c and '财神爷-追投跟踪.html' in c:
        c = c.replace('财神爷-追投跟踪.html', '下单系统.html')
    
    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(c)
    print('Fixed', f)
