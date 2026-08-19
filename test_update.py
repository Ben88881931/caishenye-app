import sys
sys.argv = ['update_daily.py', '232', '0,1,3,6,8,9']
import update_daily

print('=== 测试关键函数 ===')

# 1. 测试 tails_to_binary
binary = update_daily.tails_to_binary([0,1,3,6,8,9])
print(f'1. tails_to_binary([0,1,3,6,8,9]) = {binary}')
assert binary == '1101001011', f'期望 1101001011, 得到 {binary}'
print('   ✓ 二进制转换正确')

# 2. 测试 load_lottery_data
data = update_daily.load_lottery_data()
print(f'2. load_lottery_data() 加载了 {len(data)} 期数据')
assert '231' in data, '应该包含231期'
print('   ✓ 数据加载正确')

# 3. 测试 recalc_miss
miss = update_daily.recalc_miss(data)
print(f'3. recalc_miss() 计算了 {len(miss)} 个尾数的遗漏')
assert '0' in miss, '应该包含尾数0'
print('   ✓ 遗漏计算正确')

# 4. 测试 rebuild_cntdata
cntdata = update_daily.rebuild_cntdata(data)
print(f'4. rebuild_cntdata() 重建了 {len(cntdata)} 个窗口的CNTDATA')
assert '5' in cntdata, '应该包含5期窗口'
print('   ✓ CNTDATA重建正确')

# 5. 测试 calc_segment_stats
stats = update_daily.calc_segment_stats(data, 15)
segs_count = stats['segs']
print(f'5. calc_segment_stats(data, 15) 计算了 {segs_count} 个段')
assert 'trans' in stats, '应该包含转移矩阵'
assert 'preds' in stats, '应该包含预测'
assert 'stats' in stats, '应该包含统计'
print('   ✓ 分段统计正确')

print()
print('=== 所有测试通过 ===')
