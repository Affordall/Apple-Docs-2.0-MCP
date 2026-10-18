import type { Result } from '../types/captured/search-document.js';
import { APPLE_PATHS, WWDC_URLS } from '../utils/constants.js';
import { convertToJsonApiUrl } from '../utils/url-converter.js';

/**
 * One result of a search, in Apple's words: Apple's own kind for it, its summary and its place
 */
export interface SearchResult {
  title: string;
  url: string;
  /** Apple's kind ("symbol", "article", "sampleCode", "project") or a video's type ("Video", "Session"); a Help page has none */
  kind?: string;
  description: string;
  framework?: string;
  /** A WWDC session's year and number in the bundled WWDC data, which `get_wwdc_video` reads */
  wwdc?: { year: string; videoId: string };
}

/** One result of Apple's search API, typed by quicktype from captured responses (`npm run types:captured`) */
export type ApiSearchResult = Result;

type Metadata = NonNullable<NonNullable<ApiSearchResult['value']>['metadata']>;

/**
 * A result the tools can read: a WWDC session, which the bundled data holds; an App Store Connect Help page; or a page
 * get_apple_doc_content reads as JSON. Anything else (a forum thread, a news post) is left out. Which kinds a search
 * returns is the search's scope, which Apple applies.
 */
export function parseSearchResult(result: ApiSearchResult): SearchResult | null {
  const metadata = result.value?.metadata ?? {};
  // Apple tags most sessions "Video", some "Session" or "Special Event"; the link is a session's either way
  const link = metadata.permalinks?.[0] ?? metadata.permalink ?? '';
  if (WWDC_URLS.SESSION_LINK.test(link)) {
    return parseWWDCSession(metadata, link);
  }
  if (metadata.sourceURL?.includes(APPLE_PATHS.HELP)) {
    return parseHelpPage(metadata);
  }
  return parseDocumentationPage(metadata);
}

/**
 * A documentation, guideline, tutorial or sample-code page
 */
function parseDocumentationPage(metadata: Metadata): SearchResult | null {
  const { title, permalink, kind, description, hierarchy } = metadata;
  // A download (a sample's zip) isn't a page
  if (!title || !permalink || convertToJsonApiUrl(permalink) === null || permalink.includes('.zip')) {
    return null;
  }
  return { title, url: permalink, kind, description: description ?? '', framework: hierarchy?.split(' > ')[0] };
}

/**
 * An App Store Connect Help page, whose title carries its place and the product: "Platform version information - App
 * information - Reference - App Store Connect - Help". Apple lists each page twice, with and without a final slash.
 */
function parseHelpPage(metadata: Metadata): SearchResult | null {
  const parts = (metadata.title ?? '').split(' - ');
  const product = parts.slice(-2).join(' ');
  const [section] = parts.slice(1, -2);
  if (!product || !metadata.sourceURL) {
    return null;
  }
  return {
    // The help's own front page is titled with the product alone
    title: parts.length > 2 ? parts[0] ?? '' : product,
    url: metadata.sourceURL.replace(/\/$/, ''),
    description: metadata.description ?? '',
    framework: section ? `${product} › ${section}` : product,
  };
}

/**
 * A WWDC session, which the bundled WWDC data holds, transcript and code
 */
function parseWWDCSession(metadata: Metadata, link: string): SearchResult | null {
  const [, year, videoId] = WWDC_URLS.SESSION_LINK.exec(link) ?? [];
  const title = metadata.titles?.[0] ?? metadata.title;
  if (!year || !videoId || !title) {
    return null;
  }
  return {
    title,
    url: link,
    kind: metadata.itemTypes?.[0],
    description: metadata.descriptions?.[0] ?? metadata.description ?? '',
    wwdc: { year, videoId },
  };
}
