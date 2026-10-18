import { z } from 'zod';
import { API_LIMITS } from '../utils/constants.js';

export const listTechnologiesSchema = z.object({
  catalog: z.enum(['technologies', 'samples', 'updates', 'overviews']).default('technologies').describe('"technologies": Apple\'s frameworks and technologies; "samples": Apple\'s Sample Code Library; "updates": Apple\'s Updates page; "overviews": Apple\'s Technology Overviews.'),
  category: z.string().optional().describe('Keeps one part of the catalog, in any case: technologies, the ones whose category or one of whose tags contains it ("Machine learning" finds Core ML, Create ML and Vision); samples, a library section, by any part of its name ("WWDC26" lists that year\'s samples); updates, a section of the page, by any part of its title ("Release notes"); overviews, one collection, by its whole title or the last part of its link. Technologies, updates and overviews answer a value they lack with the ones they have.'),
  language: z.enum(['swift', 'occ']).optional().describe('technologies only: keeps the technologies available in Swift ("swift") or Objective-C ("occ").'),
  framework: z.string().optional().describe('samples only: keeps the samples whose framework, title or link names this framework, in any spelling ("SwiftUI", "storekit", "Core ML").'),
  technology: z.string().optional().describe('updates only: keeps the entries whose framework, title or summary contains this name ("SwiftUI"), in any case.'),
  searchQuery: z.string().optional().describe('samples: words that must all appear, in any case, in a sample\'s title, sections, framework, link or summary ("SwiftData widget"); the list keeps the library\'s order. updates: keeps the entries whose title or summary contains this text, in any case. overviews: keeps the collections and articles whose title or link contains this text, in any case; a collection\'s summary counts too.'),
  includeBeta: z.boolean().default(true).describe('false leaves out beta technologies, samples or updates.'),
  includeSubcategories: z.boolean().default(true).describe('overviews only: false lists only the collections, without their articles.'),
  limit: z.number().int().positive().max(API_LIMITS.MAX_TECHNOLOGIES_LIMIT).optional().describe(`Most entries to show, in all; if left out, ${API_LIMITS.DEFAULT_TECHNOLOGIES_LIMIT} technologies, ${API_LIMITS.DEFAULT_SAMPLE_CODE_LIMIT} samples, ${API_LIMITS.DEFAULT_DOCUMENTATION_UPDATES_LIMIT} updates, ${API_LIMITS.DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT} overview entries.`),
});
