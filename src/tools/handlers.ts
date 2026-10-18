/**
 * Every tool the server offers, registered with its zod schema: the SDK lists it, checks a call's arguments against the
 * schema, and answers an unknown tool, bad arguments or a thrown error with an error result.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { getAppleDocContentSchema } from '../schemas/doc-content.schema.js';
import { indexKindSchema, searchDocsMapSchema } from '../schemas/docs-map.schema.js';
import { searchAppleDocsSchema } from '../schemas/search.schema.js';
import { listTechnologiesSchema } from '../schemas/technologies.schema.js';
import { listWWDCVideosSchema, searchWWDCContentSchema, getWWDCVideoSchema } from '../schemas/wwdc.schemas.js';
import { API_LIMITS, APPLE_URLS, RATE_LIMIT, WWDC_CONFIG } from '../utils/constants.js';
import { fetchAppleDocJson } from './doc-fetcher.js';
import { handleFindSimilarApis } from './find-similar-apis.js';
import { handleGetDocumentationUpdates } from './get-documentation-updates.js';
import { handleGetPlatformCompatibility } from './get-platform-compatibility.js';
import { handleGetRelatedApis } from './get-related-apis.js';
import { handleGetSampleCode } from './get-sample-code.js';
import { handleGetTechnologyOverviews } from './get-technology-overviews.js';
import { handleListTechnologies } from './list-technologies.js';
import { handleResolveReferencesBatch } from './resolve-references-batch.js';
import { searchStream } from './search-api.js';
import { searchFrameworkSymbols } from './search-framework-symbols.js';
import { parseSearchResults } from './search-parser.js';
import {
  handleBrowseWWDCTopics,
  handleFindRelatedWWDCVideos,
  handleGetWWDCCodeExamples,
  handleGetWWDCVideo,
  handleListWWDCVideos,
  handleListWWDCYears,
  handleSearchWWDCContent,
} from './wwdc/wwdc-handlers.js';
import { handleSearchDocsMap } from './search-docs-map.js';

/** A tool's answer: its Markdown as the one text item. A failure is thrown, and the SDK answers it with `isError`. */
const text = (result: string): CallToolResult => ({ content: [{ type: 'text', text: result }] });

/** A view of a page asked for in Objective-C: the views read the Swift page */
class ViewLanguageError extends Error {}

/** The index source given no framework, or several: it reads one framework's sidebar */
class IndexFrameworkError extends Error {}

