# Apple Docs 2.0 MCP - Apple 开发者文档 Model Context Protocol 服务器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)
[![Fork of Apple Docs MCP](https://img.shields.io/badge/fork%20of-kimsungwhee%2Fapple--docs--mcp-blue)](https://github.com/kimsungwhee/apple-docs-mcp)

通过 Model Context Protocol 为 AI 助手提供 Apple 开发者文档：API 参考、技术文章、示例代码、教程、《人机界面指南》（Human Interface Guidelines）、App Store Connect 帮助、Web 服务 API（App Store Connect API、App Store Server API 等），以及包含文字转写与代码的 1,700 场 WWDC 演讲视频，支持 Claude、Cursor、VS Code 或任何 MCP 客户端。

Apple Docs 2.0 MCP 是 [kimsungwhee](https://github.com/kimsungwhee) 开发的 [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp) 的分支项目，通过新增功能、缺陷修复和全新工具进行了全面改进。

[English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **简体中文**

## 🆕 2.0 版本新特性

Apple Docs 2.0 MCP 保留了 Apple Docs MCP 1.0.26 的所有工具，并修复了失效或返回不完整内容的问题，让你的助手能够依据 Apple 官方文档进行回答，而非凭空猜测。基于原版自身的使用示例测试对比：

| | Apple Docs MCP 1.0.26 | Apple Docs 2.0 MCP |
|---|---|---|
| 其 README 中 6 个搜索示例的结果数 | 各 0 个 | 各 18–23 个 |
| `NSManagedObjectContext` 页面上的链接数 | 2 个（仅 See Also） | 96 个，包含 78 个成员及其声明和 15 个关联关系 |
| WWDC 演讲视频 | 1,266 场（2014–2025） | 1,700 场（2014–2026） |
| 包含代码的 WWDC 演讲视频 | 626 场 | 715 场 |
| 离线按精确名称查找页面 | — | `search_docs_map`，336,629 个页面 |

### 🔍 真正能返回结果的搜索

`search_apple_docs` 已修复：它现在使用 Apple 官网相同的搜索服务，因此你的助手可以获得与 developer.apple.com 上一致的结果：API 参考、文章、示例代码、设计指南、App Store Connect 帮助以及 WWDC 视频。而在原版中，由于 Apple 改版了搜索页面，搜索结果全部为空。

询问有关 API、设计准则或 App Store 流程的问题，助手会先进行搜索，然后阅读检索到的页面。

### 🗺️ 按名称查找任意页面

全新工具 `search_docs_map` 可在离线状态下按完整名称或部分名称查找 336,629 个页面中的任意页面：

- API 符号：类型、方法、属性、枚举用例、宏
- 文章、教程和示例代码
- Info.plist 和 entitlement 键
- Web 服务端点，例如 App Store Connect API 的端点
- 《人机界面指南》和 App Store Connect 帮助页面

当你在代码或错误信息中已知名称时，可使用它直接打开对应页面。

### 📄 完整的文档页面

页面完整呈现，效果与 Apple 官网一致：每个方法和属性均附带完整签名（如 `var view: UIView!`，而不仅仅是 `view`）、类型的继承与遵循关系、相关 API，以及支持它的 OS 版本。2.0 还支持阅读《人机界面指南》、教程、App Store Connect 帮助，以及带有参数和响应的 App Store Connect API 端点。

询问任何 API、指南或 App Store Connect 主题，助手都会在回答或编写代码前阅读完整页面。

### 🎥 WWDC 2014–2026，附带代码

内置 1,700 场演讲，包含 WWDC26，且完全支持离线使用：其中 1,416 场配有逐字文本记录，715 场配有代码示例，每个示例均标注了在视频中出现的时间。演讲分类与 Apple 官网保持一致。

询问新 API 如何工作，助手可以引用介绍它的 WWDC 演讲内容及代码。

### 📋 完整的框架列表

原版的技术列表在 200 个条目后便戛然而止，导致整个分类（图形与游戏、媒体、系统、Web）从未显示，且其符号搜索混杂了失效链接的标题。2.0 列出了所有内容，标出处于测试阶段（Beta）的框架，并支持按主题查找框架：搜索“Machine learning”可返回 Core ML、Create ML、Foundation Models、Vision 等。

询问哪些框架适合某项任务（如机器学习或音频），助手可对比完整列表。

### 🛠️ 为持续稳定运行而构建

采用最新的依赖库，请求模拟正常浏览器行为并排队等待（Apple 在请求过快时会返回空搜索结果），请求失败时自动重试，并包含 255 个自动化测试。原版 README 中的全部 63 个使用示例均可无报错运行。

除构建外无需任何额外配置：无需 API 密钥或账户。

## ✨ 功能特性

- 🔍 **搜索**：一次搜索即可涵盖 Apple 文档、设计指南、示例代码、App Store Connect 帮助和 WWDC 演讲，亦可单独搜索其中一项
- 🗺️ **文档索引图谱**：无需网络请求，即可按标题（甚至方法或属性名）查找任意页面
- 📚 **文档页面**：将 Swift 和 Objective-C API、文章、教程和 Web 服务参考渲染为 Markdown
- 🎨 **人机界面指南**：每一页 HIG 内容均可搜索与阅读
- 🏪 **App Store Connect 帮助**：产品页面字段、审核、TestFlight、定价
- 🔧 **框架符号**：通过通配符浏览框架的类、结构体、协议和成员
- 🔗 **API 关联关系**：相关、相似及被引用的 API，以及已废弃 API 的替代方案
- 📊 **平台兼容性**：各平台上引入和废弃某 API 的系统版本
- 📋 **技术目录**：按类别列出所有 Apple 框架和技术，标注处于 Beta 状态的项目
- 📰 **文档更新**：发行说明、框架更新和 WWDC “新特性”页面
- 🎯 **技术概述**：Apple 关于应用设计、游戏、AI 与机器学习、数据等方面的指南
- 💻 **示例代码**：Apple 示例项目及其摘要和下载链接
- 🎥 **WWDC 资料库**：2014 至 2026 年的 1,700 场演讲，支持离线查看文本记录、时间轴代码示例、相关资源和关联演讲

## 🚀 快速入门

环境要求：Node.js 22（22.22.2 或更高）、24（24.15 或更高）或 26 及更高版本（满足 jsdom 30 所需），以及 git。

```bash
git clone https://github.com/mishafyi/Apple-Docs-2.0-MCP.git
cd Apple-Docs-2.0-MCP
npx pnpm@10 install
npx pnpm@10 run build
```

然后使用 `dist/index.js` 的完整路径将服务器添加到你的 MCP 客户端中，以 Claude Code 为例：

```bash
claude mcp add apple-docs -- node /absolute/path/to/Apple-Docs-2.0-MCP/dist/index.js
```

## 📦 安装说明

<details>
<summary><strong>🤖 Claude Desktop</strong></summary>

添加到你的 Claude Desktop 配置文件中：

**macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "node",
      "args": ["/absolute/path/to/Apple-Docs-2.0-MCP/dist/index.js"]
    }
  }
}
```

重启 Claude Desktop。

</details>

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- node /absolute/path/to/Apple-Docs-2.0-MCP/dist/index.js
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
      "command": "node",
      "args": ["/absolute/path/to/Apple-Docs-2.0-MCP/dist/index.js"]
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
      "command": "node",
      "args": ["/absolute/path/to/Apple-Docs-2.0-MCP/dist/index.js"]
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
      "command": "node",
      "args": ["/absolute/path/to/Apple-Docs-2.0-MCP/dist/index.js"],
      "env": {}
    }
  }
}
```

[📖 Zed MCP 文档](https://zed.dev/docs/ai/mcp)

</details>

<details>
<summary><strong>🪟 Windows</strong></summary>

使用 `dist\index.js` 的 Windows 路径：

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "node",
      "args": ["C:\\path\\to\\Apple-Docs-2.0-MCP\\dist\\index.js"]
    }
  }
}
```

</details>

## 💬 使用示例

### 🔍 搜索
```
"搜索 SwiftUI 动画"
"查找 withAnimation API 文档"
"在《人机界面指南》中搜索标签栏（tab bars）"
"在 App Store Connect 帮助中搜索 TestFlight 外部测试员"
"查找 Core Data 的示例代码"
```

### 🗺️ 文档索引图谱
```
"查找 accessibilityInputLabels 的页面"
"哪些 SwiftUI 页面的标题中包含 gauge？"
"查找用于创建自动续期订阅的 App Store Connect API 端点"
```

### 📚 访问文档
```
"获取关于 SwiftUI 框架的详细信息"
"向我展示 withAnimation API 及其相关 API"
"向我展示 NSManagedObjectContext 文档"
"阅读《人机界面指南》中关于标签栏的页面"
"展示 SwiftUI 教程的步骤"
```

### 🔧 探索框架
```
"向我展示 SwiftUI 视图"
"列出所有 UIKit 委托（delegate）协议"
"获取 WeatherKit API 层级结构"
"探索 Core ML 模型加载 API"
```

### 🔗 API 发现
```
"查找与 UIViewController 相关的 API"
"发现 UIAlertView 的替代方案"
"获取 SwiftData 文档中的所有参考引用"
"获取 SwiftData 的平台兼容性信息"
```

### 📋 技术、更新与概述
```
"有哪些可用的机器学习框架？"
"哪些技术目前处于 beta 阶段？"
"SwiftUI 有哪些新特性？"
"向我展示 Xcode 的发行说明"
"获取数据管理技术概述"
```

### 💻 示例代码
```
"展示 SwiftUI 示例代码项目"
"查找机器学习的示例代码"
"获取 Food Truck 示例"
```

### 🎥 WWDC
```
"搜索关于 SwiftUI 的 WWDC 视频"
"查找关于机器学习的 WWDC 演讲"
"向我展示 WWDC 2026 视频"
"在 WWDC 文本记录中搜索 async/await"
"向我展示 WWDC23 Meet SwiftData 的文本记录"
"从使用 SwiftData 的 WWDC 演讲中获取代码示例"
"查找与 WWDC23 Meet SwiftData 相关的演讲"
"列出所有 WWDC 主题"
```

## 🛠️ 可用工具

| 工具 | 返回内容 |
|------|---------|
| `search_apple_docs` | Apple 搜索结果链接，均附带标题、框架、类型和单行摘要，并分组为文档、设计、示例代码、App Store Connect 帮助以及 WWDC 演讲 |
| `search_docs_map` 🆕 | 标题包含指定文本的页面（不区分大小写，短标题优先，可限定在指定技术范围内），均附带其类别、技术和链接 |
| `get_apple_doc_content` | 将单一文档页面从其 JSON 渲染为 Markdown：包含摘要、声明、概述、代码、附带各成员声明及摘要的主题（Topics）、关联关系（Relationships）、参见（See Also）和可用性；或包含 URL、参数、请求体和响应的 Web 服务端点；或包含各步骤代码及项目文件的教程；或示例的下载链接；或 App Store Connect 帮助文章 |
| `search_framework_symbols` | 某个框架中名称与通配符匹配的符号，附带类别和链接 |
| `get_related_apis` | 某个 API 的继承与遵循关系，外加其 See Also 和各个 Topics 组的首批 API，均附带摘要 |
| `find_similar_apis` | 某个 API 的替代方案，对于已废弃的 API，优先列出其废弃声明中提及的替代项，随后列出其 See Also 和 Topics |
| `resolve_references_batch` | 某个文档页面所链接到的页面，附带标题、类别、摘要，若为符号则附带其声明 |
| `get_platform_compatibility` | 某个 API 在各平台上引入及废弃的 OS 版本，包含 Apple 的废弃说明 |
| `list_technologies` | 按类别列出所有 Apple 框架和技术及其链接，标注处于 Beta 状态的项目 |
| `get_documentation_updates` | 指向 Apple 发行说明、框架更新页面及 WWDC “新特性”页面的链接，附带摘要 |
| `get_technology_overviews` | 指向 Apple 技术概述（Technology Overviews）指南的链接，按合集分组并附带每个合集的摘要 |
| `get_sample_code` | Apple 的示例代码项目，按框架分组，附带链接和单行摘要 |
| `list_wwdc_videos` | 按年份、主题或标题关键词筛选的 WWDC 演讲，附带链接、主题以及是否包含文本记录和代码 |
| `search_wwdc_content` | 文本记录或代码中包含指定词语的 WWDC 演讲，每个演讲附带最多三个匹配片段 |
| `get_wwdc_video` | 单场 WWDC 演讲，附带链接与下载资源、完整文本记录、带时间轴的代码示例以及相关演讲 |
| `get_wwdc_code_examples` | 代码中提及某类型或框架的 WWDC 代码示例，附带所属演讲和在视频中出现的时间 |
| `browse_wwdc_topics` | WWDC 主题及其演讲数量，或某个主题下的所有演讲 |
| `find_related_wwdc_videos` | 与某场 WWDC 演讲相关的演讲，优先呈现 Apple 官方精选，其次为具有相同主题的演讲 |
| `list_wwdc_years` | WWDC 各年份及其演讲数量 |

文档工具从 developer.apple.com 获取数据；WWDC 工具读取内置数据，`search_docs_map` 读取文档索引图谱，两者均无需发起网络请求。

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

所有请求均通过统一的 HTTP 客户端发出：采用带有 Safari 请求头的 `fetch`，限制每分钟最多 100 次请求；搜索请求逐个执行，间隔 15 秒，以防因 Apple 对过快请求返回空结果。每次尝试设置 2 分钟超时，遇网络错误、超时或 5xx 响应时最多重试 3 次并执行退避重试。

| 内容 | 缓存时间 |
|------|------------|
| 文档页面 | 30 分钟 |
| 框架索引 | 1 小时 |
| 技术、示例代码、技术概述 | 2 小时 |
| 文档更新 | 30 分钟 |
| 搜索 | 不缓存 |

## 📦 WWDC 数据

WWDC 演讲数据打包在 `data/wwdc/` 目录下，因此 WWDC 工具可离线工作且不受速率限制：

- 📹 **1,700 场演讲**，涵盖 2014 至 2026 年，其中 1,416 场配有文本记录，715 场配有代码示例
- 🏷️ **19 个主题**，提取自 Apple 主题页面
- 💾 **41 MB** JSON 数据

运行 `npx tsx scripts/add-wwdc-year.ts <year>` 可从 Apple 页面添加或刷新某一年份的数据；Apple 不再列出的演讲仍会保留其已存储的数据。

## 🗺️ 文档索引图谱

`api-map/apple-docs-map.tsv` 收录了来自 Apple 导航索引、《人机界面指南》以及 App Store Connect 帮助导航的 336,629 个页面（包含 URL、标题、类别、技术、分组和目录树）。`search_docs_map` 在每次调用时读取该文件。运行 `npx tsx scripts/build-docs-map.ts api-map/apple-docs-map.tsv` 可重新构建该文件，耗时约 10 分钟。

## 🧪 开发

```bash
npx pnpm@10 install
npx pnpm@10 run build          # tsc into dist/, then the WWDC data into dist/data/

