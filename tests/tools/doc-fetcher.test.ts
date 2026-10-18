import type { Mock } from 'vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchAppleDocJson } from '../../src/tools/doc-fetcher.js';
import { mockData } from '../helpers/test-helpers.js';

vi.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    getJson: vi.fn(),
  },
}));

import { httpClient } from '../../src/utils/http-client.js';

describe('fetchAppleDocJson', () => {
  const mockDocUrl = 'https://developer.apple.com/documentation/uikit/uiview';
  const mockJsonUrl = 'https://developer.apple.com/tutorials/data/documentation/uikit/uiview.json';
  const swift = 'swift';
  // Every page names itself and its language; the Objective-C version names "occ"
  const swiftPage = { identifier: { url: 'doc://com.apple.uikit/documentation/UIKit/UIView', interfaceLanguage: 'swift' } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful fetching', () => {
    it('should fetch and format documentation', async () => {
      (httpClient.getJson as Mock).mockResolvedValue(mockData.docJsonData);

      const result = await fetchAppleDocJson(mockDocUrl, swift);

      expect(httpClient.getJson).toHaveBeenCalledWith(mockJsonUrl);
      expect(result.content[0].text).toContain('# UIView');
      expect(result.content[0].text).toContain('**Class**');
      expect(result.content[0].text).toContain('class UIView');
    });

    it('should handle complex documentation structure', async () => {
      const complexDoc = {
        ...swiftPage,
        primaryContentSections: [
          {
            kind: 'declarations',
            declarations: [
              {
                platforms: [],
                tokens: [
                  { text: '@MainActor', kind: 'attribute' },
                  { text: ' ' },
                  { text: 'class', kind: 'keyword' },
                  { text: ' ' },
                  { text: 'UIView', kind: 'typeIdentifier' },
                  { text: ' : ', kind: 'text' },
                  { text: 'UIResponder', kind: 'typeIdentifier', preciseIdentifier: 'c:objc(cs)UIResponder' },
                ],
              },
            ],
          },
          {
            kind: 'content',
            content: [
              {
                type: 'paragraph',
                inlineContent: [
                  { type: 'text', text: 'Views are the fundamental building blocks of your app\'s user interface.' },
                ],
              },
            ],
          },
        ],
        metadata: {
          roleHeading: 'Class',
          title: 'UIView',
          modules: [{ name: 'UIKit' }],
          platforms: [
            { name: 'iOS', introducedAt: '2.0', current: '17.0' },
            { name: 'iPadOS', introducedAt: '2.0', current: '17.0' },
          ],
        },
        abstract: [
          { type: 'text', text: 'An object that manages the content for a rectangular area on the screen.' },
        ],
        topicSections: [
          {
            title: 'Creating a View',
            identifiers: [
              'doc://com.apple.documentation/documentation/uikit/uiview/init(frame:)',
              'doc://com.apple.documentation/documentation/uikit/uiview/init(coder:)',
            ],
          },
        ],
      };

      (httpClient.getJson as Mock).mockResolvedValue(complexDoc);

      const result = await fetchAppleDocJson(mockDocUrl, swift);
      const text = result.content[0].text;

      expect(text).toContain('@MainActor class UIView : UIResponder');
      expect(text).toContain('An object that manages the content');
      expect(text).toContain('Views are the fundamental building blocks');
      expect(text).toContain('## Platform Availability');
      expect(text).toContain('**iOS** 2.0+');
      expect(text).toContain('**iPadOS** 2.0+');
    });
  });

  describe('nested content blocks', () => {
    it('should render code in language tabs, notes and lists', async () => {
      // The shape of UNCalendarNotificationTrigger's page: its only code listing sits in Swift and Objective-C tabs.
      const doc = {
        ...swiftPage,
        primaryContentSections: [
          { kind: 'declarations', declarations: [{ platforms: [], tokens: [{ text: 'class UNCalendarNotificationTrigger' }, { text: '\n' }] }] },
          {
            kind: 'content',
            content: [
              { type: 'heading', text: 'Overview' },
              {
                type: 'tabNavigator',
                tabs: [
                  {
                    title: 'Swift',
                    content: [{ type: 'codeListing', syntax: 'swift', code: ['var date = DateComponents()', 'date.hour = 8'] }],
                  },
                  {
                    title: 'Objective-C',
                    content: [{ type: 'codeListing', syntax: 'objc', code: ['NSDateComponents* date = [NSDateComponents new];'] }],
                  },
                ],
              },
              {
                type: 'aside',
                name: 'Important',
                content: [{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'Ask for permission first.' }] }],
              },
              {
                type: 'unorderedList',
                items: [{ content: [{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'First item' }] }] }],
              },
            ],
          },
        ],
        metadata: { roleHeading: 'Class', title: 'UNCalendarNotificationTrigger' },
      };

      (httpClient.getJson as Mock).mockResolvedValue(doc);

      const text = (await fetchAppleDocJson(mockDocUrl, swift)).content[0].text;

      expect(text).toContain('```swift\nclass UNCalendarNotificationTrigger\n```');
      expect(text).toContain('**Swift**\n\n```swift\nvar date = DateComponents()\ndate.hour = 8\n```');
      expect(text).toContain('**Objective-C**\n\n```objc\nNSDateComponents* date = [NSDateComponents new];\n```');
      expect(text).toContain('> **Important:** Ask for permission first.');
      expect(text).toContain('- First item');
    });
  });

  describe('articles', () => {
    it('should render an article in full: headings, bold rules, link titles, columns, tables and code', async () => {
      // The shape of a Human Interface Guidelines page, which opens with paragraphs and has no declaration
      const doc = {
        ...swiftPage,
        primaryContentSections: [{
          kind: 'content',
          content: [
            { type: 'paragraph', inlineContent: [{ type: 'text', text: 'A tab bar lets people navigate.' }] },
            { type: 'heading', level: 2, text: 'Best practices' },
            {
              type: 'paragraph',
              inlineContent: [
                { type: 'strong', inlineContent: [{ type: 'text', text: 'Use a tab bar to support navigation.' }] },
                { type: 'text', text: ' For actions, use a ' },
                { type: 'reference', identifier: 'doc://com.apple.HIG/toolbars', isActive: true, overridingTitle: 'toolbar' },
                { type: 'text', text: ' or ' },
                { type: 'reference', identifier: 'doc://com.apple.documentation/documentation/uikit/uitabbar', isActive: true },
                { type: 'text', text: '.' },
              ],
            },
            { type: 'heading', level: 3, text: 'iPadOS' },
            {
              type: 'row',
              columns: [{ content: [{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'Left column' }] }] }],
            },
            { type: 'codeListing', syntax: 'swift', code: ['TabView { }'] },
            {
              type: 'table',
              header: 'row',
              rows: [
                [[{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'Date' }] }],
                  [{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'Changes' }] }]],
                [[{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'June 8, 2026' }] }],
                  [{ type: 'paragraph', inlineContent: [{ type: 'text', text: 'Updated art.' }] }]],
              ],
            },
          ],
        }],
        references: {
          'doc://com.apple.HIG/toolbars': { type: 'topic', title: 'Toolbars', url: '/design/human-interface-guidelines/toolbars' },
          'doc://com.apple.documentation/documentation/uikit/uitabbar': {
            type: 'topic', title: 'UITabBar', url: '/documentation/uikit/uitabbar', kind: 'symbol',
          },
        },
        metadata: { role: 'article', title: 'Tab bars' },
      };

      (httpClient.getJson as Mock).mockResolvedValue(doc);

      const text = (await fetchAppleDocJson(mockDocUrl, swift)).content[0].text;

      expect(text).toContain('## Overview\n\nA tab bar lets people navigate.');
      expect(text).toContain('## Best practices');
      expect(text).toContain('**Use a tab bar to support navigation.** For actions, use a '
        + '[toolbar](https://developer.apple.com/design/human-interface-guidelines/toolbars) or '
        + '[`UITabBar`](https://developer.apple.com/documentation/uikit/uitabbar).');
      expect(text).toContain('### iPadOS');
      expect(text).toContain('Left column');
      expect(text).toContain('```swift\nTabView { }\n```');
      expect(text).toContain('| Date | Changes |\n| --- | --- |\n| June 8, 2026 | Updated art. |');
    });
  });

  describe('error handling', () => {
    it('throws for a URL off developer.apple.com', async () => {
      await expect(fetchAppleDocJson('invalid-url', swift)).rejects.toThrow('invalid-url is not on developer.apple.com');
    });

    it('should handle network errors', async () => {
      (httpClient.getJson as Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchAppleDocJson(mockDocUrl, swift)).rejects.toThrow('Network error');
    });

    it('should handle 404 errors', async () => {
      (httpClient.getJson as Mock).mockRejectedValue(new Error('404 Not Found'));

      await expect(fetchAppleDocJson(mockDocUrl, swift)).rejects.toThrow('404 Not Found');
    });

    it('should handle malformed JSON', async () => {
      (httpClient.getJson as Mock).mockResolvedValue({});

      const result = await fetchAppleDocJson(mockDocUrl, swift);

      expect(result.content[0].text).toContain('# Documentation');
      expect(result.content[0].text).toContain('[View full documentation on Apple Developer]');
    });

    it('should handle missing metadata', async () => {
      (httpClient.getJson as Mock).mockResolvedValue({
        ...swiftPage,
        primaryContentSections: [
          {
            kind: 'content',
            content: [
              {
                type: 'paragraph',
                inlineContent: [{ type: 'text', text: 'Some content without metadata.' }],
              },
            ],
          },
        ],
      });

      const result = await fetchAppleDocJson(mockDocUrl, swift);

      expect(result.content[0].text).toContain('Some content without metadata');
      expect(result.content[0].text).not.toContain('**Type:**');
      expect(result.content[0].text).not.toContain('**Module:**');
    });
  });

  describe('special features', () => {
    it('should handle beta and deprecated flags', async () => {
      const betaDoc = {
        ...swiftPage,
        ...mockData.docJsonData,
        metadata: {
          ...mockData.docJsonData.metadata,
          beta: true,
          deprecated: true,
          deprecationSummary: [
            { type: 'text', text: 'Use NewAPI instead.' },
          ],
        },
      };

      (httpClient.getJson as Mock).mockResolvedValue(betaDoc);

      const result = await fetchAppleDocJson(mockDocUrl, swift);
      const text = result.content[0].text;

      expect(text).toContain('# UIView');
      expect(text).toContain('**Class**');
    });

    it('should handle availability information', async () => {
      const availabilityDoc = {
        ...swiftPage,
        ...mockData.docJsonData,
        metadata: {
          ...mockData.docJsonData.metadata,
          platforms: [
            { name: 'iOS', introducedAt: '13.0', current: '17.0', beta: true },
            { name: 'macOS', introducedAt: '10.15', deprecatedAt: '13.0', current: '14.0' },
            { name: 'watchOS', introducedAt: '6.0', current: '10.0' },
          ],
          required: true,
        },
      };

      (httpClient.getJson as Mock).mockResolvedValue(availabilityDoc);

      const result = await fetchAppleDocJson(mockDocUrl, swift);
      const text = result.content[0].text;

      expect(text).toContain('# UIView');
      // Apple tags the title Beta only when every platform is
      expect(text).not.toContain('**Beta**');
      expect(text).toContain('Platform Availability');
      expect(text).toContain('iOS');
      expect(text).toContain('13.0+');
    });

    it('should handle code samples', async () => {
      const codeSampleDoc = {
        ...swiftPage,
        ...mockData.docJsonData,
        sampleCodeDownload: {
          url: 'https://docs-assets.developer.apple.com/published/sample.zip',
          action: {
            overridingTitle: 'Download Sample Code',
          },
        },
        primaryContentSections: [
          {
            kind: 'content',
            content: [
              {
                type: 'codeListing',
                syntax: 'swift',
                code: [
                  'let view = UIView()',
                  'view.backgroundColor = .red',
                ],
              },
            ],
          },
        ],
      };

      (httpClient.getJson as Mock).mockResolvedValue(codeSampleDoc);

      const result = await fetchAppleDocJson(mockDocUrl, swift);
      const text = result.content[0].text;

      expect(text).toContain('# UIView');
      expect(text).toContain('**Class**');
      expect(text).toContain('## Overview');
    });
  });
});