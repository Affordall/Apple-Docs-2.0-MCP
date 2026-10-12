<div align="center">

[English](README.md) · **日本語** · [한국어](README-ko.md) · [简体中文](README-zh-CN.md)

# Apple Docs 2.0 MCP

### Apple の開発者ドキュメント、デザインガイドライン、WWDC セッションをひとつにまとめた MCP。

**次の iOS アプリをエージェントと作るなら、まず Apple 公式ドキュメントを読ませましょう。書き直しも中断も減ります。**

[![npm version](https://img.shields.io/npm/v/apple-docs-2.0-mcp?style=flat-square&color=cb3837)](https://www.npmjs.com/package/apple-docs-2.0-mcp)
[![MCP tools](https://img.shields.io/badge/MCP-19_tools-5c4ee5?style=flat-square)](#️-利用可能なツール)
[![Node.js](https://img.shields.io/node/v/apple-docs-2.0-mcp?style=flat-square&logo=nodedotjs&logoColor=white&label=Node.js&color=339933)](https://nodejs.org/en/download)
[![npm downloads](https://img.shields.io/npm/dm/apple-docs-2.0-mcp?style=flat-square&color=cb3837)](https://www.npmjs.com/package/apple-docs-2.0-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-0d1117?style=flat-square)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.mishafyi/apple-docs-2.0-mcp)
[![skills.sh](https://skills.sh/b/mishafyi/Apple-Docs-2.0-MCP?style=flat-square)](https://skills.sh/mishafyi/Apple-Docs-2.0-MCP)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)
[![Fork of Apple Docs MCP](https://img.shields.io/badge/fork_of-kimsungwhee%2Fapple--docs--mcp-blue?style=flat-square)](https://github.com/kimsungwhee/apple-docs-mcp)

[クイックスタート](#-クイックスタート) · [新機能](#-20-の新機能) · [インストール](#-インストール) · [使用例](#-使用例) · [ツール](#️-利用可能なツール) · [アーキテクチャ](#️-アーキテクチャ) · [開発](#-開発)

<code>npx -y apple-docs-2.0-mcp</code>

<br />

<img src="https://cdn.jsdelivr.net/gh/mishafyi/Apple-Docs-2.0-MCP@main/assets/banner.png" alt="Apple Docs 2.0 MCP: doc search optimized for agents, a complete index of 336,629 pages, and Sample Code with WWDC included" width="1200" />

</div>

---

Model Context Protocol を通じて AI アシスタントに提供される Apple Developer Documentation: Claude、Cursor、VS Code、またはその他の MCP クライアント内で、API リファレンス、記事、サンプルコード、チュートリアル、Human Interface Guidelines、App Store Connect ヘルプ、Web サービス API（App Store Connect API、App Store Server API など）、そしてトランスクリプトやコードを含む 1,700 件の WWDC セッションを利用できます。

Apple Docs 2.0 MCP は、[kimsungwhee](https://github.com/kimsungwhee) 氏による [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp) のフォークであり、機能追加、不具合修正、および新しいツールの導入によって改善されています。

## 🚀 クイックスタート

### Claude Desktop（推奨）

Claude Desktop 設定ファイルに以下を追加してください：

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

> **注意**: 古いバージョンが使用される問題が発生した場合、`@latest` を追加して最新バージョンを強制します：
> ```json
> "args": ["-y", "apple-docs-2.0-mcp@latest"]
> ```

Claude Desktop を再起動して Apple API について質問を始めましょう！

### Claude Code

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

### エージェントに頼む

```text
Apple のドキュメントで NavigationStack を調べて、それを使う WWDC のコードを見せて。
```

## 🆕 2.0 の新機能

Apple Docs 2.0 MCP は、Apple Docs MCP 1.0.26 のすべてのツールを維持しつつ、機能しなくなっていた部分や不完全な応答となっていた箇所を修正しました。これにより、アシスタントは推測ではなく Apple 公式のドキュメントに基づいて回答します。

### 🔍 結果をしっかり返す検索機能

`search_apple_docs` が修正されました。Apple の Web サイトで使用されているものと同じ検索サービスを利用するようになったため、アシスタントは developer.apple.com で確認できる検索結果（API リファレンス、記事、サンプルコード、デザインガイドライン、App Store Connect ヘルプ、WWDC ビデオ）を取得できます。オリジナル版では、Apple 側の検索ページ変更に伴い検索結果が空になっていました。

API、デザインガイドライン、App Store のプロセスについて質問すると、アシスタントはまず検索を実行し、見つかったページを読み込みます。

### 🗺️ 名前からあらゆるページを検索

新ツール `search_docs_map` は、名前またはその一部から 336,629 ページをオフラインで検索します:

- API シンボル: 型、メソッド、プロパティ、enum ケース、マクロ
- 記事、チュートリアル、サンプルコード
- Info.plist およびエンタイトルメントのキー
- Web サービスのエンドポイント（App Store Connect API など）
- Human Interface Guidelines および App Store Connect ヘルプのページ

コードやエラーメッセージから名前がすでに分かっている場合に、そのページを直接開くために使用します。

### 📄 完全なドキュメントページ

ページは Apple のサイトと同様に完全な形で取得されます: すべてのメソッドとプロパティ（単なる `view` ではなく `var view: UIView!` のような完全なシグネチャ付き）、型の継承元や準拠プロトコル、関連 API、およびサポートされている OS バージョンが含まれます。2.0 では、Human Interface Guidelines、チュートリアル、App Store Connect ヘルプ、パラメータやレスポンスを含む App Store Connect API エンドポイントも読み込むことができます。

API、ガイドライン、App Store Connect のトピックについて質問すると、アシスタントは回答やコード生成を行う前にページ全体を読み込みます。

### 🎥 コード付き WWDC 2014–2026

WWDC26 を含む 1,700 のセッションが組み込まれており、オフラインで動作します。1,416 件にトランスクリプト、715 件にコードサンプル（動画内の登場時間付き）が含まれています。セッションは Apple の Web サイトと同じトピック分類で整理されています。

新しい API の動作について質問すると、アシスタントはその API が導入された WWDC セッションをコード付きで引用できます。

### 📋 完全なフレームワーク一覧

オリジナル版のテクノロジーリストは 200 件で途切れており、一部のカテゴリ全体（Graphics and Games、Media、System、Web）が表示されず、シンボル検索では壊れたリンクを含む見出しが混ざっていました。2.0 ではすべてを網羅し、ベータ版フレームワークを明示し、分野別にフレームワークを検索できます（「Machine learning」で検索すると Core ML、Create ML、Foundation Models、Vision などが返されます）。

機械学習やオーディオなど、特定のタスクに適したフレームワークを質問すると、アシスタントは完全なリストを比較検討します。

### 🛠️ 安定稼働のための設計

最新の依存関係、通常のブラウザのように動作しリクエスト間隔を空ける仕組み（Apple はリクエストが速すぎると空の検索結果を返します）、リクエスト失敗時の自動リトライ、および 255 件の自動テストを備えています。オリジナル版の README にある 63 件の使用例はすべてエラーなく実行されます。

追加設定は不要です。API キーやアカウントも必要ありません。

## ✨ 特徴

- 🔍 **検索**: Apple ドキュメント、デザインガイドライン、サンプルコード、App Store Connect ヘルプ、WWDC セッションを一括検索、または個別に検索
- 🗺️ **ドキュメントマップ**: ネットワークリクエストなしで、タイトル（メソッド名やプロパティ名を含む）から任意のページを検索
- 📚 **ドキュメントページ**: Swift および Objective-C API、記事、チュートリアル、Web サービスリファレンスを Markdown 形式で取得
- 🎨 **Human Interface Guidelines**: すべての HIG ページを検索・閲覧可能
- 🏪 **App Store Connect ヘルプ**: プロダクトページの項目、審査、TestFlight、価格設定など
- 🔧 **フレームワークシンボル**: ワイルドカードを使用してフレームワークのクラス、構造体、プロトコル、メンバーを探索
- 🔗 **API リレーションシップ**: 関連 API、類似 API、参照されている API、および非推奨となった API の移行先
- 📊 **プラットフォーム互換性**: 各プラットフォームで API が導入されたバージョンおよび非推奨となったバージョン
- 📋 **テクノロジーカタログ**: カテゴリ別のすべての Apple フレームワークおよびテクノロジー（ベータ版は明示）
- 📰 **ドキュメントの更新情報**: リリースノート、フレームワークのアップデート情報、WWDC の「What's new」ページ
- 🎯 **テクノロジー概要**: アプリ設計、ゲーム、AI・機械学習、データなどに関する Apple の公式ガイド
- 💻 **サンプルコード**: 概要とダウンロードリンクを含む Apple のサンプルプロジェクト
- 🎥 **WWDC ライブラリ**: トランスクリプト、タイムスタンプ付きコード例、リソース、関連セッションを含む 2014 年から 2026 年までの 1,700 セッション（オフライン対応）

## 📦 インストール

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

[📖 Claude Code MCP ドキュメント](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

`~/.cursor/mcp.json` に追加します:

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

[📖 Cursor MCP ドキュメント](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

ワークスペースのルートにある `.mcp.json`（VS Code のポータブル形式）に追加します:

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

[📖 VS Code MCP ドキュメント](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

Zed の `settings.json` に追加します:

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

[📖 Zed MCP ドキュメント](https://zed.dev/docs/ai/mcp)

</details>

## 💬 使用例

### 🔍 検索
```
"SwiftUIのアニメーションを検索して"
"withAnimation APIのドキュメントを探して"
"Human Interface Guidelinesでタブバーについて検索して"
"App Store ConnectヘルプでTestFlightの外部テスターについて検索して"
"Core Dataのサンプルコードを探して"
```

### 🗺️ ドキュメントマップ
```
"accessibilityInputLabelsのページを探して"
"タイトルにgaugeが含まれるSwiftUIのページはどれ？"
"自動更新サブスクリプションを作成するためのApp Store Connect APIエンドポイントを探して"
```

### 📚 ドキュメントへのアクセス
```
"SwiftUIフレームワークに関する詳細情報を取得して"
"withAnimation APIと関連APIを表示して"
"NSManagedObjectContextのドキュメントを表示して"
"タブバーに関するHuman Interface Guidelinesのページを読んで"
"SwiftUIチュートリアルの手順を表示して"
```

### 🔧 フレームワークの探索
```
"SwiftUIのViewを表示して"
"すべてのUIKitデリゲートプロトコルを一覧表示して"
"WeatherKit APIの階層を取得して"
"Core MLのモデル読み込みAPIを探索して"
```

### 🔗 APIの発見
```
"UIViewControllerに関連するAPIを探して"
"UIAlertViewの代替手段を見つけて"
"SwiftDataのドキュメントからすべての参照を取得して"
"SwiftDataのプラットフォーム互換性を取得して"
```

### 📋 テクノロジー、更新情報、および概要
```
"利用可能な機械学習フレームワークには何がある？"
"どのテクノロジーがベータ版ですか？"
"SwiftUIの新機能は何？"
"Xcodeのリリースノートを表示して"
"データ管理テクノロジーの概要を取得して"
```

### 💻 サンプルコード
```
"SwiftUIのサンプルコードプロジェクトを表示して"
"機械学習のサンプルコードを探して"
"Food Truckのサンプルを取得して"
```

### 🎥 WWDC
```
"SwiftUIに関するWWDCビデオを検索して"
"機械学習に関するWWDCセッションを探して"
"WWDC 2026のビデオを見せて"
"WWDCのトランスクリプトでasync/awaitを検索して"
"WWDC23のMeet SwiftDataのトランスクリプトを表示して"
"SwiftDataを使用しているWWDCセッションのコード例を取得して"
"WWDC23のMeet SwiftDataに関連するセッションを探して"
"すべてのWWDCトピックを一覧表示して"
```

## 🛠️ 利用可能なツール

| ツール | 返り値 |
|------|---------|
| `search_apple_docs` | タイトル、フレームワーク、種類、1行の要約を含むリンク形式の Apple 検索結果（ドキュメント、デザイン、サンプルコード、App Store Connect ヘルプ、WWDC セッションに分類） |
| `search_docs_map` 🆕 | 大文字・小文字を問わずタイトルに指定の文字列を含むページ（最短タイトル順、オプションで指定テクノロジー内への絞り込み可能）。種類、テクノロジー、リンクを含みます |
| `get_apple_doc_content` | JSON からレンダリングされた Markdown 形式のドキュメントページ（要約、宣言、概要、コード、各メンバーの宣言と要約を含む Topics、Relationships、See Also、提供状況）。URL、パラメータ、ボディ、レスポンスを含む Web サービスエンドポイント。各ステップのコードとプロジェクトファイルを含むチュートリアル。サンプルのダウンロードリンク。App Store Connect ヘルプ記事 |
| `search_framework_symbols` | ワイルドカードに一致する名前を持つ、指定したフレームワークのシンボル（種類およびリンクを含む） |
| `get_related_apis` | 指定した API の継承元および準拠プロトコルに加え、See Also および各 Topics グループの先頭 API（それぞれ要約付き） |
| `find_similar_apis` | 指定した API の代替手段（非推奨 API の場合は非推奨ノートに記載された代替先を優先し、次に See Also および Topics を表示） |
| `resolve_references_batch` | ドキュメントページがリンクしているページ一覧（タイトル、種類、要約、シンボルの場合はその宣言を含む） |
| `get_platform_compatibility` | 各プラットフォームで指定した API が導入および非推奨となった OS バージョン（Apple の非推奨ノート付き） |
| `list_technologies` | カテゴリ別のすべての Apple フレームワークおよびテクノロジーのリンク（ベータ版は明示） |
| `get_documentation_updates` | Apple のリリースノート、フレームワーク更新情報ページ、WWDC の「What's new」ページへのリンク（それぞれ要約付き） |
| `get_technology_overviews` | コレクションごとにグループ化された Apple の Technology Overviews ガイドへのリンク（各コレクションの要約付き） |
| `get_sample_code` | フレームワークごとにグループ化された Apple のサンプルコードプロジェクト（リンクおよび1行の要約付き） |
| `list_wwdc_videos` | 指定した年、トピック、またはタイトル単語に該当する WWDC セッション（リンク、トピック、トランスクリプトおよびコードの有無を含む） |
| `search_wwdc_content` | トランスクリプトまたはコードに指定した単語が含まれる WWDC セッション（一致箇所を最大3件含む） |
| `get_wwdc_video` | リンクとダウンロード、完全なトランスクリプト、タイムスタンプ付きコード例、関連セッションを含む単一の WWDC セッション |
| `get_wwdc_code_examples` | コード内で特定の型やフレームワークに言及している WWDC コード例（セッション名および登場時間付き） |
| `browse_wwdc_topics` | セッション数を含む WWDC トピック一覧、または指定したトピックのセッション一覧 |
| `find_related_wwdc_videos` | 指定した WWDC セッションに関連するセッション（Apple のおすすめを優先し、次いでトピックを共有するセッション） |
| `list_wwdc_years` | 各年のセッション数を含む WWDC の開催年一覧 |

ドキュメント関連ツールは developer.apple.com を取得します。WWDC ツールはバンドルされたデータを読み込み、`search_docs_map` はドキュメントマップを読み込みます（どちらもネットワークリクエストは行いません）。

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

すべてのリクエストは単一の HTTP クライアントを経由します: Safari のヘッダーを付与した `fetch` を使用し、最大で毎分 100 リクエストに制限され、検索は 15 秒間隔で 1 つずつ実行されます（Apple は頻度が高すぎるリクエストに対して結果なしを返すため）。各試行のタイムアウトは 2 分で、ネットワークエラー、タイムアウト、5xx レスポンスに対して最大 3 回のバックオフ付き再試行を行います。

| コンテンツ | キャッシュ期間 |
|---------|------------|
| ドキュメントページ | 30 分 |
| フレームワークインデックス | 1 時間 |
| テクノロジー、サンプルコード、テクノロジー概要 | 2 時間 |
| ドキュメント更新情報 | 30 分 |
| 検索結果 | キャッシュなし |

## 📦 WWDC データ

WWDC セッションは `data/wwdc/` にバンドルされているため、WWDC ツールはオフラインかつレート制限なしで動作します:

- 📹 2014 年から 2026 年までの **1,700 セッション**（1,416 件にトランスクリプト、715 件にコード例付き）
- 🏷️ Apple のトピックページから抽出された **19 のトピック**
- 💾 **41 MB** の JSON

`npx tsx scripts/add-wwdc-year.ts <year>` を実行すると、Apple のページから年次データを追加または更新できます。Apple が掲載を取り下げたセッションの保存データも保持されます。

## 🗺️ ドキュメントマップ

`api-map/apple-docs-map.tsv` には、Apple のナビゲーターインデックス、Human Interface Guidelines、および App Store Connect ヘルプのナビゲーションから取得した 336,629 ページ（URL、タイトル、種類、テクノロジー、グループ、ツリー）が記載されています。`search_docs_map` は呼び出しのたびにこれを読み込みます。`npx tsx scripts/build-docs-map.ts api-map/apple-docs-map.tsv` を実行すると、約 10 分で再構築できます。

## 🧪 開発

```bash
git clone https://github.com/mishafyi/Apple-Docs-2.0-MCP.git
cd Apple-Docs-2.0-MCP
npx pnpm@10 install
npx pnpm@10 run build          # tsc into dist/, then the WWDC data into dist/data/

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

ビルド後、MCP クライアントでサーバーを再起動または再接続してください。

## 🙏 クレジット

Apple Docs 2.0 MCP は、[kimsungwhee](https://github.com/kimsungwhee) 氏による [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp) をベースにしており、同プロジェクトのツール、WWDC データ、および構造から発展しました。

## 🤝 コントリビューション

コントリビューションを歓迎します:

1. リポジトリを **フォーク (Fork)** する
2. フィーチャーブランチを **作成 (Create)** する: `git checkout -b feature/amazing-feature`
3. 変更を **コミット (Commit)** する: `git commit -m 'Add amazing feature'`
4. ブランチに **プッシュ (Push)** する: `git push origin feature/amazing-feature`
5. プルリクエストを **作成 (Open)** する

## 📄 ライセンス

オリジナルプロジェクトと同様に MIT ライセンスが適用されます: [LICENSE](LICENSE) を参照してください。

## ⚠️ 免責事項

本プロジェクトは Apple Inc. と提携しておらず、また同社による承認を受けたものでもありません。教育および開発目的のために、公開されている Apple の開発者向けドキュメントを読み込んでいます。
