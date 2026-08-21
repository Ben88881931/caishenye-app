import re

with open('预估分析表.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 检查233期
m = re.search(r'"233":"([01]{10})"', content)
if m:
    bin_str = m.group(1)
    opened = [i for i in range(10) if bin_str[i] == '1']
    print(f'233期已在RAW: {bin_str} -> 开出{opened}')
else:
    print('233期不在RAW中')

# 检查N值
m2 = re.search(r'var N = (\d+)', content)
if m2:
    print(f'N = {m2.group(1)}')
else:
    print('N未找到')

# 检查三层分析板块
if 'threeLayerBody' in content:
    print('三层分析板块已存在')
else:
    print('三层分析板块缺失')

if 'recommendation' in content:
    print('推荐板块已存在')
else:
    print('推荐板块缺失')
