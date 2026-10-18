import type { PlatformAvailability, RenderInlineContent, RenderNode, RenderReference } from '../types/docc.js';
import { isDeprecated, isTopicReference } from '../types/docc.js';
import { APPLE_URLS } from '../utils/constants.js';
import { siteUrl } from '../utils/url-converter.js';

type References = RenderNode['references'];

/**
 * Format inline content: text, code voice, links and references, keeping strong and emphasized runs. A new term is
 * emphasized and an inline head strong, as swift-docc-render draws them; superscript and subscript keep their HTML.
 */
export function formatInlineContent(inlineContent: RenderInlineContent[], references: References): string {
  return inlineContent
    .map((inline) => {
      switch (inline.type) {
        case 'text':
          return inline.text;
        case 'codeVoice':
          return `\`${inline.code}\``;
        case 'strong':
        case 'inlineHead':
          return `**${formatInlineContent(inline.inlineContent, references)}**`;
        case 'emphasis':
        case 'italic':
        case 'newTerm':
          return `*${formatInlineContent(inline.inlineContent, references)}*`;
        case 'superscript':
          return `<sup>${formatInlineContent(inline.inlineContent, references)}</sup>`;
        case 'subscript':
          return `<sub>${formatInlineContent(inline.inlineContent, references)}</sub>`;
        case 'link':
          return `[${inline.title}](${inline.destination})`;
        case 'reference':
          return formatReference(inline, references);
        case 'image':
          return formatImage(inline.identifier, references);
        default: {
          // A spec type without a case fails the build here; one Apple ships before the spec lists it keeps its words
          const unlisted: never = inline;
          return formatUnlistedInline(unlisted, references);
        }
      }
    })
    .join('');
}

/** Whether a value is a list of inline content, as a type the spec doesn't list yet carries it */
function isInlineList(value: unknown): value is RenderInlineContent[] {
  return Array.isArray(value);
}

/** An inline type the spec doesn't list yet, such as `strikethrough`: its words, or the whole of it as its JSON */
function formatUnlistedInline(inline: object, references: References): string {
  if ('inlineContent' in inline && isInlineList(inline.inlineContent)) {
    return formatInlineContent(inline.inlineContent, references);
  }
  return 'text' in inline && typeof inline.text === 'string' ? inline.text : `\`${JSON.stringify(inline)}\``;
}

/**
 * A reference reads as the words the page links (its overriding title), else its target's title; a symbol is code.
 * An active one links to its target, as Apple's pages do.
 */
function formatReference(inline: Extract<RenderInlineContent, { type: 'reference' }>, references: References): string {
  const target = references?.[inline.identifier];
  const title = inline.overridingTitle ?? (target && 'title' in target ? target.title : undefined) ?? inline.identifier.split('/').pop() ?? '';
  const text = isTopicReference(target) && target.kind === 'symbol' ? `\`${title}\`` : title;
  const url = inline.isActive ? referenceUrl(target) : undefined;
  return url ? `[${text}](${url})` : text;
}

/**
 * Where an asset loads from (an image, a sample's download, a tutorial's project files): its path, with or without a
 * leading slash, is from the pages' base, as swift-docc-render resolves it; a full URL stays as it is
 */
