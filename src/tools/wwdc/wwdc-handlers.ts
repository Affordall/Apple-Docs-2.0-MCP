import type { TranscriptData, WWDCVideo, YearIndex } from '../../types/wwdc.js';
import { sessionTextFolder } from './text-export.js';
import { WWDC_CONFIG } from '../../utils/constants.js';
import {
  loadGlobalMetadata,
  loadTopicIndex,
  loadVideoData,
  loadYearIndex,
} from '../../utils/wwdc-data-source.js';

/** A session as the year and topic indexes list it: every field a list shows, without reading its file */
type SessionEntry = YearIndex['videos'][number];

/** The sessions of index entries, which name each one's year and number */
function loadSessions(entries: SessionEntry[]): Promise<WWDCVideo[]> {
  return Promise.all(entries.map((entry) => loadVideoData(entry.year, entry.id)));
}

/**
 * List WWDC videos, from the year and topic indexes: they hold every field the list shows, so no session file is read
 */
export async function handleListWWDCVideos(
  year: string | undefined,
  topic: string | undefined,
  hasCode: boolean | undefined,
  limit: number,
): Promise<string> {
  const metadata = await loadGlobalMetadata();
  // A topic ID is one the bundled data lists ("swift", "swiftui-ui-frameworks"); other text is a word to find
  const isTopicId = metadata.topics.some(t => t.id === topic);
  const oneYear = year && year !== 'all' ? year : undefined;
  const entries = topic && isTopicId
    ? (await loadTopicIndex(topic)).videos.filter((entry) => !oneYear || entry.year === oneYear)
    : (await Promise.all((oneYear ? [oneYear] : metadata.years).map((one) => loadYearIndex(one)))).flatMap((index) => index.videos);
  const topicLower = topic?.toLowerCase() ?? '';
  const found = entries.filter((entry) =>
    (!topic || isTopicId || entry.topics.some((name) => name.toLowerCase().includes(topicLower)) ||
      entry.title.toLowerCase().includes(topicLower)) &&
    (hasCode === undefined || entry.hasCode === hasCode));
  return formatVideoList(found.slice(0, limit), found.length, year, topic, hasCode);
}

export async function handleSearchWWDCContent(
  query: string,
  searchIn: 'transcript' | 'code' | 'both' = 'both',
  year?: string,
  limit: number = 20,
): Promise<string> {
  const metadata = await loadGlobalMetadata();
  const queryLower = query.toLowerCase();
  const results: Array<{
    video: WWDCVideo & { year: string };
    matches: Array<{ type: 'transcript' | 'code'; context: string; timestamp?: string }>;
    count: number;
  }> = [];

  const yearsToSearch = year ? [year] : metadata.years;

  for (const y of yearsToSearch) {
    const yearIndex = await loadYearIndex(y);

    const potentialVideos = yearIndex.videos.filter(v => {
      const titleMatch = v.title?.toLowerCase().includes(queryLower) || false;
      const topicMatch = v.topics?.some(t => t.toLowerCase().includes(queryLower)) || false;
      return titleMatch || topicMatch ||
             (searchIn === 'code' || searchIn === 'both') && v.hasCode ||
             (searchIn === 'transcript' || searchIn === 'both') && v.hasTranscript;
    });

    if (potentialVideos.length === 0) {
      continue;
    }

    const videos = await loadSessions(potentialVideos);

    for (const video of videos) {
      const matches: Array<{ type: 'transcript' | 'code'; context: string; timestamp?: string }> = [];

      if ((searchIn === 'transcript' || searchIn === 'both') && video.transcript) {
        const transcriptMatches = searchInTranscript(video.transcript, queryLower);
        matches.push(...transcriptMatches.map(m => ({
          type: 'transcript' as const,
          context: m.context,
          timestamp: m.timestamp,
        })));
      }

      if ((searchIn === 'code' || searchIn === 'both') && video.codeExamples) {
        const codeMatches = searchInCode(video.codeExamples, queryLower);
        matches.push(...codeMatches.map(m => ({
          type: 'code' as const,
          context: m.context,
          timestamp: m.timestamp,
        })));
      }

      if (matches.length > 0) {
        results.push({
          video: { ...video, year: y },
          matches: matches.slice(0, WWDC_CONFIG.MAX_CONTEXT_MATCHES),
          count: matches.length,
        });
      }
    }
  }

  // Most matches first, counted before only three are kept to show
  results.sort((a, b) => b.count - a.count);

  const texts = sessionTextsLine(await sessionTextFolder());
  return `${formatSearchResults(results.slice(0, limit), results.length, query, searchIn)}\n\n${texts}`;
}

