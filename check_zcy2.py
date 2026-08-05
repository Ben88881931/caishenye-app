import re

with open('财神爷-追投跟踪.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Find the nav div
nav_match = re.search(r'<div class="nav">(.*?)</div>', c, re.DOTALL)
if nav_match:
    print('NAV in 财神爷-追投跟踪.html:')
    print(nav_match.group(1))
else:
    print('No nav div found')

# Also check for any h1
h1_match = re.search(r'<h1>(.*?)</h1>', c)
if h1_match:
    print('H1:', h1_match.group(1))
