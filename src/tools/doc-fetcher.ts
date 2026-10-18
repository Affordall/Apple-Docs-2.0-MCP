import { APPLE_PATHS } from '../utils/constants.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import jsonpatch from 'fast-json-patch';
import type { Operation } from 'fast-json-patch';

import { cachedJson, pageCache } from '../utils/cache.js';
import { isValidAppleDeveloperUrl, jsonApiUrlOf } from '../utils/url-converter.js';
import type {
  Attribute, CodeExample, Declaration, DeclarationToken, DetailsSection, RelationshipsGroupSection, DocumentationPrimaryRenderSection,
  RenderBlockContent, RenderNode, RenderSection, TasksGroupSection, TypedProperty,
} from '../types/docc.js';
import {
  docUrl,
  formatDocumentHeader,
  formatDocumentAbstract,
  formatIdentifierLine,
  formatIdentifierLink,
  formatImage,
  formatInlineContent,
  formatPlatformAvailability,
  formatSeeAlsoSection,
  referenceUrl,
  isSpecificAPIDocument,
} from './doc-formatter.js';
import { fetchHelpPage } from './help-pages.js';



/**
 * The page as Markdown, its sections in the order Apple's page shows them
 */
function formatJsonDocumentation(jsonData: RenderNode, originalUrl: string): CallToolResult {
  let content = '';

  content += formatDocumentHeader(jsonData);

  content += formatDocumentAbstract(jsonData);
  content += formatDeprecationSummary(jsonData);
  content += formatSampleDownload(jsonData);

  if (isSpecificAPIDocument(jsonData)) {
    content += formatSpecificAPIContent(jsonData);
  } else {
    content += formatAPICollectionContent(jsonData);
  }
  content += formatTutorialSections(jsonData);
  content += formatDefaultImplementations(jsonData);
  content += formatRelationshipsSection(jsonData);

  content += formatPlatformAvailability(jsonData);

  content += formatSeeAlsoSection(jsonData);

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

function formatSpecificAPIContent(jsonData: RenderNode): string {
  let content = '';

  for (const section of jsonData.primaryContentSections ?? []) {
    content += formatPrimarySection(section, jsonData.references, jsonData.identifier.interfaceLanguage);
  }

  return content + formatTopicsSection(jsonData);
}

/**
 * One of a page's sections, in the order the page gives them: a declaration, parameters, the overview's blocks, the
 * articles that mention it, and a property list key's details and attributes; a web-service page's go on to
 * `formatWebServiceSection`
 */
function formatPrimarySection(section: DocumentationPrimaryRenderSection, references: References,
  language: string): string {
  switch (section.kind) {
    case 'declarations': {
      // Apple's page captions each declaration with its platforms only when they differ (swift-docc-render, Declaration.vue)
      const captioned = section.declarations.some((declaration) =>
        declaration.platforms.join() !== section.declarations[0]?.platforms.join());
      return `## Declaration\n\n${section.declarations.map((declaration) =>
        formatDeclaration(declaration, captioned, references, language)).join('')}`;
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
 * One declaration: its platforms when the page's declarations differ in them, its code, and the other declarations of
 * the name, each with its own page, which Apple's page lists when expanded (swift-docc-render, DeclarationList.vue)
 */
function formatDeclaration(declaration: Declaration, captioned: boolean, references: References, language: string): string {
  const code = (tokens: DeclarationToken[]): string => tokens.map((token) => token.text).join('');
  const others = declaration.otherDeclarations?.declarations ?? [];
  // DocC names Objective-C "occ"; Markdown's code fences name it "objc"
  return `${captioned ? `**${declaration.platforms.join(', ')}**\n\n` : ''}` +
    `\`\`\`${language === 'occ' ? 'objc' : 'swift'}\n${code(declaration.tokens).trimEnd()}\n\`\`\`\n\n` +
    (others.length === 0 ? '' : `Other declarations, each on its own page:\n${others.map((other) =>
      `- \`${code(other.tokens).replace(/\s+/g, ' ').trim()}\`: ` +
      `${referenceUrl(references?.[other.identifier]) ?? docUrl(other.identifier)}\n`).join('')}\n`);
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
  return new Intl.ListFormat('en', { type: 'disjunction' }).format(words);
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
  // What a type inherits and conforms to is a short list, worth each one's summary; the types that conform can run to hundreds
  const summarized = new Set<RelationshipsGroupSection['type']>(['inheritsFrom', 'conformsTo']);
  const groups = (jsonData.relationshipsSections ?? [])
    .filter((section) => section.identifiers.length > 0)
    .map((section) => `### ${section.title}\n\n${section.identifiers
      .map((identifier) => (summarized.has(section.type)
        ? formatIdentifierLine(identifier, jsonData.references)
        : `- ${formatIdentifierLink(identifier, jsonData.references)}\n`)).join('')}\n`);
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
    content += formatPrimarySection(section, jsonData.references, jsonData.identifier.interfaceLanguage);
  }

  return content + formatTopicsSection(jsonData);
}

/** A page's language: Swift, or Objective-C, which Apple ships as JSON Patch overrides on the Swift page */
export type PageLanguage = 'swift' | 'occ';

/** A URL that isn't on developer.apple.com */
class NotAppleDeveloperUrlError extends Error {}

/** A page asked for in Objective-C that Apple documents in Swift alone */
class NoObjectiveCVersionError extends Error {}

/**
 * One page as Markdown, in the language asked for; its JSON is cached by URL
 */
export async function fetchAppleDocJson(url: string, language: PageLanguage): Promise<CallToolResult> {
  if (!isValidAppleDeveloperUrl(url)) {
    throw new NotAppleDeveloperUrlError(`${url} is not on developer.apple.com`);
  }
  if (new URL(url).pathname.startsWith(APPLE_PATHS.HELP)) {
    return { content: [{ type: 'text', text: await fetchHelpPage(url) }] };
  }
  const page = await cachedJson<RenderNode>(pageCache, url.includes('.json') ? url : jsonApiUrlOf(url));
  return formatJsonDocumentation(inLanguage(page, language, url), url);
}

/**
 * The page in the language asked for: its Objective-C version is the Swift page with Apple's `occ` overrides applied, to
 * a copy; a page Apple writes in Objective-C needs none
 */
function inLanguage(page: RenderNode, language: PageLanguage, url: string): RenderNode {
  if (language === 'swift' || page.identifier.interfaceLanguage === language) {
    return page;
  }
  const patch = (page.variantOverrides ?? [])
    .filter((override) => override.traits.some((trait) => trait.interfaceLanguage === language))
    .flatMap((override) => override.patch);
  if (patch.length === 0) {
    throw new NoObjectiveCVersionError(`${url} has no Objective-C version`);
  }
  // The spec's JSONPatch operations are RFC 6902 operations, the type fast-json-patch names Operation
  return jsonpatch.applyPatch(page, patch as Operation[], false, false).newDocument;
}
