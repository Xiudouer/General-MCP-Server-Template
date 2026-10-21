# 第三方说明

自有源码和文档使用 MIT，见 LICENSE。WeKnora 仅为设计分析来源，完整上游许可证附在 licenses/。

运行依赖为官方 `@modelcontextprotocol/sdk` 1.32.1（MIT）和 `zod` 4.6.7（MIT），传递依赖由 package-lock.json 固定。源码 ZIP 不包含第三方 node_modules；`npm ci` 下载的依赖保留其自身 LICENSE/NOTICE。重新分发包含 node_modules 的包时应一并保留这些文件。

Node.js、Git、Claude Code、Cursor 为用户自备软件；本包未分发它们或其授权。SQLite 通过 Node 内置模块使用。
