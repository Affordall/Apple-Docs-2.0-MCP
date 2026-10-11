/**
 * The bundled WWDC data itself, read through the real loader (wwdc-data-source.test.ts mocks it).
 */

import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';

import { loadGlobalMetadata, loadYearIndex } from '../../src/utils/wwdc-data-source.js';

// tests/setup.ts points the loader at /mock/data/wwdc for every suite; this one reads the real bundle.
vi.mock('../../src/utils/wwdc-data-source-path.js', () => ({
  getWWDCDataDirectory: () => `${process.cwd()}/data/wwdc`,
}));

describe('Bundled WWDC data', () => {
  it('covers WWDC26, every session with its data file', async () => {
    const meta = await loadGlobalMetadata();
    expect(meta.years).toContain('2026');
    expect(meta.statistics.byYear['2026']).toBeGreaterThan(100);
    const year = await loadYearIndex('2026');
    expect(year.videos.length).toBe(meta.statistics.byYear['2026']);
    for (const video of year.videos) {
      expect(existsSync(path.resolve('data/wwdc', video.dataFile))).toBe(true);
    }
  });
});
