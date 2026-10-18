import { formatDocumentHeader, formatPlatformAvailability } from './doc-formatter.js';
import type { RenderNode } from '../types/docc.js';
import { jsonApiUrlOf } from '../utils/url-converter.js';
import { cachedJson, pageCache } from '../utils/cache.js';

/**
 * One API's availability as its page gives it: the title with Apple's Deprecated or Beta tag, then each platform with
 * the version that introduced it, a deprecation and Apple's note
 */
export async function handleGetPlatformCompatibility(apiUrl: string): Promise<string> {
  const page = await cachedJson<RenderNode>(pageCache, jsonApiUrlOf(apiUrl));
  return `${formatDocumentHeader(page)}${formatPlatformAvailability(page) || 'Apple lists no platforms for this page.\n'}`;
}
