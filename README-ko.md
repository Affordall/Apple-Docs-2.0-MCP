<div align="center">

[English](README.md) · [日本語](README-ja.md) · **한국어** · [简体中文](README-zh-CN.md)

# Apple Docs 2.0 MCP

### Apple의 개발자 문서, 디자인 가이드라인, WWDC 세션을 위한 단 하나의 MCP.

**에이전트와 함께 다음 iOS 앱을 개발하고 계신가요? Apple의 공식 문서부터 먼저 읽게 하세요. 코드 재작성과 흐름 끊김이 줄어듭니다.**

[![npm version](https://img.shields.io/npm/v/apple-docs-2.0-mcp?style=flat-square&color=cb3837)](https://www.npmjs.com/package/apple-docs-2.0-mcp)
[![MCP tools](https://img.shields.io/badge/MCP-7_tools-5c4ee5?style=flat-square)](#️-제공-도구)
[![Node.js](https://img.shields.io/node/v/apple-docs-2.0-mcp?style=flat-square&logo=nodedotjs&logoColor=white&label=Node.js&color=339933)](https://nodejs.org/en/download)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-0d1117?style=flat-square)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.mishafyi/apple-docs-2.0-mcp)
[![skills.sh](https://skills.sh/b/mishafyi/apple-docs-2.0-mcp?style=flat-square)](https://skills.sh/mishafyi/apple-docs-2.0-mcp)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)

[빠른 시작](#-빠른-시작) · [새로운 기능](#-20의-새로운-기능) · [설치](#-설치) · [사용 예시](#-사용-예시) · [도구](#️-제공-도구) · [아키텍처](#️-아키텍처) · [개발](#-개발)

<code>npx -y apple-docs-2.0-mcp</code>

<br />

<img src="https://cdn.jsdelivr.net/gh/mishafyi/Apple-Docs-2.0-MCP@main/assets/banner.png" alt="Apple Docs 2.0 MCP: 에이전트에 최적화된 문서 검색, 336,723개 페이지의 전체 인덱스, Sample Code 및 WWDC 포함" width="1200" />

</div>

---

Model Context Protocol을 통해 AI 어시스턴트에게 제공되는 Apple Developer Documentation: API 레퍼런스, 아티클, 샘플 코드, 튜토리얼, Human Interface Guidelines, App Store Connect Help, 웹 서비스 API(App Store Connect API, App Store Server API 등), 그리고 트랜스크립트와 코드가 포함된 1,700개의 WWDC 세션을 Claude, Cursor, VS Code 또는 모든 MCP 클라이언트에서 이용할 수 있습니다.

Apple Docs 2.0 MCP는 [kimsungwhee](https://github.com/kimsungwhee)의 [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp)를 포크한 프로젝트로, 기능 추가, 버그 수정, 그리고 새로운 도구를 더해 개선되었습니다.

## 🚀 빠른 시작

### Claude Desktop (권장)

Claude Desktop 설정 파일에 다음 내용을 추가하세요:

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

> **참고**: 이전 버전이 사용되어 문제가 발생하는 경우, `@latest`를 추가하여 최신 버전을 강제 적용하세요:
> ```json
> "args": ["-y", "apple-docs-2.0-mcp@latest"]
> ```

Claude Desktop을 재시작하고 Apple API에 대해 질문해 보세요!

### Claude Code

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

### 에이전트에 질문하기

```text
Look up NavigationStack in Apple's docs, then show me the WWDC code that uses it.
```

## 🆕 2.0의 새로운 기능

Apple Docs 2.0 MCP는 Apple Docs MCP 1.0.26의 모든 기능을 유지하면서 작동이 중단되었거나 불완전하게 반환되던 문제를 해결하여, 어시스턴트가 어림짐작하는 대신 Apple의 공식 문서를 바탕으로 답변하도록 합니다.

### 🔍 결과를 반환하는 검색

`search_apple_docs` 기능이 수정되었습니다. 이제 Apple 웹사이트와 동일한 검색 서비스를 사용하여, 어시스턴트가 developer.apple.com에서 볼 수 있는 결과(API 레퍼런스, 아티클, 샘플 코드, 디자인 가이드라인, App Store Connect Help, WWDC 비디오)를 그대로 가져옵니다. 기존 버전에서는 Apple이 검색 페이지를 변경한 이후 검색 결과가 빈 상태로 반환되었습니다.

API, 디자인 가이드라인, 또는 App Store 프로세스에 대해 질문하면, 어시스턴트가 먼저 검색한 뒤 찾은 페이지를 읽습니다.

### 🗺️ 이름으로 모든 페이지 찾기

새로운 도구인 `search_docs_map`은 오프라인에서 이름 전체 또는 일부로 336,723개 페이지 중 원하는 페이지를 찾아냅니다:

- API 심볼: 타입, 메서드, 프로퍼티, enum 케이스, 매크로
- 아티클 및 샘플 코드
- Info.plist 및 entitlement 키
- App Store Connect API 등의 웹 서비스 엔드포인트
- Human Interface Guidelines 및 App Store Connect Help 페이지

코드나 에러 메시지를 통해 이름을 이미 알고 있을 때, 해당 페이지를 직접 여는 용도로 사용하세요.

### 📄 완전한 문서 페이지

Apple 사이트와 마찬가지로 페이지 전체가 그대로 제공됩니다. 모든 메서드와 프로퍼티의 전체 시그니처(단순히 `view`가 아닌 `var view: UIView!`), 타입의 상속 및 준수 정보, 관련 API, 지원하는 OS 버전까지 포함됩니다. 또한 2.0은 Human Interface Guidelines, 튜토리얼, App Store Connect Help, 매개변수와 응답이 포함된 App Store Connect API 엔드포인트도 읽어옵니다.

API, 가이드라인, App Store Connect 관련 주제에 대해 질문하면, 어시스턴트가 답변하거나 코드를 작성하기 전에 전체 페이지를 먼저 읽습니다.

### 🎥 코드가 포함된 WWDC 2014–2026

WWDC26을 포함한 1,700개의 세션이 내장되어 오프라인으로 작동합니다. 1,416개 세션의 트랜스크립트(각 단락의 시작 시간 포함), 480개 세션의 챕터, 715개 세션의 코드 샘플(각 샘플이 비디오에 나타나는 시간 포함)이 제공됩니다. 세션은 Apple 웹사이트와 동일한 주제별로 분류되어 있습니다.

새로운 API가 어떻게 작동하는지 질문하면, 어시스턴트가 해당 API를 소개한 WWDC 세션과 코드를 함께 인용할 수 있습니다.

### 📋 완전한 프레임워크 목록

기존 버전의 기술 목록은 200개 항목 이후 끊겨서 전체 카테고리(Graphics and Games, Media, System, Web)가 전혀 나타나지 않았고, 심볼 검색에는 링크가 깨진 제목들이 섞여 있었습니다. 2.0은 모든 기술을 나열하고, 베타 상태인 프레임워크를 표시하며, 주제별로 프레임워크를 찾을 수 있습니다. 예를 들어 "Machine learning"을 검색하면 Core ML, Create ML, Foundation Models, Vision 등이 반환됩니다.

머신 러닝이나 오디오 등 특정 작업에 적합한 프레임워크가 무엇인지 물어보면, 어시스턴트가 전체 목록을 비교해 줍니다.

### 🛠️ 안정적인 동작을 위한 설계

최신 의존성 유지, 일반 브라우저처럼 보이면서 순서를 기다리는 요청 방식(요청이 너무 빠르면 Apple이 빈 검색 결과를 반환함), 요청 실패 시 자동 재시도, 207개의 자동화 테스트를 갖추고 있습니다. 기존 README에 있던 63개의 사용 예시가 모두 오류 없이 실행됩니다.

설정할 것이 없습니다. API 키나 계정이 필요하지 않습니다.

## ✨ 주요 기능

- 🔍 **검색**: Apple 문서, 디자인 가이드라인, 샘플 코드, App Store Connect Help, WWDC 세션을 한 번에 검색하거나 각각 단독으로 검색
- 🗺️ **Docs map**: 네트워크 요청 없이 메서드나 프로퍼티 이름을 포함한 모든 페이지를 제목으로 찾기
- 📚 **문서 페이지**: Swift 및 Objective-C API, 아티클, 튜토리얼, 웹 서비스 레퍼런스를 Markdown 형식으로 제공
- 🎨 **Human Interface Guidelines**: 모든 HIG 페이지를 검색하고 열람 가능
- 🏪 **App Store Connect Help**: 제품 페이지 필드, 심사, TestFlight, 가격 책정
- 🔧 **프레임워크 심볼**: 와일드카드를 사용하여 프레임워크의 클래스, 구조체, 프로토콜 및 멤버 탐색
- 🔗 **API 관계**: 관련 API, 유사 API, 참조된 API 및 지원 중단된 API의 대체제 제공
- 📊 **플랫폼 호환성**: 각 플랫폼에서 API가 도입되거나 지원 중단된 버전 정보 제공
- 📋 **기술 카탈로그**: 모든 Apple 프레임워크 및 기술을 카테고리별로 분류하고 베타 항목 표시
- 📰 **문서 업데이트**: 릴리스 노트, 프레임워크 업데이트 및 WWDC "What's new" 페이지
- 🎯 **기술 개요**: 앱 디자인, 게임, AI 및 머신 러닝, 데이터 등에 대한 Apple의 가이드
- 💻 **샘플 코드**: Apple 검색 순위가 적용된 모든 샘플 프로젝트, 요약 및 다운로드 링크가 포함된 프레임워크/섹션별 Sample Code Library
- 🎥 **WWDC 라이브러리**: 트랜스크립트, 시간별 코드 예제, 리소스 및 관련 세션이 포함된 2014년부터 2026년까지의 1,700개 세션을 오프라인으로 제공

## 📦 설치

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y apple-docs-2.0-mcp
```

[📖 Claude Code MCP 문서](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

`~/.cursor/mcp.json`에 추가:

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

[📖 Cursor MCP 문서](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

VS Code의 이식 가능한 포맷인 워크스페이스 루트의 `.mcp.json`에 추가:

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

[📖 VS Code MCP 문서](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

Zed의 `settings.json`에 추가:

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

[📖 Zed MCP 문서](https://zed.dev/docs/ai/mcp)

</details>

## 💬 사용 예시

### 🔍 검색
```
"SwiftUI 애니메이션 검색해줘"
"withAnimation API 문서 찾아줘"
"Human Interface Guidelines에서 탭 바 관련 내용 검색해줘"
"App Store Connect Help에서 TestFlight 외부 테스터 관련 내용 검색해줘"
"Core Data 샘플 코드 찾아줘"
```

### 🗺️ Docs Map
```
"accessibilityInputLabels 페이지 찾아줘"
"제목에 gauge가 포함된 SwiftUI 페이지는 어떤 것이 있어?"
"자동 갱신 구독을 생성하는 App Store Connect API 엔드포인트 찾아줘"
```

### 📚 문서 접근
```
"SwiftUI 프레임워크에 대한 상세 정보 가져와줘"
"withAnimation API와 관련 API 보여줘"
"NSManagedObjectContext 문서 보여줘"
"탭 바에 대한 Human Interface Guidelines 페이지 읽어줘"
"SwiftUI 튜토리얼 단계들을 보여줘"
```

### 🔧 프레임워크 탐색
```
"SwiftUI 뷰 목록 보여줘"
"모든 UIKit 델리게이트 프로토콜 나열해줘"
"WeatherKit API 계층 구조 가져와줘"
"Core ML 모델 로딩 API 탐색해줘"
```

### 🔗 API 탐색
```
"UIViewController 관련 API 찾아줘"
"UIAlertView의 대체제 찾아줘"
"SwiftData 문서의 모든 참조 정보 가져와줘"
"SwiftData의 플랫폼 호환성 정보 가져와줘"
```

### 📋 기술, 업데이트 및 개요
```
"사용 가능한 머신 러닝 프레임워크에는 어떤 것이 있어?"
"어떤 기술들이 베타 상태야?"
"SwiftUI의 새로운 기능은 뭐야?"
"Xcode 릴리스 노트 보여줘"
"데이터 관리 기술 개요 가져와줘"
```

### 💻 샘플 코드
```
"SwiftUI 샘플 코드 프로젝트 보여줘"
"머신 러닝 샘플 코드 찾아줘"
"Food Truck 샘플 가져와줘"
```

### 🎥 WWDC
```
"SwiftUI 관련 WWDC 비디오 검색해줘"
"머신 러닝 관련 WWDC 세션 찾아줘"
"WWDC 2026 비디오 보여줘"
"WWDC 트랜스크립트에서 async/await 검색해줘"
"WWDC23 Meet SwiftData 세션의 트랜스크립트 보여줘"
"SwiftData를 사용하는 WWDC 세션들의 코드 예제 가져와줘"
"WWDC23 Meet SwiftData 관련 세션 찾아줘"
"모든 WWDC 주제 나열해줘"
```

## 🛠️ 제공 도구

| 도구 | 반환 내용 |
|------|---------|
| `search_apple_docs` | Apple 검색 결과 순서대로 제목, Apple의 kind, 프레임워크, 한 줄 요약 및 링크를 반환합니다(문서, 디자인 가이드라인, 샘플 코드, App Store Connect Help, WWDC 세션). Apple 검색 페이지의 필터처럼 `type`을 지정하여 그중 하나만 검색할 수도 있습니다. |
| `search_docs_map` 🆕 | 대소문자 구분 없이 제목에 해당 텍스트가 포함된 페이지를 가장 짧은 제목 순으로 반환합니다. 각 항목에는 kind, Beta 또는 Deprecated 표시, 기술, 상위 페이지 및 링크가 포함됩니다. 특정 기술(이름 또는 ID 기준, 사이드바에 나열된 모든 페이지) 내에서나 특정 종류로 범위를 좁힐 수 있습니다. `source: "index"`를 사용하면 특정 프레임워크의 사이드바를 실시간으로 읽어와 와일드카드와 매칭합니다. |
| `get_apple_doc_content` | JSON으로부터 렌더링된 단일 문서 페이지를 Swift 또는 Objective-C 형태의 Markdown으로 반환합니다: 요약, 오버로드가 포함된 모든 선언, 개요, 코드, 해당 항목을 언급한 아티클, 프로퍼티 리스트 키 세부 정보, 각 멤버의 선언과 요약이 포함된 Topics, Relationships, See Also, Apple의 참고 사항이 포함된 사용 가능 여부 정보. 웹 서비스 엔드포인트의 경우 URL, 매개변수, 본문 및 응답. 튜토리얼의 경우 각 단계의 코드와 프로젝트 파일. 샘플의 경우 다운로드 링크. App Store Connect Help 아티클. `view` 매개변수로 API 페이지의 특정 부분만 조회할 수 있습니다: `"related"`, `"similar"`(지원 중단 안내에 명시된 페이지를 우선으로 한 대체 항목), `"references"`(요약과 함께 링크된 페이지들), `"availability"` |
| `list_technologies` | Apple의 네 가지 카탈로그: 카테고리별 모든 프레임워크 및 기술과 그 요약; 주요 샘플이 먼저 나오는 Sample Code Library; Updates 페이지의 릴리스 노트 및 업데이트 페이지; Technology Overviews의 컬렉션 및 아티클. 앞의 두 카탈로그는 전체 카탈로그가 담긴 TSV 파일명을 제공합니다. |
| `list_wwdc_videos` | 특정 연도나 주제의 WWDC 세션, 또는 제목이나 주제 이름에 해당 텍스트가 포함된 세션을 반환합니다. 각 항목에는 링크, 주제, 트랜스크립트 및 코드 포함 여부가 표시됩니다. `view: "years"`는 연도별 세션 수를 집계하고, `view: "topics"`는 주제 목록 또는 특정 주제의 세션을 나열합니다. |
| `search_wwdc_content` | 입력된 텍스트가 트랜스크립트나 코드에 포함된 WWDC 세션을 일치 항목이 많은 순서대로 반환하며, 각 구절의 시작 시간이 표시됩니다. `view: "examples"`는 텍스트가 포함된 코드 예제를 대신 나열합니다. 텍스트로 된 모든 세션이 담긴 폴더 경로를 안내합니다. |
| `get_wwdc_video` | 링크 및 다운로드, 챕터, 시간 정보가 포함된 트랜스크립트, 시간 정보가 포함된 코드 예제, 관련 세션이 포함된 단일 WWDC 세션을 반환합니다. `view: "related"`는 Apple이 해당 세션과 연관 지은 세션을 먼저 나열한 뒤, 주제를 가장 많이 공유하는 세션들을 나열합니다. |

문서 도구들은 developer.apple.com을 호출하며, WWDC 도구들은 번들된 데이터를 읽고 `search_docs_map`은 docs map을 읽으므로 둘 다 네트워크 요청 없이 작동합니다.

## 🏗️ 아키텍처

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

### 🌐 요청 및 캐싱

모든 요청은 하나의 HTTP 클라이언트를 통과합니다. Safari의 헤더를 갖춘 `fetch`를 사용하며, 분당 최대 100개의 요청을 처리하고, 검색은 15초 간격으로 한 번에 하나씩 수행합니다(더 빠르게 요청하면 Apple이 빈 결과를 반환하기 때문입니다). 각 시도에는 2분의 타임아웃이 적용되며, 네트워크 에러, 타임아웃, 5xx 응답 발생 시 백오프와 함께 최대 3회까지 재시도합니다.

Apple의 JSON은 Apple이 전송한 그대로 URL별로 캐시되어 모든 도구가 공유합니다. 다른 도구가 방금 읽은 페이지는 다시 다운로드되지 않으며, 동일한 시점에 하나의 URL로 들어온 여러 요청은 한 번의 다운로드를 공유합니다.

| 콘텐츠 | 캐시 유지 시간 |
|---------|------------|
| 페이지, 카탈로그 페이지 및 기술 목록 | 30분 |
| 사이드바(프레임워크 및 카탈로그 인덱스) | 1시간 |
| 파싱된 docs map | 사용 중일 때 유지, 30분간 유휴 상태 시 해제 |
| 검색 결과 | 캐시되지 않음 |

## 📦 WWDC 데이터

WWDC 세션은 `data/wwdc/`에 번들로 포함되어 있어, WWDC 도구가 속도 제한 없이 오프라인으로 작동합니다:

- 📹 **1,700개 세션**: 2014년부터 2026년까지, 각 단락의 시간 정보가 포함된 트랜스크립트 1,416개(Apple에서 더 이상 제공하지 않는 6개 제외 전체), 코드 예제 715개, 챕터 480개 포함
- 🏷️ **19개 주제**: Apple의 주제 페이지에서 가져옴
- 💾 **48 MB**의 JSON

`npx tsx scripts/add-wwdc-year.ts <year>` 명령어로 Apple 페이지에서 특정 연도를 추가하거나 새로고침할 수 있습니다. Apple에서 더 이상 제공하지 않는 세션도 기존에 저장된 데이터는 유지됩니다.

## 🗺️ Docs Map

`api-map/apple-docs-map.tsv`는 Apple의 네비게이터 인덱스, Human Interface Guidelines, App Store Connect Help의 네비게이션에서 가져온 336,723개 페이지(URL, 제목, kind, 기술, 그룹, 트리, 해당 기술의 ID, Beta 또는 Deprecated 표시, 사이드바에 해당 페이지가 나열된 기타 기술들)를 나열합니다. `search_docs_map`은 사용 중일 때 이를 메모리에 유지합니다. `npx tsx scripts/build-docs-map.ts api-map/apple-docs-map.tsv` 명령으로 약 10분 만에 이를 다시 빌드할 수 있습니다.

## 🧪 개발

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

빌드 후 MCP 클라이언트에서 서버를 재시작하거나 다시 연결하세요.

## 🙏 크레딧

Apple Docs 2.0 MCP는 [kimsungwhee](https://github.com/kimsungwhee)의 [Apple Docs MCP](https://github.com/kimsungwhee/apple-docs-mcp)를 기반으로 구축되었으며, 그 도구들과 WWDC 데이터, 구조에서 출발했습니다.

## 🤝 기여하기

기여는 언제나 환영합니다:

1. 저장소를 **Fork**합니다
2. 기능 브랜치를 **생성**합니다: `git checkout -b feature/amazing-feature`
3. 변경 사항을 **커밋**합니다: `git commit -m 'Add amazing feature'`
4. 브랜치로 **푸시**합니다: `git push origin feature/amazing-feature`
5. Pull Request를 **생성**합니다

## 📄 라이선스

원래 프로젝트와 동일한 MIT License가 적용됩니다. [LICENSE](LICENSE)를 참고하세요.

## ⚠️ 면책 조항

이 프로젝트는 Apple Inc.와 제휴하거나 보증을 받지 않았습니다. 교육 및 개발 목적으로 Apple의 공개 개발자 문서를 읽어옵니다.
