/**
 * The WWDC sessions a page of developer.apple.com/videos links to: a year's page lists that year's, a topic's page
 * those of every year
 */
import { WWDC_URLS } from '../../utils/constants.js';
import { fetchVideosPage } from './content-extractor.js';

interface SessionLink {
  year: string;
  id: string;
  url: string;
}

/** Each session the page at `url` links to, once, in the page's order */
export async function extractSessionLinks(url: string): Promise<SessionLink[]> {
  const document = await fetchVideosPage(url);
  const links = new Map<string, SessionLink>();
  for (const anchor of document.querySelectorAll('a[href]')) {
    const [, year, id] = anchor.getAttribute('href')?.match(WWDC_URLS.SESSION_LINK) ?? [];
    if (year && id && !links.has(`${year}-${id}`)) {
      links.set(`${year}-${id}`, { year, id, url: WWDC_URLS.getVideoUrl(year, id) });
    }
  }
  return [...links.values()];
}

/** One WWDC year's sessions, from its page */
export async function extractVideoList(year: string): Promise<SessionLink[]> {
  return (await extractSessionLinks(WWDC_URLS.getYearUrl(year))).filter((link) => link.year === year);
}
