import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Mock } from 'vitest';

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../src/utils/wwdc-data-source.js', () => ({
  loadGlobalMetadata: vi.fn(),
  loadTopicIndex: vi.fn(),
  loadYearIndex: vi.fn(),
  loadVideoData: vi.fn(),
}));

import { searchAppleDocsSchema } from '../src/schemas/search.schema.js';
import { connectClient } from './helpers/test-helpers.js';

vi.mock('../src/utils/http-client.js', () => ({
  httpClient: {
    getText: vi.fn().mockResolvedValue('<html><body><ul class="search-results"></ul></body></html>'),
    postText: vi.fn().mockResolvedValue(''),
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })
  }
}));

vi.mock('../src/tools/list-technologies.js', () => ({
  handleListTechnologies: vi.fn().mockResolvedValue('Mock technologies list')
}));

vi.mock('../src/tools/search-framework-symbols.js', () => ({
  searchFrameworkSymbols: vi.fn().mockResolvedValue('Mock framework symbols')
}));

vi.mock('../src/tools/get-related-apis.js', () => ({
  handleGetRelatedApis: vi.fn().mockResolvedValue('Mock related APIs')
}));

vi.mock('../src/tools/resolve-references-batch.js', () => ({
  handleResolveReferencesBatch: vi.fn().mockResolvedValue('Mock references')
}));

vi.mock('../src/tools/get-platform-compatibility.js', () => ({
  handleGetPlatformCompatibility: vi.fn().mockResolvedValue('Mock platform compatibility')
}));

vi.mock('../src/tools/find-similar-apis.js', () => ({
  handleFindSimilarApis: vi.fn().mockResolvedValue('Mock similar APIs')
}));

vi.mock('../src/tools/get-documentation-updates.js', () => ({
  handleGetDocumentationUpdates: vi.fn().mockResolvedValue('Mock documentation updates')
}));

vi.mock('../src/tools/get-technology-overviews.js', () => ({
  handleGetTechnologyOverviews: vi.fn().mockResolvedValue('Mock technology overviews')
}));

vi.mock('../src/tools/get-sample-code.js', () => ({
  handleGetSampleCode: vi.fn().mockResolvedValue('Mock sample code')
}));

vi.mock('../src/tools/doc-fetcher.js', () => ({
  fetchAppleDocJson: vi.fn().mockResolvedValue({
    content: [{
      type: 'text',
      text: 'Mock doc content'
    }]
  })
}));

