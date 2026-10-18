import { siteUrl } from '../utils/url-converter.js';
import { formatInlineContent } from './doc-formatter.js';
import { technologyNames } from './list-technologies.js';
import type { RenderIndex, RenderIndexNode, RenderNode } from '../types/docc.js';
import { isTopicReference } from '../types/docc.js';
import { cachedJson, indexCache, pageCache } from '../utils/cache.js';
import { APPLE_PATHS, APPLE_URLS } from '../utils/constants.js';

/**
 * Apple's Updates page as links, filtered, under the page's own sections ("Release notes", "Technology and
 * frameworks", "Past releases")
 */
export async function handleGetDocumentationUpdates(
  category: string | undefined,
  technology: string | undefined,
  year: string | undefined,
  searchQuery: string | undefined,
  includeBeta: boolean,
  limit: number,
): Promise<string> {
  const [updatesData, updatesIndex, names] = await Promise.all([
    cachedJson<RenderNode>(pageCache, APPLE_URLS.UPDATES_JSON),
    cachedJson<RenderIndex>(indexCache, APPLE_URLS.UPDATES_INDEX_JSON),
    technologyNames(),
  ]);
  const updates = parseUpdates(updatesData, updatesIndex, names);
  const sections = [...new Set(updates.map((update) => update.section))];
  if (category && !sections.some((section) => section.toLowerCase().includes(category.toLowerCase()))) {
    return `No section of Apple's Updates page has "${category}" in its title. Sections: ${sections.join(', ')}.`;
  }
  const filters = { category, technology, year, searchQuery, includeBeta, limit };
  return formatUpdatesList(applyUpdatesFilters(updates, filters));
}

/** Where the frameworks' updates pages sit, each named by its framework's ID */
const UPDATES_PATH = `${APPLE_PATHS.DOCUMENTATION}updates/`;

/**
 * The page's entries in its order, each under its section; the sidebar marks the beta ones, matched by exact path, and
 * a framework's updates page ("/documentation/updates/swiftui") is named as Apple names the framework
 */
function parseUpdates(updatesData: RenderNode, updatesIndex: RenderIndex, names: Map<string, string>): UpdateItem[] {
  const references = updatesData.references ?? {};
  const nodes = (list: RenderIndexNode[]): RenderIndexNode[] =>
    list.flatMap((node) => [node, ...nodes(node.children ?? [])]);
  const sidebar = new Map(nodes(updatesIndex.interfaceLanguages.swift ?? [])
    .map((node) => [node.path?.toLowerCase(), node]));
  return (updatesData.topicSections ?? []).flatMap((section) =>
    section.identifiers.flatMap((identifier): UpdateItem[] => {
      const reference = references[identifier];
      if (!isTopicReference(reference)) {
        return [];
      }
      const path = reference.url.toLowerCase();
      const wwdc = /^WWDC(\d{2,4})\b/.exec(reference.title)?.[1];
      return [{
        title: reference.title,
        url: siteUrl(reference.url),
        description: formatInlineContent(reference.abstract ?? [], references).trim(),
        section: section.title ?? '',
        technology: path.startsWith(UPDATES_PATH) ? names.get(path.slice(UPDATES_PATH.length)) : undefined,
        year: wwdc && (wwdc.length === 2 ? `20${wwdc}` : wwdc),
        beta: reference.beta === true || sidebar.get(path)?.beta === true,
        images: reference.images,
      }];
    }));
}

function applyUpdatesFilters(
  updates: UpdateItem[],
  filters: {
    category: string | undefined;
    technology: string | undefined;
    year: string | undefined;
    searchQuery: string | undefined;
    includeBeta: boolean;
    limit: number;
  },
): UpdateItem[] {
  const contains = (text: string | undefined, part: string): boolean => (text ?? '').toLowerCase().includes(part.toLowerCase());
  const { category, technology, year, searchQuery } = filters;
  return updates.filter((update) =>
    (!category || contains(update.section, category)) &&
    (!technology || [update.technology, update.title, update.description].some((text) => contains(text, technology))) &&
    (!year || update.year === year) &&
    (!searchQuery || contains(update.title, searchQuery) || contains(update.description, searchQuery)) &&
    (filters.includeBeta || !update.beta))
    .slice(0, filters.limit);
}

function formatUpdatesList(updates: UpdateItem[]): string {
  if (updates.length === 0) {
    return 'No documentation updates found matching the specified criteria.';
  }

  let content = '# Apple Developer Documentation Updates\n\n';

  // The page's sections, in its order
  const grouped = Map.groupBy(updates, (update) => update.section);

  grouped.forEach((items, section) => {
    content += `## ${section}\n\n`;


    items.forEach(item => {
      let titleLine = `### [${item.title}](${item.url})`;

      const badges = [];
      if (item.beta) {
        badges.push('Beta');
      }
      if (item.images?.some(img => img.identifier === 'new.svg')) {
        badges.push('New');
      }

      if (badges.length > 0) {
        titleLine += ` *${badges.join(' | ')}*`;
      }

      content += titleLine + '\n';

      if (item.description) {
        content += `${item.description}\n`;
      }

      if (item.year) {
        content += `*Year: ${item.year}*\n`;
      }

      content += '\n';
    });
  });

  content += '\n---\n\n[View all updates on Apple Developer](https://developer.apple.com/documentation/updates)';

  return content;
}

/** One entry of the Updates page */
interface UpdateItem {
  title: string;
  url: string;
  description: string;
  /** The page's section the entry is listed under, by Apple's title */
  section: string;
  /** The framework a framework's updates page is about, as Apple names it */
  technology: string | undefined;
  /** A WWDC's year, from its title ("WWDC25" → "2025") */
  year: string | undefined;
  beta: boolean;
  images: Array<{ type: string; identifier: string }> | undefined;
}
