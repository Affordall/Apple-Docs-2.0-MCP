/**
 * Apple's documentation JSON, typed by openapi-typescript from Swift-DocC's published specs, RenderNode.spec.json
 * (pages) and RenderIndex.spec.json (navigator indexes): `npm run types:docc` regenerates docc/.
 */
import type { components as RenderNodeSpec } from './docc/render-node.js';
import type { components as RenderIndexSpec } from './docc/render-index.js';

type Schemas = RenderNodeSpec['schemas'];

/** A documentation page: an API symbol or an article, its sections as Apple's JSON carries them */
export type RenderNode = Omit<Schemas['DocumentationRenderNode'], 'primaryContentSections'> & {
  primaryContentSections?: DocumentationPrimaryRenderSection[];
};
export type RenderReference = Schemas['RenderReference'];
export type TopicRenderReference = Schemas['TopicRenderReference'];
export type RenderInlineContent = Schemas['RenderInlineContent'];
export type TasksGroupSection = Schemas['TasksGroupSection'];
export type PlatformAvailability = Schemas['PlatformAvailability'];
/** A web-service page's parts: a property, parameter or body field, its type's tokens, and a property's attribute */
export type TypedProperty = Schemas['TypedProperty'];
export type Declaration = Schemas['Declaration'];
export type RelationshipsGroupSection = Schemas['RelationshipsGroupSection'];
export type DeclarationToken = Schemas['DeclarationToken'];
export type Attribute = Schemas['Attribute'];
export type DetailsSection = Schemas['DetailsSection'];
export type CodeExample = Schemas['CodeExample'];
/** A page's sections. Apple's "Mentioned in" carries `kind: "mentions"`, which the spec leaves out (2026-10-12). */
export type DocumentationPrimaryRenderSection =
  | Exclude<Schemas['DocumentationPrimaryRenderSection'], Schemas['MentionsRenderSection']>
  | (Schemas['MentionsRenderSection'] & { kind: 'mentions' });
/**
 * A tutorials page's parts (an overview's volumes, a tutorial's tasks); documentation pages have none. Apple's heroes
 * also name the tutorial's project download, `projectFiles`, and an overview's "Get started" link, `action`, and its
 * Resources open with a paragraph, `content`; the spec leaves these out (2026-10-10, 2026-10-12).
 */
export type RenderSection = Exclude<Schemas['RenderSection'], Schemas['IntroRenderSection'] | Schemas['ResourcesRenderSection']>
  | (Schemas['IntroRenderSection'] & { projectFiles?: string; action?: RenderInlineContent })
  | (Schemas['ResourcesRenderSection'] & { content?: RenderBlockContent[] });

/** A navigator index (index/<framework>, index/updates, index/technologyoverviews) and one node of its tree */
export type RenderIndex = RenderIndexSpec['schemas']['RenderIndex'];
export type RenderIndexNode = RenderIndexSpec['schemas']['Node'];

/** The spec tags tab and row blocks with `kind`; Apple's pages tag them with `type` (HIG tab bars, 2026-10-06) */
type TaggedByType<Block extends { kind: string }> = Omit<Block, 'kind'> & { type: Block['kind'] };
export type RenderBlockContent = Schemas['RenderBlockContent'] | TaggedByType<Schemas['TabNavigator']> | TaggedByType<Schemas['Row']>;

/** Apple marks a deprecation with the version that made it, leaving `deprecated` false (UIAlertView, 2026-10-06) */
export function isDeprecated(platform: PlatformAvailability): boolean {
  return Boolean(platform.deprecated) || platform.deprecatedAt !== undefined;
}

/** A reference to a page; the others are a page's images, videos, files and links */
export function isTopicReference(reference: RenderReference | undefined): reference is TopicRenderReference {
  return reference?.type === 'topic' || reference?.type === 'section';
}
