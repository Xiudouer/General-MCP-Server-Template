# Changelog

本项目的显著变更记录在此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- GitHub Actions `tests` 工作流：Node.js 24、`npm ci --ignore-scripts` 和完整集成测试。

### Changed

- 测试目录统一为 `tests/`；`npm test` 与贡献指南中的路径同步更新。
- README 新增“仓库结构”一节，逐项说明 `src/`、`tests/`、`docs/`、`examples/`、`scripts/` 和依赖配置。

### Fixed

- Linux 下集成测试未把 Git 解析为绝对路径，导致首次 GitHub Actions 运行失败；现已修复，Windows 行为不变。

## [1.0.0] - 2026-10-21

### Added

- 可复用的本地 MCP Server 模板，基于官方 `@modelcontextprotocol/sdk`。
- stdio 与 loopback Streamable HTTP 两种传输；HTTP 使用 Bearer Token、Host/Origin 校验和固定窗口限流。
- `git_status`、`git_log`、`text_search`、`sqlite_query` 四个只读示例工具。
- 严格的 Zod 参数校验、路径 realpath 限制、子进程超时和输出/结果预算。
- 插件机制：`createTools(config)`、`enabledTools` 白名单和示例 echo 插件。
- `scripts/init-demo.mjs` 生成虚构 SQLite 示例；无真实用户数据。
- 5 组真实 stdio/HTTP 集成测试、`TEST-RESULTS.md` 和第三方声明。
- `package-lock.json` 固定依赖版本。

### Verified

- Windows x64、Node.js 24.14.1、MCP SDK 1.32.1、Zod 4.6.7：`npm test` 5 组通过。
- 测试覆盖真实 Git、SQLite、stdio 子进程、HTTP 鉴权、路径越界、参数校验和超时。
- 未验证 Claude Code/Cursor GUI 实际接入、Linux/macOS、OAuth/TLS、长连接 SSE 或生产负载。

### Notes

- 1.0.0 是本地参考实现，不是沙盒、生产网关或完整 MCP 协议认证。
- `node_modules/`、生成的 SQLite、私有配置和运行数据不包含在此源码仓库。
