import { describe, it, expect } from 'vitest';
import { parseSearchResults } from '../../src/tools/search-parser.js';

type Metadata = { title?: string; permalink?: string; kind?: string; description?: string; hierarchy?: string };

const result = (title: string, path: string, extra: Metadata = {}) => ({
  value: { metadata: { title, permalink: `https://developer.apple.com${path}`, kind: 'symbol', ...extra } },
});

/** A video as Apple's search API returns it: every field a one-element list, its id `<event>-<number>`. */
const wwdcSession = (id: string, title: string) => ({
  value: {
    metadata: {
      ids: [id],
      titles: [title],
      itemTypes: ['Video'],
      descriptions: ['A session.'],
      permalinks: [`https://developer.apple.com/videos/play/${id.replace(/-(\d+)$/, '/$1')}`],
    },
  },
});

/**
 * The JSON lines Apple's search API streams: `search` events build one results document, each trimming
 * `removeLast` characters before appending. The second event takes back the first one's last two characters.
 */
const stream = (results: unknown[]) => {
  const document = JSON.stringify({ results });
  const cut = Math.floor(document.length / 2);
  return [
    JSON.stringify({ kind: 'search', diff: { append: `${document.slice(0, cut)}"x` } }),
    JSON.stringify({ kind: 'search', diff: { removeLast: 2, append: document.slice(cut) } }),
    JSON.stringify({ kind: 'searchFinished' }),
  ].join('\n');
};

describe('parseSearchResults', () => {
  const mockSearchUrl = 'https://developer.apple.com/search/?q=test';
  const text = (jsonl: string, query = 'test', filter?: string) =>
    parseSearchResults(jsonl, query, mockSearchUrl, filter).content[0].text;

  describe('successful parsing', () => {
    it('should parse search results from the streamed response', () => {
      const output = text(stream([
        result('UIView', '/documentation/uikit/uiview', {
          description: 'An object that manages the content for a rectangular area on the screen.',
          hierarchy: 'UIKit > UIView',
        }),
        result('UIViewController', '/documentation/uikit/uiviewcontroller', { hierarchy: 'UIKit > UIViewController' }),
      ]));

      expect(output).toContain('# Apple Documentation Search Results');
      expect(output).toContain('**Query:** "test"');
      expect(output).toContain('### 1. UIView');
      expect(output).toContain('### 2. UIViewController');
      expect(output).toContain('An object that manages the content');
      expect(output).toContain('**Framework:** UIKit');
      expect(output).toContain('**URL:** https://developer.apple.com/documentation/uikit/uiview');
    });

    it('should keep documentation pages and design guidelines', () => {
      const output = text(stream([
        result('WWDC Video', '/videos/play/wwdc2023/10001'),
        result('Buttons', '/design/human-interface-guidelines/buttons', {
          kind: 'article',
          hierarchy: 'Human Interface Guidelines > Components > Menus and actions > Buttons',
        }),
      ]));

      expect(output).toContain('WWDC Video');
      expect(output).toContain('**Kind:** article');
      expect(output).toContain('**URL:** https://developer.apple.com/design/human-interface-guidelines/buttons');
    });

    it('should list WWDC sessions with no type, each with the call that reads its transcript and code', () => {
      const output = text(stream([wwdcSession('wwdc2023-10013', 'Meet StoreKit for SwiftUI')]));

      expect(output).toContain('**Kind:** Video');
      expect(output).toContain('### 1. Meet StoreKit for SwiftUI');
      expect(output).toContain('**URL:** https://developer.apple.com/videos/play/wwdc2023/10013');
      expect(output).toContain('get_wwdc_video (year: "2023", videoId: "10013")');
    });

    it('should leave other events out of an unfiltered search', () => {
      const jsonl = stream([
        wwdcSession('wwdc2023-10013', 'Meet StoreKit for SwiftUI'),
        wwdcSession('tech-talks-110358', 'A tech talk the bundled data does not hold'),
      ]);

      expect(text(jsonl)).not.toContain('A tech talk');
    });

    it('should handle empty results', () => {
      const output = text(stream([]));

      expect(output).toContain('No results found for "test"');
    });

    it('should take the framework from the hierarchy', () => {
      const output = text(stream([
        result('List', '/documentation/swiftui/list', { hierarchy: 'SwiftUI > List' }),
        result('NSString', '/documentation/foundation/nsstring', { hierarchy: 'Foundation > NSString' }),
      ]));

      expect(output).toContain('**Framework:** SwiftUI');
      expect(output).toContain('**Framework:** Foundation');
    });

    it('should limit results when too many', () => {
      const output = text(stream(Array.from({ length: 100 }, (_, i) =>
        result(`Result ${i}`, `/documentation/test/result${i}`, { description: `Description ${i}` }))));

      expect(output).toContain('### 1. Result 0');
      expect(output).toContain('### 50. Result 49');
      expect(output).not.toContain('Result 99');
      expect(output).toContain('[View all results on Apple Developer]');
    });

  });

  describe('error cases', () => {
    it('should handle an empty response', () => {
      const output = text('');

      expect(output).toContain('No results found');
    });

    it('throws on a malformed response', () => {
      expect(() => text('<html>not a stream</html>')).toThrow(SyntaxError);
    });

    it('should skip results with missing fields', () => {
      const output = text(stream([
        result('Valid Result', '/documentation/test', { description: 'Valid description' }),
        { value: { metadata: { permalink: 'https://developer.apple.com/documentation/x', description: 'No title' } } },
        { value: { metadata: { title: 'No URL', description: 'No URL' } } },
        {},
      ]));

      expect(output).toContain('### 1. Valid Result');
      expect(output).not.toContain('No title');
      expect(output).not.toContain('No URL');
    });
  });

  describe('special cases', () => {
    it('should handle special characters in query', () => {
      const specialQuery = 'test & <special> "quoted"';
      const output = text(stream([result('Result', '/documentation/test')]), specialQuery);

      expect(output).toContain('**Query:** "test & <special> "quoted""');
    });

    it('should pass descriptions through', () => {
      const output = text(stream([
        result('UILocalNotification', '/documentation/uikit/uilocalnotification', {
          description: 'A notification that an app can schedule for presentation at a specific date and time.',
        }),
      ]));

      expect(output).toContain('A notification that an app can schedule for presentation at a specific date and time.');
    });
  });
});
