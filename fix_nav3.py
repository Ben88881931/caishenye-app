import os

files = ['尾数分析器.html', '开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    
    # 删除所有财神爷相关的导航链接
    c = c.replace('<a href="财神爷-追投跟踪.html">财神爷下单</a>', '')
    c = c.replace('<a href="财神爷-追投跟踪.html">下单系统</a>', '')
    c = c.replace('<a href="财神爷-数据记录.html">财神爷数据记录</a>', '')
    
    # 添加下单系统链接（在遗漏颜色后面）
    c = c.replace('<a href="遗漏颜色表.html">遗漏颜色</a>', '<a href="遗漏颜色表.html">遗漏颜色</a>\n  <a href="财神爷-追投跟踪.html">下单系统</a>')
    
    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(c)
    print('Fixed', f)
