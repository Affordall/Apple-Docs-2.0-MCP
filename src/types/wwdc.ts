export interface TranscriptSegment {
  timestamp: string;
  text: string;
}

export interface TranscriptData {
  /** The page's paragraphs, each timed by its first sentence; the transcript's text is theirs, in order */
  segments: TranscriptSegment[];
}

export interface CodeExample {
  timestamp?: string;
  title?: string;
  language: string;
  code: string;
}

interface ResourceLink {
  title: string;
  url: string;
}

export interface VideoResources {
  hdVideo?: string;
  sdVideo?: string;
  sampleProject?: string;
  resourceLinks?: ResourceLink[];
}

export interface RelatedVideo {
  id: string;
  year: string;
  title: string;
  url: string;
}

export interface WWDCVideo {
  id: string;
  year: string;
  url: string;
  title: string;
  duration: string;        // its last chapter's end, empty for a session without chapters
  topics: string[];
  hasTranscript: boolean;
  hasCode: boolean;
  transcript?: TranscriptData;
  codeExamples?: CodeExample[];
  chapters?: Chapter[];
  resources: VideoResources;
  relatedVideos?: RelatedVideo[];
  extractedAt?: string;
}

export interface Chapter {
  title: string;
  timestamp: string;
  duration?: string;
}

export interface GlobalMetadata {
  version: string;
  lastUpdated: string;
  totalVideos: number;
  topics: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  years: string[];
  statistics: {
    byTopic: Record<string, number>;
    byYear: Record<string, number>;
    videosWithCode: number;
    videosWithTranscript: number;
  };
}

export interface TopicIndex {
  id: string;
  name: string;
  videoCount: number;
  years: string[];
  videos: Array<{
    id: string;
    year: string;
    title: string;
    topics: string[];
    duration: string;
    hasCode: boolean;
    hasTranscript: boolean;
    url: string;
    dataFile: string;
  }>;
}

export interface YearIndex {
  year: string;
  videoCount: number;
  topics: string[];
  videos: Array<{
    id: string;
    year: string;
    title: string;
    topics: string[];
    duration: string;
    hasCode: boolean;
    hasTranscript: boolean;
    url: string;
    dataFile: string;
  }>;
}
