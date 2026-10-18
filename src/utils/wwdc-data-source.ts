import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { GlobalMetadata, TopicIndex, TranscriptData, WWDCVideo, YearIndex } from '../types/wwdc.js';

// The package's data/ folder: two levels up from src/utils/ and from dist/utils/ alike
const WWDC_DATA_DIR = fileURLToPath(new URL('../../data/wwdc', import.meta.url));

/** A year, topic or session the bundled data doesn't have */
class WWDCDataNotFoundError extends Error {}

/**
 * A bundled file's text; `what` names it in the error when the bundle doesn't have it ("Video 2025-219")
 */
async function fetchData(filePath: string, what: string): Promise<string> {
  try {
    return await fs.readFile(path.join(WWDC_DATA_DIR, filePath), 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new WWDCDataNotFoundError(`${what} not found in the bundled WWDC data`, { cause: error });
    }
    throw error;
  }
}

/** A transcript's text: its paragraphs in order, as the page shows them */
export function transcriptText(transcript: TranscriptData): string {
  return transcript.segments.map((segment) => segment.text).join('\n\n');
}

export async function loadGlobalMetadata(): Promise<GlobalMetadata> {
  return JSON.parse(await fetchData('index.json', 'The WWDC index')) as GlobalMetadata;
}

export async function loadTopicIndex(topicId: string): Promise<TopicIndex> {
  return JSON.parse(await fetchData(`by-topic/${topicId}/index.json`, `Topic ${topicId}`)) as TopicIndex;
}

export async function loadYearIndex(year: string): Promise<YearIndex> {
  return JSON.parse(await fetchData(`by-year/${year}/index.json`, `Year ${year}`)) as YearIndex;
}

export async function loadVideoData(year: string, videoId: string): Promise<WWDCVideo> {
  return JSON.parse(await fetchData(`videos/${year}-${videoId}.json`, `Video ${year}-${videoId}`)) as WWDCVideo;
}
