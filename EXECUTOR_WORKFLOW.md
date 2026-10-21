# 财神爷小程序执行端工作流

版本：`executor-v1-20261021`

本文件只定义执行端。执行端只更新数据，不做审计、不签收、不改模型或页面。

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
294期：01.02.03.04.05.06.07
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
```

确认 `probability_snapshots.json` 中存在目标期且 `settled: false` 的记录。
如果已有目标期快照，保留原记录，禁止覆盖。

### 第 2 步：更新两个原始数据源

只允许追加，不允许改写历史：

1. `lottery_data.json`
   - 增加期号键。
   - 值为 10 位尾数二进制。

2. `号码走势图.html`
   - 在 `var D = [...]` 末尾追加一条：

```json
{"y":2026,"p":294,"nums":[1,2,3,4,5,6,7],"zods":["马","蛇","龙","兔","虎","牛","鼠"],"tai":"马"}
```

`y`、`p`、`nums`、`zods`、`tai` 五项必须完整。

### 第 3 步：生成前端数据

```powershell
python sync.py
```

该命令生成 `data.js`。生成后必须确认 `data.js` 的最新期等于本次期号。

### 第 4 步：结算旧快照并生成下一期快照

```powershell
node probability_supervisor.js sync
```

该命令会：

- 结算本次开奖对应的概率快照。
- 生成下一期待开奖快照。

禁止手工修改 `probability_snapshots.json` 中已经保存的预测值。

### 第 5 步：更新缓存版本

统一修改 `index.html` 中八处 `?v=`：

- `styles.css`
- `data.js`
- `model_core.js`
- `model_selector.js`
- `model_probability.js`
- `ultimate_model.js`
- `snapshots.js`
- `app.js`

同日连续更新使用递增序号，例如：

```text
20261021-09 -> 20261021-10
```

八处必须完全一致。

### 第 6 步：检查改动范围

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
- `index.html`

出现任何其他文件改动时立即停止并报告，不得为了“顺手”提交。

### 第 7 步：提交和推送

只能逐个文件加入：

```powershell
git add -- lottery_data.json 号码走势图.html data.js probability_snapshots.json index.html
git commit -m "更新第294期数据并结算概率快照"
git push origin main
```

禁止使用 `git add -A`。

## 4. 禁止事项

- 禁止运行 `update_daily.py`。该脚本仍引用已删除的旧页面，不适用于当前仓库。
- 禁止运行或修改 `model_supervisor.js`、`prediction_snapshots.json`、`snapshots.js`，旧 D1/D2 快照已冻结。
- 禁止修改 `app.js`、`styles.css`、模型、公式、阈值、窗口规则或页面结构。
- 禁止修改历史开奖数据。
- 禁止事后补写、重算或覆盖开奖前预测。
- 禁止为了让检查通过而修改测试、护栏或断言。
- 禁止写“审计通过”“可以发布”“模型正常”等结论。
- 禁止把浏览器 `localStorage` 当成共享真源。

## 5. 交付格式

执行成功后只回报以下内容：

```text
状态：已推送
期号：
原始号码：
尾数：
二进制：
生肖：
版本：
commit：
修改文件：
推送分支：main
推送结果：
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
是否需要监督端接管：是
```

