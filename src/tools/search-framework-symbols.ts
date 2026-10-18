import { siteUrl } from '../utils/url-converter.js';
import { minimatch } from 'minimatch';

import { cachedJson, indexCache } from '../utils/cache.js';
import { APPLE_URLS } from '../utils/constants.js';
import { technologyId, technologyNames } from './list-technologies.js';
import type { RenderIndex, RenderIndexNode } from '../types/docc.js';

function findSymbolsRecursive(
  items: RenderIndexNode[],
  symbolType: string,
  namePattern: string | undefined,
  limit: number,
  symbols: RenderIndexNode[],
): boolean {
  for (const item of items) {
    if (symbols.length >= limit) {
      return true;
    }

    // Group markers head the symbols that follow them, and an index can list one symbol under two groups
    if (item.type !== 'groupMarker' && (symbolType === 'all' || item.type === symbolType)) {
      if ((!namePattern || matchesPattern(item, namePattern)) && !symbols.some(symbol => symbol.path === item.path)) {
        symbols.push(item);
      }
    }

    if (item.children && symbols.length < limit) {
      const limitReached = findSymbolsRecursive(
        item.children,
        symbolType,
        namePattern,
        limit,
        symbols,
      );
      if (limitReached) {
        return true;
      }
    }
  }

  return false;
}

export async function searchFrameworkSymbols(
  framework: string,
  symbolType: string,
  namePattern: string | undefined,
  limit: number,
): Promise<string> {
  const id = await technologyId(framework);
  const [data, names] = await Promise.all([cachedJson<RenderIndex>(indexCache, `${APPLE_URLS.INDEX}${id}`), technologyNames()]);
  // Apple's own name for the framework, however it was typed
  const name = names.get(id) ?? framework;
  const indexItems = data.interfaceLanguages?.swift ?? [];
  if (indexItems.length === 0) {
    // An Objective-C-only framework's, or a web service's (`data`), index has no Swift tree
    const availableLanguages = Object.keys(data.interfaceLanguages ?? {});
    return `${name}'s index has no Swift pages. Its languages: ${availableLanguages.join(', ')}`;
  }

  const symbols: RenderIndexNode[] = [];
  findSymbolsRecursive(indexItems, symbolType, namePattern, limit, symbols);

  // Apple's own kinds, as the index names them and the docs map prints them
  const scope = `${namePattern ? ` matching "${namePattern}"` : ''}${symbolType === 'all' ? '' : ` of kind ${symbolType}`}`;
  let result = `# ${name} index${scope}\n\n`;

  if (symbols.length === 0) {
    result += `No page in the ${name} index${scope}.\n`;
  } else {
    result += `**Found:** ${symbols.length} ${symbols.length === 1 ? 'page' : 'pages'}\n\n`;

    if (symbolType === 'all') {
      for (const [type, items] of Map.groupBy(symbols, (symbol) => symbol.type ?? 'other')) {
        result += `## ${type} (${items.length})\n\n`;
        for (const item of items) {
          result += formatSymbolItem(item);
        }
        result += '\n';
      }
    } else {
      for (const symbol of symbols) {
        result += formatSymbolItem(symbol);
      }
    }
  }

  return result;
}

function formatSymbolItem(item: RenderIndexNode): string {
  const url = siteUrl(item.path ?? '');
  let result = `- [**${item.title}**](${url})`;

  const metadata = [item.type ?? '', item.beta ? 'beta' : '', item.deprecated ? 'deprecated' : ''].filter(Boolean);

  if (metadata.length > 0) {
    result += ` *(${metadata.join(', ')})*`;
  }

  return result + '\n';
}

/** Wildcards and nothing else: braces, extglobs, a leading "!" or "#" read as written, in any case */
const NAME_PATTERN_OPTIONS = { nocase: true, nobrace: true, noext: true, nonegate: true, nocomment: true, dot: true };

/**
 * The pattern against the symbol's title or its name in its URL: a member's title opens with its declaration
 * ("func registerForTraitChanges(…)"), the last segment of its path is the name alone
 */
function matchesPattern(node: RenderIndexNode, pattern: string): boolean {
  const name = node.path?.split('/').pop() ?? '';
  return minimatch(node.title, pattern, NAME_PATTERN_OPTIONS) || minimatch(name, pattern, NAME_PATTERN_OPTIONS);
}
