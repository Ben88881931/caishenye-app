with open('遗漏颜色表.html', 'r', encoding='utf-8') as f:
    c = f.read()
idx = c.find('class="nav"')
print(repr(c[idx:idx+500]))
