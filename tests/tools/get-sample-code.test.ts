import { vi, describe, it, expect, beforeEach } from 'vitest';
import { APPLE_URLS } from '../../src/utils/constants';

vi.mock('../../src/utils/http-client');
vi.mock('../../src/utils/cache');

describe('handleGetSampleCode', () => {
  let mockHttpClient: any;
  let mockSampleCodeCache: any;

  const reference = (path: string, title: string, abstract: string) => ({
    type: 'topic',
    role: 'sampleCode',
    kind: 'article',
    identifier: `doc://com.apple.documentation${path}`,
    title,
    url: path.toLowerCase(),
    abstract: [{ type: 'text', text: abstract }],
  });

  // Sample data: Apple's identifiers keep a framework's capitals, the sidebar's paths are lowercase
  const mockSampleCodeContent = {
    metadata: {
      role: 'collection',
      title: 'Sample Code Library',
    },
    abstract: [
      {
        type: 'text',
        text: 'Enhance and expand your knowledge of Apple technologies by exploring the full library of sample code projects.',
      },
    ],
    primaryContentSections: [
      {
        kind: 'content',
        content: [
          {
            type: 'heading',
            text: 'Featured at WWDC25',
            anchor: 'Featured-at-WWDC25',
            level: 2,
          },
          {
            type: 'links',
            items: [
              'doc://com.apple.documentation/documentation/SwiftUI/Landmarks-Building-an-app-with-Liquid-Glass',
              'doc://com.apple.documentation/documentation/StoreKit/understanding-storekit-workflows',
            ],
            style: 'detailedGrid',
          },
        ],
      },
    ],
    topicSections: [
      {
        anchor: 'WWDC25',
        title: 'WWDC25',
        identifiers: [
          'doc://com.apple.documentation/documentation/SwiftUI/Landmarks-Building-an-app-with-Liquid-Glass',
          'doc://com.apple.documentation/documentation/StoreKit/understanding-storekit-workflows',
          'doc://com.apple.documentation/documentation/FoundationModels/adding-intelligent-app-features-with-generative-models',
        ],
      },
      {
        anchor: 'SwiftUI',
        title: 'SwiftUI',
        identifiers: [
          'doc://com.apple.documentation/documentation/SwiftUI/Landmarks-Building-an-app-with-Liquid-Glass',
          'doc://com.apple.documentation/documentation/SwiftUI/building-rich-swiftui-text-experiences',
        ],
      },
    ],
    references: Object.fromEntries([
      reference('/documentation/SwiftUI/Landmarks-Building-an-app-with-Liquid-Glass', 'Landmarks: Building an app with Liquid Glass', 'Enhance your app with Liquid Glass.'),
      reference('/documentation/StoreKit/understanding-storekit-workflows', 'Understanding StoreKit workflows', 'Implement an in-app store.'),
      reference('/documentation/FoundationModels/adding-intelligent-app-features-with-generative-models', 'Adding intelligent app features with generative models', 'Build features with the on-device model.'),
      reference('/documentation/SwiftUI/building-rich-swiftui-text-experiences', 'Building rich SwiftUI text experiences', 'Build an editor for rich text.'),
    ].map((entry) => [entry.identifier, entry])),
  };

  const mockSampleCodeIndex = {
    interfaceLanguages: {
      swift: [
        {
          path: '/documentation/samplecode',
          title: 'Sample Code Library',
          type: 'module',
          children: [
            {
              title: 'WWDC25',
              type: 'groupMarker',
            },
            {
              path: '/documentation/foundationmodels/adding-intelligent-app-features-with-generative-models',
              title: 'Adding intelligent app features with generative models',
              type: 'sampleCode',
              external: true,
              beta: true,
            },
            {
              path: '/documentation/storekit/understanding-storekit-workflows',
              title: 'Understanding StoreKit workflows',
              type: 'sampleCode',
              external: true,
              beta: false,
            },
            {
              title: 'SwiftUI',
              type: 'groupMarker',
            },
            {
              path: '/documentation/swiftui/landmarks-building-an-app-with-liquid-glass',
              title: 'Landmarks: Building an app with Liquid Glass',
              type: 'sampleCode',
              external: true,
              beta: false,
            },
            {
              path: '/documentation/swiftui/building-rich-swiftui-text-experiences',
              title: 'Building rich SwiftUI text experiences',
              type: 'sampleCode',
              external: true,
              beta: true,
            },
          ],
        },
      ],
    },
  };

  const everything = { framework: undefined, category: undefined, includeBeta: true, searchQuery: undefined };

  const mockTechnologies = {
    sections: [{
      kind: 'technologies',
      groups: [{
        name: 'App frameworks',
        technologies: ['SwiftUI', 'StoreKit', 'FoundationModels'].map((id) => ({
          title: id === 'FoundationModels' ? 'Foundation Models' : id,
          destination: { identifier: `doc://com.apple.documentation/documentation/${id}` },
        })),
      }],
    }],
    references: {},
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // The library's page and sidebar, and the technologies list, whose names the samples' frameworks take
    mockHttpClient = {
      getJson: vi.fn().mockImplementation(async (url: string) => (
        url === APPLE_URLS.SAMPLE_CODE_JSON ? mockSampleCodeContent
          : url === APPLE_URLS.SAMPLE_CODE_INDEX_JSON ? mockSampleCodeIndex
            : mockTechnologies)),
    };
    vi.doMock('../../src/utils/http-client', () => ({
      httpClient: mockHttpClient,
    }));

    // Setup cache mock: the library's own; Apple's files go through the real caches, to the mocked client
    mockSampleCodeCache = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
    vi.doMock('../../src/utils/cache', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../src/utils/cache')>()),
      sampleCodeCache: mockSampleCodeCache,
    }));
  });

  it('should fetch and return sample code data', async () => {
    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    const result = await handleGetSampleCode(everything, 50);

    expect(mockHttpClient.getJson).toHaveBeenCalledWith(APPLE_URLS.SAMPLE_CODE_JSON);
    expect(mockHttpClient.getJson).toHaveBeenCalledWith(APPLE_URLS.SAMPLE_CODE_INDEX_JSON);
    expect(mockHttpClient.getJson).toHaveBeenCalledWith(APPLE_URLS.TECHNOLOGIES_JSON);

    // Verify result contains expected content: the featured samples first, then the library's sections
    expect(result).toContain('Apple Sample Code Library');
    expect(result).toContain('Found 4 entries');
    expect(result).toMatch(/## ⭐ Featured\n\n- \[Understanding StoreKit workflows\][^\n]*\n- \[Landmarks: Building an app with Liquid Glass\]/);
    expect(result).toContain('## WWDC25\n\n- [Adding intelligent app features with generative models]');
    expect(result).toContain('(SwiftUI · WWDC25, SwiftUI): Enhance your app with Liquid Glass.');
  });

  it('should filter by framework', async () => {
    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    const result = await handleGetSampleCode({ ...everything, framework: 'SwiftUI' }, 50);

    expect(result).toContain('Framework: SwiftUI');
    expect(result).toContain('Found 2 entries');
    expect(result).toContain('Landmarks: Building an app with Liquid Glass');
    expect(result).toContain('Building rich SwiftUI text experiences');
  });

  it('should filter beta samples when beta=exclude', async () => {
    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    const result = await handleGetSampleCode({ ...everything, includeBeta: false }, 50);

    expect(result).toContain('Beta: exclude');
    expect(result).toContain('Found 2 entries');
    expect(result).not.toContain('Adding intelligent app features');
    expect(result).not.toContain('Building rich SwiftUI text experiences');
    expect(result).toContain('Understanding StoreKit workflows');
    expect(result).toContain('Landmarks: Building an app with Liquid Glass');
  });

  it('should return cached results when available', async () => {
    mockSampleCodeCache.get.mockReturnValue([{
      title: 'Cached sample', url: 'https://developer.apple.com/documentation/swiftui/cached-sample', kind: 'sampleCode',
      framework: 'SwiftUI', sections: ['SwiftUI'], summary: 'From the cache.', featured: false, beta: false,
    }]);

    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    const result = await handleGetSampleCode(everything, 50);

    expect(result).toContain('[Cached sample](https://developer.apple.com/documentation/swiftui/cached-sample)');
    expect(mockHttpClient.getJson).not.toHaveBeenCalled();
  });

  it('should cache results after fetching', async () => {
    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    await handleGetSampleCode({ ...everything, framework: 'SwiftUI', searchQuery: 'test' }, 10);

    expect(mockSampleCodeCache.set).toHaveBeenCalledWith('library', expect.any(Array));
    expect(mockSampleCodeCache.set.mock.calls[0][1]).toHaveLength(4);
  });

  it('should handle API errors gracefully', async () => {
    mockHttpClient.getJson.mockRejectedValueOnce(new Error('Network error'));

    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    await expect(handleGetSampleCode(everything, 50)).rejects.toThrow('Network error');
  });

  it('should handle non-200 status codes', async () => {
    mockHttpClient.getJson.mockRejectedValueOnce(new Error(`GET ${APPLE_URLS.SAMPLE_CODE_JSON}: HTTP 404 Not Found`));

    const { handleGetSampleCode } = await import('../../src/tools/get-sample-code');
    await expect(handleGetSampleCode(everything, 50)).rejects.toThrow('HTTP 404 Not Found');
  });
});
