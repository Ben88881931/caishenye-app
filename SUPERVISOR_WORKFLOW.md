# 财神爷小程序 - 监督与每日更新流程

## 角色

- 执行智能体：负责每日开奖数据更新、运行脚本、提交和推送。
- 监督智能体：负责审查数据、模型快照、回测口径、代码质量和发布结果。
- 用户：最终决策人。

## 执行智能体每日流程

### 1. 获取开奖号码后，先做预测快照

在更新数据之前先运行：

```bash
node model_supervisor.js sync
```

作用：如果下一期还没有预测记录，会先保存当期预测，避免事后补算。

### 2. 更新数据源

更新：

- `lottery_data.json`
- `号码走势图.html` 的 `var D`

### 3. 生成前端数据

```bash
python sync.py
```

### 4. 结算真实快照

再次运行：

```bash
node model_supervisor.js sync
```

作用：把已经开奖的预测快照结算为对/错、命中尾数、命中数量。结算后会自动重新生成 `snapshots.js`（各等级单尾命中率、双号整体至少中一、等级组合统计）。

### 5. 强制自检

```bash
python check_app.py
node health_check.js
node model_supervisor.js report
node score_calibration.js report
```

全部通过后才能发布。

### 6. 审查提交内容

检查：

- 数据只改动应改的文件。
- 没有未来数据泄露。
- 预测快照没有被事后修改。
- 回测账和真实快照账分开。
- 没有把回测结果说成实盘战绩。

### 7. 提交发布

```bash
git add data.js lottery_data.json 号码走势图.html prediction_snapshots.json snapshots.js
# index.html 的缓存版本号有变化时，一并提交：
git add index.html
git commit -m "更新第N期数据并结算预测快照"
git push origin main
```

> 每次结算后（第 4 步）都会自动重新生成 `snapshots.js`，务必一并提交，否则页面显示的等级命中率会滞后。

## 监督智能体每日审核

监督智能体每天检查：

1. 远端最新 HEAD 是否为当天更新。
2. `lottery_data.json`、`号码走势图.html`、`data.js` 是否一致。
3. `prediction_snapshots.json` 是否有当期预测、是否已结算。
4. `health_check.js` 是否区分回测账、旧实盘账、真实快照账。
5. 模型是否有足够真实样本才能评价。
6. 推荐页面是否夸大战绩。
7. 代码是否有语法错误或死循环。

## 模型上线门槛

- 真实快照样本少于 20 期：只能标注“样本不足”，不能宣传效果。
- 样本外命中率必须高于理论基准约 `55.39%`。
- 需要有校准结果，不能只看命中率。
- 没有通过门槛的模型只能展示为实验分析，不能作为正式推荐。

## 禁止事项

- 禁止使用未来数据回测。
- 禁止事后重算历史并冒充真实预测。
- 禁止把 `52%` 等随机水平包装成稳定推荐。
- 禁止在没有快照的情况下宣称实盘命中率。
