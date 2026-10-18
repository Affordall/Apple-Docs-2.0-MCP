/**
 * Captures complete responses of the endpoints Swift-DocC's specs do not cover, requested the way the tools request
 * them, for quicktype to type (`npm run types:captured`): Apple's search API (each stream as received, its messages as
 * one JSON array, and the document they build) and the technologies page; and a WWDC session's page, which the
 * extractor's tests read.
 */
import { mkdir, writeFile } from 'node:fs/promises';

import { searchStream } from '../src/tools/search-api.js';
import type { SearchType } from '../src/tools/search-api.js';
import { streamedDocument } from '../src/tools/search-parser.js';
import { APPLE_URLS, WWDC_URLS } from '../src/utils/constants.js';
import { httpClient } from '../src/utils/http-client.js';

/** One search per kind of result: everything, WWDC sessions, guidelines, sample code, API reference, App Store Connect Help */
const SEARCHES: Array<[name: string, query: string, type: SearchType | undefined]> = [
  ['navigationstack', 'NavigationStack', undefined],
  ['navigationstack-video', 'NavigationStack', 'video'],
  ['tab-bars-design', 'tab bars', 'design'],
  ['food-truck-sample', 'Food Truck', 'sample'],
  ['urlsession-documentation', 'URLSession', 'documentation'],
  ['promotional-text-help', 'promotional text', 'help'],
];
const OUT = 'api-map/responses';

await mkdir(OUT, { recursive: true });
for (const [name, query, type] of SEARCHES) {
  const stream = await searchStream(query, type);
  const file = `${OUT}/${name}`;
  await writeFile(`${file}.jsonl`, stream);
  await writeFile(`${file}.messages.json`, JSON.stringify(stream.trim().split('\n').map(line => JSON.parse(line) as unknown)));
  await writeFile(`${file}.document.json`, streamedDocument(stream));
}
await writeFile(`${OUT}/technologies.json`, await (await httpClient.get(APPLE_URLS.TECHNOLOGIES_JSON)).text());
/** A session with chapters and a timed transcript, as the extractor fetches it */
const SESSION_PAGE = { url: WWDC_URLS.getVideoUrl('2025', '219'), file: `${OUT}/wwdc2025-219.html` };
await writeFile(SESSION_PAGE.file, await (await httpClient.get(SESSION_PAGE.url)).text());
