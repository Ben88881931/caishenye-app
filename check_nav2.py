import os

for f in os.listdir('.'):
    if f.endswith('.html') and f not in ['财神爷-追投跟踪.html', '财神爷-数据记录.html']:
        with open(f, 'r', encoding='utf-8') as fp:
            c = fp.read()
        if '财神爷' in c:
            print(f'FOUND in {f}')
            idx = c.find('class="nav"')
            if idx > 0:
                print(c[idx:idx+400])
