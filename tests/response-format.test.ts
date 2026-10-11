import type { Mock } from 'vitest';
/**
 * Response format validation tests
 *
 * These tests ensure that all MCP tool responses follow the correct format
 * and prevent nested response structure issues.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock wwdc-data-source before importing anything that uses it
vi.mock('../src/utils/wwdc-data-source.js', () => ({
  loadGlobalMetadata: vi.fn(),
  loadTopicIndex: vi.fn(),
  loadYearIndex: vi.fn(),
  loadVideoData: vi.fn(),
  loadAllVideos: vi.fn(),
  clearDataCache: vi.fn(),
  isDataAvailable: vi.fn().mockResolvedValue(true),
}));

import AppleDeveloperDocsMCPServer from '../src/index.js';

// Mock external dependencies
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

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../src/utils/cache.js', () => ({
  apiCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    has: vi.fn().mockReturnValue(false)
  },
  generateUrlCacheKey: vi.fn().mockReturnValue('test-cache-key')
}));

// Mock all handler functions to return proper string responses
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
  let server: AppleDeveloperDocsMCPServer;

  beforeEach(() => {
    server = new AppleDeveloperDocsMCPServer();
    vi.clearAllMocks();
  });

  /**
   * Valid MCP response format should be:
   * {
   *   content: [
   *     {
   *       type: 'text',
   *       text: string
   *     }
   *   ],
   *   isError?: boolean
   * }
   */
  const validateResponseFormat = (response: any) => {
    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    
    response.content.forEach((item: any) => {
      expect(item).toHaveProperty('type');
      expect(item.type).toBe('text');
      expect(item).toHaveProperty('text');
      expect(typeof item.text).toBe('string');
      
      // Ensure text is not a nested object (the main issue we're preventing)
      expect(typeof item.text).not.toBe('object');
      expect(item.text).not.toHaveProperty('content');
    });
  };

  describe('searchAppleDocs response format', () => {
    it('should return properly formatted response for valid query', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).toContain('Apple Documentation Search Results');
    });

    it('should ask for WWDC sessions separately under all, and list them after the documentation', async () => {
      const { httpClient } = await import('../src/utils/http-client.js');
      const post = httpClient.postText as Mock;
      const stream = (results: unknown[]) => JSON.stringify({ kind: 'search', diff: { append: JSON.stringify({ results }) } });
      post.mockReset();
      post
        .mockResolvedValueOnce(stream([{ value: { metadata: {
          title: 'SKTestSession', kind: 'symbol', permalink: 'https://developer.apple.com/documentation/storekittest/sktestsession',
        } } }]) as never)
        .mockResolvedValueOnce(stream([{ value: { metadata: {
          ids: ['wwdc2020-10659'], titles: ['Introducing StoreKit Testing in Xcode'], itemTypes: ['Video'],
          permalinks: ['https://developer.apple.com/videos/play/wwdc2020/10659'],
        } } }]) as never);

      const text = (await server.searchAppleDocs('StoreKit testing', 'all')).content[0].text;

      // The search developer.apple.com/search sends unfiltered; then the videos on their own
      expect(post.mock.calls[0][1]).not.toHaveProperty('searchScope');
      expect((post.mock.calls[0][1] as { includedResponses: string[] }).includedResponses).toEqual(['search']);
      expect(JSON.stringify(post.mock.calls[1][1])).toContain('/videos/play/');
      expect(text).toContain('SKTestSession');
      expect(text).toContain('get_wwdc_video (year: "2020", videoId: "10659")');
      expect(text.indexOf('SKTestSession')).toBeLessThan(text.indexOf('Introducing StoreKit Testing'));
      post.mockReset();
      post.mockResolvedValue('' as never);
    });

    it('should make one request under the other filters', async () => {
      const { httpClient } = await import('../src/utils/http-client.js');
      const post = httpClient.postText as Mock;
      post.mockClear();

      await server.searchAppleDocs('StoreKit testing', 'documentation');

      expect(post).toHaveBeenCalledTimes(1);
    });

    it('should return properly formatted error response for invalid input', async () => {
      const response = await server.searchAppleDocs('', 'all');
      
      validateResponseFormat(response);
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error:');
    });
  });

  describe('All MCP tools response format consistency', () => {
    const toolTests = [
      {
        name: 'listTechnologies',
        method: () => server.listTechnologies(),
      },
      {
        name: 'searchFrameworkSymbols',
        method: () => server.searchFrameworkSymbols('SwiftUI'),
      },
      {
        name: 'getAppleDocContent',
        method: () => server.getAppleDocContent('https://developer.apple.com/documentation/swiftui'),
      },
      {
        name: 'getRelatedApis',
        method: () => server.getRelatedApis('https://developer.apple.com/documentation/swiftui/view'),
      },
      {
        name: 'resolveReferencesBatch',
        method: () => server.resolveReferencesBatch('https://developer.apple.com/documentation/swiftui'),
      },
      {
        name: 'getPlatformCompatibility',
        method: () => server.getPlatformCompatibility('https://developer.apple.com/documentation/swiftui/view'),
      },
      {
        name: 'findSimilarApis',
        method: () => server.findSimilarApis('https://developer.apple.com/documentation/swiftui/view'),
      },
      {
        name: 'getDocumentationUpdates',
        method: () => server.getDocumentationUpdates(),
      },
      {
        name: 'getTechnologyOverviews',
        method: () => server.getTechnologyOverviews(),
      },
      {
        name: 'getSampleCode',
        method: () => server.getSampleCode(),
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
    it('should maintain consistent error format across all tools', async () => {
      // Test with invalid URL to trigger error in getAppleDocContent
      const response = await server.getAppleDocContent('invalid-url');
      
      validateResponseFormat(response);
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error:');
    });

    it('should handle network errors with proper format', async () => {
      // Mock network failure
      const { httpClient } = await import('../src/utils/http-client.js');
      (httpClient.postText as Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      expect(response.isError).toBe(true);
    });
  });

  describe('Regression tests for nested response issue', () => {
    it('should not return nested content objects in searchAppleDocs', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      // Specifically check that text is not an object with content property
      const textContent = response.content[0].text;
      expect(typeof textContent).toBe('string');
      expect(textContent).not.toHaveProperty('content');
      
      // Ensure we don't have the problematic nested structure:
      // { content: [{ type: 'text', text: { content: [...] } }] }
      if (typeof textContent === 'object') {
        fail(`searchAppleDocs returned object instead of string: ${JSON.stringify(textContent)}`);
      }
    });

    it('should prevent double-wrapping of response content', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      // Check that the response is not double-wrapped
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      
      const firstItem = response.content[0];
      expect(firstItem.type).toBe('text');
      expect(typeof firstItem.text).toBe('string');
      
      // Parse the text to ensure it's not stringified JSON
      try {
        const parsed = JSON.parse(firstItem.text);
        if (parsed && typeof parsed === 'object' && parsed.content) {
          fail('Response text appears to be stringified JSON with nested content structure');
        }
      } catch {
        // This is expected - text should not be valid JSON
      }
    });

    it('should not return nested content objects in getAppleDocContent', async () => {
      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/uikit/uiviewcontroller');
      
      // Specifically check that text is not an object with content property
      const textContent = response.content[0].text;
      expect(typeof textContent).toBe('string');
      expect(textContent).not.toHaveProperty('content');
      
      // Ensure we don't have the problematic nested structure:
      // { content: [{ type: 'text', text: { content: [...] } }] }
      if (typeof textContent === 'object') {
        fail(`getAppleDocContent returned object instead of string: ${JSON.stringify(textContent)}`);
      }
    });

    it('should prevent double-wrapping in getAppleDocContent when fetchAppleDocJson returns MCP format', async () => {
      const response = await server.getAppleDocContent('https://developer.apple.com/documentation/swiftui/view');
      
      // Verify the response structure is correct
      validateResponseFormat(response);
      
      // Check that the response is not double-wrapped
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      
      const firstItem = response.content[0];
      expect(firstItem.type).toBe('text');
      expect(typeof firstItem.text).toBe('string');
      
      // Ensure the text content is not a stringified MCP response
      try {
        const parsed = JSON.parse(firstItem.text);
        if (parsed && typeof parsed === 'object' && parsed.content && Array.isArray(parsed.content)) {
          fail('getAppleDocContent text appears to be stringified MCP response - this indicates double-wrapping');
        }
      } catch {
        // This is expected - text should not be valid JSON representing an MCP response
      }
    });

    it('should handle getAppleDocContent with enhanced options without nesting', async () => {
      // Test with all enhanced options enabled
      const response = await server.getAppleDocContent(
        'https://developer.apple.com/documentation/swiftui/view',
        true,  // includeRelatedApis
        true,  // includeReferences
        true,  // includeSimilarApis
        true   // includePlatformAnalysis
      );
      
      validateResponseFormat(response);
      
      const textContent = response.content[0].text;
      expect(typeof textContent).toBe('string');
      expect(textContent).not.toHaveProperty('content');
      
      // Verify that enhanced content was requested (mock should still return simple content)
      expect(textContent).toContain('Mock doc content');
    });
  });

  describe('Response size and performance validation', () => {
    it('should return reasonable response sizes', async () => {
      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      
      const responseText = response.content[0].text;
      expect(responseText.length).toBeLessThan(50000); // 50KB limit
      expect(responseText.length).toBeGreaterThan(10); // Not empty
    });

    it('should handle large responses gracefully', async () => {
      // Mock a large response
      const largeHtml = '<html><body><ul class="search-results">' + 
        '<li class="search-result">'.repeat(100) +
        '<article><h1>Test Result</h1><p>Description</p></article></li>'.repeat(100) +
        '</ul></body></html>';
      
      const { httpClient } = await import('../src/utils/http-client.js');
      (httpClient.getText as Mock).mockResolvedValueOnce(largeHtml);

      const response = await server.searchAppleDocs('SwiftUI', 'all');
      
      validateResponseFormat(response);
      // Should handle large responses without breaking format
      expect(response.content[0].text).toBeDefined();
    });
  });
});