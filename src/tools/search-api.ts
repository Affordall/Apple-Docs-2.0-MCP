/**
 * The requests search_apple_docs sends to Apple's search API, the one developer.apple.com/search calls: the search page
 * fills itself in the browser from this API, so its HTML holds no results
 * (https://github.com/kimsungwhee/apple-docs-mcp/issues/51).
 */
import Bottleneck from 'bottleneck';

import { APPLE_PATHS, APPLE_URLS, RATE_LIMIT } from '../utils/constants.js';
import { httpClient } from '../utils/http-client.js';

/**
 * Searches one at a time, 15 s apart: Apple's search API answers quicker ones with no results (2026-10-06). Per server
 * process: two sessions searching at once each keep their own spacing.
 */
const searchLimiter = new Bottleneck({ maxConcurrent: 1, minTime: RATE_LIMIT.SEARCH_SPACING_MS });

const developerPath = (pathPrefix: string) => ({
  kind: 'and',
  scopes: [{ kind: 'hostname', value: new URL(APPLE_URLS.BASE).hostname }, { kind: 'pathPrefix', value: pathPrefix }],
});

/**
 * Search scopes by `type`, built the way Apple's search page builds its filters
 * (developer.apple.com/search/scripts/search.js); the types search_apple_docs takes are these keys. With no `type`, the
 * search goes unscoped, as the page sends it with no filter. `video` keeps the WWDC sessions, which the bundled WWDC data
 * holds in full.
 */
export const SEARCH_SCOPES = {
  documentation: developerPath(APPLE_PATHS.DOCUMENTATION),
  design: developerPath(APPLE_PATHS.DESIGN),
  sample: { kind: 'documentationRole', value: 'sampleCode' },
  help: developerPath(APPLE_PATHS.HELP),
  video: developerPath(APPLE_PATHS.SESSIONS),
};

export type SearchType = keyof typeof SEARCH_SCOPES;

/**
 * The response stream of one search, read to its end
 */
export function searchStream(query: string, type: SearchType | undefined): Promise<string> {
  const searchScope = type === undefined ? undefined : SEARCH_SCOPES[type];
  return httpClient.postText(APPLE_URLS.SEARCH_API, {
    text: query,
    targetResultLocale: 'en',
    includedResponses: ['search'],
    ...(searchScope && { searchScope }),
  }, 'application/jsonl', { limiter: searchLimiter });
}
