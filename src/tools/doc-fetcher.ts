import { apiCache, generateEnhancedCacheKey } from '../utils/cache.js';
import { convertToJsonApiUrl } from '../utils/url-converter.js';
import { httpClient } from '../utils/http-client.js';
import type {
  Attribute, CodeExample, DeclarationToken, DetailsSection, DocumentationPrimaryRenderSection, PlatformAvailability,
  RenderBlockContent, RenderNode, RenderSection, TasksGroupSection, TypedProperty,
} from '../types/docc.js';
import { isDeprecated, isTopicReference } from '../types/docc.js';
import { logger } from '../utils/logger.js';
import { PROCESSING_LIMITS } from '../utils/constants.js';
import {
  formatDocumentHeader,
  formatDocumentAbstract,
  formatIdentifierLine,
  formatIdentifierLink,
  formatImage,
  formatInlineContent,
  formatIntroducedVersion,
  formatPlatformAvailability,
  formatSeeAlsoSection,
  referenceUrl,
  isSpecificAPIDocument,
} from './doc-formatter.js';
import { fetchHelpPage } from './help-pages.js';
import { HELP_PATH } from './search-result-parser.js';



/**
 * Format JSON documentation content with enhanced analysis
 */
function formatJsonDocumentation(
  jsonData: RenderNode,
  originalUrl: string,
  options: EnhancedAnalysisOptions = {},
): { content: Array<{ type: string; text: string }> } {
  let content = '';

  // Add header with title and status
  content += formatDocumentHeader(jsonData);

  // Add abstract
  content += formatDocumentAbstract(jsonData);
  content += formatDeprecationSummary(jsonData);
  content += formatSampleDownload(jsonData);

  // Check if this is a specific API/symbol or an API collection
  if (isSpecificAPIDocument(jsonData)) {
    content += formatSpecificAPIContent(jsonData);
  } else {
    content += formatAPICollectionContent(jsonData);
  }
  content += formatTutorialSections(jsonData);
  content += formatDefaultImplementations(jsonData);
  content += formatRelationshipsSection(jsonData);

  // Add platform availability
  content += formatPlatformAvailability(jsonData);

  // Add See Also section
  content += formatSeeAlsoSection(jsonData);

  content += formatAnalysisSections(jsonData, options);

  // Add link to original documentation
  content += `---\n\n[View full documentation on Apple Developer](${originalUrl})`;

  return {
    content: [
      {
        type: 'text' as const,
        text: content,
      },
    ],
  };
}

/**
 * The sections the include… flags ask for, read from the page's JSON
 */
function formatAnalysisSections(jsonData: RenderNode, options: EnhancedAnalysisOptions): string {
  let content = '';

  if (options.includeRelatedApis) {
    const relatedApis = extractRelatedApis(jsonData);
    if (relatedApis.length > 0) {
      content += formatRelatedApisSection(relatedApis);
    }
  }

  if (options.includeReferences) {
    const references = extractReferences(jsonData);
    if (references.length > 0) {
      content += formatReferencesSection(references);
    }
  }

  if (options.includeSimilarApis) {
    const similarApis = extractSimilarApis(jsonData);
    if (similarApis.length > 0) {
      content += formatSimilarApisSection(similarApis);
    }
  }

  if (options.includePlatformAnalysis) {
    const platformAnalysis = analyzePlatformCompatibility(jsonData);
    if (platformAnalysis) {
      content += formatPlatformAnalysisSection(platformAnalysis);
    }
  }

  return content;
}

/**
 * A sample's Download button, a reference to the project's zip linked like any reference, or Apple's words on why it
 * has none
 */
function formatSampleDownload(jsonData: RenderNode): string {
  const action = jsonData.sampleCodeDownload?.action;
  return (action ? `${formatInlineContent([action], jsonData.references)}\n\n` : '') +
    formatContentItems(jsonData.downloadNotAvailableSummary ?? [], jsonData.references);
}

/** A deprecated API's message, which names its replacement, in the Deprecated note Apple's pages show under the summary */
function formatDeprecationSummary(jsonData: RenderNode): string {
  const summary = jsonData.deprecationSummary ?? [];
  return summary.length > 0 ? formatAside('Deprecated', summary, jsonData.references) : '';
}

