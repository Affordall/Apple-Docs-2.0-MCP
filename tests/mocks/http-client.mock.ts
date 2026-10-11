import { vi } from 'vitest';

// Mock the http-client module
vi.mock('../../src/utils/http-client.js', () => ({
  httpClient: {
    getJson: vi.fn(),
    getText: vi.fn(),
    get: vi.fn(),
  },
  HttpClient: vi.fn().mockImplementation(() => ({
    getJson: vi.fn(),
    getText: vi.fn(),
    get: vi.fn(),
  })),
}));