/** Where every session waits as text, for a search the tools can't make */
function sessionTextsLine(folder: string): string {
  return `Every session as text, one file each in year folders: ${folder} ` +
    '(`rg -c "<term>"` counts mentions per session, `rg -C 2 "<term>"` shows the passages).';
}

export async function handleGetWWDCVideo(
  year: string,
  videoId: string,
  includeTranscript: boolean = true,
  includeCode: boolean = true,
): Promise<string> {
  const video = await loadVideoData(year, videoId);

  return formatVideoDetail(video, includeTranscript, includeCode);
}

export async function handleGetWWDCCodeExamples(
  framework?: string,
  topic?: string,
  year?: string,
  limit: number = 30,
): Promise<string> {
  const metadata = await loadGlobalMetadata();
  const codeExamples: Array<{
    code: string;
    language: string;
    title?: string;
    timestamp?: string;
    videoTitle: string;
    videoUrl: string;
    year: string;
  }> = [];

  const yearsToSearch = year ? [year] : metadata.years;
  const isTopicId = metadata.topics.some(t => t.id === topic);
  // A session is its year and number: numbers repeat from year to year
  const topicSessions = topic && isTopicId ? new Set((await loadTopicIndex(topic)).videos.map((v) => v.dataFile)) : undefined;

  for (const y of yearsToSearch) {
    const yearIndex = await loadYearIndex(y);

    const videosWithCode = yearIndex.videos.filter(v => v.hasCode);

    let filteredVideos = videosWithCode;
    if (topic) {
      if (topicSessions) {
        filteredVideos = videosWithCode.filter(v => topicSessions.has(v.dataFile));
      } else {
        const topicLower = topic.toLowerCase();
        filteredVideos = videosWithCode.filter(v =>
          v.topics.some(t => t.toLowerCase().includes(topicLower)) ||
          v.title.toLowerCase().includes(topicLower),
        );
      }
    }

    if (filteredVideos.length === 0) {
      continue;
    }

    const videos = await loadSessions(filteredVideos);

    for (const video of videos) {
      if (!video.codeExamples || video.codeExamples.length === 0) {
        continue;
      }

      for (const example of video.codeExamples) {
        if (framework && !example.code.toLowerCase().includes(framework.toLowerCase())) {
          continue;
        }

        codeExamples.push({
          code: example.code,
          language: example.language,
          title: example.title,
          timestamp: example.timestamp,
          videoTitle: video.title,
          videoUrl: video.url,
          year: y,
        });
      }
    }
  }

  const texts = sessionTextsLine(await sessionTextFolder());
  return `${formatCodeExamples(codeExamples.slice(0, limit), codeExamples.length, framework, topic, year)}\n\n${texts}`;
}

/**
 * The paragraphs that hold the query, each with its time: where Apple's player starts it
 */
function searchInTranscript(transcript: TranscriptData, query: string): Array<{ context: string; timestamp?: string }> {
  return transcript.segments
    .filter((segment) => segment.text.toLowerCase().includes(query))
    .map((segment) => ({ context: segment.text, timestamp: segment.timestamp || undefined }));
}

function searchInCode(
  codeExamples: Array<{ code: string; language: string; timestamp?: string; title?: string }>,
  query: string,
): Array<{ context: string; timestamp?: string }> {
  const matches: Array<{ context: string; timestamp?: string }> = [];

  for (const example of codeExamples) {
    const lines = example.code.split('\n');
    const at = lines.findIndex(line => line.toLowerCase().includes(query));
    if (at >= 0) {
      // The matching line with 2 lines before it and 6 after: enough to see the call and what it takes
      const snippet = lines.slice(Math.max(0, at - 2), at + 7).join('\n');
      matches.push({
        context: `${example.title ?? ''}\n\`\`\`${example.language}\n${snippet}\n\`\`\``,
        timestamp: example.timestamp,
      });
    }
  }

  return matches;
}

