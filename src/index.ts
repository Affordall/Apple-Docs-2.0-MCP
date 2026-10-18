#!/usr/bin/env node

import { readFileSync } from 'fs';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/handlers.js';

const PACKAGE = z.object({ name: z.string(), version: z.string() })
  .parse(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')));

/**
 * The server's instructions, which Claude Code adds to its system prompt cut at 2,048 characters: how to search with
 * these tools, from tests on real needs (README.md, "Finding things")
 */
const SEARCH_GUIDE = `Apple's API docs, Human Interface Guidelines (HIG), App Store Connect Help, sample code and WWDC sessions with their code. Search here before writing or fixing code that calls an Apple framework or Swift. A name, or part of one: search_docs_map first.

1. Code examples: search_wwdc_content, view "examples", with the type or attribute the code contains as \`query\` (\`LanguageModelSession\`, \`@Generable\`); a framework name finds about half as many. Then read the best session with get_wwdc_video (includeTranscript: false).
2. Sample projects: search_apple_docs with type "sample", then get_apple_doc_content on the best one for its code and Download link.
3. Replacing hand-rolled code: search_apple_docs (type "documentation") for what it does, with the UI framework's name ("SwiftUI haptic feedback"; without it, older UIKit and Foundation APIs lead), then confirm the family with search_docs_map's source "index" and a wildcard (\`*feedback*\`).
4. Bugs: search the failing API's name with what it should do ("NLTagger requestAssets", "SwiftData CloudKit sync requirements") and read the first member or article: its Important notes and tables hold the rules. For a deprecated call, get_apple_doc_content's view "similar" leads with Apple's replacement.
5. Design: search with type "design" and the HIG's own noun ("progress indicators"), then read the first result titled with it by its URL, never a guessed one.

Searched wrong, or not there:
- Wrong: 0 results (describe the behavior in Apple's words), a 404 (take URLs and framework IDs such as "foundationmodels" from results), or one fuzzy hit for a guessed name (follow it: "ProgressRing" leads to ProgressView).
- Not there: the word matches only another framework's term ("confetti" is an AVFoundation camera reaction), a wildcard symbol search in the framework finds nothing, and Xcode's DocumentationSearch returns only generic matches; look outside Apple's frameworks.
- An existing API comes first under its exact name. Result counts mean nothing: searches fill about 20 slots.`;

const server = new McpServer(PACKAGE, { instructions: SEARCH_GUIDE });
registerTools(server);
await server.connect(new StdioServerTransport());
