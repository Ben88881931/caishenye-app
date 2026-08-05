import re

files = ['尾数分析器.html', '开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    # 删除重复的财神爷下单链接（连续两个）
    c = re.sub(r'\s*<a href="财神爷-追投跟踪\.html">财神爷下单</a>\s*<a href="财神爷-追投跟踪\.html">财神爷下单</a>', '', c)
    
    # 替换剩余的财神爷下单为下单系统
    c = c.replace('<a href="财神爷-追投跟踪.html">财神爷下单</a>', '<a href="财神爷-追投跟踪.html">下单系统</a>')
    
    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(c)
    print('Fixed', f)