function formatVideoList(
  videos: SessionEntry[],
  found: number,
  year: string | undefined,
  topic: string | undefined,
  hasCode: boolean | undefined,
): string {
  if (videos.length === 0) {
    return 'No WWDC videos found matching the criteria.';
  }

  let content = '# WWDC Video List\n\n';

  const filters: string[] = [];
  if (year && year !== 'all') {
    filters.push(`Year: ${year}`);
  }
  if (topic) {
    filters.push(`Topic: ${topic}`);
  }
  if (hasCode !== undefined) {
    filters.push(`Has Code: ${hasCode ? 'Yes' : 'No'}`);
  }

  if (filters.length > 0) {
    content += `**Filter Conditions:** ${filters.join(', ')}\n\n`;
  }

  content += `**Found ${found} videos${videos.length < found ? `, showing ${videos.length}` : ''}**\n\n`;

  // Each year's sessions, the newest year first
  [...Map.groupBy(videos, (video) => video.year)]
    .sort(([a], [b]) => Number(b) - Number(a))
    .forEach(([y, yearVideos]) => {
      content += `## WWDC${y}\n\n`;

      yearVideos.forEach(video => {
        content += `### [${video.title}](${video.url})\n`;

        const metadata: string[] = [];
        if (video.duration) {
          metadata.push(`Duration: ${video.duration}`);
        }
        if (video.hasTranscript) {
          metadata.push('Transcript');
        }
        if (video.hasCode) {
          metadata.push('Code Examples');
        }

        if (metadata.length > 0) {
          content += `*${metadata.join(' | ')}*\n`;
        }

        if (video.topics.length > 0) {
          content += `**Topics:** ${video.topics.join(', ')}\n`;
        }

        content += '\n';
      });
    });

  return content;
}

function formatSearchResults(
  results: Array<{
    video: WWDCVideo & { year: string };
    matches: Array<{ type: 'transcript' | 'code'; context: string; timestamp?: string }>;
    count: number;
  }>,
  found: number,
  query: string,
  searchIn: string,
): string {
  if (results.length === 0) {
    return `No ${searchIn === 'code' ? 'code' : searchIn === 'transcript' ? 'transcript' : 'content'} found containing "${query}".`;
  }

  let content = '# WWDC Content Search Results\n\n';
  content += `**Search Query:** "${query}"\n`;
  content += `**Search Scope:** ${searchIn === 'code' ? 'Code' : searchIn === 'transcript' ? 'Transcript' : 'All Content'}\n`;
  content += `**Found ${found} videos${results.length < found ? `, showing ${results.length}` : ''}**\n\n`;

  results.forEach(result => {
    content += `## [${result.video.title}](${result.video.url})\n`;
    content += `*WWDC${result.video.year} | ${result.count} matches*\n\n`;

    result.matches.forEach(match => {
      content += `**${match.type === 'code' ? 'Code' : 'Transcript'}**`;
      if (match.timestamp) {
        content += ` (${match.timestamp})`;
      }
      content += '\n';
      content += match.type === 'code' ? `${match.context}\n\n` : `> ${match.context}\n\n`;
    });
  });

  return content;
}

function formatVideoDetail(
  video: WWDCVideo,
  includeTranscript: boolean,
  includeCode: boolean,
): string {
  let content = `# ${video.title}\n\n`;
  content += `**WWDC${video.year}** | [Watch Video](${video.url})\n\n`;

  if (video.duration) {
    content += `**Duration:** ${video.duration}\n`;
  }
  if (video.topics.length > 0) {
    content += `**Topics:** ${video.topics.join(', ')}\n`;
  }

  if (video.resources.hdVideo || video.resources.sdVideo || video.resources.resourceLinks) {
    content += '\n**Resources:**\n';
    if (video.resources.hdVideo) {
      content += `- [HD Video](${video.resources.hdVideo})\n`;
    }
    if (video.resources.sdVideo) {
      content += `- [SD Video](${video.resources.sdVideo})\n`;
    }
    if (video.resources.resourceLinks && video.resources.resourceLinks.length > 0) {
      video.resources.resourceLinks.forEach(link => {
        content += `- [${link.title}](${link.url})\n`;
      });
    }
  }

  if (video.chapters && video.chapters.length > 0) {
    content += '\n## Chapters\n\n';
    video.chapters.forEach(chapter => {
      content += `- **${chapter.timestamp}** ${chapter.title}\n`;
    });
  }

  if (includeTranscript && video.transcript) {
    content += '\n## Transcript\n\n';

    // Each paragraph at its time, where Apple's player starts it
    video.transcript.segments.forEach(segment => {
      content += segment.timestamp ? `**${segment.timestamp}** ${segment.text}\n\n` : `${segment.text}\n\n`;
    });
  }

  if (includeCode && video.codeExamples && video.codeExamples.length > 0) {
    content += '\n## Code Examples\n\n';

    video.codeExamples.forEach((example, index) => {
      if (example.title) {
        content += `### ${example.title}`;
      } else {
        content += `### Code Example ${index + 1}`;
      }

      if (example.timestamp) {
        content += ` (${example.timestamp})`;
      }
      content += '\n\n';

      content += `\`\`\`${example.language}\n`;
      content += example.code;
      content += '\n\`\`\`\n\n';
    });
  }

  if (video.relatedVideos && video.relatedVideos.length > 0) {
    content += '\n## Related Videos\n\n';
    video.relatedVideos.forEach(related => {
      content += `- [${related.title}](${related.url}) (WWDC${related.year})\n`;
    });
  }

  return content;
}

