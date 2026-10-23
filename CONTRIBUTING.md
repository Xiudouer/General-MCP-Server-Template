# Contributing

LocalMCPKit 是一个可复用的本地 MCP Server 模板。贡献应保持 **stdio/loopback、小依赖面、默认拒绝** 的范围，不要把它扩展成远程多租户服务。

## 开发环境

- Node.js 24.14+（测试使用 24.14.1）
- Git（`git_status` / `git_log` 工具需要）
- Node 内置 `node:sqlite`（运行时可能打印 experimental 提示）

```sh
npm ci --ignore-scripts
npm run demo:init
npm test
```

测试使用真实临时 Git 仓库、真实 SQLite 文件和真实 stdio/loopback HTTP，不依赖外部服务或模型。

## 修改准则

- 保持 stdio 和 `127.0.0.1` 两种传输；不要加入公网监听、OAuth 登录或多租户管理，除非先开 Issue 讨论威胁模型。
- HTTP 入口必须继续校验 Host、Origin 和 Bearer Token；Token 只从调用者环境读取，不写入日志、配置或 URL。
- 工具参数必须使用严格 Zod schema 校验；不要让模型传入任意命令、SQL、文件路径或插件路径。
- 外部命令必须使用固定可执行文件和参数数组，禁止 shell 拼接；数据库保持只读、参数绑定和有界结果。
- 插件是维护者信任的本地代码，不是沙盒；新增示例应默认只读，并说明超时和输出上限。
- 修改工具、传输、路径校验或预算时，必须补充 `tests/integration.test.mjs`。
- 更新用户可见行为时同步修改 README、`TEST-RESULTS.md` 和 `CHANGELOG.md`。
- **不要提交** `node_modules/`、`config.local.json`、`*.sqlite`、`.env`、日志、私有状态或任何凭据。这些路径已在 `.gitignore` 中排除。

## 提交与 Pull Request

1. 从最新 `main` 创建分支，一个提交只做一类改动。
2. 提交信息说明动机和安全影响。
3. PR 描述包含：测试命令、传输方式、是否影响工具权限或路径边界。
4. 确保 `npm test` 通过；新增测试应可在无网络环境运行。
5. 不要在 PR 中附加真实仓库路径、Token、数据库或用户数据。

## 安全报告

请不要在公开 Issue 中粘贴 Token、真实路径、数据库内容或可利用细节。先使用仓库的私密安全报告渠道联系维护者；如果不可用，只发一个不含敏感内容的最小说明。

## 许可证

提交即表示你同意以本仓库的 MIT 许可证（见 [LICENSE](LICENSE)）发布你的贡献。第三方组件声明见 [THIRD-PARTY.md](THIRD-PARTY.md)。
