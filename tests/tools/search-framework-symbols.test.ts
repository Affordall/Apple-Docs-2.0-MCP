import { readFileSync } from 'node:fs';
import type { Mock } from 'vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { searchFrameworkSymbols } from '../../src/tools/search-framework-symbols.js';
import { mockData, createTestFrameworkIndex } from '../helpers/test-helpers.js';

vi.mock('../../src/utils/http-client.js');

import { pageCache } from '../../src/utils/cache.js';
import { APPLE_URLS } from '../../src/utils/constants.js';
import { httpClient } from '../../src/utils/http-client.js';

/** Apple's technologies list as captured (`npm run types:captured`), already read: the IDs typed names resolve to */
const technologies: unknown = JSON.parse(readFileSync(new URL('../../api-map/responses/technologies.json', import.meta.url), 'utf8'));

describe('searchFrameworkSymbols', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageCache.set(APPLE_URLS.TECHNOLOGIES_JSON, technologies as object);
  });

  describe('successful searches', () => {
    it('should search for classes in UIKit framework', async () => {
      
      (httpClient.getJson as Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 10);

      expect(httpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/tutorials/data/index/uikit'
      );
      expect(result).toContain('UIView');
      expect(result).toContain('UIViewController');
      expect(result).toContain('Found:** 4 pages');
    });

    it('should search with wildcard pattern', async () => {
      (httpClient.getJson as Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', '*View', 10);

      expect(result).toContain('UIView');
      expect(result).toContain('UITableView');
      expect(result).toContain('UIStackView');
      expect(result).not.toContain('UIViewController');
      expect(result).toContain('matching "*View"');
    });

    it('should search all symbol types', async () => {
      (httpClient.getJson as Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'all', undefined, 10);

      expect(result).toContain('## class (4)');
      expect(result).toContain('## struct (1)');
      expect(result).toContain('UIView');
      expect(result).toContain('List');
    });

    it('should respect limit parameter', async () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        path: `/documentation/uikit/class${i}`,
        title: `Class${i}`,
        type: 'class',
        beta: false,
        deprecated: false,
        children: [],
      }));

      (httpClient.getJson as Mock).mockResolvedValue(
        createTestFrameworkIndex(manyItems)
      );

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 5);

      const classLinks = (result.match(/\[.*?\]/g) || []).length;
      expect(classLinks).toBe(5);
    });

  });

  describe('error cases', () => {
    it('should handle invalid framework gracefully', async () => {
      (httpClient.getJson as Mock).mockRejectedValue(new Error('404 Not Found'));

      await expect(searchFrameworkSymbols('invalidframework', 'class', undefined, 10)).rejects.toThrow('404 Not Found');
    });

    it('should handle empty framework name', async () => {
      (httpClient.getJson as Mock).mockRejectedValue(new Error('Invalid URL'));

      await expect(searchFrameworkSymbols('', 'class', undefined, 10)).rejects.toThrow('Invalid URL');
    });

    it('should handle no results gracefully', async () => {
      (httpClient.getJson as Mock).mockResolvedValue({
        interfaceLanguages: {
          swift: [
            {
              path: '/documentation/uikit/uiview',
              title: 'UIView',
              type: 'class',
              beta: false,
              deprecated: false,
              children: [],
            }
          ]
        }
      });

      const result = await searchFrameworkSymbols('uikit', 'macro', undefined, 10);

      expect(result).toContain('No page in the UIKit index of kind macro');
    });

    it('should handle network errors', async () => {
      (httpClient.getJson as Mock).mockRejectedValue(new Error('Network error'));

      await expect(searchFrameworkSymbols('uikit', 'class', undefined, 10)).rejects.toThrow('Network error');
    });
  });

  describe('edge cases', () => {
    it('reads brackets as a glob reads them, one of the letters inside', async () => {
      (httpClient.getJson as Mock).mockResolvedValue(mockData.frameworkIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', 'UI[View]*', 10);

      expect(result).toContain('UIView');
      expect(result).not.toContain('UITableView');
    });

    it('should handle deeply nested items', async () => {
      const nestedIndex = createTestFrameworkIndex([
        {
          path: '/documentation/uikit/views',
          title: 'Views',
          type: 'collection',
          children: [
            {
              path: '/documentation/uikit/views/basic',
              title: 'Basic Views',
              type: 'collection',
              children: [
                {
                  path: '/documentation/uikit/uiview',
                  title: 'UIView',
                  type: 'class',
                  children: [],
                },
              ],
            },
          ],
        },
      ]);

      (httpClient.getJson as Mock).mockResolvedValue(nestedIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 10);

      expect(result).toContain('UIView');
      expect(result).toContain('Found:** 1 page');
    });

    it('should handle framework name case variations', async () => {
      (httpClient.getJson as Mock).mockResolvedValue(mockData.frameworkIndex);

      const result1 = await searchFrameworkSymbols('UIKit', 'class', undefined, 1);
      const result2 = await searchFrameworkSymbols('UIKIT', 'class', undefined, 1);
      const result3 = await searchFrameworkSymbols('uikit', 'class', undefined, 1);

      // All should call the same lowercase URL: one download, cached
      expect(httpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/tutorials/data/index/uikit'
      );
      expect(httpClient.getJson).toHaveBeenCalledTimes(1);
    });

    it('should handle items with beta and deprecated flags', async () => {
      const flaggedIndex = createTestFrameworkIndex([
        {
          path: '/documentation/uikit/betaclass',
          title: 'BetaClass',
          type: 'class',
          beta: true,
          deprecated: false,
          children: [],
        },
        {
          path: '/documentation/uikit/deprecatedclass',
          title: 'DeprecatedClass',
          type: 'class',
          beta: false,
          deprecated: true,
          children: [],
        },
      ]);

      (httpClient.getJson as Mock).mockResolvedValue(flaggedIndex);

      const result = await searchFrameworkSymbols('uikit', 'class', undefined, 10);

      expect(result).toContain('BetaClass**');
      expect(result).toContain('*(class, beta)*');
      expect(result).toContain('DeprecatedClass**');
      expect(result).toContain('*(class, deprecated)*');
    });
  });
});