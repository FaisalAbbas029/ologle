/**
 * Outbound Link & UTM Campaign Tracking Utility
 * Enforces standardized UTM tracking across all outbound references
 */

export function withUtmTracking(
  url: string,
  params: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  } = {}
): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('utm_source', params.source || 'ologle');
    parsed.searchParams.set('utm_medium', params.medium || 'web');
    parsed.searchParams.set('utm_campaign', params.campaign || 'peer_discovery');
    if (params.content) {
      parsed.searchParams.set('utm_content', params.content);
    }
    return parsed.toString();
  } catch {
    // If not a full URL, return as is
    return url;
  }
}
