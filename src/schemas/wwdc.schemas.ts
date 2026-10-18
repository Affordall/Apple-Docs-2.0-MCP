import { z } from 'zod';
import { WWDC_CONFIG } from '../utils/constants.js';

/** The topics come from the bundled WWDC data, which list_wwdc_videos' "topics" view lists: no copy of them here */
const TOPIC = 'a topic ID, as list_wwdc_videos with view "topics" lists them, keeps that topic\'s sessions; any other text keeps the sessions whose title or topic names contain it, in any case';

export const listWWDCVideosSchema = z.object({
  view: z.enum(['sessions', 'years', 'topics']).default('sessions').describe('"sessions": the sessions by year, topic or text in the title or topic names. "years": each WWDC year with its number of sessions, then how many sessions in all have code and a transcript. "topics": the WWDC topics with their IDs and session counts or, with topic, one topic\'s sessions, newest year first.'),
  year: z.string().optional().describe('sessions, and one topic\'s sessions: keeps one WWDC year ("2026"); left out or "all", every year.'),
  topic: z.string().optional().describe(`sessions: ${TOPIC}. topics: one topic's ID, to list its sessions.`),
  hasCode: z.boolean().optional().describe('sessions: true keeps the sessions with code; false, those without.'),
  includeVideos: z.boolean().default(true).describe('topics: false shows the topic without its sessions.'),
  limit: z.number().min(1).max(WWDC_CONFIG.MAX_VIDEO_LIMIT).optional().describe(`Most sessions to show: ${WWDC_CONFIG.DEFAULT_VIDEO_LIMIT} if left out, ${WWDC_CONFIG.DEFAULT_TOPIC_VIDEOS_LIMIT} of one topic's.`),
});

export const searchWWDCContentSchema = z.object({
  view: z.enum(['sessions', 'examples']).default('sessions').describe(`"sessions": the matching sessions, most matches first, each with its count of matches and up to ${WWDC_CONFIG.MAX_CONTEXT_MATCHES} passages or code excerpts, each with its time. "examples": the code examples that contain query, each with its session, year and the time it appears, newest year first.`),
  query: z.string().min(1).describe('sessions: text a transcript paragraph or a line of code must contain, as typed, in any case ("@Observable", "Vision Pro"; "async await" finds the two words side by side). examples: text the code must contain, in any case: a type, attribute, method or framework name ("LanguageModelSession", "@Generable"); session code rarely shows its imports, so a framework\'s name finds fewer.'),
  searchIn: z.enum(['transcript', 'code', 'both']).default('both').describe('sessions: search the transcripts, the code, or both.'),
  year: z.string().optional().describe('Keeps one WWDC year ("2025"); left out, every year.'),
  topic: z.string().optional().describe(`examples: ${TOPIC}.`),
  limit: z.number().min(1).max(WWDC_CONFIG.MAX_SEARCH_LIMIT).optional().describe(`Most sessions to show, ${WWDC_CONFIG.DEFAULT_SEARCH_LIMIT} if left out; examples: most examples, ${WWDC_CONFIG.DEFAULT_CODE_EXAMPLES_LIMIT}.`),
});

export const getWWDCVideoSchema = z.object({
  view: z.enum(['session', 'related']).default('session').describe('"session": the session itself. "related": the sessions related to it, first those Apple lists as related, then, across every year, sessions that share its topics, the most shared first; each with its year, link and topics, and whether it has a transcript and code.'),
  year: z.string().describe('The session\'s WWDC year ("2025").'),
  videoId: z.string().describe('The session\'s number, from its link: …/wwdc2025/10101/ is "10101".'),
  includeTranscript: z.boolean().default(true).describe('session: false leaves out the transcript, which runs to tens of KB.'),
  includeCode: z.boolean().default(true).describe('session: false leaves out the code examples.'),
  limit: z.number().min(1).max(WWDC_CONFIG.MAX_RELATED_VIDEOS_LIMIT).default(WWDC_CONFIG.DEFAULT_RELATED_VIDEOS_LIMIT).describe('related: most sessions to show.'),
});