/**
 * Format specific API content (methods, properties, etc.)
 */
function formatSpecificAPIContent(jsonData: RenderNode): string {
  let content = '';

  for (const section of jsonData.primaryContentSections ?? []) {
    content += formatPrimarySection(section, jsonData.references);
  }

  return content + formatTopicsSection(jsonData);
}

/**
 * One of a page's sections, in the order the page gives them: a declaration, parameters, the overview's blocks, the
 * articles that mention it, and a property list key's details and attributes; a web-service page's go on to
 * `formatWebServiceSection`
 */
function formatPrimarySection(section: DocumentationPrimaryRenderSection, references: References): string {
  switch (section.kind) {
    case 'declarations': {
      const declaration = section.declarations[0]?.tokens.map((token) => token.text).join('') ?? '';
      return `## Declaration\n\n\`\`\`swift\n${declaration.trimEnd()}\n\`\`\`\n\n`;
    }
    case 'parameters':
      return `## Parameters\n\n${section.parameters.map((param) =>
        `**${param.name}**: ${formatContentItems(param.content, references).trim()}\n\n`).join('')}`;
    case 'content':
      return formatContentItems(section.content, references);
    case 'mentions':
      // swift-docc-render's `mentioned-in` heading
      return `## Mentioned in\n\n${section.mentions.map((identifier) => formatIdentifierLine(identifier, references)).join('')}\n`;
    case 'details':
      return formatDetails(section.title, section.details);
    case 'attributes':
      return `## ${section.title}\n\n${(section.attributes ?? []).map((attribute) =>
        `- ${formatAttribute(attribute, references)}\n`).join('')}\n`;
    default:
      return formatWebServiceSection(section, references);
  }
}

/**
 * A web-service page's sections: an endpoint's URL, parameters, body and responses; an object's properties; a type's
 * possible values
 */
function formatWebServiceSection(
  section: Exclude<DocumentationPrimaryRenderSection,
    { kind: 'declarations' | 'parameters' | 'content' | 'mentions' | 'details' | 'attributes' }>,
  references: References,
): string {
  const fields = (items: TypedProperty[]): string => items.map((item) => formatTypedProperty(item, references)).join('');
  switch (section.kind) {
    case 'restEndpoint':
      return `## ${section.title}\n\n\`\`\`\n${section.tokens.map((token) => token.text).join('')}\n\`\`\`\n\n`;
    case 'restParameters':
      return `## ${section.title}\n\n${fields(section.items)}\n`;
    case 'properties':
      return `## ${section.title}\n\n${fields(section.items ?? [])}\n`;
    case 'restBody':
      return `## ${section.title}\n\n${formatTypeTokens(section.bodyContentType, references)} (${section.mimeType})\n\n` +
        `${formatContentItems(section.content ?? [], references)}${fields(section.parameters ?? [])}\n`;
    case 'restResponses':
      return `## ${section.title}\n\n${section.items.map((response) => {
        const about = formatOneLine(response.content ?? [], references);
        return `- ${response.status}${response.reason ? ` ${response.reason}` : ''}: ${formatTypeTokens(response.type, references)}` +
          `${response.mimeType ? ` (${response.mimeType})` : ''}${about ? `. ${about}` : ''}\n`;
      }).join('')}\n`;
    case 'possibleValues':
      return `${section.title ? `## ${section.title}\n\n` : ''}${section.values.map((value) => {
        const about = formatOneLine(value.content ?? [], references);
        return `- \`${value.name}\`${about ? `: ${about}` : ''}\n`;
      }).join('')}\n`;
    default: {
      // A spec kind without a case fails the build here; one Apple ships before the spec lists it keeps its words
      const unlisted: never = section;
      return formatUnlistedBlock(unlisted);
    }
  }
}

/**
 * A property list key's Details as swift-docc-render's PropertyListKeyDetails shows them: its name in Xcode or its key,
 * then its type in words
 */
function formatDetails(title: string, details: DetailsSection): string {
  const lines = [
    details.ideTitle && details.titleStyle === 'symbol' ? `- Name: ${details.ideTitle}` : '',
    details.ideTitle && details.titleStyle === 'title' ? `- Key: ${details.name}` : '',
    `- Type: ${formatKeyTypes(details.value)}`,
  ].filter(Boolean);
  return `## ${title}\n\n${lines.join('\n')}\n\n`;
}

