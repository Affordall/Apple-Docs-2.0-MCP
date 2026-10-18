import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { SearchDocument } from '../types/captured/search-document.js';
import type { SearchStream } from '../types/captured/search-stream.js';
import type { ApiSearchResult, SearchResult } from './search-result-parser.js';
import { parseSearchResult } from './search-result-parser.js';
import { API_LIMITS } from '../utils/constants.js';

/**
 * The results as one list in Apple's order, each with its type
 */
function formatSearchResults(
  results: SearchResult[],
  query: string,
  filterType: string | undefined,
  searchUrl: string,
): string {
  const header = [
    '# Apple Documentation Search Results',
    '',
    `**Query:** "${query}"`,
    ...(filterType ? [`**Filter:** ${filterType}`] : []),
    `**Results found:** ${results.length}`,
    '',
  ].join('\n');
  if (results.length === 0) {
    return `${header}\nNo ${filterType ? `${filterType} ` : ''}results found for "${query}".\n\n[View search on Apple Developer](${searchUrl})`;
  }
  return `${header}\n${results.map((result, index) => formatSingleResult(result, index + 1)).join('')}${formatSearchFooter(searchUrl)}`;
}

function formatSingleResult(result: SearchResult, index: number): string {
  let content = `### ${index}. ${result.title}\n\n`;

  if (result.framework) {
    content += `**Framework:** ${result.framework}\n`;
  }
  if (result.kind) {
    content += `**Kind:** ${result.kind}\n`;
  }

  if (result.description) {
    content += `**Description:** ${result.description}\n`;
  }

  if (result.wwdc) {
    content += `**Read:** get_wwdc_video (year: "${result.wwdc.year}", videoId: "${result.wwdc.videoId}"): transcript and code\n`;
  }

  content += `**URL:** ${result.url}\n\n`;

  return content;
}

function formatSearchFooter(searchUrl: string): string {
  return `---\n\n[View all results on Apple Developer](${searchUrl})`;
}

/**
 * Replays the JSON lines Apple's search API streams, as its search page does: each `search` event takes `removeLast`
 * characters off the results document, then appends `append`
 */
export function streamedDocument(jsonl: string): string {
  let document = '';
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const event = JSON.parse(line) as SearchStream;
    if (event.kind === 'search') {
      const { append = '', removeLast = 0 } = event.diff ?? {};
      document = document.slice(0, Math.max(0, document.length - removeLast)) + append;
    }
  }
  return document;
}

function streamedResults(jsonl: string): ApiSearchResult[] {
  const document = streamedDocument(jsonl);
  return document ? (JSON.parse(document) as SearchDocument).results : [];
}

/**
 * The results of a search, in Apple's order. Mixed in with other results, WWDC sessions are capped at
 * `MAX_WWDC_RESULTS`; a search for sessions alone (`type: "video"`) shows as many as any other.
 */
export function parseSearchResults(
  stream: string,
  query: string,
  searchUrl: string,
  filterType: string | undefined,
): CallToolResult {
  const found = streamedResults(stream)
    .map(parseSearchResult)
    .filter((result): result is SearchResult => result !== null);
  // Apple lists a Help page twice, with and without a final slash; the parser drops the slash
  const parsed = found.filter((result, index) => found.findIndex((other) => other.url === result.url) === index);
  const sessionCap = filterType === 'video' ? API_LIMITS.MAX_SEARCH_RESULTS : API_LIMITS.MAX_WWDC_RESULTS;
  const sessions = parsed.filter(result => result.wwdc !== undefined).slice(0, sessionCap);
  const results = parsed
    .filter(result => result.wwdc === undefined || sessions.includes(result))
    .slice(0, API_LIMITS.MAX_SEARCH_RESULTS);

  return { content: [{ type: 'text', text: formatSearchResults(results, query, filterType, searchUrl) }] };
}
