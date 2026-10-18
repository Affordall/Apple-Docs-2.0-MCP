import { formatIdentifierLine } from './doc-formatter.js';
import type { RenderNode } from '../types/docc.js';
import { isTopicReference } from '../types/docc.js';
import { jsonApiUrlOf } from '../utils/url-converter.js';
import { cachedJson, pageCache } from '../utils/cache.js';

type References = RenderNode['references'];

/**
 * The pages one page links to, each with its summary, by Apple's role for it: the page's lists first, as its page shows
 * them, then the references in its text; `filterByType` keeps one role, kind or type
 */
export async function handleResolveReferencesBatch(sourceUrl: string, maxReferences: number,
  filterByType: string): Promise<string> {
  const data = await cachedJson<RenderNode>(pageCache, jsonApiUrlOf(sourceUrl));
  const references = data.references ?? {};
  if (Object.keys(references).length === 0) {
    return `No references found in: ${sourceUrl}`;
  }

  // The page itself isn't one of them
  const named = [...new Set([
    ...namedIn([data.topicSections, data.relationshipsSections, data.seeAlsoSections], references),
    ...namedIn([data.abstract, data.primaryContentSections], references),
  ])];
  const resolved = named.flatMap((identifier) => {
    const ref = references[identifier];
    return identifier !== data.identifier.url && isTopicReference(ref) &&
      (filterByType === 'all' || [ref.role, ref.kind, ref.type].some((value) => value === filterByType))
      ? [{ identifier, role: ref.role || 'unknown' }]
      : [];
  }).slice(0, maxReferences);
  if (resolved.length === 0) {
    return `No references could be resolved from: ${sourceUrl}`;
  }

  const title = data.metadata?.title || new URL(sourceUrl).pathname.split('/').pop() || 'Document';
  return [
    `# References from ${title}`,
    `**Source:** [${sourceUrl}](${sourceUrl})`,
    `**Resolved ${resolved.length} references:**`,
    // Apple's own role for the linked page ("symbol", "collection", "article", "sampleCode")
    ...[...Map.groupBy(resolved, (entry) => entry.role)].map(([role, entries]) =>
      `## ${role} (${entries.length})\n\n${entries.map((entry) => formatIdentifierLine(entry.identifier, references)).join('').trimEnd()}`),
  ].join('\n\n');
}

/** The references a part of the page names, in its order: the identifiers its lists and its inline links give */
function namedIn(value: unknown, references: References): string[] {
  if (typeof value === 'string') {
    return references?.[value] ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => namedIn(item, references));
  }
  return value && typeof value === 'object' ? Object.values(value).flatMap((child) => namedIn(child, references)) : [];
}