/** swift-docc-render's PropertyListKeyType: "array of strings", "string or number", "string, number, or boolean" */
function formatKeyTypes(types: DetailsSection['value']): string {
  const plurals: Record<string, string> = { dictionary: 'dictionaries', array: 'arrays', number: 'numbers', string: 'strings' };
  const words = types.map(({ arrayMode, baseType }) => {
    const base = baseType?.trim() ?? '*';
    return arrayMode ? `array of ${plurals[base] ?? base}` : base;
  });
  return words.length > 2 ? `${words.slice(0, -1).join(', ')}, or ${words[words.length - 1]}` : words.join(' or ');
}

/**
 * A property, parameter or body field on one line: its name, type, flags, description and attributes
 */
function formatTypedProperty(property: TypedProperty, references: References): string {
  const flags = [property.required && 'required', property.readOnly && 'read-only', property.deprecated && 'deprecated']
    .filter((flag): flag is string => Boolean(flag)).map((flag) => `, ${flag}`).join('');
  const notes = [formatOneLine(property.content ?? [], references),
    ...(property.attributes ?? []).map((attribute) => formatAttribute(attribute, references))].filter(Boolean).join('; ');
  return `- \`${property.name}\` (${formatTypeTokens(property.type, references)}${flags})${notes ? `: ${notes}` : ''}\n`;
}

/**
 * swift-docc-render's labels for an attribute that comes without a title (its `parameters` strings)
 */
const ATTRIBUTE_LABELS: Record<Attribute['kind'], string> = {
  default: 'Default', minimum: 'Minimum', minimumExclusive: 'Minimum', maximum: 'Maximum', maximumExclusive: 'Maximum',
  allowedValues: 'Possible Values', allowedTypes: 'Possible types',
};

/**
 * A property's default, bound, allowed values or allowed types
 */
function formatAttribute(attribute: Attribute, references: References): string {
  const label = attribute.title ?? ATTRIBUTE_LABELS[attribute.kind];
  switch (attribute.kind) {
    case 'allowedValues':
      return `${label}: ${attribute.values.map((value) => `\`${value}\``).join(', ')}`;
    case 'allowedTypes':
      return `${label}: ${attribute.values.map((type) => formatTypeTokens(type, references)).join(', ')}`;
    default:
      return `${label}: ${attribute.value}`;
  }
}

/**
 * A type's tokens as text, each token with a page linked to it
 */
function formatTypeTokens(tokens: DeclarationToken[], references: References): string {
  return tokens.map((token) => {
    const url = token.identifier ? referenceUrl(references?.[token.identifier]) : undefined;
    return url ? `[\`${token.text}\`](${url})` : token.text;
  }).join('');
}

/**
 * Blocks as one line of text, for a list item
 */
function formatOneLine(blocks: RenderBlockContent[], references: References): string {
  return formatContentItems(blocks, references).trim().replace(/\s*\n+\s*/g, ' ');
}

/**
 * A page's Topics: Apple's groups of its members (a type's) or collections (a framework's), under the heading
 * Apple's renderer gives them, swift-docc-render's `sections.topics` string; the page's JSON has only each group's title.
 */
function formatTopicsSection(jsonData: RenderNode): string {
  const topics = formatTopicGroups(jsonData.topicSections ?? [], jsonData.references);
  return topics ? `## Topics\n\n${topics}` : '';
}

/** A protocol requirement's Default Implementations, under swift-docc-render's `sections.default-implementations` heading */
function formatDefaultImplementations(jsonData: RenderNode): string {
  const groups = formatTopicGroups(jsonData.defaultImplementationsSections ?? [], jsonData.references);
  return groups ? `## Default Implementations\n\n${groups}` : '';
}

