import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetDocumentationUpdates } from '../../src/tools/get-documentation-updates.js';
import { httpClient } from '../../src/utils/http-client.js';

vi.mock('../../src/utils/http-client.js');

describe('get-documentation-updates', () => {
  const mockUpdatesData = {
    topicSections: [
      {
        title: 'Release notes',
        identifiers: [
          'doc://com.apple.documentation/documentation/ios-ipados-release-notes',
        ],
        anchor: 'Release-notes',
      },
      {
        title: 'Technology and frameworks',
        identifiers: [
          'doc://com.apple.Updates/documentation/Updates/SwiftUI',
          'doc://com.apple.Updates/documentation/Updates/UIKit',
        ],
        anchor: 'Technology-and-frameworks',
      },
      {
        title: 'Past releases',
        identifiers: [
          'doc://com.apple.Updates/documentation/Updates/wwdc2024',
          'doc://com.apple.Updates/documentation/Updates/wwdc2023',
        ],
        anchor: 'Past-releases',
      },
    ],
    references: {
      'doc://com.apple.Updates/documentation/Updates/wwdc2024': {
        type: 'topic',
        title: 'WWDC24',
        url: '/documentation/updates/wwdc2024',
        abstract: [{ text: 'Highlights of new technologies introduced at WWDC24.', type: 'text' }],
        images: [{ type: 'icon', identifier: 'new.svg' }],
        kind: 'article',
        role: 'collectionGroup',
      },
      'doc://com.apple.Updates/documentation/Updates/wwdc2023': {
        type: 'topic',
        title: 'WWDC23',
        url: '/documentation/updates/wwdc2023',
        abstract: [{ text: 'Highlights of new technologies introduced at WWDC23.', type: 'text' }],
        kind: 'article',
        role: 'collectionGroup',
      },
      'doc://com.apple.Updates/documentation/Updates/SwiftUI': {
        type: 'topic',
        title: 'SwiftUI updates',
        url: '/documentation/updates/swiftui',
        abstract: [{ text: 'Learn about important changes to SwiftUI.', type: 'text' }],
        kind: 'article',
        role: 'article',
      },
      'doc://com.apple.Updates/documentation/Updates/UIKit': {
        type: 'topic',
        title: 'UIKit updates',
        url: '/documentation/updates/uikit',
        abstract: [{ text: 'Learn about important changes to UIKit.', type: 'text' }],
        kind: 'article',
        role: 'article',
      },
      'doc://com.apple.documentation/documentation/ios-ipados-release-notes': {
        type: 'topic',
        title: 'iOS & iPadOS Release Notes',
        url: '/documentation/ios-ipados-release-notes',
        abstract: [{ text: 'Learn about changes to the iOS & iPadOS SDK.', type: 'text' }],
        kind: 'article',
        role: 'collection',
      },
    },
  };

  const mockUpdatesIndex = {
    interfaceLanguages: {
      swift: [
        {
          path: '/documentation/updates',
          title: 'Updates',
          type: 'module',
          children: [
            {
              title: 'Past releases',
              type: 'groupMarker',
            },
            {
              path: '/documentation/updates/wwdc2024',
              title: 'WWDC24',
              type: 'collection',
              beta: false,
            },
            {
              path: '/documentation/updates/wwdc2023',
              title: 'WWDC23',
              type: 'collection',
              beta: false,
            },
            {
              title: 'Technology and frameworks',
              type: 'groupMarker',
            },
            {
              path: '/documentation/updates/swiftui',
              title: 'SwiftUI updates',
              type: 'article',
              beta: true,
            },
            {
              path: '/documentation/updates/uikit',
              title: 'UIKit updates',
              type: 'article',
              beta: false,
            },
          ],
        },
      ],
    },
  };

  const mockTechnologies = {
    sections: [{
      kind: 'technologies',
      groups: [{
        name: 'App frameworks',
        technologies: ['SwiftUI', 'UIKit'].map((title) => ({
          title, tags: [], languages: ['swift'],
          destination: { identifier: `doc://com.apple.documentation/documentation/${title}` },
        })),
      }],
    }],
    references: {},
  };

  /** Apple's three files by URL: the Updates page, its sidebar and the technologies list */
  const answering = (page: unknown, index: unknown) => (url: unknown): Promise<unknown> => {
    const urlStr = url as string;
    if (urlStr.includes('Updates.json')) {
      return Promise.resolve(page);
    }
    if (urlStr.includes('index/updates')) {
      return Promise.resolve(index);
    }
    if (urlStr.includes('technologies.json')) {
      return Promise.resolve(mockTechnologies);
    }
    throw new Error('Unknown URL');
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (httpClient.getJson as Mock).mockImplementation(answering(mockUpdatesData, mockUpdatesIndex));
  });

  it('should fetch and format documentation updates', async () => {
    const result = await handleGetDocumentationUpdates(undefined, undefined, undefined, undefined, true, 50);

    expect(httpClient.getJson).toHaveBeenCalledTimes(3);
    expect(result).toContain('Apple Developer Documentation Updates');
    expect(result).toContain('WWDC24');
    expect(result).toContain('SwiftUI updates');
    expect(result).toContain('UIKit updates');
  });

  it('should filter by section', async () => {
    const result = await handleGetDocumentationUpdates('past releases', undefined, undefined, undefined, true, 50);

    expect(result).toContain('WWDC24');
    expect(result).toContain('WWDC23');
    expect(result).not.toContain('SwiftUI updates');
    expect(result).not.toContain('UIKit updates');
  });

  it('should filter by technology', async () => {
    const result = await handleGetDocumentationUpdates(undefined, 'SwiftUI', undefined, undefined, true, 50);

    expect(result).toContain('SwiftUI updates');
    expect(result).not.toContain('UIKit updates');
    expect(result).not.toContain('WWDC24');
  });

  it('should filter by year for WWDC', async () => {
    const result = await handleGetDocumentationUpdates('Past releases', undefined, '2024', undefined, true, 50);

    expect(result).toContain('WWDC24');
    expect(result).not.toContain('WWDC23');
  });

  it('should filter release notes', async () => {
    const result = await handleGetDocumentationUpdates('Release notes', undefined, undefined, undefined, true, 50);

    expect(result).toContain('iOS & iPadOS Release Notes');
    expect(result).not.toContain('WWDC');
    expect(result).not.toContain('SwiftUI updates');
  });

  it('should exclude beta features when includeBeta is false', async () => {
    const result = await handleGetDocumentationUpdates('Technology', undefined, undefined, undefined, false, 50);

    expect(result).toContain('UIKit updates');
    expect(result).not.toContain('SwiftUI updates');
  });

  it('should include beta features when includeBeta is true', async () => {
    const result = await handleGetDocumentationUpdates('Technology', undefined, undefined, undefined, true, 50);

    expect(result).toContain('UIKit updates');
    expect(result).toContain('SwiftUI updates');
    expect(result).toContain('*Beta*');
  });

  it('should search by query', async () => {
    const result = await handleGetDocumentationUpdates(undefined, undefined, undefined, 'SwiftUI', true, 50);

    expect(result).toContain('SwiftUI updates');
    expect(result).not.toContain('UIKit updates');
    expect(result).not.toContain('WWDC24');
  });

  it('should limit results', async () => {
    const result = await handleGetDocumentationUpdates(undefined, undefined, undefined, undefined, true, 2);

    const updateCount = (result.match(/###/g) || []).length;
    expect(updateCount).toBe(2);
  });

  it('should show new badges', async () => {
    const result = await handleGetDocumentationUpdates('Past releases', undefined, undefined, undefined, true, 50);

    expect(result).toContain('WWDC24');
    expect(result).toContain('*New*');
  });

  it('should handle empty results', async () => {
    (httpClient.getJson as Mock).mockImplementation(answering(
      { topicSections: [], references: {} }, { interfaceLanguages: { swift: [] } }));

    const result = await handleGetDocumentationUpdates(undefined, undefined, undefined, undefined, true, 50);

    expect(result).toBe('No documentation updates found matching the specified criteria.');
  });

  it('throws when Apple\'s files fail to load', async () => {
    (httpClient.getJson as Mock).mockRejectedValue(new Error('Network error'));

    await expect(handleGetDocumentationUpdates(undefined, undefined, undefined, undefined, true, 50))
      .rejects.toThrow('Network error');
  });

  it('should handle partial data correctly', async () => {
    (httpClient.getJson as Mock).mockImplementation(answering({
      topicSections: [
        {
          title: 'Past releases',
          identifiers: ['doc://com.apple.Updates/documentation/Updates/wwdc2024'],
          anchor: 'Past-releases',
        },
      ],
      references: {},
    }, mockUpdatesIndex));

    const result = await handleGetDocumentationUpdates(undefined, undefined, undefined, undefined, true, 50);

    expect(result).toBe('No documentation updates found matching the specified criteria.');
  });

  it('takes the Beta mark from the sidebar entry with the same path', async () => {
    // A beta /updates/swift must not mark /updates/swiftui, whose path starts the same
    const children = [
      { path: '/documentation/updates/swift', title: 'Swift updates', type: 'article', beta: true },
      { path: '/documentation/updates/swiftui', title: 'SwiftUI updates', type: 'article', beta: false },
      { path: '/documentation/updates/uikit', title: 'UIKit updates', type: 'article', beta: false },
    ];
    (httpClient.getJson as Mock).mockImplementation(answering(mockUpdatesData,
      { interfaceLanguages: { swift: [{ path: '/documentation/updates', title: 'Updates', type: 'module', children }] } }));

    const result = await handleGetDocumentationUpdates('Technology', undefined, undefined, undefined, true, 50);

    expect(result).toContain('SwiftUI updates');
    expect(result).not.toContain('*Beta*');
  });

  it('groups the entries under the page\'s sections, in its order', async () => {
    const result = await handleGetDocumentationUpdates(undefined, undefined, undefined, undefined, true, 50);

    const releaseIndex = result.indexOf('## Release notes');
    const techIndex = result.indexOf('## Technology and frameworks');
    const pastIndex = result.indexOf('## Past releases');

    expect(releaseIndex).toBeGreaterThan(-1);
    expect(releaseIndex).toBeLessThan(techIndex);
    expect(techIndex).toBeLessThan(pastIndex);
  });

  it('finds a WWDC under Past releases by its year', async () => {
    (httpClient.getJson as Mock).mockImplementation(answering({
      topicSections: [{
        title: 'Past releases', identifiers: ['doc://com.apple.Updates/documentation/Updates/wwdc2025'], anchor: 'Past-releases',
      }],
      references: {
        'doc://com.apple.Updates/documentation/Updates/wwdc2025': {
          type: 'topic', title: 'WWDC25', url: '/documentation/updates/wwdc2025', kind: 'article',
          abstract: [{ type: 'text', text: 'Highlights of new technologies introduced at WWDC25.' }],
        },
      },
    }, {
      interfaceLanguages: {
        swift: [{
          path: '/documentation/updates', title: 'Updates', type: 'module',
          children: [{ path: '/documentation/updates/wwdc2025', title: 'WWDC25', type: 'article' }],
        }],
      },
    }));

    const result = await handleGetDocumentationUpdates('Past releases', undefined, '2025', undefined, true, 50);

    expect(result).toContain('## Past releases');
    expect(result).toContain('[WWDC25](https://developer.apple.com/documentation/updates/wwdc2025)');
    expect(result).toContain('Year: 2025');
    expect(result).not.toContain('Technology:');
  });
});
