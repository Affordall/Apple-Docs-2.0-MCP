/**
 * The references embedded in one page's JSON: its pages, not its images, each summary as Apple wrote it.
 */
import { describe, expect, it, vi } from 'vitest';

import { handleResolveReferencesBatch } from '../../src/tools/resolve-references-batch.js';
import { httpClient } from '../../src/utils/http-client.js';

vi.mock('../../src/utils/http-client.js');

describe('resolve_references_batch', () => {
  it('lists the pages a page references, not its images, keeping code names in summaries', async () => {
    vi.mocked(httpClient.getJson).mockResolvedValue({
      metadata: { title: 'NavigationStack' },
      references: {
        'SwiftUI-PageImage-card.png': { type: 'image', identifier: 'SwiftUI-PageImage-card.png', variants: [] },
        'doc://SwiftUI/Binding': {
          type: 'topic', kind: 'symbol', role: 'symbol', title: 'Binding', url: '/documentation/swiftui/binding',
          abstract: [{ type: 'text', text: 'Reads and writes a value owned by a ' }, { type: 'codeVoice', code: 'State' }, { type: 'text', text: '.' }],
        },
      },
    });

    const result = await handleResolveReferencesBatch('https://developer.apple.com/documentation/swiftui/navigationstack', 5, 'all');

    expect(result).not.toContain('Unknown');
    expect(result).toContain('Resolved 1 references');
    expect(result).toContain('Reads and writes a value owned by a `State`.');
  });
});