/**
 * Each group's title when it has one, its description when it has one, and the pages in it, as links
 */
function formatTopicGroups(groups: TasksGroupSection[], references: References): string {
  return groups
    .filter((section) => section.identifiers.length > 0)
    .map((section) => (section.title ? `### ${section.title}\n\n` : '') +
      (section.abstract ? `${formatInlineContent(section.abstract, references).trim()}\n\n` : '') +
      `${section.identifiers.map((identifier) => formatIdentifierLine(identifier, references)).join('')}\n`)
    .join('');
}

/**
 * The page's Relationships (Conforms To, Inherits From, Inherited By, Conforming Types), each type by name as Apple's
 * pages list them
 */
function formatRelationshipsSection(jsonData: RenderNode): string {
  const groups = (jsonData.relationshipsSections ?? [])
    .filter((section) => section.identifiers.length > 0)
    .map((section) => `### ${section.title}\n\n${section.identifiers
      .map((identifier) => `- ${formatIdentifierLink(identifier, jsonData.references)}\n`).join('')}\n`);
  return groups.length > 0 ? `## Relationships\n\n${groups.join('')}` : '';
}

type References = RenderNode['references'];

/**
 * Format one block, including the blocks that hold other blocks: a code listing's language tabs (Swift, Objective-C),
 * notes, lists, term lists, side-by-side columns, tables, link lists (a HIG page's videos), tutorial layouts and steps,
 * videos as Apple's Markdown writes them, and a web-service page's request, response and object examples. A type the
 * spec doesn't list yet keeps its words.
 */
function formatBlock(block: RenderBlockContent, references: References): string {
  if (!('type' in block)) {
    return formatLayout(block, references);
  }
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(Math.min(Math.max(block.level, 2), 6))} ${block.text}\n\n`;
    case 'paragraph': {
      const text = formatInlineContent(block.inlineContent, references);
      return text.trim() ? `${text}\n\n` : '';
    }
    case 'codeListing':
      return `\`\`\`${block.syntax ?? 'swift'}\n${block.code.join('\n')}\n\`\`\`\n\n`;
    case 'tabNavigator':
      return block.tabs.map((tab) => `**${tab.title}**\n\n${formatContentItems(tab.content, references)}`).join('');
    case 'aside':
      return formatAside(block.name ?? 'Note', block.content, references);
    case 'unorderedList':
    case 'orderedList': {
      const lines = block.items.map((item, index) => {
        const marker = block.type === 'orderedList' ? `${index + 1}.` : '-';
        return `${marker} ${formatContentItems(item.content, references).trim().replace(/\n/g, '\n  ')}`;
      });
      return `${lines.join('\n')}\n\n`;
    }
    case 'row':
      return block.columns.map((column) => formatContentItems(column.content, references)).join('');
    case 'table':
      return formatTable(block, references);
    case 'links':
      return `${block.items.map((identifier) => formatIdentifierLine(identifier, references)).join('')}\n`;
    default:
      return formatOtherBlock(block, references);
  }
}

/**
 * The blocks `formatBlock` passes on: term lists, tutorial steps, videos, breaks, small print, and a web-service page's
 * request, response and object examples
 */
function formatOtherBlock(
  block: Extract<RenderBlockContent,
    { type: 'termList' | 'step' | 'video' | 'thematicBreak' | 'small' | 'endpointExample' | 'dictionaryExample' }>,
  references: References,
): string {
  switch (block.type) {
    case 'termList': {
      // As Apple's Markdown writes it: "- term: definition", the definition's further lines indented under it
      const lines = block.items.map((item) => `- ${formatInlineContent(item.term.inlineContent, references).trim()}: ${
        formatContentItems(item.definition.content, references).trim().replace(/\n/g, '\n  ')}`);
      return `${lines.join('\n')}\n\n`;
    }
    case 'step':
      return formatStep(block, references);
    case 'video': {
      const video = formatImage(block.identifier, references);
      return video ? `${video}\n\n` : '';
    }
    case 'thematicBreak':
      return '---\n\n';
    case 'small': {
      const text = formatInlineContent(block.inlineContent, references);
      return text.trim() ? `${text}\n\n` : '';
    }
    case 'endpointExample':
      // swift-docc-render's Request and Response tabs
      return `${formatContentItems(block.summary ?? [], references)}**Request**\n\n${formatCodeExample(block.request)}` +
        `**Response**\n\n${formatCodeExample(block.response)}`;
    case 'dictionaryExample':
      return formatContentItems(block.summary ?? [], references) + formatCodeExample(block.example);
    default: {
      // A spec type without a case fails the build here; one Apple ships before the spec lists it keeps its words
      const unlisted: never = block;
      return formatUnlistedBlock(unlisted);
    }
  }
}

