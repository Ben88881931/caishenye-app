# 财神爷训练数据库

本目录保存可复现的本地训练数据。真正入库的历史预测只来自开奖前快照；历史窗口标签直接来自真实开奖数据，不用开奖结果反推预测。

## 生成

```powershell
python build_training_database.py
```

`sync.py` 每次更新开奖数据后也会自动重建。

## 文件

- `caishenye_training.sqlite`：本地 SQLite 数据库，已忽略提交，避免每日提交大体积二进制文件。
- `manifest.json`：数据库版本、最新期、各表行数和源文件 SHA-256，随仓库提交。

## 核心表

- `periods`：期号、日期、完整号码、尾数、二进制和生肖。
- `personality_snapshots` / `personality_predictions`：13线逐期开奖前预测与结算结果。
- `probability_snapshots` / `probability_predictions`：10尾完整概率排序与开奖结果。
- `core_snapshots` / `core_picks`：D1/D2等核心模型快照和选号。
- `model_line_features`：当前13线长期画像、年度验证和当下状态。
- `model_reviews`：30期/30天性格复测版本。
- `training_examples`：逐条预测样本及真实结果，供监督学习和评估。
- `historical_windows`：10条尾号线全部重叠三期窗口的真实标签。

## 分析视图

- `v_monthly_activity`
- `v_half_month_activity`
- `v_historical_monthly_behavior`
- `v_historical_half_month_behavior`
- `v_line_training_summary`

预测样本与历史窗口标签分开保存，训练时不得把 `historical_windows` 的结果字段当成当时已知特征。
