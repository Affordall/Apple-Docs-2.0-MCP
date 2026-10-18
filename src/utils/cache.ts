/**
 * In-memory caches, each holding at most its size and expiring entries (lru-cache). Apple's JSON is cached by URL, as
 * Apple sends it, and every tool reads through them, so a page or index another tool just read isn't downloaded again.
 */
import { LRUCache } from 'lru-cache';

import type { SampleCodeEntry } from '../tools/get-sample-code.js';
import { CACHE_SIZE, CACHE_TTL } from './constants.js';
import { httpClient } from './http-client.js';

/** A fetch lru-cache resolved without a value: only an aborted fetch does, and nothing here aborts one */
class FetchAbortedError extends Error {}

/**
 * Apple's JSON by URL, fetched once per entry's lifetime; simultaneous requests for one URL share one fetch.
 * `allowStaleOnFetchRejection` stays off: it would turn a failed fetch into `undefined`.
 */
const jsonCache = (max: number, ttl: number): LRUCache<string, object> =>
  new LRUCache<string, object>({ max, ttl, fetchMethod: (url) => httpClient.getJson<object>(url) });

/** Documentation pages, catalog pages (Updates, Technology Overviews, Sample Code) and `technologies.json` */
export const pageCache = jsonCache(CACHE_SIZE.PAGES, CACHE_TTL.PAGES);
/** Navigator indexes, a framework's or a catalog's sidebar (`/tutorials/data/index/…`), SwiftUI's 1.4 MB among them */
export const indexCache = jsonCache(CACHE_SIZE.INDEXES, CACHE_TTL.INDEXES);

/** `key`'s value through `cache`'s fetchMethod */
export async function cachedFetch<V extends object>(cache: LRUCache<string, V>, key: string): Promise<V> {
  const value = await cache.fetch(key);
  if (value === undefined) {
    throw new FetchAbortedError(`${key}: the fetch was aborted`);
  }
  return value;
}

/** The JSON at `url`, through `cache`, as the caller's type */
export async function cachedJson<T>(cache: LRUCache<string, object>, url: string): Promise<T> {
  return await cachedFetch(cache, url) as T;
}

/** The Sample Code Library's entries, read once and filtered for each request */
export const sampleCodeCache = new LRUCache<string, SampleCodeEntry[]>({
  max: 1,
  ttl: CACHE_TTL.PAGES,
});
