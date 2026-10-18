import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockFetchAppleDocJson } = vi.hoisted(() => ({ mockFetchAppleDocJson: vi.fn() }));

vi.mock('../../src/utils/wwdc-data-source.js', () => ({
  loadGlobalMetadata: vi.fn(),
  loadTopicIndex: vi.fn(),
  loadYearIndex: vi.fn(),
  loadVideoData: vi.fn(),
}));

vi.mock('../../src/tools/doc-fetcher.js', () => ({
  fetchAppleDocJson: mockFetchAppleDocJson
}));

vi.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    getText: vi.fn().mockResolvedValue('<html><body><ul class="search-results"></ul></body></html>'),
    getJson: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })
  }
}));

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { connectClient } from '../helpers/test-helpers.js';

describe('getAppleDocContent Nested Response Regression Tests', () => {
  let client: Client;
  const read = (url: string) => client.callTool({ name: 'get_apple_doc_content', arguments: { url } });

  beforeEach(async () => {
    client = await connectClient();
    vi.clearAllMocks();
  });

  describe('Preventing nested response structure', () => {
    it('should not double-wrap when fetchAppleDocJson returns MCP format', async () => {
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Mock documentation content for UIViewController'
        }]
      });

      const response = await read('https://developer.apple.com/documentation/uikit/uiviewcontroller');

      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content.length).toBe(1);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');
      expect(contentItem.text).toBe('Mock documentation content for UIViewController');

      expect(contentItem.text).not.toHaveProperty('content');
      expect(typeof contentItem.text).not.toBe('object');

      expect(mockFetchAppleDocJson).toHaveBeenCalledWith(
        'https://developer.apple.com/documentation/uikit/uiviewcontroller',
        'swift',
      );
    });

    it('should handle error responses without double-wrapping', async () => {
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Error: Failed to get Apple doc content: Network error\n\nPlease try accessing the documentation directly at: https://developer.apple.com/documentation/invalid'
        }],
        isError: true
      });

      const response = await read('https://developer.apple.com/documentation/invalid');

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('isError', true);
      expect(Array.isArray(response.content)).toBe(true);

      const contentItem = response.content[0];
      expect(contentItem.type).toBe('text');
      expect(typeof contentItem.text).toBe('string');
      expect(contentItem.text).toContain('Error: Failed to get Apple doc content');

      expect(contentItem.text).not.toHaveProperty('content');
    });
  });

  describe('Specific regression scenarios', () => {
    it('should detect if handleAsyncOperation wrapper is incorrectly used', async () => {

      const correctMcpResponse = {
        content: [{
          type: 'text',
          text: 'Correct MCP response from fetchAppleDocJson'
        }]
      };

      mockFetchAppleDocJson.mockResolvedValue(correctMcpResponse);

      const response = await read('https://developer.apple.com/documentation/swiftui/view');

      const textContent = response.content[0].text;
      
      let parsedContent;
      try {
        parsedContent = JSON.parse(textContent);
      } catch {
        parsedContent = null;
      }

      if (parsedContent && typeof parsedContent === 'object' && parsedContent.content) {
        fail(`getAppleDocContent appears to be double-wrapping responses! 
              Text content is a stringified MCP response: ${textContent}`);
      }

      expect(textContent).toBe('Correct MCP response from fetchAppleDocJson');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large content responses without nesting', async () => {
      const largeContent = 'Large content '.repeat(1000);
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: largeContent
        }]
      });

      const response = await read('https://developer.apple.com/documentation/foundation');

      expect(response.content[0].text).toBe(largeContent);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).not.toHaveProperty('content');
    });

    it('should handle special characters and markdown without nesting', async () => {
      const specialContent = `# Documentation
      
## Overview
This contains **bold** text, \`code\`, and [links](https://example.com).

### JSON-like content:
\`\`\`json
{
  "content": "This looks like MCP format but it's just documentation"
}
\`\`\``;

      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: specialContent
        }]
      });

      const response = await read('https://developer.apple.com/documentation/swift');

      expect(response.content[0].text).toBe(specialContent);
      expect(typeof response.content[0].text).toBe('string');
      expect(response.content[0].text).not.toHaveProperty('content');
    });

    it('should detect the specific nested structure that was causing the original bug', async () => {
      
      mockFetchAppleDocJson.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Valid documentation content'
        }]
      });

      const response = await read('https://developer.apple.com/documentation/uikit/uiviewcontroller');

      const textContent = response.content[0].text;
      
      expect(typeof textContent).toBe('string');
      
      expect(textContent).not.toHaveProperty('text');
      expect(textContent).not.toHaveProperty('content');
      expect(textContent).not.toHaveProperty('type');
      
      expect(textContent).toBe('Valid documentation content');
    });
  });
});