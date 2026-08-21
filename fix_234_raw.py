import json, re

pages = ['开奖历史记录.html', '尾数分析器.html', '遗漏监控.html', '遗漏颜色表.html']

for page in pages:
    with open(page, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到RAW块
    m = re.search(r'(var RAW\s*=\s*\{)([^}]+)(\})', content)
    if m:
        raw_str = m.group(2)
        # 删除234期及以后的数据
        # 格式: "234":"1101110101"
        raw_str = re.sub(r',?"23[4-9]"\s*:\s*"[01]{10}"', '', raw_str)
        raw_str = re.sub(r',?"2[4-9]\d"\s*:\s*"[01]{10}"', '', raw_str)
        raw_str = re.sub(r',?"[3-9]\d{2}"\s*:\s*"[01]{10}"', '', raw_str)
        
        # 写回
        new_content = content[:m.start(2)] + raw_str + content[m.end(2):]
        
        with open(page, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        # 验证
        pairs = re.findall(r'"(\d+)"\s*:\s*"([01]{10})"', new_content)
        if pairs:
            last = max(pairs, key=lambda x: int(x[0]))
            print(f'{page}: 已修复, 最后={last[0]}')
