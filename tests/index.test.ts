/**
 * The server as a client sees it, over the SDK's in-memory transport: the tools it lists, and each call routed to its
 * handler with its arguments checked against the tool's schema.
 */
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAppleDocJson } from '../src/tools/doc-fetcher.js';
import { handleGetDocumentationUpdates } from '../src/tools/get-documentation-updates.js';
import { handleListTechnologies } from '../src/tools/list-technologies.js';
import { searchStream } from '../src/tools/search-api.js';
import { searchFrameworkSymbols } from '../src/tools/search-framework-symbols.js';
import { parseSearchResults } from '../src/tools/search-parser.js';
import { connectClient } from './helpers/test-helpers.js';

vi.mock('../src/tools/doc-fetcher.js', () => ({ fetchAppleDocJson: vi.fn() }));
vi.mock('../src/tools/get-documentation-updates.js', () => ({ handleGetDocumentationUpdates: vi.fn() }));
vi.mock('../src/tools/list-technologies.js', () => ({ handleListTechnologies: vi.fn() }));
// The search schema reads the module's scopes
vi.mock('../src/tools/search-api.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/tools/search-api.js')>(),
  searchStream: vi.fn(),
}));
vi.mock('../src/tools/search-framework-symbols.js', () => ({ searchFrameworkSymbols: vi.fn() }));
vi.mock('../src/tools/search-parser.js', () => ({ parseSearchResults: vi.fn() }));

const answer = (text: string) => ({ content: [{ type: 'text' as const, text }] });

describe('the server', () => {
  let client: Client;

  beforeEach(async () => {
    vi.clearAllMocks();
    client = await connectClient();
  });

  afterEach(async () => {
    await client.close();
  });

  it('lists every tool, each with a description and every argument described', async () => {
    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual([
      'get_apple_doc_content', 'get_wwdc_video', 'list_technologies', 'list_wwdc_videos', 'search_apple_docs',
      'search_docs_map', 'search_wwdc_content',
    ]);
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.annotations?.readOnlyHint).toBe(true);
      for (const argument of Object.values(tool.inputSchema.properties ?? {})) {
        expect((argument as { description?: string }).description).toBeTruthy();
      }
    }
  });

  it('passes a search its query, no type when none is given, and returns its answer', async () => {
    vi.mocked(parseSearchResults).mockReturnValue(answer('Search results'));
    const search = vi.mocked(searchStream);

    await expect(client.callTool({ name: 'search_apple_docs', arguments: { query: 'SwiftUI' } }))
      .resolves.toMatchObject(answer('Search results'));
    expect(search).toHaveBeenCalledWith('SwiftUI', undefined);
  });

  it('passes a page read its URL and the language Swift', async () => {
    const read = vi.mocked(fetchAppleDocJson).mockResolvedValue(answer('Doc content'));

    await client.callTool({
      name: 'get_apple_doc_content',
      arguments: { url: 'https://developer.apple.com/documentation/swiftui' },
    });

    expect(read).toHaveBeenCalledWith('https://developer.apple.com/documentation/swiftui', 'swift');
  });

  it('fills the defaults a tool leaves to its schema', async () => {
    const list = vi.mocked(handleListTechnologies).mockResolvedValue('Technologies');

    await client.callTool({ name: 'list_technologies', arguments: { category: 'games', language: 'swift', includeBeta: false } });
    await client.callTool({ name: 'list_technologies', arguments: { category: 'ui', limit: 10 } });

    expect(list).toHaveBeenNthCalledWith(1, 'games', 'swift', false, 200);
    expect(list).toHaveBeenNthCalledWith(2, 'ui', undefined, true, 10);
  });

  it('passes every argument it is given, in order', async () => {
    const symbols = vi.mocked(searchFrameworkSymbols).mockResolvedValue('Symbols');
    const updates = vi.mocked(handleGetDocumentationUpdates).mockResolvedValue('Updates');

    await client.callTool({
      name: 'search_docs_map',
      arguments: { source: 'index', technology: ['swiftui'], kind: 'struct', query: '*View', limit: 100 },
    });
    await client.callTool({
      name: 'list_technologies',
      arguments: { catalog: 'updates', category: 'wwdc', technology: 'SwiftUI', searchQuery: 'animation', includeBeta: true, limit: 50 },
    });

    expect(symbols).toHaveBeenCalledWith('swiftui', 'struct', '*View', 100);
    expect(updates).toHaveBeenCalledWith('wwdc', 'SwiftUI', undefined, 'animation', true, 50);
  });

  it('refuses arguments its schema rejects, without calling the tool', async () => {
    const search = vi.mocked(searchStream);

    const result = await client.callTool({ name: 'search_apple_docs', arguments: {} });

    expect(result).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('Input validation error') }] });
    expect(search).not.toHaveBeenCalled();
  });

  it('answers an unknown tool, and a tool that throws, with an error result', async () => {
    vi.mocked(handleListTechnologies).mockRejectedValue(new Error('Apple is down'));

    await expect(client.callTool({ name: 'unknown_tool', arguments: {} }))
      .resolves.toMatchObject({ isError: true, content: [{ text: expect.stringContaining('unknown_tool not found') }] });
    await expect(client.callTool({ name: 'list_technologies', arguments: {} }))
      .resolves.toMatchObject({ isError: true, content: [{ type: 'text', text: 'Apple is down' }] });
  });
});
