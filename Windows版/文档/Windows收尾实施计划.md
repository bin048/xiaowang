> 历史阶段记录；Windows最终结论以本包《Windows基础链路收尾报告》为准。

# Windows 基础链路收尾 Implementation Plan

> 本轮由当前会话依次执行；用户已授权修复和测试，不创建新功能或子任务。

**Goal:** 显式释放 SQLite 连接，验证虚构数据迁移，交付可由用户在 Windows 真机执行并回传证据的验收包。

**Architecture:** 保持事件、ACK、SQLite 表与 H5 存储契约；仅更换 Store.connect 的资源管理。迁移使用既有完整备份入口，file 与 HTTP 数据源保持隔离。

**Tech Stack:** Python sqlite3/unittest、Chromium/Playwright、现有 Electron。

1. 在 测试/test_sqlite_resources.py 增加跟踪真实连接的测试。强引用保留连接，不依赖垃圾回收；先确认旧实现失败。
2. 在 Windows本地服务/本地投递服务.py 以 contextmanager + with db + finally close 保留提交/回滚，覆盖初始化异常。
3. 连续投递、相同事件重试、ACK重试、冲突、并发、关闭后重开与连接释放；运行既有8组协议测试和入口恢复测试。
4. 在隔离 Chromium 资料环境，用虚构人物/来源/关联事项验证 M1.0 file → M1.1 HTTP → M1.0 file 回退；导出实际JSON并逐项校验，不读用户资料或模型密钥。
5. 准备 Windows 10/11 人工验收单、虚构 TXT/DOCX/PDF、仅本验收目录的进程/回执/环境证据采集；自动测试不得冒充系统物理拖入。
6. 独立生成 Windows待验收包，检查绝对路径、运行时密钥、缓存及资料。保留有平台标签的历史证据；更新报告与校验清单。
7. Windows项目在用户回传真机证据前保持 NOT_RUN，不声明达到停止条件；不扩展真实微信或 AI 功能。
