import type { Mocked } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleListTechnologies } from '../../src/tools/list-technologies.js';
import { httpClient } from '../../src/utils/http-client.js';

vi.mock('../../src/utils/http-client.js');

const mockHttpClient = httpClient as Mocked<typeof httpClient>;

describe('list-technologies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleListTechnologies', () => {
    const mockTechnologiesResponse = {
      references: {},
      sections: [
        {
          kind: 'technologies',
          groups: [
            {
              name: 'Featured',
              technologies: [
                {
                  title: 'SwiftUI',
                  identifier: 'swiftui',
                  tags: [],
                  languages: ['swift'],
                  destination: {
                    identifier: 'doc://com.apple.documentation/documentation/swiftui'
                  }
                },
                {
                  title: 'UIKit', 
                  identifier: 'uikit',
                  tags: [],
                  languages: ['swift', 'occ'],
                  destination: {
                    identifier: 'doc://com.apple.documentation/documentation/uikit'
                  }
                }
              ]
            },
            {
              name: 'App Frameworks',
              technologies: [
                {
                  title: 'Foundation',
                  identifier: 'foundation',
                  tags: [],
                  languages: ['swift', 'occ'],
                  destination: {
                    identifier: 'doc://com.apple.documentation/documentation/foundation'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    it('should list all technologies without filters', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies();

      expect(mockHttpClient.getJson).toHaveBeenCalledWith(
        'https://developer.apple.com/tutorials/data/documentation/technologies.json'
      );
      expect(result).toContain('# Apple Developer Technologies');
      expect(result).toContain('## Featured');
      expect(result).toContain('[SwiftUI]');
      expect(result).toContain('## App Frameworks');
      expect(result).toContain('[Foundation]');
    });

    it('should filter by category', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies('app frameworks');

      expect(result).toContain('## App Frameworks');
      expect(result).toContain('[Foundation]');
      expect(result).not.toContain('## Featured');
      expect(result).not.toContain('[SwiftUI]');
    });

    it('should handle case-insensitive category filtering', async () => {
      mockHttpClient.getJson.mockResolvedValue(mockTechnologiesResponse);

      const result = await handleListTechnologies('APP FRAMEWORKS');

      expect(result).toContain('## App Frameworks');
      expect(result).toContain('[Foundation]');
    });

    it('should filter by language', async () => {
      const mockResponseWithLanguage = {
        references: {},
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Featured',
                technologies: [
                  {
                    title: 'SwiftUI',
                    identifier: 'swiftui',
                    tags: [],
                    languages: ['swift'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/swiftui'
                    }
                  },
                  {
                    title: 'Core Foundation',
                    identifier: 'corefoundation',
                    tags: [],
                    languages: ['occ'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/corefoundation'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(mockResponseWithLanguage);

      const result = await handleListTechnologies(undefined, 'swift');

      expect(result).toContain('[SwiftUI]');
      expect(result).not.toContain('Core Foundation');
    });

    it('should exclude beta technologies when includeBeta is false', async () => {
      // Apple marks a beta technology on its reference
      const mockResponseWithBeta = {
        references: {
          'doc://com.apple.documentation/documentation/swiftui': {
            identifier: 'doc://com.apple.documentation/documentation/swiftui', beta: true,
          },
        },
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Featured',
                technologies: [
                  {
                    title: 'SwiftUI',
                    identifier: 'swiftui',
                    tags: [],
                    languages: ['swift'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/swiftui'
                    }
                  },
                  {
                    title: 'UIKit',
                    identifier: 'uikit',
                    tags: [],
                    languages: ['swift', 'occ'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/uikit'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(mockResponseWithBeta);

      const result = await handleListTechnologies(undefined, undefined, false);

      expect(result).not.toContain('SwiftUI');
      expect(result).toContain('[UIKit]');
    });

    it('should handle empty response', async () => {
      mockHttpClient.getJson.mockResolvedValue({ references: {}, sections: [] });

      const result = await handleListTechnologies();

      expect(result).toContain('No technologies found matching the specified criteria.');
    });

    it('should handle fetch errors', async () => {
      mockHttpClient.getJson.mockRejectedValue(new Error('Network error'));

      await expect(handleListTechnologies()).rejects.toThrow('Network error');
    });

    it('should report malformed JSON as an error', async () => {
      mockHttpClient.getJson.mockResolvedValue({ invalid: 'response' });

      await expect(handleListTechnologies()).rejects.toThrow();
    });

    it('should return detailed technology information when available', async () => {
      const detailedResponse = {
        references: {},
        sections: [
          {
            kind: 'technologies',
            groups: [
              {
                name: 'Graphics & Games',
                technologies: [
                  {
                    title: 'Metal',
                    identifier: 'metal',
                    tags: ['Graphics', 'Games'],
                    languages: ['swift', 'occ'],
                    destination: {
                      identifier: 'doc://com.apple.documentation/documentation/metal'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      mockHttpClient.getJson.mockResolvedValue(detailedResponse);

      const result = await handleListTechnologies();

      expect(result).toContain('[Metal]');
      expect(result).toContain('swift, occ');
      expect(result).toContain('Graphics, Games');
    });
  });
});