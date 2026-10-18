import type { Mocked } from 'vitest';
import { vi, describe, test, expect, beforeEach } from 'vitest';

import { extractVideoContent as extractWWDCVideoContent } from '../../../src/tools/wwdc/content-extractor';
import { httpClient } from '../../../src/utils/http-client';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';

vi.mock('../../../src/utils/http-client');
const mockHttpClient = httpClient as Mocked<typeof httpClient>;

describe('WWDC Content Extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Apple's page for Meet Liquid Glass as captured (scripts/capture-responses.ts): chapters and a timed transcript
  const capturedSession = () => readFile(new URL('../../../api-map/responses/wwdc2025-219.html', import.meta.url), 'utf8');

  test('should extract video metadata correctly', async () => {
    mockHttpClient.get.mockResolvedValue({ text: vi.fn().mockResolvedValue(await capturedSession()) } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/219/', '219', '2025', ['Design']);

    expect(result).toMatchObject({
      id: '219',
      url: 'https://developer.apple.com/videos/play/wwdc2025/219/',
      title: 'Meet Liquid Glass',
      // The page names no length; its last chapter ends at 19:33
      duration: '19:33',
      year: '2025',
      topics: ['Design'],
    });
    expect(result.chapters?.[0]).toEqual({ timestamp: '0:00', title: 'Introduction', duration: '1:29' });
  });

  test('should extract transcript when available', async () => {
    mockHttpClient.get.mockResolvedValue({ text: vi.fn().mockResolvedValue(await capturedSession()) } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/219/', '219', '2025', []);

    expect(result.hasTranscript).toBe(true);
    // Each paragraph at its first sentence's start, where Apple's player seeks
    expect(result.transcript?.segments.every((segment) => /^\d+:\d{2}$/.test(segment.timestamp))).toBe(true);
    expect(result.transcript?.segments[0]).toMatchObject({ timestamp: '0:07', text: expect.stringMatching(/^Liquid Glass is a significant new step/) });
  });

  test('should extract code examples', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>SwiftUI Animations</h1>
        </div>
        <li class="supplement sample-code" data-supplement-id="sample-code">
          <ul class="no-bullet">
            <li class="sample-code-main-container">
              <p>2:10 - <a class="jump-to-time-sample" href="/videos/play/wwdc2025/10002/?time=130">Spring a circle</a></p>
              <pre class="code-source"><code>
struct ContentView: View {
    @State private var isAnimating = false
    
    var body: some View {
        Circle()
            .scaleEffect(isAnimating ? 1.5 : 1.0)
            .animation(.spring(), value: isAnimating)
    }
}
</code></pre>
            </li>
          </ul>
        </li>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: vi.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10002/', '10002', '2025', []);

    expect(result.hasCode).toBe(true);
    expect(result.codeExamples).toHaveLength(1);
    expect(result.codeExamples[0]).toMatchObject({
      timestamp: '2:10',
      title: 'Spring a circle',
      language: 'swift',
      code: expect.stringContaining('struct ContentView'),
    });
  });

  test('should extract resources', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Test Video</h1>
        </div>
        <nav><a href="/forums/">Developer Forums</a><a href="/documentation/">Documentation</a></nav>
        <li class="supplement details" data-supplement-id="details">
          <h2>Resources</h2>
          <ul class="links small">
            <li class="document"><a href="/documentation/translation">Translation Documentation</a></li>
            <li class="download">
              <ul class="options">
                <li><a href="https://devstreaming-cdn.apple.com/videos/wwdc/2025/10003/downloads/wwdc2025-10003_hd.mp4?dl=1">HD Video</a></li>
                <li><a href="https://devstreaming-cdn.apple.com/videos/wwdc/2025/10003/downloads/wwdc2025-10003_sd.mp4?dl=1">SD Video</a></li>
              </ul>
            </li>
          </ul>
        </li>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: vi.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10003/', '10003', '2025', []);

    expect(result.resources).toBeDefined();
    expect(result.resources.resourceLinks).toHaveLength(1);
    expect(result.resources.resourceLinks).toEqual([
      {
        title: 'Translation Documentation',
        url: 'https://developer.apple.com/documentation/translation',
      },
    ]);
    expect(result.resources.hdVideo).toBe('https://devstreaming-cdn.apple.com/videos/wwdc/2025/10003/downloads/wwdc2025-10003_hd.mp4?dl=1');
    expect(result.resources.sdVideo).toBe('https://devstreaming-cdn.apple.com/videos/wwdc/2025/10003/downloads/wwdc2025-10003_sd.mp4?dl=1');
  });

  test('should extract related videos', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Test Video</h1>
        </div>
        <!-- Include links to other WWDC videos in the page -->
        <div class="content">
          <a href="/videos/play/wwdc2025/10189/">Advanced Translation Features</a>
          <a href="/videos/play/wwdc2024/10055/">Introduction to Translation</a>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: vi.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10004/', '10004', '2025', []);

    expect(result.relatedVideos).toBeDefined();
    expect(result.relatedVideos).toHaveLength(2);
    expect(result.relatedVideos?.[0]).toMatchObject({ id: '10189' });
    expect(result.relatedVideos?.[1]).toMatchObject({ id: '10055' });
  });

  test('should handle missing elements gracefully', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Minimal Session</h1>
        </div>
      </body>
      </html>
    `;

    mockHttpClient.get.mockImplementation((url) => {
      if (url.includes('/transcript')) {
        return Promise.reject(new Error('No transcript'));
      }
      return Promise.resolve({
        text: vi.fn().mockResolvedValue(mockHtml),
      } as any);
    });

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10005/', '10005', '2025', []);

    expect(result).toMatchObject({
      id: '10005',
      title: 'Minimal Session',
      hasTranscript: false,
      hasCode: false,
      topics: [],
      resources: {
        resourceLinks: []
      },
      relatedVideos: undefined,
    });
  });

  test('should handle HTTP errors', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('404 Not Found'));

    await expect(extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/99999/', '99999', '2025', [])).rejects.toThrow(
      '404 Not Found'
    );
  });

  test('should clean and format code examples', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="video-title">
          <h1>Code Formatting Test</h1>
        </div>
        <li class="sample-code-main-container">
          <p>0:42 - Example</p>
          <pre class="code-source" data-language="swift">
          <code>
            // This is a comment
            func example() {
                print("Hello")
            }
          </code>
          </pre>
        </li>
      </body>
      </html>
    `;

    mockHttpClient.get.mockResolvedValue({
      text: vi.fn().mockResolvedValue(mockHtml),
    } as any);

    const result = await extractWWDCVideoContent('https://developer.apple.com/videos/play/wwdc2025/10006/', '10006', '2025', []);

    expect(result.codeExamples[0].code).toBe(
      '// This is a comment\nfunc example() {\n    print("Hello")\n}'
    );
  });
});