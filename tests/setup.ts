import { vi, beforeEach, afterEach } from 'vitest';
/**
 * Vitest's setup file, run before each test file
 */

// The tools leave whole lists as files for agents; tests write none into the folder a running server shares
vi.mock('../src/utils/exports.js', () => ({
  exportPath: (name: string) => `/mock/exports/${name}`,
  writeTsv: vi.fn(async (name: string) => `/mock/exports/${name}`),
  writeFolderOnce: vi.fn(async (name: string) => `/mock/exports/${name}`),
}));

const originalConsoleError = console.error;
beforeEach(async () => {
  console.error = vi.fn();
  // Apple's JSON stays cached by URL for a server's life; each test starts with none
  const { pageCache, indexCache } = await import('../src/utils/cache.js');
  pageCache.clear();
  indexCache.clear();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Requests stay off the network unless a test mocks the client
global.fetch = vi.fn();
