<div align="center">

[English](README.md) · [日本語](README-ja.md) · [한국어](README-ko.md) · **简体中文**

# Apple Docs 2.0 MCP

### 汇集 Apple 开发者文档、设计指南与 WWDC 讲座的一体化 MCP。

**正在用智能体构建你的下一款 iOS App 吗？先让它阅读 Apple 官方文档：更少重写，更少打断。**

[![npm version](https://img.shields.io/npm/v/apple-docs-2.0-mcp?style=flat-square&color=cb3837)](https://www.npmjs.com/package/apple-docs-2.0-mcp)
[![MCP tools](https://img.shields.io/badge/MCP-7_tools-5c4ee5?style=flat-square)](#️-可用工具)
[![Node.js](https://img.shields.io/node/v/apple-docs-2.0-mcp?style=flat-square&logo=nodedotjs&logoColor=white&label=Node.js&color=339933)](https://nodejs.org/en/download)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-0d1117?style=flat-square)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.mishafyi/apple-docs-2.0-mcp)
[![skills.sh](https://skills.sh/b/mishafyi/apple-docs-2.0-mcp?style=flat-square)](https://skills.sh/mishafyi/apple-docs-2.0-mcp)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)

[快速开始](#-快速开始) · [新特性](#-20-新特性) · [安装](#-安装) · [使用示例](#-使用示例) · [可用工具](#️-可用工具) · [架构](#️-架构) · [开发](#-开发)

<code>npx -y apple-docs-2.0-mcp</code>

<br />

<img src="https://cdn.jsdelivr.net/gh/mishafyi/Apple-Docs-2.0-MCP@main/assets/banner.png" alt="Apple Docs 2.0 MCP：专为智能体优化的文档搜索、包含 336,723 个页面的完整索引，以及内置的 Sample Code 与 WWDC" width="1200" />

</div>

---

通过 Model Context Protocol 为 AI 助手提供 Apple Developer Documentation：涵盖 API 参考、技术文章、示例代码、教程、Human Interface Guidelines、App Store Connect Help、Web 服务 API（App Store Connect API、App Store Server API 等），以及包含讲稿与代码的 1,700 场 WWDC 讲座，支持 Claude、Cursor、VS Code 或任何 MCP 客户端。

Apple Docs 2.0 MCP 是基于 [kimsungwhee](https://github.com/kimsungwhee) 开发的 [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp) 的分支版本（fork），通过新增功能、问题修复和全新工具进行了改进。

## 🚀 快速开始

### Claude Desktop（推荐）

将以下内容添加到你的 Claude Desktop 配置中：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "apple-docs-2.0-mcp"]
    }
  }
}
```

> **注意**：如果遇到仍在使用旧版本的问题，请添加 `@latest` 强制使用最新版本：
> ```json
> "args": ["-y", "apple-docs-2.0-mcp@latest"]
> ```

重启 Claude Desktop，开始向它提问有关 Apple API 的问题吧！

### Claude Code

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

### 向你的智能体提问

```text
Look up NavigationStack in Apple's docs, then show me the WWDC code that uses it.
```

## 🆕 2.0 新特性

Apple Docs 2.0 MCP 保留了 Apple Docs MCP 1.0.26 的全部功能，并修复了失效或返回不完整内容的问题，让你的助手能够依据 Apple 官方文档进行解答，而不是凭空猜测。

### 🔍 真正能返回结果的搜索

`search_apple_docs` 已完成修复：它现在使用与 Apple 官方网站相同的搜索服务，因此你的助手可以获取与在 developer.apple.com 上所见一致的结果：API 参考、技术文章、示例代码、设计指南、App Store Connect Help 和 WWDC 视频。在原版中，由于 Apple 更改了搜索页面，搜索结果始终为空。

向助手询问某个 API、设计指南或 App Store 流程，它会先进行搜索，然后阅读找到的页面。

### 🗺️ 按名称查找任意页面

全新工具 `search_docs_map` 支持离线通过全名或部分名称查找全部 336,723 个页面中的任意一个：

- API 符号：类型、方法、属性、枚举成员、宏
- 技术文章和示例代码
- Info.plist 和 entitlement 键
- Web 服务端点，例如 App Store Connect API 的端点
- Human Interface Guidelines 和 App Store Connect Help 页面

当你已经从代码或错误信息中获知具体名称时，可以使用它直接打开对应的页面。

### 📄 完整的文档页面

页面内容完整呈现，与 Apple 官网一致：每个方法和属性都带有完整的签名（是 `var view: UIView!`，而不仅仅是 `view`）、类型的继承关系与遵循的协议、相关 API 以及支持它的 OS 版本。2.0 还能读取 Human Interface Guidelines、教程、App Store Connect Help 以及带有参数和响应的 App Store Connect API 端点。

向助手询问任何 API、指南或 App Store Connect 主题，它都会在回答或编写代码之前完整阅读该页面。

### 🎥 WWDC 2014–2026，附带代码

内置 1,700 场讲座（包括 WWDC26），且均支持离线使用：其中 1,416 场包含演讲逐字稿且每段均带有起始时间戳，480 场带有章节划分，715 场包含代码示例且每个示例均标有在视频中出现的时刻。讲座分类主题与 Apple 官网完全一致。

询问新 API 的工作原理，助手便能引用介绍该 API 的 WWDC 讲座并附上相应的代码。

### 📋 完整的 Framework 列表

原版的技术列表在 200 项后便截断，导致整个分类（Graphics and Games、Media、System、Web）从未出现，而且其符号搜索中还混杂了带有失效链接的标题。2.0 列出了全部内容，标注了处于 Beta 阶段的 Framework，并支持按主题查找 Framework：搜索 "Machine learning" 会返回 Core ML、Create ML、Foundation Models、Vision 等。

询问哪些 Framework 适合某项任务（如机器学习或音频处理），助手会在完整列表中进行对比评估。

### 🛠️ 为持续稳定运行而构建

采用最新的依赖项、模拟常规浏览器的请求头并按序排队请求（请求过快时 Apple 会返回空搜索结果）、请求失败时自动重试，并拥有 207 个自动化测试。原版 README 中的全部 63 个使用示例均可无错运行。

无需任何配置：不需要 API 密钥，也不需要注册账号。

## ✨ 功能特性

- 🔍 **搜索**：一键搜索 Apple 文档、设计指南、示例代码、App Store Connect Help 和 WWDC 讲座，亦可单独搜索其中任意一项
- 🗺️ **文档索引图（Docs map）**：无需网络请求，即可通过标题（甚至是方法名或属性名）查找任意页面
- 📚 **文档页面**：以 Markdown 格式呈现 Swift 和 Objective-C API、技术文章、教程及 Web 服务参考文档
- 🎨 **Human Interface Guidelines**：每一个 HIG 页面均可搜索和阅读
- 🏪 **App Store Connect Help**：涵盖 App 页面字段、审核、TestFlight、定价等内容
- 🔧 **Framework 符号**：通过通配符浏览 Framework 的类、结构体、协议及成员
- 🔗 **API 关联关系**：相关、相似与被引用的 API，以及已弃用 API 的替代方案
- 📊 **平台兼容性**：各平台上引入和弃用某个 API 的具体系统版本
- 📋 **技术目录**：按类别罗列 Apple 的每一个 Framework 与技术，并标注 Beta 版本
- 📰 **文档更新**：发布说明、Framework 更新以及 WWDC "What's new" 页面
- 🎯 **技术概览**：Apple 关于 App 设计、游戏、AI 与机器学习、数据管理等方面的指南
- 💻 **示例代码**：按 Apple 搜索排序的全部示例项目，以及按 Framework 或分区组织的 Sample Code Library，包含摘要和下载（Download）链接
- 🎥 **WWDC 资源库**：收录 2014 至 2026 年的 1,700 场讲座，离线提供演讲逐字稿、带时间戳的代码示例、配套资源及相关讲座

## 📦 安装

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

[📖 Claude Code MCP 文档](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

添加到 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "apple-docs-2.0-mcp"]
    }
  }
}
```

[📖 Cursor MCP 文档](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

添加到工作区根目录下的 `.mcp.json`（VS Code 的便携配置格式）：

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "apple-docs-2.0-mcp"]
    }
  }
}
```

[📖 VS Code MCP 文档](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

添加到你的 Zed `settings.json`：

```json
{
  "context_servers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "apple-docs-2.0-mcp"],
      "env": {}
    }
  }
}
```

[📖 Zed MCP 文档](https://zed.dev/docs/ai/mcp)

</details>

## 💬 使用示例

### 🔍 搜索
```
"搜索 SwiftUI 动画"
"查找 withAnimation API 文档"
"在 Human Interface Guidelines 中搜索标签栏"
"在 App Store Connect Help 中搜索 TestFlight 外部测试员"
"查找 Core Data 示例代码"
```

### 🗺️ 文档索引图
```
"查找 accessibilityInputLabels 的页面"
"哪些 SwiftUI 页面标题中包含 gauge？"
"查找用于创建自动续期订阅的 App Store Connect API 端点"
```

### 📚 查阅文档
```
"获取关于 SwiftUI 框架的详细信息"
"显示 withAnimation API 及其相关 API"
"显示 NSManagedObjectContext 文档"
"阅读 Human Interface Guidelines 中关于标签栏的页面"
"显示 SwiftUI 教程的步骤"
```

### 🔧 探索 Framework
```
"显示 SwiftUI 视图"
"列出所有 UIKit 代理协议"
"获取 WeatherKit API 层级结构"
"探索 Core ML 模型加载相关 API"
```

### 🔗 发现 API
```
"查找与 UIViewController 相关的 API"
"查找 UIAlertView 的替代方案"
"获取 SwiftData 文档中的所有参考引用"
"获取 SwiftData 的平台兼容性"
```

### 📋 技术、更新与概览
```
"有哪些可用的机器学习框架？"
"哪些技术处于 Beta 阶段？"
"SwiftUI 有哪些新特性？"
"显示 Xcode 的发布说明"
"获取数据管理技术概览"
```

### 💻 示例代码
```
"显示 SwiftUI 示例代码项目"
"查找机器学习相关的示例代码"
"获取 Food Truck 示例项目"
```

### 🎥 WWDC
```
"搜索关于 SwiftUI 的 WWDC 视频"
"查找关于机器学习的 WWDC 讲座"
"显示 WWDC 2026 视频"
"在 WWDC 演讲逐字稿中搜索 async/await"
"显示 WWDC23 Meet SwiftData 的演讲逐字稿"
"从使用 SwiftData 的 WWDC 讲座中获取代码示例"
"查找与 WWDC23 Meet SwiftData 相关的讲座"
"列出所有 WWDC 主题"
```

## 🛠️ 可用工具

| 工具 | 返回内容 |
|------|----------|
| `search_apple_docs` | 按 Apple 搜索排序返回搜索结果，每项均包含标题、Apple 分类类别（kind）、Framework、单行摘要以及链接：覆盖文档、设计指南、示例代码、App Store Connect Help 和 WWDC 讲座；`type` 可仅搜索其中一项，逻辑与 Apple 搜索页面的过滤筛选一致 |
| `search_docs_map` 🆕 | 标题包含指定文本的页面（不区分大小写，最短标题优先），每项包含类别、Beta 或 Deprecated 标记、所属技术、上级页面及链接；可选限定在特定技术内（按名称或 ID，涵盖其侧边栏列出的所有页面）或限定特定类别。`source: "index"` 则改为实时读取某个 Framework 的侧边栏并匹配通配符 |
| `get_apple_doc_content` | 将单个文档页面基于其 JSON 渲染为 Markdown，支持 Swift 或 Objective-C：包含摘要、每个声明及其重载、概览、代码、提及它的文章、属性列表（Property List）键的详细信息、带有各成员声明与摘要的 Topics、Relationships、See Also 以及带有 Apple 说明的系统可用性；Web 服务端点及其 URL、参数、请求体和响应；包含各步骤代码及工程文件的教程；示例代码的 Download 链接；App Store Connect Help 文章。`view` 可获取 API 页面的局部内容：`"related"`、`"similar"`（替代方案，优先展示其弃用说明中指明的页面）、`"references"`（其链接的页面及摘要）或 `"availability"` |
| `list_technologies` | Apple 的四类目录：按分类罗列每个 Framework 和技术及其摘要；Sample Code Library（精选示例优先）；Updates 页面的发布说明与更新页面；Technology Overviews 的合集与文章。前两类支持指定整个目录的 TSV 文件 |
| `list_wwdc_videos` | 指定年份或主题的 WWDC 讲座，或标题/主题名称中包含指定文本的讲座，每项包含链接、所属主题以及是否提供演讲逐字稿和代码；`view: "years"` 统计各年份的讲座数量，`view: "topics"` 列出所有主题或某个主题下的讲座 |
| `search_wwdc_content` | 演讲逐字稿或代码中包含原样文本的 WWDC 讲座（匹配项最多的优先），每段内容均附带起始时间；`view: "examples"` 则改为列出包含该文本的代码示例；支持指定包含全部讲座文本的文件夹 |
| `get_wwdc_video` | 单场 WWDC 讲座的详细内容，包含链接与下载项、章节、带时间戳的演讲逐字稿、带时间戳的代码示例及相关讲座；`view: "related"` 列出 Apple 官方关联的讲座，随后按共同主题最多的顺序排列相关讲座 |

文档相关工具会请求 developer.apple.com；WWDC 相关工具读取随附数据，`search_docs_map` 读取文档索引图，二者均无需发起网络请求。

## 🏗️ 架构

```
Apple-Docs-2.0-MCP/
├── src/
│   ├── index.ts                    # MCP server and its search guide
│   ├── tools/
│   │   ├── handlers.ts             # Tool registration
│   │   ├── search-api.ts           # Apple's search API
│   │   ├── search-docs-map.ts      # Docs map search
│   │   ├── doc-fetcher.ts          # Pages from Swift-DocC JSON
│   │   ├── doc-formatter.ts        # Markdown rendering
│   │   ├── help-pages.ts           # App Store Connect Help (jsdom, turndown)
│   │   ├── list-technologies.ts    # Technology catalog
│   │   ├── search-framework-symbols.ts
│   │   ├── get-related-apis.ts, find-similar-apis.ts, resolve-references-batch.ts, get-platform-compatibility.ts
│   │   ├── get-documentation-updates.ts, get-technology-overviews.ts, get-sample-code.ts
│   │   └── wwdc/                   # WWDC tools and the session, topic and year extractors
│   ├── types/                      # Generated from Swift-DocC's specs and captured responses
│   └── utils/                      # HTTP client, caches, constants, URL conversion
├── scripts/
│   ├── add-wwdc-year.ts            # Adds or refreshes a WWDC year in data/wwdc
│   ├── build-docs-map.ts           # Builds api-map/apple-docs-map.tsv
│   └── capture-responses.ts        # Captures responses to type them
├── data/wwdc/                      # The bundled WWDC sessions
├── api-map/                        # The docs map, Apple's search API (OpenAPI) and captured responses
└── tests/                          # Vitest
```

### 🌐 请求与缓存

所有请求均通过同一个 HTTP 客户端发出：采用携带 Safari 请求头的 `fetch`，每分钟最多 100 次请求；搜索请求单次串行执行，间隔 15 秒（因为频率过快时 Apple 会返回空结果）。每次尝试超时时间为 2 分钟，遇到网络错误、超时和 5xx 响应时最多重试 3 次并进行退避重试。

Apple 返回的 JSON 数据按 URL 原样缓存，并在所有工具间共享：其他工具刚读取过的页面不会重复下载，同一时刻对同一 URL 发起的多个请求将共享同一次下载。

| 内容 | 缓存时长 |
|------|----------|
| 页面、目录页面及技术列表 | 30 分钟 |
| 侧边栏（Framework 及目录索引） | 1 小时 |
| 解析后的文档索引图（docs map） | 使用期间保持；空闲 30 分钟后释放 |
| 搜索结果 | 不缓存 |

## 📦 WWDC 数据

WWDC 讲座数据打包内置于 `data/wwdc/` 中，因此 WWDC 工具支持完全离线运行且无速率限制：

- 📹 **1,700 场讲座**（2014 至 2026 年）：1,416 场配有演讲逐字稿且每段带时间戳（除 6 场外，其余均已不再在 Apple 官网展示），715 场包含代码示例，480 场配有章节
- 🏷️ **19 个主题**：提取自 Apple 官网的主题页面
- 💾 **48 MB** JSON 数据

`npx tsx scripts/add-wwdc-year.ts <year>` 可从 Apple 官网页面添加或刷新某一年份的数据；Apple 官网已下架的讲座将保留其已存储的数据。

## 🗺️ 文档索引图（Docs Map）

`api-map/apple-docs-map.tsv` 汇总了来自 Apple 导航索引（navigator indexes）、Human Interface Guidelines 及 App Store Connect Help 导航的 336,723 个页面（包含 URL、标题、类别、技术所属、组、树结构、技术 ID、Beta 或 Deprecated 标记，以及在其侧边栏中收录该页面的其他技术）。`search_docs_map` 在使用期间会将其常驻内存。运行 `npx tsx scripts/build-docs-map.ts api-map/apple-docs-map.tsv` 大约需要 10 分钟来重新构建该文件。

## 🧪 开发

```bash
git clone https://github.com/mishafyi/Apple-Docs-2.0-MCP.git
cd Apple-Docs-2.0-MCP
npx pnpm@10 install
npx pnpm@10 run build          # tsc into dist/

# Run your build in Claude Code in place of the npm package
claude mcp add apple-docs -- node "$PWD/dist/index.js"

# Checks: types (server and scripts), lint and tests
npx tsc --noEmit && npx tsc -p scripts && npx eslint src scripts && npx vitest run

# Call the built server without an MCP client
npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call \
  --tool-name search_apple_docs --tool-args-json '{"query":"tab bars","type":"design"}'

# Regenerate the types of Apple's JSON
npm run types:docc             # from Swift-DocC's RenderNode and RenderIndex specs
npm run types:captured         # from captured responses (quicktype)
```

构建完成后，在你的 MCP 客户端中重启或重新连接服务器。

## 🙏 致谢

Apple Docs 2.0 MCP 基于 [kimsungwhee](https://github.com/kimsungwhee) 的 [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp) 构建，继承了其原有的工具、WWDC 数据与基础架构。

## 🤝 贡献

欢迎参与项目贡献：

1. **Fork** 本代码仓库
2. **创建** 特性分支：`git checkout -b feature/amazing-feature`
3. **提交** 你的更改：`git commit -m 'Add amazing feature'`
4. **推送** 到该分支：`git push origin feature/amazing-feature`
5. **提交** Pull Request

## 📄 许可证

遵循 MIT License，与原项目保持一致：详见 [LICENSE](LICENSE)。

## ⚠️ 免责声明

本项目与 Apple Inc. 无任何关联，亦未获得其官方认可。本项目出于教育和开发目的读取 Apple 公开可用的开发者文档。
