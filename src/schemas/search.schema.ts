import { z } from 'zod';
import { SEARCH_SCOPES } from '../tools/search-api.js';
import type { SearchType } from '../tools/search-api.js';

export const searchAppleDocsSchema = z.object({
  query: z.string().min(1).describe('What you\'re looking for, in words or by name: "SwiftUI haptic feedback", "NSPredicate", "TestFlight external testers". Every word counts. A full list doesn\'t mean a match: when little fits, the list fills up with weaker results.'),
  type: z.enum(Object.keys(SEARCH_SCOPES) as [SearchType, ...SearchType[]]).optional()
    .describe('Leave out to search everything, as Apple\'s search page does with no filter; WWDC sessions show only where Apple mixes them in. "documentation": API reference and articles; "design": the Human Interface Guidelines; "sample": sample code projects; "help": App Store Connect Help (product page, review, TestFlight, pricing); "video": WWDC sessions alone.'),
});
