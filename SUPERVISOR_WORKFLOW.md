# 财神爷小程序 - 监督与每日更新流程（唯一权威）

> 本文件是「财神爷小程序」每日数据更新与模型监督的**唯一权威流程文件**。
> 任何新接手智能体必须先完整阅读本文件，再开始任何操作。
> 智能体自己的 `MEMORY.md` 只是个人记忆，不能作为交接的唯一依据。

## 角色

- 执行智能体：负责每日开奖数据更新、运行脚本、提交和推送。
- 监督智能体：负责审查数据、模型快照、回测口径、代码质量和发布结果。
- 用户：最终决策人。

---

## 执行智能体每日 8 步标准流程

### 开始前（每次收到开奖数据前先做）

1. `git pull --ff-only`，与远端 main 同步。
2. 确认工作区干净（`git status` 无未提交改动）。
3. 记录执行前的 commit hash，便于出问题时回退定位。

### 第 1 步：开奖前保存预测快照

在更新数据之前，先运行：

```bash
node model_supervisor.js sync
```

作用：如果下一期还没有预测记录，会先保存当期预测快照，**避免事后补算**。
这条快照是「开奖前预测」的凭证，结算时只能拿它来对答案，绝不能事后改写。

### 第 2 步：只更新两个数据源

只更新，且只能写用户实际提供的号码：

- `lottery_data.json`：期数字符串 → 10 位尾数二进制。
- `号码走势图.html` 的 `var D`：`{"y":2026,"p":期数,"nums":[7个号码],"zods":[7个生肖],"tai":"马"}`。

硬性要求：

- 期数、号码、生肖必须完整。
- 不推测、不补造、不修改历史号码。
- `号码走势图.html` 里既有的历史数据一律不得改动，只追加本期。

### 第 3 步：生成前端数据

```bash
python sync.py
```

作用：读取上面两个数据源，生成根目录 `data.js`（`window.APP_DATA`）。

### 第 4 步：结算刚开奖的预测，重新生成 snapshots.js

再次运行：

```bash
node model_supervisor.js sync
```

该步骤自动完成：

- 结算 `prediction_snapshots.json`（把开奖前保存的预测标记为对/错、命中尾数、命中数量）。
- 更新逐期命中记录和双号总命中。
- 重新生成 `snapshots.js`（`window.APP_SNAPSHOTS`）。
- 更新五级单尾命中率（S/A/B/C/D 各自 single 的 n/hits/miss）。
- 更新等级组合至少中一命中率（如 A+C、C+C、C+D、A+D）。
- 生成五级逐期对错滚动记录（detail：每期每尾号的期数、尾号、分数、等级、实际尾数、对错、结算时间）。

**`snapshots.js` 只能由 `model_supervisor.js` 生成，绝对不得手工修改。**

### 第 5 步：更新缓存版本

`data.js` 已经变化，因此必须更新 `index.html` 中以下五个资源的版本号：

- `styles.css`
- `data.js`
- `model_core.js`
- `snapshots.js`
- `app.js`

五处版本必须**完全一致**，格式建议：

```
?v=YYYYMMDD-N
```

例如第 265 期：

```
?v=20260922-265
```

### 第 6 步：强制自检（按顺序，全过才能发布）

```bash
node score_calibration.js report
python check_app.py
node health_check.js
node model_supervisor.js report
```

必须满足：

- `check_app.py` 全部 PASS。
- 最新期数正确。
- `data.js` 与 `lottery_data.json`、`号码走势图.html` 一致。
- `prediction_snapshots.json` 已有本期结算。
- 下一期预测快照已生成。
- `snapshots.js` 已更新。
- 五个资源版本一致。
- 五级明细包含期数、尾号、分数、等级、实际尾数、对错。
- 历史预测、分数和对错没有被修改。

### 第 7 步：检查 Git 改动

```bash
git status
git diff
```

每日正常只应修改：

- `lottery_data.json`
- `号码走势图.html`
- `data.js`
- `prediction_snapshots.json`
- `snapshots.js`
- `index.html`

如果出现其他文件改动，必须先说明原因，不得直接提交无关修改。

### 第 8 步：提交推送

```bash
git add lottery_data.json 号码走势图.html data.js prediction_snapshots.json snapshots.js index.html
git commit -m "更新第N期数据并结算预测快照"
git push origin main
```

推送前设置密钥：

```bash
export GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=accept-new'
```

---

## 完成后必须回报（给用户/监督智能体）

每次更新完成后，回报以下字段：

1. 最终 commit hash。
2. 更新到第几期。
3. 本期 7 个号码和实际尾数。
4. 双号推荐号码、等级、命中或未中。
5. 五级各自的逐期对错变化。
6. 五级累计样本、命中、未中、命中率。
7. 双号整体至少中一结果。
8. 等级组合命中结果。
9. 三项检查（check_app.py / health_check.js / model_supervisor.js report）及 score_calibration.js 的结果。
10. 是否存在异常或样本不足。

---

## 监督智能体每日审核

监督智能体每天检查：

1. 远端最新 HEAD 是否为当天更新。
2. `lottery_data.json`、`号码走势图.html`、`data.js` 是否一致。
3. `prediction_snapshots.json` 是否有当期预测、是否已结算。
4. `health_check.js` 是否区分回测账、旧实盘账、真实快照账。
5. 模型是否有足够真实样本才能评价。
6. 推荐页面是否夸大战绩。
7. `snapshots.js` 只能由 `model_supervisor.js` 生成，不得手工改。
8. 代码是否有语法错误或死循环。

---

## 模型上线门槛

- 真实快照样本少于 20 期：只能标注「样本不足」，不能宣传效果。
- 样本外命中率必须高于理论基准约 `55.39%`。
- 需要有校准结果，不能只看命中率。
- 没有通过门槛的模型只能展示为实验分析，不能作为正式推荐。

---

## 禁止事项

- 禁止使用未来数据回测。
- 禁止事后重算历史并冒充真实预测（禁止改 `prediction_snapshots.json` 的预测/分数/对错）。
- 禁止把回测命中率当成真实快照命中率。
- 禁止把 `52%` 等随机水平包装成稳定推荐。
- 禁止在没有快照的情况下宣称实盘命中率。
- 禁止手工修改 `snapshots.js`（只能由 `model_supervisor.js` 生成）。
- 禁止编造开奖号码、补造未开奖号码。
- 禁止修改预测算法、分数或等级规则，除非用户明确授权。
- 禁止样本少于 20 期时宣传稳定命中率。
- **同一天收到多期补录数据时：先停止并报告，不得自行补造已错过的预测快照。**

---

## 数据冲突处理

- 同一期号出现两个不同号码时，先向用户确认（A 纠正该期号码 / B 期号笔误），不得擅自覆盖或改期。
- 所有数据以生肖开奖页面的真实号码为准。
- 当前年份是 2026 年，不能用 2021 年或其他年份的历史数据顶替。