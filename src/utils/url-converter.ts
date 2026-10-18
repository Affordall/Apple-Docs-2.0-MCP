import { APPLE_PATHS, APPLE_URLS } from './constants.js';

/** A link as a web address: a site path is on developer.apple.com, a full URL stays as it is */
export function siteUrl(url: string): string {
  return new URL(url, APPLE_URLS.BASE).href;
}

export function convertToJsonApiUrl(webUrl: string): string | null {
  try {
    if (webUrl.endsWith('/')) {
      webUrl = webUrl.slice(0, -1);
    }

    const urlObj = new URL(webUrl);

    if (urlObj.hostname !== new URL(APPLE_URLS.BASE).hostname) {
      return null;
    }

    let path = urlObj.pathname;

    if (path.includes(APPLE_PATHS.DOCUMENTATION)) {
      path = path.replace(APPLE_PATHS.DOCUMENTATION, '');
      return `${APPLE_URLS.TUTORIALS_DATA}documentation/${path}.json`;
    }

    // The design guidelines are served from the same data path as the documentation, in any letter case:
    // Xcode's DocumentationSearch writes the path as /design/Human-Interface-Guidelines/…
    // A section's own page is its path without the final slash its pages' paths go on from
    if (`${path.toLowerCase()}/`.startsWith(APPLE_PATHS.DESIGN)) {
      return `${APPLE_URLS.TUTORIALS_DATA}${path.slice(1)}.json`;
    }

    // A tutorial's JSON sits at its whole path under the data path: /tutorials/data/tutorials/…
    if (`${path}/`.startsWith(APPLE_PATHS.TUTORIALS)) {
      return `${APPLE_URLS.TUTORIALS_DATA}${path.slice(1)}.json`;
    }

    // Any other path (a WWDC session, a forum thread) has no page JSON: fetched as JSON, it fails as a parse error
    return null;
  } catch {
    return null;
  }
}

/** A URL with no documentation page JSON behind it */
class NotADocumentationPageError extends Error {}

/** The JSON URL of the page at `url`, or a NotADocumentationPageError for a URL that has none */
export function jsonApiUrlOf(url: string): string {
  const jsonApiUrl = convertToJsonApiUrl(url);
  if (!jsonApiUrl) {
    throw new NotADocumentationPageError(`${url} is not a documentation page: these read ${APPLE_PATHS.DOCUMENTATION}, ` +
      `${APPLE_PATHS.DESIGN} and ${APPLE_PATHS.TUTORIALS} pages (get_apple_doc_content also ${APPLE_PATHS.HELP})`);
  }
  return jsonApiUrl;
}

export function isValidAppleDeveloperUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === new URL(APPLE_URLS.BASE).hostname;
  } catch {
    return false;
  }
}

export function extractApiNameFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop() || 'Unknown API';
  } catch {
    return 'Unknown API';
  }
}