function formatCodeExamples(
  examples: Array<{
    code: string;
    language: string;
    title?: string;
    timestamp?: string;
    videoTitle: string;
    videoUrl: string;
    year: string;
  }>,
  found: number,
  framework: string | undefined,
  topic: string | undefined,
  year: string | undefined,
): string {
  if (examples.length === 0) {
    return 'No code examples found matching the criteria.';
  }

  let content = '# WWDC Code Examples\n\n';

  const filters: string[] = [];
  if (framework) {
    filters.push(`Code contains: ${framework}`);
  }
  if (topic) {
    filters.push(`Topic: ${topic}`);
  }
  if (year) {
    filters.push(`Year: ${year}`);
  }

  if (filters.length > 0) {
    content += `**Filter Conditions:** ${filters.join(', ')}\n\n`;
  }

  content += `**Found ${found} code examples${examples.length < found ? `, showing ${examples.length}` : ''}**\n\n`;

  Map.groupBy(examples, (example) => example.language).forEach((languageExamples, lang) => {
    content += `## ${lang.charAt(0).toUpperCase() + lang.slice(1)}\n\n`;

    languageExamples.forEach(example => {
      content += `### ${example.title || 'Code Example'}\n`;
      content += `*From: [${example.videoTitle}](${example.videoUrl}) (WWDC${example.year})*`;

      if (example.timestamp) {
        content += ` *@ ${example.timestamp}*`;
      }
      content += '\n\n';

      content += `\`\`\`${example.language}\n`;
      content += example.code;
      content += '\n\`\`\`\n\n';
    });
  });

  return content;
}

export async function handleBrowseWWDCTopics(
  topicId?: string,
  includeVideos: boolean = true,
  year?: string,
  limit: number = 20,
): Promise<string> {
  const metadata = await loadGlobalMetadata();

  if (!topicId) {
    let content = '# WWDC Topics\n\n';
    content += `Found ${metadata.topics.length} topics:\n\n`;

    metadata.topics.forEach(topic => {
      content += `## [${topic.name}](${topic.url})\n`;
      content += `**Topic ID:** ${topic.id}\n`;

      const topicStats = metadata.statistics.byTopic[topic.id];
      if (topicStats) {
        content += `**Videos:** ${topicStats}\n`;
      }

      content += '\n';
    });

    return content;
  }

  const topic = metadata.topics.find(t => t.id === topicId);
  if (!topic) {
    return `Topic "${topicId}" not found. Available topics: ${metadata.topics.map(t => t.id).join(', ')}`;
  }

  let content = `# ${topic.name}\n\n`;
  content += `**Topic ID:** ${topic.id}\n`;
  content += `**URL:** [${topic.url}](${topic.url})\n\n`;

  if (includeVideos) {
    const topicIndex = await loadTopicIndex(topicId);

    let videosToShow = topicIndex.videos;
    if (year && year !== 'all') {
      videosToShow = videosToShow.filter(v => v.year === year);
    }

    videosToShow = videosToShow.slice(0, limit);

    content += `## Videos (${videosToShow.length}${videosToShow.length === limit ? '+' : ''})\n\n`;

    if (videosToShow.length === 0) {
      content += 'No videos found for this topic.\n';
    } else {
      [...Map.groupBy(videosToShow, (video) => video.year)]
        .sort(([a], [b]) => Number(b) - Number(a))
        .forEach(([y, yearVideos]) => {
          content += `### WWDC${y}\n\n`;

          yearVideos.forEach(video => {
            content += `- [${video.title}](${video.url})`;

            const features: string[] = [];
            if (video.hasTranscript) {
              features.push('Transcript');
            }
            if (video.hasCode) {
              features.push('Code');
            }

            if (features.length > 0) {
              content += ` | ${features.join(' | ')}`;
            }

            content += '\n';
          });

          content += '\n';
        });
    }
  }

  return content;
}

