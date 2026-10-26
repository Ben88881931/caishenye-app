# 财神爷小程序执行端工作流

版本：`executor-v4-20261026`

本文件只定义执行端。执行端只更新开奖数据、生成派生文件、同步快照、提交推送和回报最小执行结果，不做审计、不签收、不做模型判断、不改模型或页面。

每日完整审计、页面实测、模型判断和最终报告只由监督线程执行一次。执行端不得重复运行审计命令，也不得生成四层对账报告。

## 0. 零审计边界

- 只有收到用户新开奖号码后才启动。
- 若没有收到新开奖号码，只回复 `无新号码，不执行`，不得拉取、运行脚本、审计、生成报告或推送。
- 不得运行任何测试、审计、回测、健康检查或模型报告。
- 只允许本文第1节的 `git pull --ff-only`、`git status` 预检、第3节的7个数据更新步骤，以及第5节六行回报；其他命令一律不运行。
- 禁止运行 `npm test`、`npm run test:*`、`npm run lint`、`node page_audit.js`、`python check_app.py`、`node health_check.js`、`node score_calibration.js`、`node ultimate_backtest.js`、`node selector_backtest.js`、`node model_supervisor.js report`、`node _probability_model_check.js`。
- 本文第6步的 `git status`、`git diff --stat`、`git diff` 只用于核对许可文件范围，不是审计，不得据此写命中率、页面、模型或发布结论。

## 1. 工作区规则

- 使用独立克隆或独立 worktree，不得和监督线程共用同一个工作区。
- 仓库地址：`https://github.com/Ben88881931/caishenye-app.git`
- 每次开始前运行 `git pull --ff-only`，并确认 `git status` 没有未提交改动。
- 同一时间只能有一个执行端写生产数据。
- 如果 `main`、期数、数据源或快照状态有任何不一致，立即停止并报告。

## 2. 输入格式

用户必须提供：

```text
期号，7个完整开奖号码
```

例如：

```text
295期：01.02.03.04.05.06.07
```

执行端自己计算：

- 尾数：每个号码的个位，去重后从 0 到 9 排序。
- 二进制：长度为 10 位，尾数 `0-9` 对应位置从左到右；开出写 `1`，未开出写 `0`。
- 生肖：`ZODIACS[(太岁索引 - (号码 - 1)) % 12]`。
- `ZODIACS = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"]`。
- 2026 年太岁是“马”，索引为 6。

输入不合法时停止，不得猜测：

- 号码不是 7 个。
- 号码重复、小于 1 或大于 49。
- 期号不等于当前最新期加 1。
- 期号跨年但用户没有明确提供新年份和太岁。

## 3. 固定更新步骤

### 第 1 步：保存开奖前快照

```powershell
node probability_supervisor.js sync
node model_supervisor.js sync
node build_personality_model.js
```

确认以下文件都存在目标期开奖前记录：

- `probability_snapshots.json`
- `prediction_snapshots.json`
- `personality_snapshots.json`

如果已有目标期快照，保留原记录，禁止覆盖。

### 第 2 步：更新两个原始数据源

只允许追加，不允许改写历史：

1. `lottery_data.json`
   - 增加期号键。
   - 值为 10 位尾数二进制。

2. `号码走势图.html`
   - 在 `var D = [...]` 末尾追加一条：

```json
{"y":2026,"p":295,"nums":[1,2,3,4,5,6,7],"zods":["马","蛇","龙","兔","虎","牛","鼠"],"tai":"马"}
```

`y`、`p`、`nums`、`zods`、`tai` 五项必须完整。

### 第 3 步：生成前端数据

```powershell
python sync.py
```

该命令生成 `data.js`，并自动重建 `personality_model.json`、`personality_model_data.js`、`personality_snapshots.json`、`personality_snapshots.js`。生成后必须确认最新期等于本次期号。

### 第 4 步：结算旧快照并生成下一期快照

```powershell
node probability_supervisor.js sync
node model_supervisor.js sync
```

两条命令会：

- 结算动态概率快照并生成下一期概率快照。
- 结算 D1/D2 诊断快照并重新生成 `snapshots.js`。
- 两条线都只保留下一期的一条待开奖记录。

禁止手工修改任何快照中的预测值。

### 第 5 步：更新缓存版本

统一修改 `index.html` 中十二处 `?v=`：

- `styles.css`
- `data.js`
- `model_core.js`
- `model_selector.js`
- `probability_weight_research.js`
- `model_probability.js`
- `personality_model_data.js`
- `personality_snapshots.js`
- `ultimate_model.js`
- `snapshots.js`
- `probability_snapshots.js`
- `app.js`

同日连续更新使用递增序号，例如：

```text
20261021-12 -> 20261021-13
```

十二处必须完全一致。

### 第 6 步：核对改动范围（不是审计）

```powershell
git status --short
git diff --stat
git diff
```

正常只允许出现：

- `lottery_data.json`
- `号码走势图.html`
- `data.js`
- `probability_snapshots.json`
- `probability_snapshots.js`
- `prediction_snapshots.json`
- `snapshots.js`
- `personality_model.json`
- `personality_model_data.js`
- `personality_snapshots.json`
- `personality_snapshots.js`
- `index.html`

出现任何其他文件改动时立即停止并报告，不得为了“顺手”提交。

### 第 7 步：提交和推送

只能逐个文件加入：

```powershell
git add -- lottery_data.json 号码走势图.html data.js probability_snapshots.json probability_snapshots.js prediction_snapshots.json snapshots.js personality_model.json personality_model_data.js personality_snapshots.json personality_snapshots.js index.html
git commit -m "更新第<期号>期数据并结算快照"
git push origin main
```

禁止使用 `git add -A`。

## 4. 禁止事项

- 禁止恢复或运行 `update_daily.py`。该旧脚本及其旧页面入口已删除。
- 禁止手工修改 `model_supervisor.js`、`prediction_snapshots.json`、`snapshots.js`。只能通过 `node model_supervisor.js sync` 生成和结算。
- 禁止修改 `app.js`、`styles.css`、模型算法、公式、阈值、窗口规则或页面结构；只允许通过 `sync.py` 重建逐线性格派生文件。
- 禁止修改历史开奖数据。
- 禁止事后补写、重算或覆盖开奖前预测。
- 禁止为了让检查通过而修改测试、护栏或断言。
- 禁止写“审计通过”“可以发布”“模型正常”等结论。
- 禁止运行 `score_calibration.js`、`ultimate_backtest.js`、`selector_backtest.js`、`page_audit.js`、`check_app.py`、`health_check.js`、`model_supervisor.js report`、`_probability_model_check.js`。这些全部由监督线程执行。
- 禁止运行 `npm test`、`npm run test:*`、`npm run lint` 或任何测试套件；执行端只核对 `git status` 和 `git diff` 的改动文件范围。
- 禁止生成 Markdown 审计表、命中率分析、页面检查结论、模型报告、趋势判断或签收意见。
- 禁止把浏览器 `localStorage` 当成共享真源。

## 5. 交付格式

执行成功后只回报以下六项，共六行，不得超过六行，不得增加审计、统计、命中率或模型内容：

```text
状态：已推送
期号：
commit：
修改文件：
推送：main，成功
异常：无
```

执行失败时：

```text
状态：已停止
完成到第几步：
最后成功命令：
原始错误：
当前 git status：
已修改文件：
```

