import type { RenderBlockContent, RenderInlineContent, RenderNode, TasksGroupSection } from '../types/docc.js';
import { docUrl, formatIdentifierLine, formatInlineContent, formatIntroducedVersion, isLinkable, referenceUrl } from './doc-formatter.js';
import { jsonApiUrlOf } from '../utils/url-converter.js';
import { cachedJson, pageCache } from '../utils/cache.js';
import { PROCESSING_LIMITS, SEARCH_DEPTH_LIMITS } from '../utils/constants.js';

type References = RenderNode['references'];

/** An API a page lists: the group it's under, and the references of that page, which describe it */
interface Listing {
  group: string;
  identifier: string;
  references: References;
}

/**
 * What to use instead of an API or beside it, in this order, which is the ranking: the replacements its deprecation note
 * names, its See Also list, members of its Topics groups ("medium" and "deep"), then the See Also lists of the first
 * results ("deep")
 */
export async function handleFindSimilarApis(apiUrl: string, searchDepth: string): Promise<string> {
  const { data, references } = await readPage(jsonApiUrlOf(apiUrl));
  const deprecation = paragraphsOf(data.deprecationSummary ?? []);
  const listings = [
    ...deprecation.flat().flatMap((inline) => (inline.type === 'reference'
      ? [{ group: 'Replacement: Named in the deprecation note', identifier: inline.identifier, references }]
      : [])),
    ...listed(data.seeAlsoSections ?? [], 'See Also', references, Infinity),
    ...(searchDepth === 'medium' || searchDepth === 'deep'
      ? listed(data.topicSections ?? [], 'Topic Group', references, PROCESSING_LIMITS.MAX_TOPIC_IDENTIFIERS)
      : []),
  ].filter((listing) => isLinkable(listing.identifier, listing.references));
  const all = searchDepth === 'deep'
    ? [...listings, ...await deepListings(listings.slice(0, PROCESSING_LIMITS.MAX_SIMILAR_APIS_FOR_DEEP_SEARCH))]
    : listings;
  // Each API once, where it first comes
  const similar = all.filter((listing, index) => all.findIndex((other) => other.identifier === listing.identifier) === index)
    .slice(0, SEARCH_DEPTH_LIMITS[searchDepth as keyof typeof SEARCH_DEPTH_LIMITS] || SEARCH_DEPTH_LIMITS.medium);

  const note = deprecation.map((inline) => formatInlineContent(inline, references)).join(' ').trim();
  const heading = [`# Similar APIs to ${data.metadata?.title ?? 'API'}`, ...(note ? [`**Deprecated:** ${note}`] : [])];
  if (similar.length === 0) {
    return [...heading, 'No similar APIs found'].join('\n\n');
  }
  const role = data.metadata?.roleHeading ?? '';
  const platforms = (data.metadata?.platforms ?? []).map((platform) => `${platform.name}${formatIntroducedVersion(platform)}`).join(', ');
  return [
    ...heading,
    ...(role || platforms ? [`${role}${platforms ? ` · ${platforms}` : ''}`] : []),
    `**Source:** [${apiUrl}](${apiUrl})`,
    `**Found ${similar.length} similar APIs, the closest first:**`,
    ...[...Map.groupBy(similar, (listing) => listing.group)].map(([group, members]) =>
      `## ${group}\n\n${members.map((listing) => formatIdentifierLine(listing.identifier, listing.references)).join('').trimEnd()}`),
  ].join('\n\n');
}

/** A page's JSON, which may come wrapped in `data` with its references beside it */
async function readPage(url: string): Promise<{ data: RenderNode; references: References }> {
  const response = await cachedJson<RenderNode & { data?: RenderNode }>(pageCache, url);
  const data = response.data ?? response;
  return { data, references: response.references ?? data.references };
}

/** The inline content of each paragraph among blocks */
function paragraphsOf(blocks: RenderBlockContent[]): RenderInlineContent[][] {
  return blocks.flatMap(block => ('type' in block && block.type === 'paragraph' ? [block.inlineContent] : []));
}

/** The first `count` APIs of each group, grouped as "<kind>: <group title>" */
function listed(sections: TasksGroupSection[], kind: string, references: References, count: number): Listing[] {
  return sections.flatMap((section) => section.identifiers.slice(0, count)
    .map((identifier) => ({ group: `${kind}: ${section.title ?? ''}`, identifier, references })));
}

/** The See Also lists of the seeds' pages, read together through the shared cache */
async function deepListings(seeds: Listing[]): Promise<Listing[]> {
  const lists = await Promise.all(seeds.map(async (seed): Promise<Listing[]> => {
    const url = referenceUrl(seed.references?.[seed.identifier]) ?? docUrl(seed.identifier);
    try {
      const { data, references } = await readPage(jsonApiUrlOf(url));
      return listed(data.seeAlsoSections ?? [], 'Deep Related', references, Infinity)
        .filter((listing) => isLinkable(listing.identifier, listing.references));
    } catch (error) {
      // One related page that fails (a stale link) leaves the others' results
      console.error('Skipped a related page that failed', { url, error });
      return [];
    }
  }));
  return lists.flat();
}