describe('Response Format Validation', () => {
  let client: Client;
  const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args });

  beforeEach(async () => {
    client = await connectClient();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await client.close();
  });

  const validateResponseFormat = (response: any) => {
    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    
    response.content.forEach((item: any) => {
      expect(item).toHaveProperty('type');
      expect(item.type).toBe('text');
      expect(item).toHaveProperty('text');
      expect(typeof item.text).toBe('string');
      
      expect(typeof item.text).not.toBe('object');
      expect(item.text).not.toHaveProperty('content');
    });
  };

  describe('searchAppleDocs response format', () => {
    it('should return properly formatted response for valid query', async () => {
      const response = await call('search_apple_docs', { query: 'SwiftUI' });
      
      validateResponseFormat(response);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).toContain('Apple Documentation Search Results');
    });

    it('should make one request under the other filters', async () => {
      const { httpClient } = await import('../src/utils/http-client.js');
      const post = httpClient.postText as Mock;
      post.mockClear();

      await call('search_apple_docs', { query: 'StoreKit testing', type: 'documentation' });

      expect(post).toHaveBeenCalledTimes(1);
    });

    it('turns down an empty query before searching', () => {
      expect(searchAppleDocsSchema.safeParse({ query: '' }).success).toBe(false);
    });
  });

  describe('All MCP tools response format consistency', () => {
    const toolTests = [
      {
        name: 'listTechnologies',
        method: () => call('list_technologies', {}),
      },
      {
        name: 'searchFrameworkSymbols',
        method: () => call('search_docs_map', { source: 'index', technology: ['SwiftUI'], query: '*' }),
      },
      {
        name: 'getAppleDocContent',
        method: () => call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui' }),
      },
      {
        name: 'getRelatedApis',
        method: () => call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui/view', view: 'related' }),
      },
      {
        name: 'resolveReferencesBatch',
        method: () => call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui', view: 'references' }),
      },
      {
        name: 'getPlatformCompatibility',
        method: () => call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui/view', view: 'availability' }),
      },
      {
        name: 'findSimilarApis',
        method: () => call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui/view', view: 'similar' }),
      },
      {
        name: 'getDocumentationUpdates',
        method: () => call('list_technologies', { catalog: 'updates' }),
      },
      {
        name: 'getTechnologyOverviews',
        method: () => call('list_technologies', { catalog: 'overviews' }),
      },
      {
        name: 'getSampleCode',
        method: () => call('list_technologies', { catalog: 'samples', limit: 50 }),
      },
    ];

    toolTests.forEach(({ name, method }) => {
      it(`${name} should return properly formatted response`, async () => {
        const response = await method();
        
        validateResponseFormat(response);
        expect(typeof response.content[0].text).toBe('string');
      });
    });
  });

  describe('Error response format consistency', () => {
    it('should handle network errors with proper format', async () => {
      const { httpClient } = await import('../src/utils/http-client.js');
      (httpClient.postText as Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(call('search_apple_docs', { query: 'SwiftUI' })).resolves.toMatchObject({
        isError: true, content: [{ type: 'text', text: expect.stringContaining('Network error') }],
      });
    });
  });

  describe('Regression tests for nested response issue', () => {
    it('should not return nested content objects in searchAppleDocs', async () => {
      const response = await call('search_apple_docs', { query: 'SwiftUI' });
      
      const textContent = response.content[0].text;
      expect(typeof textContent).toBe('string');
      expect(textContent).not.toHaveProperty('content');
      
      if (typeof textContent === 'object') {
        fail(`searchAppleDocs returned object instead of string: ${JSON.stringify(textContent)}`);
      }
    });

    it('should prevent double-wrapping of response content', async () => {
      const response = await call('search_apple_docs', { query: 'SwiftUI' });
      
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      
      const firstItem = response.content[0];
      expect(firstItem.type).toBe('text');
      expect(typeof firstItem.text).toBe('string');
      
      try {
        const parsed = JSON.parse(firstItem.text);
        if (parsed && typeof parsed === 'object' && parsed.content) {
          fail('Response text appears to be stringified JSON with nested content structure');
        }
      } catch {
      }
    });

    it('should not return nested content objects in getAppleDocContent', async () => {
      const response = await call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/uikit/uiviewcontroller' });
      
      const textContent = response.content[0].text;
      expect(typeof textContent).toBe('string');
      expect(textContent).not.toHaveProperty('content');
      
      if (typeof textContent === 'object') {
        fail(`getAppleDocContent returned object instead of string: ${JSON.stringify(textContent)}`);
      }
    });

    it('should prevent double-wrapping in getAppleDocContent when fetchAppleDocJson returns MCP format', async () => {
      const response = await call('get_apple_doc_content', { url: 'https://developer.apple.com/documentation/swiftui/view' });
      
      validateResponseFormat(response);
      
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      
      const firstItem = response.content[0];
      expect(firstItem.type).toBe('text');
      expect(typeof firstItem.text).toBe('string');
      
      try {
        const parsed = JSON.parse(firstItem.text);
        if (parsed && typeof parsed === 'object' && parsed.content && Array.isArray(parsed.content)) {
          fail('getAppleDocContent text appears to be stringified MCP response - this indicates double-wrapping');
        }
      } catch {
      }
    });
  });

  describe('Response size and performance validation', () => {
    it('should return reasonable response sizes', async () => {
      const response = await call('search_apple_docs', { query: 'SwiftUI' });
      
      validateResponseFormat(response);
      
      const responseText = response.content[0].text;
      expect(responseText.length).toBeLessThan(50000);
      expect(responseText.length).toBeGreaterThan(10);
    });

    it('should handle large responses gracefully', async () => {
      const largeHtml = '<html><body><ul class="search-results">' + 
        '<li class="search-result">'.repeat(100) +
        '<article><h1>Test Result</h1><p>Description</p></article></li>'.repeat(100) +
        '</ul></body></html>';
      
      const { httpClient } = await import('../src/utils/http-client.js');
      (httpClient.getText as Mock).mockResolvedValueOnce(largeHtml);

      const response = await call('search_apple_docs', { query: 'SwiftUI' });
      
      validateResponseFormat(response);
      expect(response.content[0].text).toBeDefined();
    });
  });
});