export function registerTools(server: McpServer): void {
  server.registerTool('search_apple_docs', {
    title: 'Search Apple Docs',
    description: `Search Apple's developer site the way developer.apple.com/search does, best match first: API reference, articles, sample code, the Human Interface Guidelines, App Store Connect Help and WWDC sessions. Use it to find pages by what they do or are about ("SwiftUI haptic feedback", "TestFlight external testers"); for a name you already know, search_docs_map answers at once. Returns links, each with its title, framework, kind and one-line summary; read a page with get_apple_doc_content, a session with get_wwdc_video. For sample code, type "sample" ranks every sample project on the site, including ones Apple's Sample Code Library doesn't list; for WWDC sessions, type "video". Searches run one at a time, ${RATE_LIMIT.SEARCH_SPACING_MS / 1000} s apart, so several in a row are slow.`,
    inputSchema: searchAppleDocsSchema,
    annotations: { readOnlyHint: true },
  }, async ({ query, type }) => parseSearchResults(await searchStream(query, type), query,
    `${APPLE_URLS.SEARCH}?q=${encodeURIComponent(query)}`, type));

  server.registerTool('get_apple_doc_content', {
    title: 'Get Apple Doc Content',
    description: "Read one page of Apple's developer documentation by its URL: an API, article, sample project, tutorial, Human Interface Guidelines page, App Store Connect Help article or web-service endpoint (App Store Connect API, App Store Server API and the like). Returns the whole page as Markdown: summary, declarations, overview with its code, each member with its declaration and summary, relationships, the versions it's available in on each platform with Apple's notes, and See Also; for a sample, its Download link; for a tutorial, its steps with their code; for an endpoint, its URL, parameters and responses. Use it on a search result's link or a URL you already have; language \"occ\" reads an API's Objective-C version. A view answers one question about an API in less: \"related\" (what it inherits, conforms to and lists, with summaries), \"similar\" (what to use instead, led by the pages its deprecation note names), \"references\" (the pages it links to, with their summaries) or \"availability\" (the versions that introduced and deprecated it on each platform).",
    inputSchema: getAppleDocContentSchema,
    annotations: { readOnlyHint: true },
  }, async ({ url, language, view, searchDepth, maxReferences, filterByType }) => {
    if (view !== 'page' && language !== 'swift') {
      throw new ViewLanguageError(`view "${view}" reads the Swift page; leave language out, or read the page with view "page"`);
    }
    // Each view runs the tool it replaced, with that tool's defaults for what it took and no past call set
    switch (view) {
      case 'related':
        return text(await handleGetRelatedApis(url));
      case 'similar':
        return text(await handleFindSimilarApis(url, searchDepth));
      case 'references':
        return text(await handleResolveReferencesBatch(url, maxReferences, filterByType));
      case 'availability':
        return text(await handleGetPlatformCompatibility(url));
      case 'page':
        return fetchAppleDocJson(url, language);
    }
  });

  server.registerTool('list_technologies', {
    title: 'List Technologies',
    description: "Browse four of Apple's catalogs. catalog \"technologies\": every Apple framework and technology, grouped by Apple's categories, each with its link, languages, tags and Apple's one-line summary, beta ones marked; use it to see which frameworks fit a task (category \"Machine learning\") or to get a framework's exact name and link. catalog \"samples\": Apple's Sample Code Library, each sample with its framework, sections and summary, featured ones first, then by the library's sections (\"WWDC26\" holds that year's); to find a sample by what it does, search_apple_docs with type \"sample\" ranks every sample on the site, including ones this library leaves out. catalog \"updates\": Apple's Updates page as links with summaries, each framework's updates page (\"SwiftUI updates\"), the release notes of each OS, Xcode and Safari, and each past WWDC's What's new page; use it to find what changed in a framework or a release. catalog \"overviews\": Apple's Technology Overviews, guides to which technologies to use for a goal (app design and UI, Liquid Glass, games, AI and machine learning and more), the collections with their summaries and the articles in each; use it to choose an approach before choosing APIs. Read any entry with get_apple_doc_content. The technologies and samples answers also name a TSV of the whole catalog, one entry a line, for a grep the parameters can't make.",
    inputSchema: listTechnologiesSchema,
    annotations: { readOnlyHint: true },
  }, async ({ catalog, category, language, framework, technology, searchQuery, includeBeta, includeSubcategories, limit }) => {
    switch (catalog) {
      case 'samples':
        return text(await handleGetSampleCode({ framework, category, includeBeta, searchQuery },
          limit ?? API_LIMITS.DEFAULT_SAMPLE_CODE_LIMIT));
      case 'updates':
        return text(await handleGetDocumentationUpdates(category, technology, undefined, searchQuery, includeBeta,
          limit ?? API_LIMITS.DEFAULT_DOCUMENTATION_UPDATES_LIMIT));
      case 'overviews':
        return text(await handleGetTechnologyOverviews(category, searchQuery, includeSubcategories,
          limit ?? API_LIMITS.DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT));
      case 'technologies':
        return text(await handleListTechnologies(category, language, includeBeta,
          limit ?? API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT));
    }
  });

  server.registerTool('search_docs_map', {
    title: 'Search Docs Map',
    description: "Find any page of Apple's documentation by its title, at once: API symbols (types, methods, properties, enum cases, macros), articles, samples, web-service endpoints, Info.plist and entitlement keys, Human Interface Guidelines and App Store Connect Help pages. Use it when you know a name or part of one, from code, an error or another page. Returns each match's title, kind, Beta or Deprecated mark, technology, the page it sits under (which tells same-named members apart) and link, shortest titles first; read one with get_apple_doc_content. It matches titles only, so to search by what something does, use search_apple_docs. Pages Apple added after the map's date, given in each answer, are missing: source \"index\" reads one framework's sidebar live and matches a wildcard (\"*View\" structs in SwiftUI, \"*Delegate\" protocols in UIKit), to see a family of APIs or what's newer than the map, without summaries.",
    inputSchema: searchDocsMapSchema,
    annotations: { readOnlyHint: true },
  }, async ({ source, query, technology, kind, limit }) => {
    if (source === 'map') {
      return text(await handleSearchDocsMap(query, technology, kind, limit ?? API_LIMITS.DEFAULT_DOCS_MAP_LIMIT));
    }
    const [framework, ...others] = technology ?? [];
    if (!framework || others.length > 0) {
      throw new IndexFrameworkError('source "index" reads one framework\'s sidebar: give technology one name, as ["SwiftUI"]');
    }
    return text(await searchFrameworkSymbols(framework, indexKindSchema.parse(kind), query,
      limit ?? API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT));
  });

  server.registerTool('list_wwdc_videos', {
    title: 'List WWDC Videos',
    description: 'List WWDC sessions, every year since 2014, by year, topic or text in the title or topic names: each with its title, link, topics, and whether it has a transcript and code, newest year first. Use it to browse sessions; search_wwdc_content finds what sessions said or showed, and get_wwdc_video reads one. view "years" counts each year\'s sessions; view "topics" lists the WWDC topics with their IDs and session counts, or one topic\'s sessions.',
    inputSchema: listWWDCVideosSchema,
    annotations: { readOnlyHint: true },
  }, async ({ view, year, topic, hasCode, includeVideos, limit }) => text(await (view === 'years'
    ? handleListWWDCYears()
    : view === 'topics'
      ? handleBrowseWWDCTopics(topic, includeVideos, year, limit ?? WWDC_CONFIG.DEFAULT_TOPIC_VIDEOS_LIMIT)
      : handleListWWDCVideos(year, topic, hasCode, limit ?? WWDC_CONFIG.DEFAULT_VIDEO_LIMIT))));

  server.registerTool('search_wwdc_content', {
    title: 'Search WWDC Content',
    description: 'Search what WWDC sessions said and showed, every year since 2014: the full text of their transcripts and their code. Returns the sessions whose transcript or code contains the query, most matches first, each with its count of matches and its first matching passages and code excerpts, with the time each comes up. Use it to find the sessions that cover an API or a technique; read one with get_wwdc_video. view "examples" lists the code itself instead: each example that contains query (pass the type or attribute the code uses, "LanguageModelSession", "@Generable"), with its session, year and time, newest year first. The answer also names a folder of every session as text, for a grep across sessions.',
    inputSchema: searchWWDCContentSchema,
    annotations: { readOnlyHint: true },
  }, async ({ view, query, searchIn, year, topic, limit }) => text(await (view === 'examples'
    ? handleGetWWDCCodeExamples(query, topic, year, limit ?? WWDC_CONFIG.DEFAULT_CODE_EXAMPLES_LIMIT)
    : handleSearchWWDCContent(query, searchIn, year, limit ?? WWDC_CONFIG.DEFAULT_SEARCH_LIMIT))));

  server.registerTool('get_wwdc_video', {
    title: 'Get WWDC Video',
    description: 'One WWDC session: its title, year and topics; its links, including the video downloads and the documentation it covers; its chapters; the full transcript, each paragraph with its time; every code example with the time it appears; and the sessions Apple lists as related. Transcripts are long: set includeTranscript to false when you need only the code or the links. view "related" lists the sessions related to it instead: those Apple lists, then, across every year, those that share the most of its topics.',
    inputSchema: getWWDCVideoSchema,
    annotations: { readOnlyHint: true },
  }, async ({ view, year, videoId, includeTranscript, includeCode, limit }) => text(await (view === 'related'
    ? handleFindRelatedWWDCVideos(videoId, year, limit)
    : handleGetWWDCVideo(year, videoId, includeTranscript, includeCode))));
}
