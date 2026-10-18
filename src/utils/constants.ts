export const API_LIMITS = {
  MAX_SEARCH_RESULTS: 50,
  MAX_WWDC_RESULTS: 5,

  DEFAULT_DOCS_MAP_LIMIT: 10,
  DEFAULT_FRAMEWORK_SYMBOLS_LIMIT: 50,
  DEFAULT_DOCUMENTATION_UPDATES_LIMIT: 50,
  DEFAULT_TECHNOLOGY_OVERVIEWS_LIMIT: 50,
  DEFAULT_SAMPLE_CODE_LIMIT: 50,
  DEFAULT_TECHNOLOGIES_LIMIT: 200,
  DEFAULT_REFERENCES_LIMIT: 20,

  MAX_FRAMEWORK_SYMBOLS_LIMIT: 200,
  MAX_TECHNOLOGIES_LIMIT: 500,
  MAX_REFERENCES_LIMIT: 50,
} as const;

// Search Depth Configuration: the similar view's depths, and the most results each shows
export const SEARCH_DEPTH_LIMITS = {
  shallow: 5,
  medium: 10,
  deep: 15,
} as const;

export const CACHE_TTL = {
  PAGES: 30 * 60 * 1000, // 30 minutes
  INDEXES: 60 * 60 * 1000, // 1 hour
  // The parsed docs map, freed when idle this long: each session's server holds its own
  DOCS_MAP_IDLE: 30 * 60 * 1000,
} as const;

// Cache Size Configuration: entries are parsed JSON, a big page about 1 MB, SwiftUI's index several
export const CACHE_SIZE = {
  PAGES: 100,
  INDEXES: 20,
} as const;

export const REQUEST_CONFIG = {
  // Per attempt. A search streams until its results are ready (6 to 17 s in 2026-10-06 runs); this only catches a hang.
  TIMEOUT: 120000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // the first retry's wait; each next one doubles it
} as const;

export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 100,
  WINDOW_MS: 60000,
  SEARCH_SPACING_MS: 15000, // Apple's search API answers quicker searches with no results (2026-10-06)
} as const;

export const PROCESSING_LIMITS = {
  MAX_RELATED_APIS_PER_SECTION: 3,
  MAX_SIMILAR_APIS_FOR_DEEP_SEARCH: 3,
  MAX_TOPIC_IDENTIFIERS: 4,
} as const;

/** Where Apple keeps each part of its developer site, written once; every tool and script builds on these */
export const APPLE_PATHS = {
  DOCUMENTATION: '/documentation/',
  DESIGN: '/design/human-interface-guidelines/',
  TUTORIALS: '/tutorials/',
  HELP: '/help/app-store-connect/',
  SESSIONS: '/videos/play/',
} as const;

const SITE = 'https://developer.apple.com';
/** The JSON behind the site's pages and sidebars */
const DATA = `${SITE}/tutorials/data/`;

export const APPLE_URLS = {
  BASE: SITE,
  /** Where pages' images, videos and downloads load from: the pages' <base href>, which swift-docc-render prefixes */
  ASSETS: `${SITE}${APPLE_PATHS.TUTORIALS}`,
  SEARCH: `${SITE}/search/`,
  SEARCH_API: 'https://devintserv.msc.sbz.apple.com/api/v1/query',
  APP_STORE_CONNECT_HELP: `${SITE}${APPLE_PATHS.HELP}`,
  TUTORIALS_DATA: DATA,
  /** A technology's sidebar, its navigator index, by the technology's ID */
  INDEX: `${DATA}index/`,
  TECHNOLOGIES_JSON: `${DATA}documentation/technologies.json`,
  UPDATES_JSON: `${DATA}documentation/Updates.json`,
  UPDATES_INDEX_JSON: `${DATA}index/updates`,
  TECHNOLOGY_OVERVIEWS_JSON: `${DATA}documentation/TechnologyOverviews.json`,
  TECHNOLOGY_OVERVIEWS_INDEX_JSON: `${DATA}index/technologyoverviews`,
  SAMPLE_CODE_JSON: `${DATA}documentation/SampleCode.json`,
  SAMPLE_CODE_INDEX_JSON: `${DATA}index/samplecode`,
} as const;

export const WWDC_URLS = {
  getYearUrl: (year: string) => `${SITE}/videos/wwdc${year}/`,
  getVideoUrl: (year: string, videoId: string) => `${SITE}${APPLE_PATHS.SESSIONS}wwdc${year}/${videoId}/`,
  /** A session's link, as getVideoUrl builds it: its year and number */
  SESSION_LINK: /\/videos\/play\/wwdc(\d{4})\/(\d+)/,
} as const;

export const WWDC_CONFIG = {
  CODE_TAB_INTRODUCED_YEAR: 2022,

  DEFAULT_VIDEO_LIMIT: 50,
  DEFAULT_CODE_EXAMPLES_LIMIT: 30,
  DEFAULT_SEARCH_LIMIT: 20,
  DEFAULT_RELATED_VIDEOS_LIMIT: 15,
  DEFAULT_TOPIC_VIDEOS_LIMIT: 20,

  MAX_VIDEO_LIMIT: 200,
  MAX_SEARCH_LIMIT: 100,
  MAX_RELATED_VIDEOS_LIMIT: 50,

  MIN_CODE_LENGTH: 10,
  MAX_CONTEXT_MATCHES: 3,

} as const;
