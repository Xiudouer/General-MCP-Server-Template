# LocalMCPKit

[![tests](https://github.com/Xiudouer/General-MCP-Server-Template/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Xiudouer/General-MCP-Server-Template/actions/workflows/tests.yml)

通用本地 MCP Server 模板：把自己维护的本地函数、命令或查询封装为模型可发现、可调用的工具。Node.js JavaScript 源码直接运行，无编译步骤。提供 **stdio + Streamable HTTP**；用官方 MCP SDK 负责 JSON-RPC、initialize、tools/list、tools/call 和协议协商。

参考 WeKnora 的端点结构独立实现，不是 WeKnora 的知识库服务，也不提供其业务 API 的兼容替代。固定源码的 HTTP 目录是 **12 项**、CLI 是 **10 项**，没有把“29 个工具”当作已核实事实。详见 [分析记录](docs/WEKNORA-ANALYSIS.md)。

## 快速试跑

需要 Node.js 24.14+（测试使用 24.14.1），Git 工具另需本机 Git。SQLite 使用 Node 内置 `node:sqlite`，当前运行时会打印 experimental 提示，不另装数据库服务。

```powershell
npm ci --ignore-scripts
npm run demo:init
```

`demo:init` 只创建含两条虚构记录的 `examples/sample.sqlite`，已有文件时拒绝覆盖。编辑 `examples/config.json` 的 `workspace` 为自己授权的 Git 仓库路径，或相对于该配置文件的目录。可把配置另存为忽略提交的 `config.local.json`。Windows JSON 路径使用 `/` 或双反斜杠。

```powershell
node src/main.mjs stdio config.local.json
```

stdio 模式没有欢迎输出；等待客户端经 stdin 发送 MCP 消息是正常状态。stdout 只承载协议，诊断写 stderr。

| 工具 | 参数 | 返回 |
|---|---|---|
| `git_status` | `{}` | 已跟踪文件状态，不列未跟踪文件 |
| `git_log` | `{"limit":5}` | 最近提交短哈希和主题，不含作者邮箱 |
| `text_search` | `{"query":"MCP","directory":"."}` | 字面匹配的相对路径、行号、片段 |
| `sqlite_query` | `{"name":"find_notes","params":["%MCP%"]}` | 预注册 SQL 模板的查询结果 |

删除 `enabledTools` 中的名称，就会同时从发现目录和可调用集合移除。未知工具名称在启动时直接报错。SQLite 文件和 SQL 模板由配置维护者预先指定，模型不能发送任意 SQL 或数据库路径。返回兼有 `content` 文本和 `structuredContent.result`。

## 连接客户端

客户端应自己启动 stdio 服务。把下列 JSON（另存于 `examples/client.mcp.json`）放到支持 `mcpServers` 的客户端配置中：[Cursor](https://cursor.com/docs/mcp) 项目内 `.cursor/mcp.json`；[Claude Code](https://code.claude.com/docs/en/mcp) 项目内 `.mcp.json`。把两个绝对路径替换为实际位置。没有任何 API Key；模型由客户端提供。

```json
{
  "mcpServers": {
    "local-tools": {
      "command": "node",
      "args": ["/ABS/PATH/LocalMCPKit/src/main.mjs", "stdio", "/ABS/PATH/LocalMCPKit/config.local.json"]
    }
  }
}
```

GUI 客户端找不到 `node` 时，将 command 改成 Node 可执行文件的绝对路径。客户端自身的信任和工具调用确认仍由客户端控制。本交付没有更改你的现有客户端配置；集成测试用官方 MCP 客户端验证协议，未实测 Claude Code / Cursor GUI。

## 本机 HTTP

```powershell
$env:MCP_TOKEN = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
node src/main.mjs http config.local.json
```

入口 `http://127.0.0.1:18788/mcp/local`，可用 `MCP_PORT` 修改端口。客户端发 `Authorization: Bearer <该会话的令牌>`，不要把令牌放在 URL、源码、共享配置或聊天中。Token 由调用者环境管理，进程不打印它，也不自动保存到磁盘。HTTP 客户端必须在本地以自己的安全方式拿到同一令牌。

这是单实例、单权限域的**无状态 Streamable HTTP**：每个请求建独立 SDK server/transport，JSON 响应；无长连接 SSE、会话恢复、OAuth 登录、多租户管理或外网监听。未提供旧版 `/sse` 协议兼容。GET/DELETE 返回 405；POST 请求由 SDK 处理协议生命周期，初始化通知返回 202。所有方法先校验 Host/Origin/Token。不要将本入口直接通过端口转发公开。

## 包装自己的工具

参看 [examples/echo-plugin.mjs](examples/echo-plugin.mjs)：模块导出 `createTools(config)`，返回 `{name,description,schema,run,annotations?}` 列表。schema 是严格 Zod 对象，run 接收参数和 AbortSignal。将模块路径加入配置 `plugins`，并把工具名加入 `enabledTools`。模块路径相对于配置文件，启动时载入。

插件是**维护者信任的本地代码**，拥有进程权限，不是沙盒。不要从模型参数、文档内容或 HTTP 请求取得插件路径、任意可执行命令或 shell 字符串。对写操作插件需自行设置准确的 MCP annotations、审批机制、超时和事务；默认示例只读。MCP annotations 是给客户端的提示，不是访问控制。

示例用受控 `git` 参数、`execFile(shell:false)` 包装命令。要包装 grep/rg，保持可执行文件和参数结构固定，只将经过 schema 校验的值填入参数数组，并处理选项分隔、超时和输出上限。数据库适配器保持只读账号、绑定参数和有界结果；不要让模型拼接 SQL。

## 范围与边界

- 信任配置维护者、插件作者和本机 OS 用户；workspace 不得被敌对进程并发改写。路径采用 realpath 校验，不能对抗文件打开前后的恶意路径替换。
- Git 只读、不联网、不接受额外参数；关闭全局/系统配置、fsmonitor 和签名检查；项目里的 Git 配置仍会被 Git 自己读取。输出最多 64 KiB，4 秒超时。
- 文本搜索是字面 UTF-8 搜索，跳过符号链接、点文件和常见生成/私有目录；最多 200 文件、3000 目录项、8 MiB 输入、50 条结果，每条片段 500 字符。它不是凭据扫描器；授权目录中的普通文本可能包含敏感内容，请先选择适合给模型看的范围。
- 搜索和 SQLite 在独立 OS 子进程中运行，4 秒超时终止，Node JS heap 上限 64 MiB（不是进程总内存配额）；参数经 stdin 传递，不放命令行或环境变量；每服务进程最多 4 个在执行工具。SQLite 最多 100 行 / 约 48 KiB，readOnly/query_only 禁写、禁扩展加载，SQL 由可信维护者定义。
- HTTP 限 64 KiB body、8 KiB headers、16 个处理请求、32 个连接；进程级每分钟 120 个 POST，固定窗口限流。非分布式配额系统。
- 适配器异常返回通用 `isError`，不回传堆栈、配置、Token 或底层 stderr。程序不记录工具参数/结果。正常结果可能包含你授权读取的数据，它们会交给 MCP 客户端及其模型；本模板不是离线模型或数据不外发保证。

## 仓库结构

| 路径 | 内容 |
|---|---|
| `src/` | MCP 服务入口、stdio/Streamable HTTP 传输、工具注册与校验、配置加载、子进程工作器 |
| `tests/` | 集成测试：真实 stdio、loopback HTTP、鉴权、Host/Origin、路径与参数边界 |
| `docs/` | WeKnora 端点结构与实现边界分析 |
| `examples/` | 示例配置、客户端配置、只读插件和示例工作区；`npm run demo:init` 生成 `examples/sample.sqlite` |
| `scripts/` | `init-demo.mjs` 演示数据初始化 |
| `licenses/` | WeKnora 上游许可证 |
| `package.json` / `package-lock.json` | 依赖声明与 `npm` 脚本，要求 Node.js 24.14+ |
| `UPSTREAM.md` / `THIRD-PARTY.md` | 上游对应关系与第三方声明 |
| `TEST-RESULTS.md` | 实际验证范围与限制 |
| `CONTRIBUTING.md` / `CHANGELOG.md` | 贡献流程与版本记录 |

本模板没有 `assets/`：仓库不含图片或图标，示例数据在运行时生成；也没有 `Dockerfile`，交付形态是 Node.js 源码，不提供容器镜像。`node_modules/`、`config.local.json`、`examples/sample.sqlite` 等运行产物已被 `.gitignore` 排除。

## 验证和交付

```powershell
npm test
```

测试使用真实本地 Git 仓库、真实 SQLite 文件、真实子进程 stdio 和 loopback HTTP，不是协议 Mock。覆盖发现、调用、绑定参数、只读拒写、权限列表、路径越界、非法参数、鉴权、Host/Origin、错误 JSON 和超限请求。详见 [TEST-RESULTS.md](TEST-RESULTS.md)。

源码 ZIP 不含 node_modules、私有配置或运行数据，首次 `npm ci` 需要联网；已用 package-lock 固定依赖。若要完全离线分发，需要另行准备对应环境的 Node 和依赖，当前源码包不作此承诺。

自有源码 MIT；设计来源和许可证见 [UPSTREAM.md](UPSTREAM.md) 与 [THIRD-PARTY.md](THIRD-PARTY.md)。贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。
