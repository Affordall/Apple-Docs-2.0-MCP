import type { Mocked } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFindSimilarApis } from '../../src/tools/find-similar-apis.js';
import { httpClient } from '../../src/utils/http-client.js';

vi.mock('../../src/utils/http-client.js');

const mockHttpClient = httpClient as Mocked<typeof httpClient>;

describe('find-similar-apis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleFindSimilarApis', () => {
    const mockApiUrl = 'https://developer.apple.com/documentation/swiftui/text';
    const mockJsonResponse = {
      data: {
        identifier: 'swiftui/text',
        title: 'Text',
        abstract: [{ type: 'text', text: 'A view that displays text.' }],
        metadata: {
          title: 'Text',
          roleHeading: 'Structure',
          platforms: [{ name: 'iOS', introducedAt: '13.0' }],
        },
        seeAlsoSections: [
          {
            title: 'Text Display',
            identifiers: ['swiftui/label', 'swiftui/textfield'],
          },
        ],
        topicSections: [
          {
            title: 'Creating Text Views',
            identifiers: ['swiftui/text/init', 'swiftui/text/init-string'],
          },
        ],
      },
      references: {
        'swiftui/label': {
          type: 'topic', title: 'Label',
          url: '/documentation/swiftui/label',
          abstract: [{ type: 'text', text: 'A view that displays text and an icon.' }],
        },
        'swiftui/textfield': {
          type: 'topic', title: 'TextField',
          url: '/documentation/swiftui/textfield',
          abstract: [{ type: 'text', text: 'A control for entering text.' }],
        },
        'swiftui/text/init': {
          type: 'topic', title: 'init(_:)',
          url: '/documentation/swiftui/text/init',
        },
        'swiftui/text/init-string': {
          type: 'topic', title: 'init(String)',
          url: '/documentation/swiftui/text/init-string',
        },
      },
    };

    it('should find similar APIs with shallow search depth', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockJsonResponse);

      const result = await handleFindSimilarApis(mockApiUrl, 'shallow');

      expect(mockHttpClient.getJson).toHaveBeenCalledWith('https://developer.apple.com/tutorials/data/documentation/swiftui/text.json');
      expect(mockHttpClient.getJson).toHaveBeenCalledTimes(1);
      
      expect(result).toContain('# Similar APIs to Text');
      expect(result).toContain('Structure · iOS 13.0+');
      expect(result).toContain('## See Also: Text Display');
      expect(result).toContain('[Label]');
      expect(result).toContain('A view that displays text and an icon.');
      expect(result).toContain('[TextField]');
      expect(result).toContain('Found 2 similar APIs');
    });

    it('should include topic sections with medium search depth', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockJsonResponse);

      const result = await handleFindSimilarApis(mockApiUrl, 'medium');

      expect(result).toContain('## See Also: Text Display');
      expect(result).toContain('## Topic Group: Creating Text Views');
      expect(result).toContain('[init(_:)]');
      expect(result).toContain('[init(String)]');
      expect(result).toContain('Found 4 similar APIs');
    });

    it('should perform deep search with related APIs', async () => {
      const relatedApiResponse = {
        data: {
          identifier: 'swiftui/label',
          title: 'Label',
          seeAlsoSections: [
            {
              title: 'Label Components',
              identifiers: ['swiftui/labelstyle'],
            },
          ],
        },
        references: {
          'swiftui/labelstyle': {
            type: 'topic', title: 'LabelStyle',
            url: '/documentation/swiftui/labelstyle',
            abstract: [{ type: 'text', text: 'A protocol for label styles.' }],
          },
        },
      };

      mockHttpClient.getJson
        .mockResolvedValueOnce(mockJsonResponse)
        .mockResolvedValueOnce(relatedApiResponse);

      const result = await handleFindSimilarApis(mockApiUrl, 'deep');

      expect(mockHttpClient.getJson.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(result).toContain('## See Also: Text Display');
      expect(result).toContain('[Label]');
      expect(result).toContain('LabelStyle');
    });

    it('should handle APIs with no similar items', async () => {
      const noSimilarResponse = {
        data: {
          identifier: 'swiftui/text',
          metadata: { title: 'Text', roleHeading: 'Structure' },
        },
        references: {},
      };

      mockHttpClient.getJson.mockResolvedValue(noSimilarResponse);

      const result = await handleFindSimilarApis(mockApiUrl);

      expect(result).toContain('# Similar APIs to Text');
      expect(result).toContain('No similar APIs found');
    });

    it('should handle invalid URL', async () => {
      await expect(handleFindSimilarApis('invalid-url')).rejects.toThrow('invalid-url is not a documentation page');
    });

    it('should handle fetch errors gracefully', async () => {
      mockHttpClient.getJson.mockRejectedValue(new Error('Network error'));

      await expect(handleFindSimilarApis(mockApiUrl)).rejects.toThrow('Network error');
    });

    it('should deduplicate similar APIs across sections', async () => {
      const duplicateResponse = {
        data: {
          identifier: 'swiftui/text',
          title: 'Text',
          seeAlsoSections: [
            {
              title: 'Section 1',
              identifiers: ['swiftui/label', 'swiftui/textfield'],
            },
            {
              title: 'Section 2', 
              identifiers: ['swiftui/label', 'swiftui/image'],
            },
          ],
        },
        references: {
          'swiftui/label': {
            type: 'topic', title: 'Label',
            url: '/documentation/swiftui/label',
          },
          'swiftui/textfield': {
            type: 'topic', title: 'TextField',
            url: '/documentation/swiftui/textfield',
          },
          'swiftui/image': {
            type: 'topic', title: 'Image',
            url: '/documentation/swiftui/image',
          },
        },
      };

      mockHttpClient.getJson.mockResolvedValue(duplicateResponse);

      const result = await handleFindSimilarApis(mockApiUrl);

      const labelOccurrences = (result.match(/\[Label\]/g) || []).length;
      expect(labelOccurrences).toBe(1);
      expect(result).toContain('Found 3 similar APIs');
    });
  });

  it('lists the replacements a deprecated API names first, keeping code names in summaries', async () => {
    mockHttpClient.getJson.mockResolvedValue({
      title: 'NavigationView',
      deprecationSummary: [{
        type: 'paragraph', inlineContent: [
          { type: 'text', text: 'Use ' }, { type: 'reference', identifier: 'doc://SwiftUI/NavigationStack', isActive: true },
          { type: 'text', text: ' and ' }, { type: 'reference', identifier: 'doc://SwiftUI/NavigationSplitView', isActive: true },
          { type: 'text', text: ' instead.' },
        ],
      }],
      seeAlsoSections: [{ title: 'Deprecated Types', identifiers: ['doc://SwiftUI/tabItem'] }],
      references: {
        'doc://SwiftUI/NavigationStack': {
          type: 'topic', kind: 'symbol', title: 'NavigationStack', url: '/documentation/swiftui/navigationstack',
          abstract: [{ type: 'text', text: 'A view that displays a root view.' }],
        },
        'doc://SwiftUI/NavigationSplitView': {
          type: 'topic', kind: 'symbol', title: 'NavigationSplitView', url: '/documentation/swiftui/navigationsplitview',
          abstract: [{ type: 'text', text: 'Pairs with ' }, { type: 'reference', identifier: 'doc://SwiftUI/NavigationStack' }, { type: 'text', text: '.' }],
        },
        'doc://SwiftUI/tabItem': { type: 'topic', kind: 'symbol', title: 'tabItem(_:)', url: '/documentation/swiftui/view/tabitem(_:)' },
      },
    });

    const result = await handleFindSimilarApis('https://developer.apple.com/documentation/swiftui/navigationview', 'medium', undefined, true);

    expect(result).toContain('**Deprecated:** Use [`NavigationStack`](https://developer.apple.com/documentation/swiftui/navigationstack) '
      + 'and [`NavigationSplitView`](https://developer.apple.com/documentation/swiftui/navigationsplitview) instead.');
    // The deprecation note names it too; its own line comes before the See Also one
    expect(result.lastIndexOf('NavigationSplitView')).toBeLessThan(result.indexOf('tabItem(_:)'));
    expect(result).toContain('Pairs with `NavigationStack`.');
  });
});
