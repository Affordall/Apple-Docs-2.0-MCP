/**
 * The bundled WWDC sessions as plain text, one file each in year folders (`2025/219-meet-liquid-glass.txt`: title, link,
 * topics, transcript, code), for an agent to grep: `rg -c` ranks sessions by mentions, `rg -C 2` shows passages.
 */
import { writeFolderOnce } from '../../utils/exports.js';
import { loadGlobalMetadata, loadVideoData, loadYearIndex, transcriptText } from '../../utils/wwdc-data-source.js';
import type { WWDCVideo } from '../../types/wwdc.js';

let folder: Promise<string> | undefined;

/** The folder of session texts, written the first time any server on this machine asks for this version of the data */
export function sessionTextFolder(): Promise<string> {
  // A failed write is tried again by the next call
  folder ??= loadGlobalMetadata().then((metadata) =>
    writeFolderOnce(`wwdc-${metadata.lastUpdated.replace(/[^0-9A-Za-z]+/g, '-')}`, async () => {
      const files: Array<[string, string]> = [];
      for (const year of metadata.years) {
        for (const entry of (await loadYearIndex(year)).videos) {
          const video = await loadVideoData(year, entry.id);
          const slug = video.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          files.push([`${year}/${entry.id}-${slug}.txt`, sessionText(video)]);
        }
      }
      return files;
    })).catch((error: unknown) => {
    folder = undefined;
    throw error;
  });
  return folder;
}

function sessionText(video: WWDCVideo): string {
  const code = (video.codeExamples ?? []).map((example) =>
    `### ${[example.timestamp, example.title].filter(Boolean).join(' ')} (${example.language})\n${example.code}`);
  return [
    video.title,
    `WWDC${video.year.slice(2)} · ${video.url}`,
    video.topics.length > 0 ? `Topics: ${video.topics.join(', ')}` : '',
    '',
    video.transcript ? transcriptText(video.transcript) : '(no transcript)',
    ...(code.length > 0 ? ['', '## Code', '', code.join('\n\n')] : []),
    '',
  ].join('\n');
}
