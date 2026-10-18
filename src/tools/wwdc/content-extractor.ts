import { siteUrl } from '../../utils/url-converter.js';
import { JSDOM } from 'jsdom';
import { httpClient } from '../../utils/http-client.js';
import { WWDC_URLS, WWDC_CONFIG } from '../../utils/constants.js';
import type {
  WWDCVideo,
  TranscriptData,
  TranscriptSegment,
  CodeExample,
  VideoResources,
  Chapter,
  RelatedVideo,
} from '../../types/wwdc.js';

/** A videos page Apple answered with another page: it redirects retired URLs (a session's /code) to /videos/ */
class PageMovedError extends Error {}

/** A session's code section whose examples no longer hold code where the extractor reads it */
class CodeSectionChangedError extends Error {}

/** A session page without the element the extractor reads */
class PageChangedError extends Error {}

/**
 * A page of developer.apple.com/videos as a document; a redirect is an error, as the page it lands on is another one
 */
export async function fetchVideosPage(url: string): Promise<Document> {
  const response = await httpClient.get(url);
  if (response.redirected) {
    throw new PageMovedError(`${url} redirected to ${response.url}`);
  }
  return new JSDOM(await response.text()).window.document;
}

/**
 * Extract complete content for a single WWDC video, with its topics from Apple's topic pages
 */
export async function extractVideoContent(
  videoUrl: string,
  videoId: string,
  year: string,
  topics: string[],
): Promise<WWDCVideo> {
  const document = await fetchVideosPage(videoUrl);

  const title = extractTitle(document);

  const transcript = extractTranscript(document);
  const hasTranscript = transcript !== undefined;

  // Sessions before WWDC22 have no code section; their code sits in the transcript
  const sessionCode = extractCodeExamples(document, videoUrl);
  const codeExamples = sessionCode.length === 0 && parseInt(year) < WWDC_CONFIG.CODE_TAB_INTRODUCED_YEAR
    ? extractCodeFromTranscript(document)
    : sessionCode;
  const hasCode = codeExamples.length > 0;

  const chapters = extractChapters(document);

  const resources = extractResources(document);

  const relatedVideos = await extractRelatedVideos(document, videoUrl);

  const video: WWDCVideo = {
    id: videoId,
    year,
    url: videoUrl,
    title,
    duration: sessionLength(document),
    topics,
    hasTranscript,
    hasCode,
    transcript: hasTranscript ? transcript : undefined,
    codeExamples: hasCode ? codeExamples : undefined,
    chapters: chapters.length > 0 ? chapters : undefined,
    resources,
    relatedVideos: relatedVideos.length > 0 ? relatedVideos : undefined,
    extractedAt: new Date().toISOString(),
  };

  return video;

}

/** The session page's title: its one h1 */
function extractTitle(document: Document): string {
  const title = document.querySelector('h1')?.textContent.trim();
  if (!title) {
    throw new PageChangedError('The session page has no h1 naming the session');
  }
  return title;
}

/** Seconds as a clock, the way Apple's chapter list writes times: "1:29", "1:02:05" */
function clock(seconds: number): string {
  const pad = (part: number): string => String(part).padStart(2, '0');
  const [hours, minutes, rest] = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), Math.floor(seconds % 60)];
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/**
 * The transcript on the session page, if it has one: its paragraphs, each timed by its first sentence's start, where
 * Apple's player seeks; a community or Q&A video's page has an empty transcript section
 */
function extractTranscript(document: Document): TranscriptData | undefined {
  const segments = [...document.querySelectorAll('#transcript-content p')].flatMap((paragraph): TranscriptSegment[] => {
    const text = (paragraph.textContent ?? '').replace(/\s+/g, ' ').trim();
    const start = paragraph.querySelector('[data-start]')?.getAttribute('data-start');
    return text ? [{ timestamp: start ? clock(Number(start)) : '', text }] : [];
  });
  return segments.length > 0 ? { segments } : undefined;
}

/**
 * The code examples in the session page's code section: one container each, its "m:ss - Title" line before the code
 */
function extractCodeExamples(document: Document, videoUrl: string): CodeExample[] {
  const containers = document.querySelectorAll('li.sample-code-main-container');
  const codeBlocks = [...document.querySelectorAll('li.sample-code-main-container pre.code-source')];
  if (codeBlocks.length !== containers.length) {
    throw new CodeSectionChangedError(`${videoUrl}: ${containers.length} code examples, ${codeBlocks.length} with code`);
  }

  const examples = codeBlocks.map((block): CodeExample => {
    const code = cleanCodeIndentation((block.querySelector('code') ?? block).textContent ?? '');
    const heading = block.previousElementSibling?.textContent?.trim() ?? '';
    const match = heading.match(/^(\d+:\d+)\s*-\s*(.+)$/);
    return {
      timestamp: match ? match[1] : '',
      title: match ? match[2].trim() : heading,
      language: detectLanguage(block),
      code,
    };
  });

  return removeDuplicateCodeExamples(examples.filter((example) => example.code.length >= WWDC_CONFIG.MIN_CODE_LENGTH));
}

function extractCodeFromTranscript(document: Document): CodeExample[] {
  const examples: CodeExample[] = [];

  const codeBlocks = document.querySelectorAll(
    '.transcript pre code, .transcript .code-voice',
  );

  codeBlocks.forEach((block: Element) => {
    let code = block.textContent || '';
    code = cleanCodeIndentation(code);
    if (code && code.length > 20) {
      examples.push({
        language: detectLanguage(block),
        code,
      });
    }
  });

  return examples;
}

