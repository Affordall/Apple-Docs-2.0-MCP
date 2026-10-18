import { siteUrl } from '../utils/url-converter.js';
import { cachedJson, pageCache } from '../utils/cache.js';
import { APPLE_URLS } from '../utils/constants.js';
import { exportPath, writeTsv } from '../utils/exports.js';
import type { References, TechnologiesPage } from '../types/captured/technologies.js';
import { docUrl } from './doc-formatter.js';

interface Technology {
  title: string;
  tags: string[];
  languages: string[];
  beta: boolean;
  /** The page Apple's reference names: lowercase, or off Apple's site for the two it publishes elsewhere (CareKit) */
  url: string;
  summary: string;
}

interface TechnologyGroup {
  name: string;
  technologies: Technology[];
}

const TECHNOLOGIES_FILE = 'technologies.tsv';
const TECHNOLOGY_COLUMNS = ['title', 'url', 'section', 'tags', 'languages', 'beta', 'summary'] as const;

/**
 * Apple's technologies, by its groups, filtered; `limit` counts them in all, as the samples catalog does
 */
export async function handleListTechnologies(
  category: string | undefined,
  language: string | undefined,
  includeBeta: boolean,
  limit: number,
): Promise<string> {
  const groups = parseTechnologies(await technologiesPage());
  const rows = groups.flatMap((group) => group.technologies.map((tech) => ({ ...tech, section: group.name })));
  await writeTsv(TECHNOLOGIES_FILE, TECHNOLOGY_COLUMNS, rows);
  const file = `All ${rows.length} technologies, one a line (${TECHNOLOGY_COLUMNS.join(', ')}): ${exportPath(TECHNOLOGIES_FILE)}`;
  if (category && !groups.some((group) => group.technologies.some((tech) => inCategory(group, tech, category)))) {
    return `No category or tag of Apple's technologies has "${category}" in it. Categories: ` +
      `${groups.map((group) => group.name).join(', ')}; each technology's tags are in the file below.\n\n${file}`;
  }
  return `${formatTechnologiesList(applyTechnologyFilters(groups, { category, language, includeBeta }), limit)}\n\n${file}`;
}

const technologiesPage = (): Promise<TechnologiesPage> => cachedJson<TechnologiesPage>(pageCache, APPLE_URLS.TECHNOLOGIES_JSON);

/** A technology's name or ID with case, spaces and punctuation folded: "Foundation Models" and "foundation-models" match */
export const frameworkKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Each technology's name as Apple writes it, by the last segment of its documentation path ("pdfkit" → "PDFKit")
 */
export async function technologyNames(): Promise<Map<string, string>> {
  const data = await technologiesPage();
  return new Map(data.sections
    .filter(section => section.kind === 'technologies')
    .flatMap(section => section.groups)
    .flatMap(group => group.technologies)
    .map(tech => [tech.destination.identifier.split('/').pop()?.toLowerCase() ?? '', tech.title]));
}

/**
 * A technology's documentation ID ("foundationmodels") from what a person types: its ID or its name, in any case and
 * with or without spaces and dashes ("Foundation Models", "foundation-models"); else what was typed, lowercased
 */
export async function technologyId(typed: string): Promise<string> {
  const wanted = frameworkKey(typed);
  const match = [...(await technologyNames()).entries()]
    .find(([id, name]) => frameworkKey(id) === wanted || frameworkKey(name) === wanted);
  return match?.[0] ?? typed.toLowerCase();
}

/**
 * Apple's groups and their technologies; each technology's page, summary and Beta mark come from its reference, as
 * Swift-DocC marks any beta page
 */
function parseTechnologies(data: TechnologiesPage): TechnologyGroup[] {
  // quicktype names each reference a key of its own, so the values' type is spelled out here
  const references = new Map(Object.values(data.references)
    .map((reference: References[keyof References]) => [reference.identifier, reference] as const));
  return data.sections
    .filter((section) => section.kind === 'technologies')
    .flatMap((section) => section.groups)
    .map((group) => ({
      name: group.name,
      technologies: group.technologies.map((tech) => {
        const reference = references.get(tech.destination.identifier);
        return {
          title: tech.title,
          tags: tech.tags,
          languages: tech.languages,
          // The identifier is the page's address too, in its capitals
          url: reference && 'url' in reference ? siteUrl(reference.url) : docUrl(tech.destination.identifier),
          summary: reference && 'abstract' in reference ? reference.abstract.map((part) => part.text).join('') : '',
          beta: reference !== undefined && 'beta' in reference && reference.beta === true,
        };
      }),
    }));
}

function applyTechnologyFilters(
  groups: TechnologyGroup[],
  filters: { category: string | undefined; language: string | undefined; includeBeta: boolean },
): TechnologyGroup[] {
  return groups
    .map((group) => ({ ...group, technologies: group.technologies.filter((tech) =>
      (!filters.category || inCategory(group, tech, filters.category)) &&
      (filters.includeBeta || !tech.beta) &&
      (!filters.language || tech.languages.includes(filters.language))) }))
    .filter((group) => group.technologies.length > 0);
}

/** A category is Apple's group or one of the tags it gives a technology ("Machine Learning"), by any part, in any case */
function inCategory(group: TechnologyGroup, tech: Technology, category: string): boolean {
  const part = category.toLowerCase();
  return group.name.toLowerCase().includes(part) || tech.tags.some((tag) => tag.toLowerCase().includes(part));
}

/** The first `limit` technologies, each on one line under its group, with its languages, tags and summary */
function formatTechnologiesList(groups: TechnologyGroup[], limit: number): string {
  const found = groups.flatMap((group) => group.technologies.map((tech) => ({ group: group.name, tech })));
  if (found.length === 0) {
    return 'No technologies found matching the specified criteria.';
  }
  const shown = found.slice(0, limit);
  const beta = found.filter(({ tech }) => tech.beta).length;
  const lines = shown.flatMap(({ group, tech }, index) => [
    ...(group === shown[index - 1]?.group ? [] : [`${index > 0 ? '\n' : ''}## ${group}\n`]),
    formatTechnology(tech),
  ]);
  return ['# Apple Developer Technologies', '',
    `Found ${found.length} technologies${beta > 0 ? ` (${beta} in beta)` : ''}` +
    `${shown.length < found.length ? `, showing ${shown.length}` : ''}`, '', ...lines].join('\n');
}

function formatTechnology(tech: Technology): string {
  const notes = [tech.languages.join(', '), tech.tags.join(', '), tech.beta ? 'beta' : ''].filter(Boolean).join(' · ');
  return `- [${tech.title}](${tech.url})${notes ? ` (${notes})` : ''}${tech.summary ? `: ${tech.summary}` : ''}`;
}
