import { z } from 'zod';
import { nodeTypeValues } from '../types/docc/render-index.js';
import { API_LIMITS } from '../utils/constants.js';

/** Every kind of page Apple's indexes list, the RenderIndex spec's node types; a group marker only heads them */
export const indexKindSchema = z.enum(['all', ...nodeTypeValues.filter((type) => type !== 'groupMarker')]).default('all');

export const searchDocsMapSchema = z.object({
  source: z.enum(['map', 'index']).default('map').describe('"map": the docs map on disk, every technology at once. "index": one framework\'s sidebar, read live from Apple\'s site, for pages newer than the map or a family of names by wildcard; technology names the framework.'),
  query: z.string().min(1).describe('map: text the title contains, in any case and as typed, without wildcards: a name ("accessibilityInputLabels(_:)"), part of one ("inputlabels") or a word ("gauge"). index: a wildcard for the whole name, in any case: "*View" ends in View, "UI*" starts with UI, "*feedback*" contains it, "registerForTraitChanges*" finds a method by its name, "*" takes every one.'),
  technology: z.array(z.string().min(1)).optional().describe('map: keeps only the pages these technologies\' sidebars list (WebKit\'s WebView is in SwiftUI\'s), by the names the results show ("SwiftUI", "Human Interface Guidelines") or IDs ("swiftui"), in any case. index: the one framework, by its name in any case and spacing ("Foundation Models") or its ID ("foundationmodels").'),
  kind: z.string().min(1).optional().describe('Keeps one kind of page, as the results name it ("struct", "method", "case", "protocol", "article"); an unknown one is answered with the kinds there are.'),
  limit: z.number().int().min(1).max(API_LIMITS.MAX_FRAMEWORK_SYMBOLS_LIMIT).optional().describe(`Most results: from the map, the shortest titles first (${API_LIMITS.DEFAULT_DOCS_MAP_LIMIT} if left out); from an index, in its order (${API_LIMITS.DEFAULT_FRAMEWORK_SYMBOLS_LIMIT}).`),
});