/** A request, response or object example: its code, collapsed parts included */
function formatCodeExample(example: CodeExample): string {
  return `\`\`\`${example.syntax ?? ''}\n${example.content.flatMap((part) => part.code).join('\n')}\n\`\`\`\n\n`;
}

/** A note, tip, warning or other aside as a quote under its name */
function formatAside(name: string, content: RenderBlockContent[], references: References): string {
  return `> **${name}:** ${formatContentItems(content, references).trim().replace(/\n/g, '\n> ')}\n\n`;
}

/**
 * A block or section type the spec doesn't list yet (Apple ships some before the spec does), shown whole as its JSON,
 * so nothing on the page goes missing
 */
function formatUnlistedBlock(block: object): string {
  return `\`\`\`json\n${JSON.stringify(block, null, 1)}\n\`\`\`\n\n`;
}

/**
 * A tutorial's layout, which the spec tags with `kind`: full width, columns, or content beside its picture
 */
function formatLayout(block: Exclude<RenderBlockContent, { type: string }>, references: References): string {
  return 'content' in block
    ? formatContentItems(block.content, references) + formatMedia('media' in block ? block.media : null, references)
    : '';
}

/**
 * A tutorial step: what to do, the code file as it stands after it, its pictures, and the caption under them
 */
function formatStep(block: RenderBlockContent, references: References): string {
  if (!('type' in block) || block.type !== 'step') {
    return formatBlock(block, references);
  }
  return formatContentItems(block.content, references) + formatCodeFile(block.code, references) +
    formatMedia(block.media, references) + formatMedia(block.runtimePreview, references) +
    formatContentItems(block.caption, references);
}

/**
 * A picture on its own line; a video or a missing reference leaves nothing
 */
function formatMedia(identifier: string | null | undefined, references: References): string {
  const image = identifier ? formatImage(identifier, references) : '';
  return image ? `${image}\n\n` : '';
}

/**
 * A tutorial step's code: the whole file as it stands after the step
 */
function formatCodeFile(identifier: string | null | undefined, references: References): string {
  const file = identifier ? references?.[identifier] : undefined;
  return file?.type === 'file' ? `**${file.fileName}**\n\n\`\`\`${file.syntax}\n${file.content.join('\n')}\n\`\`\`\n\n` : '';
}

/**
 * A tutorials page's sections, which documentation pages leave empty: an overview's volumes and resources, a tutorial's
 * tasks and an article's body; its questions and the link to what comes next are left out. The page header gives the
 * hero's title.
 */
function formatTutorialSections(jsonData: RenderNode): string {
  return (jsonData.sections ?? []).map((section) => formatTutorialSection(section, jsonData.references)).join('');
}

function formatTutorialSection(section: RenderSection, references: References): string {
  switch (section.kind) {
    case 'hero':
    case 'intro':
      return formatHero(section, references);
    case 'articleBody':
      return formatContentItems(section.content, references);
    case 'volume':
      return `${section.name ? `## ${section.name}\n\n` : ''}${formatContentItems(section.content ?? [], references)}` +
        section.chapters.map((chapter) => `### ${chapter.name}\n\n${formatContentItems(chapter.content, references)}` +
          `${chapter.tutorials.map((identifier) => formatIdentifierLine(identifier, references)).join('')}\n`).join('');
    case 'tasks':
      return section.tasks.map((task) => `## ${task.title}\n\n${formatContentItems(task.contentSection, references)}` +
        task.stepsSection.map((block) => formatStep(block, references)).join('')).join('');
    case 'resources':
      return formatResources(section, references);
    case 'assessments':
    case 'callToAction':
      // Left out: a tutorial's questions and its link to what comes next (the user, 2026-10-11)
      return '';
    default: {
      // A spec kind without a case fails the build here; one Apple ships before the spec lists it keeps its words
      const unlisted: never = section;
      return formatUnlistedBlock(unlisted);
    }
  }
}

