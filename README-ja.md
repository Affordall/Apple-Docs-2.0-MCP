<div align="center">

[English](README.md) · **日本語** · [한국어](README-ko.md) · [简体中文](README-zh-CN.md)

# Apple Docs 2.0 MCP

### Appleのデベロッパードキュメント、デザインガイドライン、WWDCセッションを統合する単一のMCP。

**エージェントと一緒に次のiOSアプリを開発していますか？ まずはApple公式のドキュメントを読み込ませましょう。書き直しを減らし、作業の中断も削減できます。**

[![npm version](https://img.shields.io/npm/v/apple-docs-2.0-mcp?style=flat-square&color=cb3837)](https://www.npmjs.com/package/apple-docs-2.0-mcp)
[![MCP tools](https://img.shields.io/badge/MCP-7_tools-5c4ee5?style=flat-square)](#️-利用可能なツール)
[![Node.js](https://img.shields.io/node/v/apple-docs-2.0-mcp?style=flat-square&logo=nodedotjs&logoColor=white&label=Node.js&color=339933)](https://nodejs.org/en/download)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-0d1117?style=flat-square)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.mishafyi/apple-docs-2.0-mcp)
[![skills.sh](https://skills.sh/b/mishafyi/apple-docs-2.0-mcp?style=flat-square)](https://skills.sh/mishafyi/apple-docs-2.0-mcp)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)

[Quick Start](#-クイックスタート) · [What's New](#-20の新機能) · [Installation](#-インストール) · [Usage](#-使用例) · [Tools](#️-利用可能なツール) · [Architecture](#️-アーキテクチャ) · [Development](#-開発)

<code>npx -y apple-docs-2.0-mcp</code>

<br />

<img src="https://cdn.jsdelivr.net/gh/mishafyi/Apple-Docs-2.0-MCP@main/assets/banner.png" alt="Apple Docs 2.0 MCP: doc search optimized for agents, a complete index of 336,723 pages, and Sample Code with WWDC included" width="1200" />

</div>

---

Model Context Protocolを通じてAIアシスタントに提供されるApple Developer Documentation：APIリファレンス、記事、サンプルコード、チュートリアル、Human Interface Guidelines、App Store Connect Help、WebサービスAPI（App Store Connect API、App Store Server APIなど）、そしてトランスクリプトとコードを含む1,700のWWDCセッションを、Claude、Cursor、VS Codeをはじめとする任意のMCPクライアントで利用できます。

Apple Docs 2.0 MCPは、[kimsungwhee](https://github.com/kimsungwhee)氏による[Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp)のフォークであり、機能追加、不具合修正、新しいツールの導入によって改良されています。

## 🚀 クイックスタート

### Claude Desktop（推奨）

Claude Desktopの設定に以下を追加します：

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

> **Note**: 古いバージョンが使用される問題が発生した場合は、`@latest` を追加して最新バージョンを強制してください：
> ```json
> "args": ["-y", "apple-docs-2.0-mcp@latest"]
> ```

Claude Desktopを再起動して、AppleのAPIについて質問を始めましょう！

### Claude Code

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

### エージェントに質問する

```text
Look up NavigationStack in Apple's docs, then show me the WWDC code that uses it.
```

## 🆕 2.0の新機能

Apple Docs 2.0 MCPは、Apple Docs MCP 1.0.26の全機能を維持しつつ、動作しなくなっていた部分や不完全だった結果を修正しているため、アシスタントは推測ではなくApple公式のドキュメントに基づいて回答します。

### 🔍 結果を返す検索

`search_apple_docs` を修正しました。AppleのWebサイトと同じ検索サービスを使用するようになったため、developer.apple.com で表示される結果（APIリファレンス、記事、サンプルコード、デザインガイドライン、App Store Connect Help、WWDCビデオ）をアシスタントがそのまま取得できます。元のバージョンでは、Appleが検索ページを変更して以来、検索結果が空で返されていました。

API、デザインガイドライン、App Storeの手続きについて質問すると、アシスタントはまず検索を実行し、見つかったページを読み込みます。

### 🗺️ あらゆるページを名前で検索

新ツールの `search_docs_map` により、336,723ページの中から任意のページを名前（またはその一部）からオフラインで検索できます：

- APIシンボル：型、メソッド、プロパティ、enum case、マクロ
- 記事およびサンプルコード
- Info.plist およびエンタイトルメントのキー
- App Store Connect APIなどのWebサービスエンドポイント
- Human Interface Guidelines および App Store Connect Help のページ

コードやエラーメッセージから名前がすでに分かっている場合に、直接そのページを開くために使用します。

### 📄 完全なドキュメントページ

ページはAppleのサイトと同様に完全な形で取得されます。すべてのメソッドとプロパティの完全なシグネチャ（単なる `view` ではなく `var view: UIView!`）、型の継承元と適合プロトコル、関連API、サポートするOSバージョンが含まれます。2.0ではさらに、Human Interface Guidelines、チュートリアル、App Store Connect Help、そしてパラメータやレスポンスを含む App Store Connect API エンドポイントも読み込めます。

API、ガイドライン、App Store Connectのトピックについて質問すると、アシスタントは回答やコード作成を行う前にページ全体を読み込みます。

### 🎥 コード付きのWWDC 2014–2026

WWDC26を含む1,700のセッションが組み込まれており、オフラインで動作します。1,416セッションのトランスクリプト（各段落の開始時間付き）、480セッションのチャプター、715セッションのコードサンプル（動画内で表示される時間付き）を収録しています。セッションはAppleのWebサイトと同じトピックごとに分類されています。

新しいAPIの仕組みについて尋ねると、アシスタントはそのAPIを導入したWWDCセッションをコードとともに引用できます。

### 📋 完全なフレームワーク一覧

元のバージョンではテクノロジー一覧が200項目で途切れていたため、カテゴリ全体（Graphics and Games、Media、System、Web）が表示されず、シンボル検索にはリンク切れの見出しが混ざっていました。2.0ではすべてをリスト化し、ベータ版のフレームワークにマークを付け、分野ごとにフレームワークを検索できます（「Machine learning」で検索すると Core ML、Create ML、Foundation Models、Vision などが返されます）。

機械学習やオーディオなど、特定のタスクに適したフレームワークを尋ねると、アシスタントは完全なリストを比較検討します。

### 🛠️ 安定した動作のための設計

最新の依存関係、通常のブラウザのように動作し順番を待つリクエスト（Appleはリクエストの間隔が短すぎると空の検索結果を返します）、リクエスト失敗時の自動リトライ、そして207件の自動テストを備えています。元のREADMEにあった63件の使用例はすべてエラーなしで動作します。

セットアップは不要で、APIキーやアカウントも必要ありません。

## ✨ 機能

- 🔍 **Search**: Appleのドキュメント、デザインガイドライン、サンプルコード、App Store Connect Help、WWDCセッションを一度にまとめて検索、または個別に対象を絞って検索
- 🗺️ **Docs map**: メソッド名やプロパティ名も含め、ネットワークリクエストなしでタイトルから任意のページを検索
- 📚 **Documentation pages**: SwiftおよびObjective-CのAPI、記事、チュートリアル、WebサービスリファレンスをMarkdown形式で取得
- 🎨 **Human Interface Guidelines**: すべてのHIGページを検索・閲覧可能
- 🏪 **App Store Connect Help**: プロダクトページの項目、審査、TestFlight、価格設定
- 🔧 **Framework symbols**: ワイルドカードを使用してフレームワークのクラス、構造体、プロトコル、メンバーをブラウズ
- 🔗 **API relationships**: 関連API、類似API、参照API、非推奨となったAPIの代替手段
- 📊 **Platform compatibility**: 各プラットフォームでAPIが導入・非推奨となったバージョン
- 📋 **Technology catalog**: カテゴリ別に分類されたすべてのAppleフレームワークとテクノロジー（ベータ版にはマークを表示）
- 📰 **Documentation updates**: リリースノート、フレームワークのアップデート、WWDCの「What's new」ページ
- 🎯 **Technology overviews**: アプリ設計、ゲーム、AI・機械学習、データなどに関するAppleのガイド
- 💻 **Sample code**: Appleの検索順位に基づくすべてのサンプルプロジェクト、フレームワークやセクション別のSample Code Library（概要およびDownloadリンク付き）
- 🎥 **WWDC library**: トランスクリプト、タイムスタンプ付きコード例、リソース、関連セッションを含む2014年から2026年までの1,700セッションをオフラインで利用可能

## 📦 インストール

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

[📖 Claude Code MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

`~/.cursor/mcp.json` に追加します：

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

[📖 Cursor MCP docs](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

ワークスペースのルートにある `.mcp.json`（VS Codeのポータブル形式）に追加します：

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

[📖 VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

Zedの `settings.json` に追加します：

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

[📖 Zed MCP docs](https://zed.dev/docs/ai/mcp)

</details>

## 💬 使用例

### 🔍 検索
```
"SwiftUIのアニメーションを検索"
"withAnimationのAPIドキュメントを探して"
"Human Interface Guidelinesでタブバーについて検索"
"App Store Connect HelpでTestFlightの外部テスターについて検索"
"Core Dataのサンプルコードを探して"
```

### 🗺️ Docs Map
```
"accessibilityInputLabelsのページを探して"
"タイトルにgaugeが含まれるSwiftUIのページはどれ？"
"自動更新サブスクリプションを作成するためのApp Store Connect APIエンドポイントを探して"
```

### 📚 ドキュメントへのアクセス
```
"SwiftUIフレームワークに関する詳細情報を取得"
"関連APIとともにwithAnimation APIを表示して"
"NSManagedObjectContextのドキュメントを表示して"
"タブバーに関するHuman Interface Guidelinesのページを読んで"
"SwiftUIチュートリアルの手順を表示して"
```

### 🔧 フレームワークの探索
```
"SwiftUIのViewを表示して"
"すべてのUIKitデリゲートプロトコルを一覧表示"
"WeatherKitのAPI階層を取得"
"Core MLのモデル読み込みAPIを探索"
```

### 🔗 APIの発見
```
"UIViewControllerに関連するAPIを検索"
"UIAlertViewの代替手段を見つけて"
"SwiftDataドキュメントからのすべての参照を取得"
"SwiftDataのプラットフォーム互換性を取得"
```

### 📋 テクノロジー、アップデート、概要
```
"利用可能な機械学習フレームワークは何？"
"ベータ版のテクノロジーはどれ？"
"SwiftUIの新機能は何？"
"Xcodeのリリースノートを表示して"
"データ管理テクノロジーの概要を取得"
```

### 💻 サンプルコード
```
"SwiftUIのサンプルコードプロジェクトを表示して"
"機械学習のサンプルコードを探して"
"Food Truckのサンプルを取得"
```

### 🎥 WWDC
```
"SwiftUIに関するWWDCビデオを検索"
"機械学習に関するWWDCセッションを探して"
"WWDC 2026のビデオを表示して"
"WWDCのトランスクリプトからasync/awaitを検索"
"WWDC23の「Meet SwiftData」のトランスクリプトを表示して"
"SwiftDataを使用するWWDCセッションからコード例を取得"
"WWDC23の「Meet SwiftData」に関連するセッションを探して"
"すべてのWWDCトピックを一覧表示"
```

## 🛠️ 利用可能なツール

| Tool | Returns |
|------|---------|
| `search_apple_docs` | Appleの検索結果をAppleの表示順で返します。各項目にはタイトル、Appleによる種別（kind）、フレームワーク、1行の要約、リンクが含まれます（ドキュメント、デザインガイドライン、サンプルコード、App Store Connect Help、WWDCセッション）。`type` を指定すると、Appleの検索ページのフィルターと同様に、そのうちの1つに絞り込んで検索できます |
| `search_docs_map` 🆕 | 大文字・小文字を問わず、タイトルに指定したテキストが含まれるページをタイトルの短い順に返します。各項目には種別、BetaまたはDeprecatedマーク、テクノロジー、親ページ、リンクが含まれます。必要に応じてテクノロジー内（名前またはIDで指定、サイドバーに掲載されている全ページ）や特定の種別に限定することも可能です。`source: "index"` を指定すると、代わりに1つのフレームワークのサイドバーをリアルタイムで読み込み、ワイルドカード検索を行います |
| `get_apple_doc_content` | JSONからレンダリングされた1つのドキュメントページを、SwiftまたはObjective-CのMarkdownとして返します：要約、オーバーロードを含むすべての宣言、概要、コード、そのAPIに言及している記事、プロパティリストキーの詳細、各メンバーの宣言と要約を含むTopics、Relationships、See Also、Appleの注記付きの利用可能バージョン（availability）。Webサービスエンドポイントの場合はURL、パラメータ、ボディ、レスポンス。チュートリアルの場合は各ステップのコードとプロジェクトファイル。サンプルの場合はDownloadリンク。App Store Connect Helpの記事。`view` を指定するとAPIページの一部のみを取得できます：`"related"`、`"similar"`（非推奨注記に記載されたページを優先した代替API）、`"references"`（リンク先ページと要約）、または `"availability"` |
| `list_technologies` | Appleの4つのカタログを返します：カテゴリ別のすべてのフレームワークとテクノロジー（要約付き）、Sample Code Library（注目のサンプルが先頭）、Updatesページのリリースノートおよびアップデートページ、Technology Overviewsのコレクションおよび記事。最初の2つはカタログ全体のTSVファイルを指定します |
| `list_wwdc_videos` | 特定の年やトピックのWWDCセッション、またはタイトルやトピック名に指定テキストを含むセッションを返します。各セッションにはリンク、トピック、トランスクリプトやコードの有無が含まれます。`view: "years"` は各年のセッション数を集計し、`view: "topics"` はトピック一覧または特定トピックのセッションを一覧表示します |
| `search_wwdc_content` | 入力されたテキストがトランスクリプトまたはコードに含まれるWWDCセッションを、一致数の多い順に返します（各パッセージには開始時間付き）。`view: "examples"` を指定すると、テキストを含むコード例を代わりに一覧表示します。全セッションをテキストとして格納したフォルダを指定します |
| `get_wwdc_video` | リンク、ダウンロード、チャプター、タイムスタンプ付きトランスクリプト、タイムスタンプ付きコード例、関連セッションを含む1つのWWDCセッションを返します。`view: "related"` を指定すると、Appleが関連付けたセッション、次いで共通トピックが最も多いセッションを一覧表示します |

ドキュメントツールは developer.apple.com から取得します。WWDCツールはバンドルされたデータを読み込み、`search_docs_map` はDocs mapを読み込みます。どちらもネットワークリクエストは発生しません。

## 🏗️ アーキテクチャ

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

### 🌐 リクエストとキャッシュ

すべてのリクエストは単一のHTTPクライアントを経由します。Safariのヘッダーを付与した `fetch` を使用し、最大で毎分100リクエストに制限されます。検索は1回ずつ15秒の間隔を空けて実行されます（Appleは間隔が短すぎると結果なしで応答するためです）。各試行のタイムアウトは2分で、ネットワークエラー、タイムアウト、5xxエラーが発生した場合は最大3回のリトライとバックオフが実行されます。

AppleのJSONは、Appleから送信された形式のままURLごとにキャッシュされ、すべてのツール間で共有されます。別のツールが直前に読み込んだページは再ダウンロードされず、同一のURLに対する同時リクエストは1回のダウンロードを共有します。

| コンテンツ | キャッシュ期間 |
|------------|----------------|
| ページ、カタログページ、テクノロジー一覧 | 30分 |
| サイドバー（フレームワークおよびカタログのインデックス） | 1時間 |
| パース済みのDocs map | 使用中（アイドル状態が30分続くと解放） |
| 検索 | キャッシュなし |

## 📦 WWDCデータ

WWDCセッションは `data/wwdc/` にバンドルされているため、WWDCツールはオフラインかつレート制限なしで動作します：

- 📹 **1,700セッション**（2014〜2026年）、1,416セッションにトランスクリプト（各段落にタイムスタンプ付き、Appleが現在掲載していない6セッションを除くすべて）、715セッションにコード例、480セッションにチャプターを収録
- 🏷️ **19トピック**（Appleのトピックページより取得）
- 💾 **48 MB** のJSON

`npx tsx scripts/add-wwdc-year.ts <year>` でAppleのページから新しい年を追加または更新できます。Appleが掲載を終了したセッションについても、保存済みのデータは保持されます。

## 🗺️ Docs Map

`api-map/apple-docs-map.tsv` には、Appleのナビゲーターインデックス、Human Interface Guidelines、App Store Connect Helpのナビゲーションから収集された336,723ページ（URL、タイトル、種別、テクノロジー、グループ、ツリー、テクノロジーID、BetaまたはDeprecatedマーク、およびそのページをサイドバーに掲載している他のテクノロジー）が一覧化されています。`search_docs_map` は使用中にこれをメモリ上に保持します。`npx tsx scripts/build-docs-map.ts api-map/apple-docs-map.tsv` を実行すると、約10分で再構築できます。

## 🧪 開発

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

ビルド後、MCPクライアントでサーバーを再起動または再接続してください。

## 🙏 クレジット

Apple Docs 2.0 MCPは、[kimsungwhee](https://github.com/kimsungwhee)氏による[Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp)をベースに構築されており、そのツール、WWDCデータ、構造を出発点としています。

## 🤝 コントリビューション

コントリビューションを歓迎します：

1. リポジトリを **Fork**
2. フィーチャーブランチを **作成**: `git checkout -b feature/amazing-feature`
3. 変更を **コミット**: `git commit -m 'Add amazing feature'`
4. ブランチに **プッシュ**: `git push origin feature/amazing-feature`
5. Pull Requestを **オープン**

## 📄 ライセンス

元のプロジェクトと同様にMITライセンスです：[LICENSE](LICENSE) を参照してください。

## ⚠️ 免責事項

本プロジェクトは Apple Inc. と提携しておらず、またApple Inc.の推奨を受けたものでもありません。教育および開発目的で、Appleが公開しているデベロッパードキュメントを読み込みます。
