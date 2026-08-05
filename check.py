import re

with open('遗漏颜色表.html', 'r', encoding='utf-8') as f:
    c = f.read()

nav_match = re.search(r'<div class="nav">(.*?)</div>', c, re.DOTALL)
if nav_match:
    print('NAV:', nav_match.group(1))
else:
    print('No nav found')

# Check for 财神爷
if '财神爷' in c:
    print('FOUND 财神爷 in file')
    for i, line in enumerate(c.split('\n')):
        if '财神爷' in line:
            print(f'  Line {i+1}: {line.strip()}')
else:
    print('No 财神爷 found')