/**
 * A tutorial's or an overview's opening: its words, an overview's "Get started" link, and a tutorial's download under
 * swift-docc-render's `project-files` string
 */
function formatHero(section: Extract<RenderSection, { kind: 'hero' | 'intro' }>, references: References): string {
  const projectFiles = section.projectFiles ? referenceUrl(references?.[section.projectFiles]) : undefined;
  return formatContentItems(section.content ?? [], references) +
    (section.action ? `${formatInlineContent([section.action], references)}\n\n` : '') +
    (projectFiles ? `[Project files](${projectFiles})\n\n` : '');
}

/** An overview's Resources, under swift-docc-render's `sections.resources` heading: each tile's title, words and link */
function formatResources(section: Extract<RenderSection, { kind: 'resources' }>, references: References): string {
  const tiles = section.tiles.map((tile) => `### ${tile.title}\n\n${formatContentItems(tile.content, references)}` +
    (tile.action ? `${formatInlineContent([tile.action], references)}\n\n` : ''));
  return `## Resources\n\n${formatContentItems(section.content ?? [], references)}${tiles.join('')}`;
}

function formatContentItems(items: RenderBlockContent[], references: References): string {
  return items.map((item) => formatBlock(item, references)).join('');
}

/**
 * Format a table in Markdown, each cell's blocks on one line; a table without a header row gets an empty one
 */
function formatTable(table: Extract<RenderBlockContent, { type: 'table' }>, references: References): string {
  const rows = table.rows.map((row) =>
    `| ${row.map((cell) => formatContentItems(cell, references).trim().replace(/\s*\n+\s*/g, ' ')).join(' | ')} |`);
  const width = table.rows[0]?.length ?? 0;
  if (width === 0) {
    return '';
  }
  const header = table.header === 'row' || table.header === 'both' ? rows.shift() : `|${' |'.repeat(width)}`;
  return `${header}\n|${' --- |'.repeat(width)}\n${rows.map((row) => `${row}\n`).join('')}\n`;
}

/**
 * An article or a collection: its sections, the overview headed "Overview" unless it opens with its own heading, then
 * its Topics
 */
function formatAPICollectionContent(jsonData: RenderNode): string {
  let content = '';

  for (const section of jsonData.primaryContentSections ?? []) {
    if (section.kind === 'content') {
      const first = section.content[0];
      content += first && 'type' in first && first.type === 'heading' ? '' : '## Overview\n\n';
    }
    content += formatPrimarySection(section, jsonData.references);
  }

  return content + formatTopicsSection(jsonData);
}

/**
 * Enhanced analysis options
 */
interface EnhancedAnalysisOptions {
  includeRelatedApis?: boolean;
  includeReferences?: boolean;
  includeSimilarApis?: boolean;
  includePlatformAnalysis?: boolean;
}

/**
 * Fetch JSON documentation from Apple Developer Documentation with optional enhanced analysis
 * @param url The URL of the documentation page
 * @param options Enhanced analysis options
 * @returns Formatted documentation content
 */
