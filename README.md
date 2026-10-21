# 财神爷尾数分析小程序

线上地址：https://ben88881931.github.io/caishenye-app/

仓库：`Ben88881931/caishenye-app`

## 当前架构

- 静态单页应用：`index.html`、`app.js`、`styles.css`
- 前端数据：`data.js`，由 `lottery_data.json` 和 `号码走势图.html` 经 `sync.py` 生成
- 当前概率快照：`probability_snapshots.json`
- 旧 D1/D2 证据：`prediction_snapshots.json`、`snapshots.js`，已冻结
- 自动化验收入口：`node _audit_all.js`

## 数据真源

1. 开奖号码与生肖：`号码走势图.html`
2. 尾数二进制：`lottery_data.json`
3. 前端数据：`data.js`
4. 当前动态概率快照：`probability_snapshots.json`

三份开奖数据必须逐期一致；任何冲突先停止，不得覆盖历史。

## 当前导航

- 模型流程：动态概率、下注执行表、公式表、13线规律中心、追三期下单
- 走势总览：总览、生肖走势、分段对比、窗口走势、号码走势
- 遗漏分析：遗漏排序、单双热图、遗漏热图、窗口遗漏热图
- 生肖专区：生肖窗口、生肖遗漏、生肖开奖
- 分析工具：尾号性格、三期规律、冷热分析、策略回测、我的笔记、号码搜索

## 窗口与模型

- 正式执行固定为三期窗口；两期窗口只作研究对照。
- 10条尾号线 + 3条动态概率影子线，共13条当前线路。
- 动态概率第1/2/3名在窗口开始时锁定尾号，追满3期，不中途换号。
- 三期全错后，必须等锁定尾重新开出，下一期才开新窗。
- 未来没产生的期数只能写“待定”，不得使用未来数据。
- D1/D2 仅保留为历史诊断证据，不再作为正式推荐依据。
- 停止新增模型和反复调参；未来训练必须先攒够真实开奖前快照。

## 每日更新

执行端只按 [EXECUTOR_WORKFLOW.md](EXECUTOR_WORKFLOW.md) 操作。旧 `update_daily.py` 及旧更新脚本已经删除，不得恢复。

固定验收入口：

```bash
npm run lint
npm run test:data
npm run test:ui
node _audit_all.js
```

监督和最终签收见 [SUPERVISOR_WORKFLOW.md](SUPERVISOR_WORKFLOW.md)。

## 工具与机器人

- [TOOLING.md](TOOLING.md)：本地工具链
- [AGENT_PROMPTS.md](AGENT_PROMPTS.md)：机器人职责与提示词
- JupyterLab：`powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\jupyter-lab.ps1`
