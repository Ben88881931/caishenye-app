import re

with open('财神爷-追投跟踪.html', 'r', encoding='utf-8') as f:
    c = f.read()

links = re.findall(r'<a href="([^"]+)">([^<]+)</a>', c)
nav_links = [l for l in links if '.html' in l[0]]
print('财神爷-追投跟踪.html nav links:', nav_links)
