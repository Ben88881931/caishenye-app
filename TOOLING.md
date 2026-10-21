# 本地工具链

## 已安装

- Playwright `1.64.1`：使用本机 Chrome 做真实浏览器检查。
- ESLint `10.13.0`：检查未定义变量、重复键、重复声明和死代码。
- JupyterLab `4.6.4`：只用于独立研究，不进入生产页面。
- pytest `9.1.1`：用于后续数据与结算逻辑测试。
- 官方 `jupyter-notebook` 技能：下个回合起可用。

Python 环境使用短路径：

```text
C:\Users\Administrator\Documents\Codex\2026-08-22\new-chat\v2
```

短路径是为了避开 Windows 的 260 字符路径限制。

## 常用命令

```powershell
npm run lint
npm run test:data
npm run test:ui
npm test
```

启动 JupyterLab：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\jupyter-lab.ps1
```

启动后打开：

```text
http://127.0.0.1:8899/lab
```

## 机器人分工

最多分三个，不要按页面拆成很多个。

1. 执行机器人：只更新开奖数据、运行 `sync.py`、保存快照、提交和推送；不写审计结论。
2. 监督机器人：独立核对数据、快照、页面、模型和远端状态，负责最终签收。
3. 研究机器人：只在独立分支或只读数据副本中做回测和 Notebook 实验，结果通过影子观察后才能进入生产。

硬规则：

- 同一时间只能有一个机器人写生产数据。
- 研究机器人不能直接改 `app.js`、`lottery_data.json` 或快照。
- 执行机器人不能给自己的结果签收。
- 页面订单记录仍属于浏览器本机 `localStorage`，不能当作跨设备审计真源。