/**
 * Sessions related to one: first those Apple lists as related, then, across every year, the sessions that share its
 * topics, the most topics shared first, then the newest. Only the session's own file is read; the others come from
 * the year indexes.
 */
export async function handleFindRelatedWWDCVideos(videoId: string, year: string, limit: number): Promise<string> {
  const [source, metadata] = await Promise.all([loadVideoData(year, videoId), loadGlobalMetadata()]);
  const entries = (await Promise.all(metadata.years.map((one) => loadYearIndex(one)))).flatMap((index) => index.videos);
  // A session is its year and number: numbers repeat from year to year
  const key = (session: { year: string; id: string }): string => `${session.year}-${session.id}`;
  const byKey = new Map(entries.map((entry) => [key(entry), entry]));
  const shared = (entry: SessionEntry): string[] => entry.topics.filter((name) => source.topics.includes(name));

  const listedByApple = (source.relatedVideos ?? []).flatMap((related) => {
    const entry = byKey.get(key(related));
    if (!entry) {
      // A few sessions link to sessions from before the bundle's first year
      console.error('Skipped a related session the bundle lacks', { year: related.year, id: related.id });
      return [];
    }
    return [{ entry, relationship: 'Listed by Apple as related' }];
  });
  const listed = new Set([key({ year, id: videoId }), ...listedByApple.map(({ entry }) => key(entry))]);
  const byTopics = entries
    .filter((entry) => !listed.has(key(entry)) && shared(entry).length > 0)
    .sort((a, b) => shared(b).length - shared(a).length || b.year.localeCompare(a.year) || a.title.localeCompare(b.title))
    .map((entry) => ({ entry, relationship: `Shares ${shared(entry).join(', ')}` }));
  const related = [...listedByApple, ...byTopics];
  const shown = related.slice(0, limit);

  let content = `# Related Videos for "${source.title}"\n\n`;
  content += `**Source:** [${source.title}](${source.url}) (WWDC${year})\n\n`;
  if (shown.length === 0) {
    return `${content}No related videos found.\n`;
  }
  content += `## Related Videos (${related.length}${shown.length < related.length ? `, showing ${shown.length}` : ''})\n\n`;
  for (const { entry, relationship } of shown) {
    content += `### [${entry.title}](${entry.url})\n`;
    content += `*WWDC${entry.year} | ${relationship}*\n\n`;
    const features = [entry.duration ? `Duration: ${entry.duration}` : '', entry.hasTranscript ? 'Transcript' : '',
      entry.hasCode ? 'Code' : ''].filter(Boolean);
    if (features.length > 0) {
      content += `${features.join(' | ')}\n`;
    }
    if (entry.topics.length > 0) {
      content += `**Topics:** ${entry.topics.join(', ')}\n`;
    }
    content += '\n';
  }
  return content;
}

export async function handleListWWDCYears(): Promise<string> {
  const metadata = await loadGlobalMetadata();

  let content = '# Available WWDC Years\n\n';

  if (!metadata.years || metadata.years.length === 0) {
    return 'No WWDC years available.';
  }

  const sortedYears = [...metadata.years].sort((a, b) => b.localeCompare(a));

  content += `**Total Years:** ${sortedYears.length}\n\n`;
  content += '## Years with Video Counts\n\n';

  for (const year of sortedYears) {
    const videoCount = metadata.statistics?.byYear?.[year] || 0;
    content += `- **${year}**: ${videoCount} videos\n`;
  }

  content += `\n**Total Videos:** ${metadata.totalVideos || 0}\n`;

  if (metadata.statistics) {
    content += '\n## Statistics\n\n';
    content += `- **Videos with Code:** ${metadata.statistics.videosWithCode || 0}\n`;
    content += `- **Videos with Transcript:** ${metadata.statistics.videosWithTranscript || 0}\n`;
  }

  return content;
}