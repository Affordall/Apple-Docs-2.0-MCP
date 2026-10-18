import { readFile, stat } from 'fs/promises';
import { fileURLToPath } from 'url';

import { LRUCache } from 'lru-cache';

import { cachedFetch } from '../utils/cache.js';
import { CACHE_TTL } from '../utils/constants.js';

/**
 * The docs map `scripts/build-docs-map.ts` writes: one page a row, under a header naming the columns; `listed_in`
 * holds the IDs of the other technologies whose sidebars list the page
 */
const MAP_PATH = fileURLToPath(new URL('../../api-map/apple-docs-map.tsv', import.meta.url));
/** The map's columns, which `scripts/build-docs-map.ts` writes in this order */
export const MAP_COLUMNS = ['url', 'title', 'kind', 'technology', 'group', 'tree', 'technology_id', 'marks', 'listed_in'] as const;

/** A `technology` the map has no pages for: answered as an error, not as "no page has it", which a typo would fake */
class UnknownTechnologyError extends Error {}

/** A `kind` no page in the map has */
class UnknownKindError extends Error {}

/** A map without a column the tool reads: built by another version of the build script */
class MissingColumnError extends Error {}

interface DocsMap {
  rows: string[][];
  column: Record<(typeof MAP_COLUMNS)[number], number>;
  /** Each technology's ID by its name and by its ID, lowercase, as the rows pair them */
  technologyIds: Map<string, string>;
  kinds: Set<string>;
  built: Date;
}

/**
 * The parsed map, held while in use: keyed by the file's modification time, so a rebuilt map is read again, and freed
 * after 30 idle minutes, as every session's server holds its own (about 270 MB)
 */
const mapCache = new LRUCache<string, DocsMap>({
  max: 1,
  ttl: CACHE_TTL.DOCS_MAP_IDLE,
  updateAgeOnGet: true,
  ttlAutopurge: true,
  fetchMethod: async (modified) => parseMap(await readFile(MAP_PATH, 'utf8'), new Date(Number(modified))),
});

function parseMap(text: string, built: Date): DocsMap {
  const [header = '', ...lines] = text.split('\n');
  const names = header.split('\t');
  const column = Object.fromEntries(MAP_COLUMNS.map((name) => {
    const index = names.indexOf(name);
    if (index < 0) {
      throw new MissingColumnError(`${MAP_PATH} has no "${name}" column; rebuild it with scripts/build-docs-map.ts`);
    }
    return [name, index];
  })) as DocsMap['column'];
  const rows = lines.filter(Boolean).map((line) => line.split('\t'));
  const pairs = rows.map((row) => [row[column.technology] ?? '', row[column.technology_id] ?? ''] as const);
  return {
    rows,
    column,
    technologyIds: new Map(pairs.flatMap(([name, id]) => [[name.toLowerCase(), id], [id.toLowerCase(), id]])),
    kinds: new Set(rows.map((row) => row[column.kind] ?? '')),
    built,
  };
}

/**
 * The pages whose title contains `query`, in any case and as typed, shortest titles first, within `technologies` (by
 * name or ID, every page their sidebars list) and `kind` when given: the docs map's shell search (awk, sort -n, head)
 * as a tool, without awk reading `(`, `.` or `*` in a Swift name as a pattern.
 */
export async function handleSearchDocsMap(query: string, technologies: string[] | undefined, kind: string | undefined,
  limit: number): Promise<string> {
  const map = await cachedFetch(mapCache, String((await stat(MAP_PATH)).mtimeMs));
  const { column } = map;
  const unknown = (technologies ?? []).filter((name) => !map.technologyIds.has(name.toLowerCase()));
  if (unknown.length > 0) {
    throw new UnknownTechnologyError(`The docs map has no technology named ${unknown.map((name) => `"${name}"`).join(', ')}; ` +
      'use a name as list_technologies or these results show it ("SwiftUI", "Human Interface Guidelines"), or its ID ("swiftui").');
  }
  if (kind !== undefined && !map.kinds.has(kind)) {
    throw new UnknownKindError(`No page in the docs map is of kind "${kind}"; its kinds: ${[...map.kinds].sort().join(', ')}.`);
  }
  const wanted = technologies && new Set(technologies.map((name) => map.technologyIds.get(name.toLowerCase())));
  const needle = query.toLowerCase();
  // Ties in length keep sort's order of the printed row, as the shell search does.
  const hits = map.rows
    .filter((row) => (row[column.title] ?? '').toLowerCase().includes(needle) &&
      (!wanted || [row[column.technology_id], ...(row[column.listed_in] ?? '').split(', ')].some((id) => wanted.has(id))) &&
      (kind === undefined || row[column.kind] === kind))
    .map((row) => ({ row, title: row[column.title] ?? '', key: `${row[column.title]}\t${row[column.technology]}\t${row[column.url]}` }))
    .sort((a, b) => a.title.length - b.title.length || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const date = map.built.toLocaleDateString('en-CA');
  const scope = [technologies ? ` in ${technologies.join(', ')}` : '', kind ? ` of kind ${kind}` : ''].join('');
  if (hits.length === 0) {
    return `No page${scope} in the docs map (built ${date}) has "${query}" in its title. ` +
      'Search by what it does with search_apple_docs.';
  }
  const shown = hits.slice(0, limit);
  const count = hits.length === 1 ? '1 page has it in its title'
    : `${hits.length} pages have it in their title${shown.length < hits.length ? `; the ${shown.length} shortest below` : ''}`;
  return [
    `# Docs map: "${query}"${scope}`,
    '',
    `${count}. The map was built ${date}; read a page with get_apple_doc_content.`,
    '',
    ...shown.map(({ row }) => {
      // The tree is the page's place in its technology's sidebar; its last part, the page it sits under
      const parent = (row[column.tree] ?? '').split(' › ').pop();
      const marks = row[column.marks] ? ` · ${row[column.marks]}` : '';
      return `- **${row[column.title]}** · ${row[column.kind]}${marks} · ${row[column.technology]}` +
        `${parent ? ` › ${parent}` : ''} · ${row[column.url]}`;
    }),
  ].join('\n');
}
