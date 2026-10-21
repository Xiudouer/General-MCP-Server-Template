# WeKnora MCP 端点分析

审阅本地公开源码快照 `2fbfb4471581cd5e7d731bc7a2d443fe7d8e95b5`，非最新在线版本探测；没有启动 WeKnora 服务或复现其业务调用。分析基于 Go 源码直接阅读，无需对公开源码进行二进制反编译。REA 的 JavaScript 分析器不适用于这里的 Go 服务，未把它的可用性检查当成源码分析证据。

## 两种不同入口

1. `internal/router/routes_mcp_endpoint.go` 的 `RegisterMCPServerRoutes`：在全局 Auth 之前注册 `/mcp/:endpoint_id` 的 POST/GET/DELETE，使用自身 `MCPEndpointAuth`。
2. `internal/mcpserver/server.go` 的 `NewServer`：mark3labs/mcp-go，WithStateLess(true) Streamable HTTP；单一全目录，通过 filterTools 限制 tools/list，通过 guardTool 在 tools/call 再检查 allowlist、限流并触碰 last-used。
3. `internal/middleware/mcp_endpoint_auth.go`：只从 Authorization 读 Bearer，拒绝 URL token；端点绑定租户及 API-key 风格知识库范围，由现有业务服务继续检查 scope。管理端点 `/api/v1/mcp-endpoints` 与公开协议入口不是同一个 API。
4. `cli/internal/mcp/server.go` 与 `cli/cmd/mcp/mcp.go`：另一个 stdio 入口 `weknora mcp serve`，使用 modelcontextprotocol/go-sdk，面向现有 WeKnora CLI 配置。

## 工具计数证据

`internal/mcpserver/server.go` 的 `toolCatalog()` 和 `internal/types/mcp_endpoint_tools.go` 一致列出 12 项：

`list_knowledge_bases`, `search_knowledge`, `grep_chunks`, `list_documents`, `read_document`, `ask`, `wiki_search`, `wiki_read_page`, `wiki_index`, `add_document`, `update_document`, `delete_document`。

新 HTTP 端点默认启用其中 9 项，三个文档写工具默认不勾选；`ask` 也会产生会话记录，因此“未标为 destructive”不等于严格无副作用。

CLI 文档声明 10 项：`kb_list`, `kb_view`, `doc_list`, `doc_view`, `doc_download`, `search_chunks`, `chunk_list`, `agent_list`, `chat`, `session_ask`。它们与 HTTP 工具的名称和语义不同，不能相加作为同一端点的工具总数。本快照不能支持“29 个工具”的说法。

## 抽取到模板的对应

| 上游 | 模板 |
|---|---|
| 业务工具定义 + handler | `src/tools.mjs` + 可信插件接口 |
| toolCatalog + filterTools | `catalog()` + 注册前的 enabledTools 筛选 |
| guardTool | 执行前再次检查、并发预算、统一错误结果 |
| Bearer 端点鉴权 | loopback HTTP Host/Origin/Bearer 校验 |
| 无状态 HTTP | 每请求独立 SDK Server/Transport |
| 单独 CLI stdio | 相同业务注册表连接 StdioServerTransport |

没有复制租户 RBAC、Redis 限流、知识库/聊天服务、管理 UI、持久化端点令牌与资源 URL 改写。配置是本地单一权限域，而非“企业权限已剥离且等效”。

MCP 是公开标准，不是 WeKnora 私有协议。没有手写近似 JSON-RPC 路由来冒充完整 MCP；协议协商和工具 schema/result 编码交给官方 SDK。该模板不是 WeKnora 那 12 项工具的协议兼容代理。
