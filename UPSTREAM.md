# 来源

设计分析固定于 [Tencent/WeKnora](https://github.com/Tencent/WeKnora/tree/2fbfb4471581cd5e7d731bc7a2d443fe7d8e95b5)：

- [HTTP server](https://github.com/Tencent/WeKnora/blob/2fbfb4471581cd5e7d731bc7a2d443fe7d8e95b5/internal/mcpserver/server.go)
- [端点鉴权](https://github.com/Tencent/WeKnora/blob/2fbfb4471581cd5e7d731bc7a2d443fe7d8e95b5/internal/middleware/mcp_endpoint_auth.go)
- [路由](https://github.com/Tencent/WeKnora/blob/2fbfb4471581cd5e7d731bc7a2d443fe7d8e95b5/internal/router/routes_mcp_endpoint.go)
- [CLI stdio](https://github.com/Tencent/WeKnora/blob/2fbfb4471581cd5e7d731bc7a2d443fe7d8e95b5/cli/internal/mcp/server.go)

本模板为独立 JavaScript 实现，未复制上游 Go 业务代码；保留上游完整许可证于 `licenses/WeKnora-LICENSE.txt`。本项目不代表腾讯或 MCP 官方背书。

标准与 SDK：

- [MCP transports 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [官方 TypeScript SDK v1 server guide](https://ts.sdk.modelcontextprotocol.io/server)
- [官方 SDK 源码](https://github.com/modelcontextprotocol/typescript-sdk)