function assetUrl(path: string): string {
  return new URL(path.replace(/^\//, ''), APPLE_URLS.ASSETS).href;
}

/**
 * Where a reference leads: a page (a WWDC session's carries a full URL; a page's, a site path), a link, or a download
 */
export function referenceUrl(ref: RenderReference | undefined): string | undefined {
  if (isTopicReference(ref)) {
    return siteUrl(ref.url);
  }
  if (ref?.type === 'link') {
    return ref.url;
  }
  return ref?.type === 'download' || ref?.type === 'externalLocation' ? assetUrl(ref.url) : undefined;
}

/**
 * The web address of a page Apple names by its doc:// identifier: doc://<bundle>/<path> is developer.apple.com/<path>
 */
export function docUrl(identifier: string): string {
  return `${APPLE_URLS.BASE}/${identifier.replace(/^doc:\/\/[^/]+\//, '')}`;
}

/**
 * An image or a video as Markdown, as Apple's Markdown writes both: Apple's alt text, which carries what it shows, and
 * its light 2x file
 */
export function formatImage(identifier: string, references: References): string {
  const image = references?.[identifier];
  if (image?.type !== 'image' && image?.type !== 'video') {
    return '';
  }
  const file = image.variants.find((variant) => variant.traits.includes('light')) ?? image.variants[0];
  if (!file) {
    return image.alt ?? '';
  }
  return `![${image.alt ?? ''}](${assetUrl(file.url)})`;
}

/**
 * A link to a page the JSON names by identifier, titled as the page's references title it; a symbol is code
 */
export function formatIdentifierLink(identifier: string, references: References): string {
  const ref = references?.[identifier];
  if (isTopicReference(ref)) {
    return `[${ref.kind === 'symbol' ? `\`${ref.title}\`` : ref.title}](${referenceUrl(ref)})`;
  }
  // Unlisted in the references: its identifier is still its address
  return `[\`${identifier.split('/').pop() ?? identifier}\`](${docUrl(identifier)})`;
}

/**
 * A Topics or See Also line: the page's link, a symbol's titled with its declaration, then the one-line summary its
 * reference carries, as Apple's pages list a type's members
 */
export function formatIdentifierLine(identifier: string, references: References): string {
  const ref = references?.[identifier];
  const summary = isTopicReference(ref) && ref.abstract ? formatInlineContent(ref.abstract, references).trim() : '';
  const declaration = isTopicReference(ref) ? (ref.fragments ?? []).map((fragment) => fragment.text).join('') : '';
  const link = isTopicReference(ref) && declaration
    ? `[\`${declaration}\`](${referenceUrl(ref)})`
    : formatIdentifierLink(identifier, references);
  return `- ${link}${summary ? `: ${summary}` : ''}\n`;
}

/** Whether formatIdentifierLine can link an identifier: a page its references carry, or a doc:// address */
export function isLinkable(identifier: string, references: References): boolean {
  return isTopicReference(references?.[identifier]) || identifier.startsWith('doc://');
}

/**
 * The title with the one tag Apple's page gives it (swift-docc-render, views/DocumentationTopic.vue): Deprecated when
 * the page's own reference is, it has a deprecation summary, or every platform deprecates it; else Beta when every
 * platform is beta. Then the role heading, the title's eyebrow.
 */
export function formatDocumentHeader(jsonData: RenderNode): string {
  const platforms = jsonData.metadata?.platforms ?? [];
  const own = jsonData.references?.[jsonData.identifier?.url ?? ''];
  const deprecated = (isTopicReference(own) && own.deprecated === true) || (jsonData.deprecationSummary?.length ?? 0) > 0 ||
    (platforms.length > 0 && platforms.every((platform) => platform.deprecatedAt !== undefined));
  const beta = platforms.length > 0 && platforms.every((platform) => platform.beta === true);
  const tag = deprecated ? ' (**Deprecated**)' : beta ? ' (**Beta**)' : '';
  const role = jsonData.metadata?.roleHeading ? `**${jsonData.metadata.roleHeading}**\n\n` : '';
  return `# ${jsonData.metadata?.title ?? 'Documentation'}${tag}\n\n${role}`;
}

export function formatDocumentAbstract(jsonData: RenderNode): string {
  const abstractText = formatInlineContent(jsonData.abstract ?? [], jsonData.references).trim();
  return abstractText ? `${abstractText}\n\n` : '';
}

export function formatPlatformAvailability(jsonData: RenderNode): string {
  if (!jsonData.metadata?.platforms || !Array.isArray(jsonData.metadata.platforms)) {
    return '';
  }

  const platforms = jsonData.metadata.platforms;
  // Apple's note, often the replacement, repeats on each platform it is for: once each, naming them when others lack it
  const notes = [...new Set(platforms.flatMap((platform) => platform.message ?? []))].map((message) => {
    const on = platforms.filter((platform) => platform.message === message).map((platform) => platform.name);
    return `- Note: ${message}${on.length < platforms.length ? ` (${on.join(', ')})` : ''}\n`;
  });
  return `## Platform Availability\n\n${platforms.map(formatPlatformLine).join('')}${notes.join('')}\n`;
}

/**
 * " 17.0+" after a platform's name, or nothing when the page's JSON gives no version: Apple's site then shows the name
 * alone (swift-docc-render's AvailabilityRange), as on XCUIAutomation's pages.
 */
export function formatIntroducedVersion(platform: PlatformAvailability): string {
  return platform.introducedAt ? ` ${platform.introducedAt}+` : '';
}

function formatPlatformLine(platform: PlatformAvailability): string {
  const platformStatus = [];

  if (platform.beta) {
    platformStatus.push('Beta');
  }
  // "Deprecated in 27.2" says it already
  if (isDeprecated(platform) && !platform.deprecatedAt) {
    platformStatus.push('Deprecated');
  }
  if (platform.unavailable) {
    platformStatus.push('Unavailable');
  }

  let platformLine = `- **${platform.name}**${formatIntroducedVersion(platform)}`;

  if (platform.deprecatedAt) {
    platformLine += ` | Deprecated in ${platform.deprecatedAt}`;
  }
  if (platformStatus.length > 0) {
    platformLine += ` | Status: ${platformStatus.join(', ')}`;
  }

  return `${platformLine}\n`;
}

export function formatSeeAlsoSection(jsonData: RenderNode): string {
  if (!jsonData.seeAlsoSections || !Array.isArray(jsonData.seeAlsoSections)) {
    return '';
  }

  let content = '## See Also\n\n';

  jsonData.seeAlsoSections.forEach((seeAlso) => {
    if (seeAlso.title && seeAlso.identifiers) {
      content += `### ${seeAlso.title}\n\n`;
      content += formatSeeAlsoIdentifiers(seeAlso.identifiers, jsonData.references);
    }
  });

  return content;
}

function formatSeeAlsoIdentifiers(identifiers: string[], references: References): string {
  return identifiers.map((identifier) => formatIdentifierLine(identifier, references)).join('') + '\n';
}

export function isSpecificAPIDocument(jsonData: RenderNode): boolean {
  // A web-service endpoint has no declaration; its URL is its signature
  return jsonData.primaryContentSections?.some((section) => 'kind' in section &&
    (section.kind === 'declarations' || section.kind === 'restEndpoint')) ?? false;
}
