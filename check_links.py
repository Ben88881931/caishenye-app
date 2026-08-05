import os, re
for f in ['尾数分析器.html', '开奖历史记录.html', '遗漏监控.html', '遗漏颜色表.html']:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    links = re.findall(r'<a href="([^"]+)">([^<]+)</a>', c)
    nav_links = [l for l in links if '.html' in l[0]]
    print(f'{f}: {nav_links}')
