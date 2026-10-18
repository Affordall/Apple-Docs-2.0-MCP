/**
 * Every request to Apple: fetch with a Safari's headers, retried with backoff by p-retry, paced by Bottleneck.
 */
import Bottleneck from 'bottleneck';
import { HeaderGenerator } from 'header-generator';
import pRetry, { AbortError } from 'p-retry';

import { RATE_LIMIT, REQUEST_CONFIG } from './constants.js';

interface RequestOptions {
  retries?: number;
  /** Paces this request instead of the shared limit */
  limiter?: Bottleneck;
}

/** Safari on a Mac, drawn from header-generator's model of real browser traffic: a new set for each request */
const headerGenerator = new HeaderGenerator({
  browsers: ['safari'], operatingSystems: ['macos'], devices: ['desktop'], locales: ['en-US', 'en'], httpVersion: '1',
});

/** A fresh Safari header set, with the request's own headers (its Accept, its Content-Type) in place of the generated ones */
function browserHeaders(own: HeadersInit | undefined): Headers {
  const headers = new Headers(headerGenerator.getHeaders());
  new Headers(own).forEach((value, name) => headers.set(name, value));
  return headers;
}

/** At most `MAX_REQUESTS_PER_MINUTE` requests a minute; past that, requests wait their turn */
const limiter = new Bottleneck({
  reservoir: RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
  reservoirRefreshAmount: RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
  reservoirRefreshInterval: RATE_LIMIT.WINDOW_MS,
});

/** An answer that is not 2xx: the request, and the status Apple answered it with */
export class HttpStatusError extends Error {
  constructor(readonly method: string, readonly url: string, readonly status: number, readonly statusText: string) {
    super(`${method} ${url}: HTTP ${status} ${statusText}`);
    this.name = 'HttpStatusError';
  }
}

/** An answer that isn't JSON where JSON was asked for, an HTML page most often: the request and how the answer starts */
class NotJsonError extends Error {
  constructor(readonly method: string, readonly url: string, readonly answerStart: string, cause: unknown) {
    super(`${method} ${url}: the answer isn't JSON; it starts ${JSON.stringify(answerStart)}`, { cause });
    this.name = 'NotJsonError';
  }
}

/** A request that got no answer for good (a network error or a timeout, on every attempt): the request and why */
export class RequestFailedError extends Error {
  constructor(readonly method: string, readonly url: string, cause: unknown) {
    super(`${method} ${url}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = 'RequestFailedError';
  }
}

/**
 * One request, its body read by `read` inside the attempt. Each attempt has its own timeout: Apple ends a search's
 * stream once its results are ready, so the timeout only catches a request that hangs. Network errors, timeouts and
 * 5xx answers retry with backoff, a warning each; any other status fails at once.
 */
async function request<T>(
  url: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
  options: RequestOptions | undefined,
): Promise<T> {
  const method = init.method ?? 'GET';
  try {
    return await pRetry(async () => {
      const response = await (options?.limiter ?? limiter).schedule(() => fetch(url, {
        ...init,
        headers: browserHeaders(init.headers),
        signal: AbortSignal.timeout(REQUEST_CONFIG.TIMEOUT),
      }));
      if (!response.ok) {
        const error = new HttpStatusError(method, url, response.status, response.statusText);
        throw response.status >= 500 ? error : new AbortError(error);
      }
      return await read(response);
    }, {
      retries: options?.retries ?? REQUEST_CONFIG.MAX_RETRIES,
      minTimeout: REQUEST_CONFIG.RETRY_DELAY,
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        if (retriesLeft > 0) {
          console.error('Request failed, retrying', { method, url, attempt: attemptNumber, retriesLeft, error: error.message });
        }
      },
    });
  } catch (error) {
    // p-retry rejects with the error an AbortError carried, so a status Apple answered arrives as it is
    if (error instanceof HttpStatusError) {
      throw error;
    }
    throw new RequestFailedError(method, url, error);
  }
}

export const httpClient = {
  /** The response, its body left for the caller to read */
  get: (url: string, options?: RequestOptions): Promise<Response> =>
    request(url, {}, async response => response, options),

  /** The text is read inside the retries, which a network error ends; it's parsed after them, once */
  getJson: async <T>(url: string, options?: RequestOptions): Promise<T> => {
    const text = await request(url, {}, response => response.text(), options);
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new NotJsonError('GET', url, text.slice(0, 80), error);
    }
  },

  getText: (url: string, options?: RequestOptions): Promise<string> =>
    request(url, {}, response => response.text(), options),

  /** A POST with a JSON body, read to the end: a search's stream ends once its results are ready */
  postText: (url: string, body: unknown, accept: string, options?: RequestOptions): Promise<string> =>
    request(url, {
      method: 'POST',
      headers: { Accept: accept, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, response => response.text(), options),
};
