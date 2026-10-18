import { formatIdentifierLine, isLinkable } from './doc-formatter.js';
import type { RenderNode } from '../types/docc.js';
import { jsonApiUrlOf } from '../utils/url-converter.js';
import { cachedJson, pageCache } from '../utils/cache.js';
import { PROCESSING_LIMITS } from '../utils/constants.js';

/**
 * The APIs one API relates to: what it inherits and conforms to and what inherits from it and conforms to it, its See
 * Also list, and the first members of each Topics group; each once, under the first group that lists it
 */
export async function handleGetRelatedApis(apiUrl: string): Promise<string> {
  const data = await cachedJson<RenderNode>(pageCache, jsonApiUrlOf(apiUrl));
  const listings = [
    ...(data.relationshipsSections ?? []).map((section) => ({ group: section.title, identifiers: section.identifiers })),
    ...(data.seeAlsoSections ?? []).map((section) => ({ group: `See Also: ${section.title ?? ''}`, identifiers: section.identifiers })),
    ...(data.topicSections ?? []).map((section) => ({
      group: `Related: ${section.title ?? ''}`,
      identifiers: section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION),
    })),
  ].flatMap(({ group, identifiers }) => identifiers
    .filter((identifier) => isLinkable(identifier, data.references))
    .map((identifier) => ({ group, identifier })));
  const related = listings.filter((listing, index) => listings.findIndex((other) => other.identifier === listing.identifier) === index);
  if (related.length === 0) {
    return `No related APIs found for: ${apiUrl}`;
  }

  const apiName = new URL(apiUrl).pathname.split('/').pop() || 'API';
  return [
    `# Related APIs for ${apiName}`,
    `**Source:** [${apiUrl}](${apiUrl})`,
    `**Found ${related.length} related APIs:**`,
    ...[...Map.groupBy(related, (listing) => listing.group)].map(([group, members]) =>
      `## ${group}\n\n${members.map((listing) => formatIdentifierLine(listing.identifier, data.references)).join('').trimEnd()}`),
  ].join('\n\n');
}
