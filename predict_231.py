# -*- coding: utf-8 -*-
"""
231期 完整预测报告
知识点：15段大方向 + 短期窗口 + 反弹临界点 + 反人性 + 跟踪计划
"""
import json

data = json.load(open(r"C:\Users\Administrator\caishenye-app\lottery_data.json", encoding="utf-8"))
S = {}
for k in data:
    if k.isdigit(): S[int(k)] = set(i for i in range(10) if data[k][i] == "1")
N = 230

# 反弹临界点（历史最长不反弹期数）
BOUNCE = {9: 1, 6: 2, 8: 2, 5: 3, 0: 4, 1: 4, 3: 4, 4: 4, 2: 5, 7: 5}

# 历史最长遗漏（冷段后的最长连续不反弹）
HIST_MAX = {0: 4, 1: 4, 2: 5, 3: 4, 4: 4, 5: 3, 6: 2, 7: 5, 8: 2, 9: 1}

print("=" * 60)
print("231期 完整预测报告")
print("=" * 60)

for d in range(10):
    cnt15 = sum(1 for p in range(216, 231) if d in S[p])
    w5 = sum(1 for p in range(226, 231) if d in S[p])
    w3 = sum(1 for p in range(228, 231) if d in S[p])
    miss = 0
    for p in range(230, 0, -1):
        if d in S[p]:
            break
        miss += 1

    # 多段走势
    segs = []
    for si in range(6):
        end = N - si * 15
        start = end - 14
        if start < 1:
            break
        segs.append(sum(1 for p in range(start, end + 1) if d in S[p]))
    segs.reverse()

    # 大方向
    if cnt15 >= 10:
        direction = "热"
    elif cnt15 <= 5:
        direction = "冷"
    else:
        direction = "中"

    b = BOUNCE[d]
    hm = HIST_MAX[d]

    print()
    print("尾%d: %d/15%s  近5=%d/5  近3=%d/3  遗%d期" % (d, cnt15, direction, w5, w3, miss))
    print("  多段走势: %s" % " → ".join(str(s) for s in segs))

    # 判断和理由
    if cnt15 >= 10 and w3 >= 2:
        print("  大方向: 热惯性")
        print("  理由: 15段热 + 近3>=2 = 持续热，反人性: 越热越不敢买，越不敢越继续开")
        print("  跟踪: 231期立即关注，跟踪5期(231-235)")
        # 预估
        counts = []
        for end in range(N, 10, -5):
            s = end - 4
            ps = s - 5
            cnt_prev = sum(1 for p in range(ps, s) if d in S[p])
            if cnt_prev >= 3:
                cnt_next = sum(1 for p in range(s, end + 1) if d in S[p])
                counts.append(cnt_next)
        if counts:
            avg = sum(counts) / len(counts)
            print("  预估: 5期内开%.1f次 (样本%d, 范围%d-%d)" % (avg, len(counts), min(counts), max(counts)))

    elif cnt15 >= 10 and w3 == 1:
        print("  大方向: 热但降温")
        print("  理由: 大方向热但近3只1次，短期降温，等1期确认")
        print("  跟踪: 232期开始关注，跟踪3期(232-234)")

    elif cnt15 <= 5 and miss > hm:
        print("  大方向: 反人性（超出历史最长记录%d期）" % hm)
        print("  理由: 历史最长遗%d期，当前遗%d期，已打破历史记录。反人性: 越等反弹越不弹")
        print("  跟踪: 231期不跟，等它自己弹出来再考虑")

    elif cnt15 <= 5 and miss >= b:
        print("  大方向: 冷反弹（到临界点%d期）" % b)
        print("  理由: 到反弹临界点，历史上到此处100%%反弹")
        print("  跟踪: 231期立即关注，跟踪3期(231-233)，开出即停")
        counts = []
        for end in range(N, 6, -3):
            s = end - 2
            ps = s - 3
            cnt_prev = sum(1 for p in range(ps, s) if d in S[p])
            if cnt_prev <= 0:
                cnt_next = sum(1 for p in range(s, end + 1) if d in S[p])
                counts.append(cnt_next)
        if counts:
            avg = sum(counts) / len(counts)
            print("  预估: 3期内开%.1f次 (样本%d, 范围%d-%d)" % (avg, len(counts), min(counts), max(counts)))

    elif cnt15 <= 5:
        gap = b - miss
        print("  大方向: 冷，距临界点还差%d期" % gap)
        print("  理由: 还没到反弹临界点，不急关注")
        print("  跟踪: %d期后开始关注" % (231 + gap))

    elif w3 >= 2:
        print("  大方向: 中段偏热")
        print("  理由: 中段但短期热，可能进入热段")
        print("  跟踪: 231期关注，跟踪3期(231-233)")

    elif w5 >= 3:
        print("  大方向: 中段稳定")
        print("  理由: 中段稳定，可能开1-2次")
        print("  跟踪: 231期关注，跟踪5期(231-235)")

    else:
        print("  大方向: 中段偏冷，方向不明")
        print("  跟踪: 暂不关注")

print()
print("=" * 60)
print("231期 总结")
print("=" * 60)
print("🟢 立即关注（热惯性+反人性）: 尾6(3.1次)、尾9(3.0次)、尾8(2.9次)、尾7(2.7次)")
print("🟡 231期关注: 尾1(中段稳定)、尾3(中段偏热)")
print("🔴 反人性到极致: 尾2(超历史记录，不跟)、尾5(高位刹车，不是冷反弹)")
print("⚪ 暂不关注: 尾0(太远)、尾4(等回暖)")