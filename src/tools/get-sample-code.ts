import { siteUrl } from '../utils/url-converter.js';
import { APPLE_URLS } from '../utils/constants.js';
import { cachedJson, indexCache, pageCache, sampleCodeCache } from '../utils/cache.js';
import { exportPath, writeTsv } from '../utils/exports.js';
import { frameworkKey, technologyNames } from './list-technologies.js';
import type { RenderIndex, RenderIndexNode, RenderNode } from '../types/docc.js';
import { isTopicReference } from '../types/docc.js';
import { formatInlineContent } from './doc-formatter.js';

/** One entry of Apple's Sample Code Library: a sample project, or one of the few articles the library lists */
export interface SampleCodeEntry {
  title: string;
  url: string;
  kind: 'sampleCode' | 'article';
  framework: string;
  /** The library's sections the entry is filed under ("WWDC26", "SwiftUI"), in the library's order */
  sections: string[];
  summary: string;
  featured: boolean;
  beta: boolean;
}

interface SampleCodeFilters {
  framework: string | undefined;
  category: string | undefined;
  includeBeta: boolean;
  searchQuery: string | undefined;
}

type SidebarEntry = RenderIndexNode & { path: string };

const LIBRARY = 'library';
const LIBRARY_FILE = 'samples.tsv';
const LIBRARY_COLUMNS = ['title', 'url', 'framework', 'sections', 'kind', 'featured', 'beta', 'summary'] as const satisfies ReadonlyArray<keyof SampleCodeEntry>;

/**
 * Apple's Sample Code Library, filtered, in its order: featured entries first, then the library's sections. Unranked:
 * `searchQuery` keeps the entries that hold every word, and the agent greps `samples.tsv` for anything finer.
 */