# Checks: types (server and scripts), lint and tests
npx tsc --noEmit && npx tsc -p scripts && npx eslint src scripts && npx vitest run

# Call the built server without an MCP client
npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call \
  --tool-name search_apple_docs --tool-args-json '{"query":"tab bars","type":"design"}'

# Regenerate the types of Apple's JSON
npm run types:docc             # from Swift-DocC's RenderNode and RenderIndex specs
npm run types:captured         # from captured responses (quicktype)
```

构建完成后，请在你的 MCP 客户端中重启或重新连接服务器。

## 🙏 致谢

Apple Docs 2.0 MCP 基于 [kimsungwhee](https://github.com/kimsungwhee) 的 [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp) 构建，沿用了其最初的工具、WWDC 数据及架构设计。

## 🤝 贡献

欢迎参与贡献：

1. **Fork** 本代码仓库
2. **创建** 特性分支：`git checkout -b feature/amazing-feature`
3. **提交** 你的更改：`git commit -m 'Add amazing feature'`
4. **推送** 到该分支：`git push origin feature/amazing-feature`
5. **发起** Pull Request

## 📄 许可证

采用 MIT 许可证，与原项目保持一致：详见 [LICENSE](LICENSE)。

## ⚠️ 免责声明

本项目与 Apple Inc. 无关联，亦未获得其认可。本项目仅出于教育与开发目的读取 Apple 公开发布的开发者文档。
