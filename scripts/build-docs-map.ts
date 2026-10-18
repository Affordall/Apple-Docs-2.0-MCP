/**
 * Lists every page of Apple's documentation with its title, URL, kind and place in the tree, from the files the
 * website's sidebar reads: technologies.json, then each technology's navigator index (index/<name>). The Human
 * Interface Guidelines have no index, so their pages come from each page's Topics. One request a second.
 *
 *   npx tsx scripts/build-docs-map.ts api-map/apple-docs-map.tsv
 */
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

import type { RenderIndex, RenderIndexNode, RenderNode } from '../src/types/docc.js';
import { isTopicReference } from '../src/types/docc.js';
import { helpPagesOf, helpTitleOf } from '../src/tools/help-pages.js';
import { MAP_COLUMNS } from '../src/tools/search-docs-map.js';
import { APPLE_PATHS, APPLE_URLS } from '../src/utils/constants.js';
import { tsv } from '../src/utils/exports.js';
import { httpClient } from '../src/utils/http-client.js';
import { jsonApiUrlOf, siteUrl } from '../src/utils/url-converter.js';

class UsageError extends Error {}

/** One page as one technology's sidebar lists it; `home` is the technology's own path, its ID the path's last part */
interface Row {
  url: string;
  title: string;
  kind: string;
  technology: string;
  group: string;
  tree: string;
  beta: boolean;
  deprecated: boolean;
  home: string;
}

/** The HIG's and Help's own paths, their IDs the paths' last parts */
const HIG_PATH = APPLE_PATHS.DESIGN.replace(/\/$/, '');
const HELP_PATH = APPLE_PATHS.HELP.replace(/\/$/, '');
const PACE_MS = 1000;

/** Every page under `nodes`, with the section heading above it and the titles of its ancestors */
function rowsOf(nodes: RenderIndexNode[], technology: { title: string; url: string }, ancestors: string[]): Row[] {
  let group = '';
  return nodes.flatMap((node) => {
    if (node.type === 'groupMarker') {
      group = node.title;
      return [];
    }
    const own = node.path
      ? [{ url: siteUrl(node.path), title: node.title, kind: node.type ?? '', technology: technology.title, group, tree: ancestors.join(' › '),
        beta: node.beta === true, deprecated: node.deprecated === true, home: technology.url }]
      : [];
    return [...own, ...rowsOf(node.children ?? [], technology, [...ancestors, node.title])];
  });
}

/** The HIG's pages, breadth-first from its root through each page's Topics; its name is its root page's title */
async function higRows(): Promise<Row[]> {
  const rows: Row[] = [];
  const seen = new Set([HIG_PATH]);
  const queue = [{ path: HIG_PATH, ancestors: [] as string[] }];
  let technology = '';
  for (let next = queue.shift(); next; next = queue.shift()) {
    const page = await httpClient.getJson<RenderNode>(jsonApiUrlOf(siteUrl(next.path)));
    await sleep(PACE_MS);
    technology ||= page.metadata?.title ?? '';
    const ancestors = [...next.ancestors, page.metadata?.title ?? next.path];
    for (const section of page.topicSections ?? []) {
      for (const identifier of section.identifiers) {
        const ref = page.references?.[identifier];
        if (!isTopicReference(ref) || !ref.url.startsWith(HIG_PATH) || seen.has(ref.url)) {
          continue;
        }
        seen.add(ref.url);
        rows.push({ url: siteUrl(ref.url), title: ref.title, kind: ref.role ?? ref.kind, technology, group: section.title ?? '', tree: ancestors.join(' › '),
          beta: ref.beta === true, deprecated: ref.deprecated === true, home: HIG_PATH });
        queue.push({ path: ref.url, ancestors });
      }
    }
  }
  return rows;
}

/** App Store Connect Help's pages, from the navigation every help page carries; its name is its front page's heading */
async function helpRows(): Promise<Row[]> {
  const html = await httpClient.getText(APPLE_URLS.APP_STORE_CONNECT_HELP);
  const technology = helpTitleOf(html);
  return helpPagesOf(html, APPLE_URLS.APP_STORE_CONNECT_HELP).map(({ url, title, section }) => ({
    url, title, kind: 'article', technology, group: section, tree: `${technology} › ${section}`,
    beta: false, deprecated: false, home: HELP_PATH,
  }));
}

const idOf = (row: Row): string => row.home.split('/').pop() ?? '';

/**
 * One row per page: as the technology the URL belongs to lists it, else as the first to list it, with the IDs of the
 * other technologies whose sidebars list it too (WebKit's WebView is in SwiftUI's)
 */
function byPage(rows: Row[]): Array<Row & { listedIn: string[] }> {
  const owns = (row: Row): boolean => row.url === siteUrl(row.home) || row.url.startsWith(siteUrl(`${row.home}/`));
  const pages = new Map<string, Row[]>();
  for (const row of rows) {
    pages.set(row.url, [...(pages.get(row.url) ?? []), row]);
  }
  return [...pages.values()].map((listings) => {
    const page = listings.find(owns) ?? listings[0];
    return { ...page, listedIn: [...new Set(listings.map(idOf))].filter((id) => id !== idOf(page)) };
  });
}

async function buildMap(out: string): Promise<void> {
  const catalog = await httpClient.getJson<RenderNode>(APPLE_URLS.TECHNOLOGIES_JSON);
  const technologies = Object.values(catalog.references ?? {})
    .filter(isTopicReference)
    .filter((ref) => ref.role === 'collection' && ref.url.startsWith(APPLE_PATHS.DOCUMENTATION));
  const rows: Row[] = [];
  const failed: Array<{ technology: string; error: string }> = [];
  for (const [n, technology] of technologies.entries()) {
    const name = technology.url.split('/').pop() ?? '';
    try {
      const index = await httpClient.getJson<RenderIndex>(`${APPLE_URLS.INDEX}${name}`);
      const languages = index.interfaceLanguages ?? {};
      // Web-service references (App Store Connect API) index their pages under `data`
      rows.push(...rowsOf([languages.swift, languages.occ, languages.data].find((nodes) => nodes?.length) ?? [], technology, []));
    } catch (error) {
      failed.push({ technology: name, error: error instanceof Error ? error.message : String(error) });
    }
    if ((n + 1) % 25 === 0) {
      console.log(JSON.stringify({ event: 'progress', technologies: n + 1, of: technologies.length, rows: rows.length }));
    }
    await sleep(PACE_MS);
  }
  rows.push(...(await higRows()));
  rows.push(...(await helpRows()));
  const pages = byPage(rows);
  // `marks`: "beta", "deprecated", both or neither; `listed_in`: the IDs of the other technologies whose sidebars list it
  await writeFile(out, tsv(MAP_COLUMNS, pages.map((row) => ({
    ...row,
    technology_id: idOf(row),
    marks: [row.beta ? 'beta' : '', row.deprecated ? 'deprecated' : ''].filter(Boolean),
    listed_in: row.listedIn,
  }))));
  console.log(JSON.stringify({ event: 'docs_map_built', out, pages: pages.length,
    listedElsewhere: pages.filter((row) => row.listedIn.length > 0).length, rows: rows.length,
    technologies: technologies.length, failed }));
}

const out = process.argv[2];
if (!out) {
  throw new UsageError('usage: npx tsx scripts/build-docs-map.ts <out.tsv>');
}
await buildMap(out);