export async function handleGetSampleCode(filters: SampleCodeFilters, limit: number): Promise<string> {
  const library = await loadLibrary();
  const words = (filters.searchQuery ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const found = library.filter((entry) => keeps(entry, filters) && words.every((word) => mentions(entry, word)));
  return `${formatLibrary(found.slice(0, limit), found.length, filters)}\n\n` +
    `All ${library.length} entries, one a line (${LIBRARY_COLUMNS.join(', ')}): ${exportPath(LIBRARY_FILE)}`;
}

/**
 * The library's entries in its order, read once per cache lifetime: its sidebar lists them, its page gives sections
 * and summaries
 */
async function loadLibrary(): Promise<SampleCodeEntry[]> {
  const cached = sampleCodeCache.get(LIBRARY);
  if (cached) {
    return cached;
  }
  const [page, index, names] = await Promise.all([
    cachedJson<RenderNode>(pageCache, APPLE_URLS.SAMPLE_CODE_JSON),
    cachedJson<RenderIndex>(indexCache, APPLE_URLS.SAMPLE_CODE_INDEX_JSON),
    technologyNames(),
  ]);
  const entries = [...librarySections(libraryEntries(page, index, names)).values()].flat();
  await writeTsv(LIBRARY_FILE, LIBRARY_COLUMNS, entries);
  sampleCodeCache.set(LIBRARY, entries);
  return entries;
}

function libraryEntries(page: RenderNode, index: RenderIndex, names: Map<string, string>): SampleCodeEntry[] {
  const references = page.references ?? {};
  // Apple's identifiers keep a framework's capitals ("…/AppIntents/…"); the sidebar's paths are lowercase
  const pathOf = (identifier: string): string => {
    const reference = references[identifier];
    return isTopicReference(reference) ? reference.url.toLowerCase() : '';
  };
  const featured = new Set((page.primaryContentSections ?? [])
    .flatMap((section) => ('kind' in section && section.kind === 'content' ? section.content : []))
    .flatMap((block) => ('type' in block && block.type === 'links' ? block.items : []))
    .map(pathOf));
  const sections = new Map<string, string[]>();
  for (const section of page.topicSections ?? []) {
    for (const path of section.identifiers.map(pathOf)) {
      sections.set(path, [...(sections.get(path) ?? []), section.title ?? '']);
    }
  }
  const summaries = new Map(Object.values(references).filter(isTopicReference)
    .map((reference) => [
      reference.url.toLowerCase(), formatInlineContent(reference.abstract ?? [], references).trim(),
    ]));
  // The sidebar lists an entry under each section it is in; one entry each
  const sidebar = new Map(Object.values(index.interfaceLanguages).flatMap(sidebarEntries)
    .map((node) => [node.path.toLowerCase(), node]));
  return [...sidebar.entries()].map(([path, node]): SampleCodeEntry => {
    const segment = path.split('/')[2] ?? '';
    return {
      title: node.title,
      url: siteUrl(node.path),
      kind: node.type === 'article' ? 'article' : 'sampleCode',
      framework: names.get(segment) ?? segment,
      sections: sections.get(path) ?? [],
      summary: summaries.get(path) ?? '',
      featured: featured.has(path),
      beta: node.beta === true,
    };
  });
}

/** The sidebar's samples and articles; its section headings sit beside them, its root holds them all */
function sidebarEntries(nodes: RenderIndexNode[]): SidebarEntry[] {
  return nodes.flatMap((node): SidebarEntry[] => ((node.type === 'sampleCode' || node.type === 'article') && node.path
    ? [{ ...node, path: node.path }]
    : sidebarEntries(node.children ?? [])));
}

function keeps(entry: SampleCodeEntry, filters: SampleCodeFilters): boolean {
  return (filters.includeBeta || !entry.beta) &&
    (!filters.framework || matchesFramework(entry, filters.framework)) &&
    (!filters.category || entry.sections.some((section) => section.toLowerCase().includes(filters.category?.toLowerCase() ?? '')));
}

/** A framework in any spelling ("storekit", "Store Kit"), matched against the entry's framework, title or link */
function matchesFramework(entry: SampleCodeEntry, framework: string): boolean {
  const wanted = frameworkKey(framework);
  return frameworkKey(entry.framework).includes(wanted) || frameworkKey(entry.url).includes(wanted) ||
    entry.title.toLowerCase().includes(framework.toLowerCase());
}

/** The word, lowercase, in the entry's title, sections, framework, path or summary */
function mentions(entry: SampleCodeEntry, word: string): boolean {
  return [entry.title, entry.sections.join(' '), entry.framework, new URL(entry.url).pathname, entry.summary]
    .some((field) => field.toLowerCase().includes(word));
}

function formatLibrary(entries: SampleCodeEntry[], found: number, filters: SampleCodeFilters): string {
  const applied = [
    filters.framework ? `Framework: ${filters.framework}` : '',
    filters.category ? `Section: ${filters.category}` : '',
    filters.includeBeta ? '' : 'Beta: exclude',
    filters.searchQuery ? `Search: "${filters.searchQuery}"` : '',
  ].filter(Boolean);
  const header = [
    '# Apple Sample Code Library',
    '',
    ...(applied.length > 0 ? ['## Filters Applied', applied.join(', '), ''] : []),
    `Found ${found} ${found === 1 ? 'entry' : 'entries'}${entries.length < found ? `, showing ${entries.length}` : ''}`,
    '',
  ];
  if (entries.length === 0) {
    return [...header, 'No entries match. search_apple_docs with type "sample" searches every sample on the site, ' +
      'including ones this library leaves out.'].join('\n');
  }
  const body = [...librarySections(entries).entries()]
    .flatMap(([group, members]) => [`## ${group}`, '', ...members.map(formatEntry), '']);
  return [...header, ...body].join('\n').trim();
}

/** Featured entries under their own heading, then each entry under its first section, in the library's order */
function librarySections(entries: SampleCodeEntry[]): Map<string, SampleCodeEntry[]> {
  return Map.groupBy([...entries.filter((entry) => entry.featured), ...entries.filter((entry) => !entry.featured)],
    (entry) => (entry.featured ? '⭐ Featured' : entry.sections[0] ?? 'Other'));
}

function formatEntry(entry: SampleCodeEntry): string {
  const notes = [entry.framework, entry.sections.join(', '), entry.kind === 'article' ? 'article' : '', entry.beta ? 'beta' : '']
    .filter(Boolean).join(' · ');
  return `- [${entry.title}](${entry.url}) (${notes})${entry.summary ? `: ${entry.summary}` : ''}`;
}