export async function fetchAppleDocJson(
  url: string,
  options: EnhancedAnalysisOptions = {},
): Promise<any> {
  try {
    // Validate that this is an Apple Developer URL
    if (!url.includes('developer.apple.com')) {
      throw new Error('URL must be from developer.apple.com');
    }

    // Convert web URL to JSON API URL if needed
    const jsonApiUrl = url.includes('.json') ? url : convertToJsonApiUrl(url);

    if (!jsonApiUrl) {
      throw new Error('Invalid Apple Developer Documentation URL');
    }

    // Generate cache key including options
    const cacheKey = generateEnhancedCacheKey(jsonApiUrl, options);

    // Try to get from cache first
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      logger.debug(`Cache hit for: ${jsonApiUrl}`);
      return cachedResult;
    }

    if (new URL(url).pathname.startsWith(HELP_PATH)) {
      const result = { content: [{ type: 'text' as const, text: await fetchHelpPage(url) }] };
      apiCache.set(cacheKey, result);
      return result;
    }

    logger.info(`Fetching Apple doc JSON from: ${jsonApiUrl}`);

    // Fetch the documentation JSON using HTTP client
    const jsonData = await httpClient.getJson<RenderNode>(jsonApiUrl);

    // Format the JSON documentation with enhanced analysis
    const result = formatJsonDocumentation(jsonData, url, options);

    // Cache the result
    apiCache.set(cacheKey, result);

    return result;
  } catch (error) {
    let errorMessage: string;

    // Handle AppError objects from http-client
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    logger.error('Error fetching Apple doc JSON:', errorMessage);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Failed to get Apple doc content: ${errorMessage}\n\nPlease try accessing the documentation directly at: ${url}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Extract related APIs from JSON data
 */
function extractRelatedApis(jsonData: RenderNode): Array<{title: string, url: string, relationship: string}> {
  const relatedApis: Array<{title: string, url: string, relationship: string}> = [];

  // From relationshipsSections
  if (jsonData.relationshipsSections) {
    for (const section of jsonData.relationshipsSections) {
      if (section.identifiers) {
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION)) {
          const ref = jsonData.references?.[identifier];
          if (isTopicReference(ref)) {
            relatedApis.push({
              title: ref.title ?? 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              relationship: section.title ?? 'Related',
            });
          }
        }
      }
    }
  }

  // From seeAlsoSections
  if (jsonData.seeAlsoSections) {
    for (const section of jsonData.seeAlsoSections) {
      if (section.identifiers) {
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION)) {
          const ref = jsonData.references?.[identifier];
          if (isTopicReference(ref)) {
            relatedApis.push({
              title: ref.title ?? 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              relationship: `See Also: ${section.title ?? 'Related'}`,
            });
          }
        }
      }
    }
  }

  return relatedApis.slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_RELATED_APIS); // Limit results
}

/**
 * Extract references from JSON data
 */
function extractReferences(jsonData: RenderNode): Array<{title: string, url: string, type: string, abstract?: string}> {
  const references: Array<{title: string, url: string, type: string, abstract?: string}> = [];

  if (jsonData.references) {
    const refEntries = Object.entries(jsonData.references).slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_REFERENCES); // Limit

    for (const [, ref] of refEntries) {
      if (!isTopicReference(ref)) {
        continue;
      }
      references.push({
        title: ref.title ?? 'Unknown',
        url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
        type: ref.role ?? ref.kind ?? 'unknown',
        abstract: ref.abstract ? formatInlineContent(ref.abstract, jsonData.references).trim() : undefined,
      });
    }
  }

  return references;
}

/**
 * Extract similar APIs from JSON data
 */
function extractSimilarApis(jsonData: RenderNode): Array<{title: string, url: string, category: string}> {
  const similarApis: Array<{title: string, url: string, category: string}> = [];

  // From topicSections
  if (jsonData.topicSections) {
    for (const section of jsonData.topicSections) {
      if (section.identifiers) {
        for (const identifier of section.identifiers.slice(0, PROCESSING_LIMITS.MAX_RELATED_APIS_PER_SECTION)) {
          const ref = jsonData.references?.[identifier];
          if (isTopicReference(ref)) {
            similarApis.push({
              title: ref.title ?? 'Unknown',
              url: ref.url ? (ref.url.startsWith('http') ? ref.url : `https://developer.apple.com${ref.url}`) : '#',
              category: section.title ?? 'Related',
            });
          }
        }
      }
    }
  }

  return similarApis.slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_SIMILAR_APIS); // Limit results
}

/**
 * Analyze platform compatibility
 */
