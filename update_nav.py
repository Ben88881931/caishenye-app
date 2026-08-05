import re

files = ['尾数分析器.html', '开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 修改标题
    content = content.replace('<title>尾数分段窗口分析</title>', '<title>接金蛋 - 尾数分析器</title>')
    content = content.replace('<title>开奖历史记录</title>', '<title>接金蛋 - 开奖历史记录</title>')
    content = content.replace('<title>遗漏监控</title>', '<title>接金蛋 - 遗漏监控</title>')
    content = content.replace('<title>遗漏颜色表</title>', '<title>接金蛋 - 遗漏颜色表</title>')
    
    content = content.replace('<h1>尾数分段窗口分析</h1>', '<h1>接金蛋 - 尾数分析器</h1>')
    content = content.replace('<h1>开奖历史记录</h1>', '<h1>接金蛋 - 开奖历史记录</h1>')
    content = content.replace('<h1>遗漏监控</h1>', '<h1>接金蛋 - 遗漏监控</h1>')
    content = content.replace('<h1>遗漏颜色表</h1>', '<h1>接金蛋 - 遗漏颜色表</h1>')
    
    # 修改导航栏
    content = content.replace('<a href="财神爷-追投跟踪.html">财神爷下单</a>', '<a href="下单系统.html">下单系统</a>')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f'Updated {f}')
