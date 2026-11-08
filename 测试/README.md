# 测试套件

## 当前主套件（提交评审用的证据来自这里）

| 文件 | 用例数 | 覆盖 |
|---|---|---|
| `person-presets.cjs` | 11 | 三槽位保存、自动归档、画像成功/失败/重试、幂等、普通模式、人物删除保护、访问控制、离线恢复、真实 Electron 交接与真实 ACK |
| `presets-followup.cjs` | 8 | 深链定位、待人工处理清单、停止重试、提取失败、换模型重试、画像中断恢复、跨标签页自愈、跨浏览器提示 |
| `presets-entry.cjs` | 1 | 悬浮球设置入口地址断言（带 / 不带 `xw_open`） |
| `test_service.py` | 8 | 本地服务：鉴权、同源、事件幂等、ACK、预设读写、停止标记 |
| `test_desktop_restart.py` | 18 | 桌面入口退出/重开、停止标记残留、服务与悬浮球独立生命周期 |
| `screenshots.cjs` | — | 用隔离数据生成 `文档/截图/`（不可作为通过证据） |

运行前置：

- Node 22+，Playwright 模块（`NODE_PATH` 指向含 `playwright` 的 `node_modules`）
- Python 3.11+
- 一份官方 Electron，通过 `XW_TEST_ELECTRON` 指向其可执行文件
- 全部用例使用**临时目录 + 虚构人物与资料**，不会读写你的运行数据
- 模型走**本地桩**，不产生外部请求与费用

```sh
export NODE_PATH=<含 playwright 的 node_modules>
export XW_TEST_ELECTRON=<Electron 可执行文件>
node 测试/person-presets.cjs      # 11 项
node 测试/presets-followup.cjs    # 8 项
node 测试/presets-entry.cjs       # 1 项
python3 -m unittest discover -s 测试 -p test_service.py -v
XW_TEST_ELECTRON=$XW_TEST_ELECTRON python3 -m unittest discover -s 测试 -p test_desktop_restart.py -v
```

从受限会话（无 GUI 权限）启动 Electron 时，Chromium 自身沙箱可能初始化失败（`sandbox initialization failed`）。
测试脚本支持 `XW_TEST_NO_SANDBOX=1` 为**测试进程**追加 `--no-sandbox`；产品代码与 `webPreferences.sandbox:true` 不受影响，
从 Finder / 终端正常启动不需要这个开关。

## 历史用例（M1.0 及更早，保留作对照）

`m10-regression.cjs`、`browser-migration.cjs`、`transport-browser.cjs`、`electron-e2e.cjs`、`desktop-switch.cjs`、
`outbox-recovery.cjs`、`fixture-parser.cjs`、`test_sqlite_resources.py` 对应早期版本的数据契约。
它们不属于本次提交的验收范围，可能有与当前目录结构不一致的路径假设；**判断本项目是否通过，请以上表的主套件为准**。