function analyzePlatformCompatibility(
  jsonData: RenderNode,
): {
  supportedPlatforms: string;
  betaPlatforms: string[];
  deprecatedPlatforms: string[];
  crossPlatform: boolean;
  platforms: PlatformAvailability[];
} | null {
  if (!jsonData.metadata?.platforms) {
    return null;
  }

  const platforms = jsonData.metadata.platforms;
  const supportedPlatforms = platforms.map((p) => p.name).join(', ');
  const betaPlatforms = platforms.filter((p) => p.beta).map((p) => p.name).filter((name): name is string => name !== undefined);
  const deprecatedPlatforms = platforms.filter(isDeprecated).map((p) => p.name).filter((name): name is string => name !== undefined);

  return {
    supportedPlatforms,
    betaPlatforms,
    deprecatedPlatforms,
    crossPlatform: platforms.length > 1,
    platforms,
  };
}

/**
 * Format related APIs section
 */
function formatRelatedApisSection(relatedApis: Array<{title: string, url: string, relationship: string}>): string {
  let content = '\n## Related APIs\n\n';

  for (const api of relatedApis) {
    content += `- [**${api.title}**](${api.url}) - *${api.relationship}*\n`;
  }

  return content + '\n';
}

/**
 * Format references section
 */
function formatReferencesSection(references: Array<{title: string, url: string, type: string, abstract?: string}>): string {
  let content = '\n## Key References\n\n';

  // Group by type
  const groupedRefs: Record<string, typeof references> = {};
  for (const ref of references) {
    if (!groupedRefs[ref.type]) {
      groupedRefs[ref.type] = [];
    }
    groupedRefs[ref.type].push(ref);
  }

  for (const [type, refs] of Object.entries(groupedRefs)) {
    content += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
    for (const ref of refs.slice(0, PROCESSING_LIMITS.MAX_DOC_FETCHER_REFS_PER_TYPE)) {
      content += `- [**${ref.title}**](${ref.url})`;
      if (ref.abstract) {
        content += ` - ${ref.abstract}`;
      }
      content += '\n';
    }
    content += '\n';
  }

  return content;
}

/**
 * Format similar APIs section
 */
function formatSimilarApisSection(
  similarApis: Array<{title: string, url: string, category: string}>,
): string {
  let content = '\n## Similar APIs\n\n';

  // Group by category
  const groupedApis: Record<string, typeof similarApis> = {};
  for (const api of similarApis) {
    if (!groupedApis[api.category]) {
      groupedApis[api.category] = [];
    }
    groupedApis[api.category].push(api);
  }

  for (const [category, apis] of Object.entries(groupedApis)) {
    content += `### ${category}\n\n`;
    for (const api of apis) {
      content += `- [**${api.title}**](${api.url})\n`;
    }
    content += '\n';
  }

  return content;
}

/**
 * Format platform analysis section
 */
function formatPlatformAnalysisSection(
  analysis: {
    supportedPlatforms: string;
    betaPlatforms: string[];
    deprecatedPlatforms: string[];
    crossPlatform?: boolean;
    platforms?: PlatformAvailability[];
  },
): string {
  let content = '\n## Platform Compatibility Analysis\n\n';

  content += `**Supported Platforms:** ${analysis.supportedPlatforms}\n`;
  content += `**Cross-Platform Support:** ${analysis.crossPlatform ? 'Yes' : 'No'}\n`;

  if (analysis.betaPlatforms.length > 0) {
    content += `**Beta Platforms:** ${analysis.betaPlatforms.join(', ')}\n`;
  }

  if (analysis.deprecatedPlatforms.length > 0) {
    content += `**Deprecated Platforms:** ${analysis.deprecatedPlatforms.join(', ')}\n`;
  }

  content += '\n**Detailed Platform Information:**\n\n';
  for (const platform of analysis.platforms ?? []) {
    content += `- **${platform.name}**${formatIntroducedVersion(platform)}`;
    if (platform.beta) {
      content += ' (Beta)';
    }
    if (isDeprecated(platform)) {
      content += ' (Deprecated)';
    }
    content += '\n';
  }

  return content + '\n';
}