function detectLanguage(element: Element): string {
  const className = element.className;
  if (className.includes('swift')) {
    return 'swift';
  }
  if (className.includes('objc') || className.includes('objective-c')) {
    return 'objc';
  }
  if (className.includes('javascript') || className.includes('js')) {
    return 'javascript';
  }

  const dataLang = element.getAttribute('data-language') ||
                  element.getAttribute('data-lang');
  if (dataLang) {
    return dataLang.toLowerCase();
  }

  return 'swift';
}

/** The chapters Apple's player lists, each at the time Apple writes beside it ("1:29 - Dynamics") and its length */
function extractChapters(document: Document): Chapter[] {
  return [...document.querySelectorAll('.chapter-item')].flatMap((item): Chapter[] => {
    const [timestamp = '', ...title] = (item.textContent ?? '').split(' - ');
    // Apple's own spelling
    const length = item.querySelector('[data-chapter-lenght]')?.getAttribute('data-chapter-lenght');
    return title.length > 0
      ? [{ timestamp: timestamp.trim(), title: title.join(' - ').trim(), ...(length ? { duration: clock(Number(length)) } : {}) }]
      : [];
  });
}

/** The session's length: the page names none, but its last chapter ends where the session does */
function sessionLength(document: Document): string {
  const ends = [...document.querySelectorAll('[data-chapter-end-time]')].map((link) => Number(link.getAttribute('data-chapter-end-time')));
  return ends.length > 0 ? clock(Math.max(...ends)) : '';
}

/**
 * The session page's Resources list: its documentation links and downloads
 */
function extractResources(document: Document): VideoResources {
  const resourceList = document.querySelector('li.supplement.details ul.links');
  if (resourceList) {
    return extractResourcesFromDocument(resourceList);
  }

  const resources: VideoResources = {
    resourceLinks: [],
  };

  const downloadLinks = document.querySelectorAll('a[href*=".mp4"], a[download]');
  downloadLinks.forEach((link: Element) => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent?.toLowerCase() || '';

    if (href.includes('_hd.mp4') || text.includes('hd')) {
      resources.hdVideo = siteUrl(href);
    } else if (href.includes('_sd.mp4') || text.includes('sd')) {
      resources.sdVideo = siteUrl(href);
    }
  });

  return resources;
}

/**
 * Extract resources from a page or one part of it
 */
function extractResourcesFromDocument(root: ParentNode): VideoResources {
  const resources: VideoResources = {
    resourceLinks: [],
  };

  const resourceLinks = root.querySelectorAll('a[href]');
  const processedUrls = new Set<string>();

  resourceLinks.forEach((link: Element) => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent?.trim() || '';

    if (!href || !text) {
      return;
    }

    const fullUrl = siteUrl(href);

    if (processedUrls.has(fullUrl)) {
      return;
    }
    processedUrls.add(fullUrl);

    if (href.includes('_hd.mp4') || text.toLowerCase().includes('hd video')) {
      resources.hdVideo = fullUrl;
    } else if (href.includes('_sd.mp4') || text.toLowerCase().includes('sd video')) {
      resources.sdVideo = fullUrl;
    } else if (href.includes('sample-code') || href.endsWith('.zip')) {
      resources.sampleProject = fullUrl;
    } else if (
      href.includes('/documentation/') ||
      href.includes('/design/') ||
      href.includes('/technotes/') ||
      href.includes('/forums/') ||
      text.includes('Human Interface Guidelines') ||
      text.includes('Documentation') ||
      text.includes('Forum')
    ) {
      resources.resourceLinks!.push({
        title: text,
        url: fullUrl,
      });
    }
  });

  return resources;
}

async function extractRelatedVideos(document: Document, videoUrl: string): Promise<RelatedVideo[]> {
  const relatedVideos: RelatedVideo[] = [];

  const relatedSection = document.querySelector('.related-videos, [data-related], #related');

  if (!relatedSection) {
    const videoLinks = document.querySelectorAll('a[href*="/videos/play/wwdc"]');
    const currentVideoId = videoUrl.match(/\/(\d+)\/?$/)?.[1];

    videoLinks.forEach((link: Element) => {
      const href = link.getAttribute('href') || '';
      const match = href.match(WWDC_URLS.SESSION_LINK);

      if (match && match[2] !== currentVideoId) {
        const year = match[1];
        const id = match[2];
        const title = link.textContent?.trim() || '';

        if (title && !relatedVideos.find(v => v.id === id)) {
          relatedVideos.push({
            id,
            year,
            title,
            url: siteUrl(href),
          });
        }
      }
    });
  }

  return relatedVideos;
}

function cleanCodeIndentation(code: string): string {
  const lines = code.split('\n');

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    return '';
  }

  const minIndent = lines
    .filter(line => line.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      return Math.min(min, indent);
    }, Infinity);

  if (minIndent > 0 && minIndent !== Infinity) {
    return lines
      .map(line => line.substring(minIndent))
      .join('\n')
      .trim();
  }

  return lines.join('\n').trim();
}

function removeDuplicateCodeExamples(examples: CodeExample[]): CodeExample[] {
  const seen = new Map<string, CodeExample>();

  for (const example of examples) {
    const key = example.code.trim();

    const existing = seen.get(key);
    if (!existing ||
        (example.title && !existing.title) ||
        (example.timestamp && !existing.timestamp)) {
      seen.set(key, example);
    }
  }

  return Array.from(seen.values());
}