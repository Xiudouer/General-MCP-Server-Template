# 验证记录

日期：2026-10-21（Asia/Shanghai）

环境：Windows x64、Node.js 24.14.1、官方 MCP SDK 1.32.1、Zod 4.6.7、本机真实 Git、Node 内置真实 SQLite。

最终 `npm test`：**5 组通过，0 失败**，测试进程正常退出。无 WeKnora 服务依赖，无模型调用。

1. 真实 stdio 子进程：SDK initialize、tools/list、tools/call；真实临时 Git 仓库状态和日志；真实文件搜索；真实 SQLite 命名查询、参数绑定抗 SQL 拼接、只读拒写及写后数据未变化；未知参数、越界参数、路径逃逸被拒。
2. 真实 HTTP：SDK StreamableHTTPClientTransport 握手、发现与调用；缺 Token 401、URL token 无效、伪造 Host/Origin 403、GET 405、非法 JSON 400、超限 body 413。
3. 工具授权与插件：仅暴露启用的插件工具；隐藏的 git_status 不能通过直接 tools/call 绕过。
4. 启动约束：越界路径、未知配置工具、过短 Token 拒绝。
5. SQLite 预算：200 行输入只返回 100 行并标记截断；无限递归 SQL 在 4 秒预算后被终止，测试进程正常结束。

额外验证 `demo:init` 能生成虚构 SQLite 示例。分发源码包不包含生成的数据库。

曾发现 Worker 终止不能可靠打断同步 SQLite，已改为 OS 子进程 + execFile deadline，最终测试覆盖此行为；不能仅凭 Promise 拒绝就宣称底层计算已停止。

未验证：Claude Code/Cursor GUI 实际接入、Linux/macOS 运行、WeKnora 上游服务运行、多租户、OAuth/TLS、长连接 SSE、协议全量一致性认证、对抗性宿主文件系统、生产负载。程序执行测试只说明这里列出的行为，不是全面安全审计。
