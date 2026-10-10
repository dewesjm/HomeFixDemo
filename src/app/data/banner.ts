/* Admin-managed site banner, stored in localStorage and shown on selected pages. */
import { STORAGE } from './storage-keys';

export type BannerPage = 'all' | 'pipe-welding' | 'weld-planning';

export interface BannerData {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  enabled: boolean;
  pages: BannerPage[];
}

const DEFAULT_BANNER: BannerData = { message: '', type: 'info', enabled: false, pages: ['all'] };

export function loadBanner(): BannerData {
  try {
    const raw = localStorage.getItem(STORAGE.banner);
    if (raw) {
      const parsed = JSON.parse(raw);
      /* a banner saved for Advanced Search shows on Pipe Welding, the page Advanced Search became */
      const pages: string[] = parsed.pages ?? ['all'];
      const mapped = [...new Set(pages.map(p => (p === 'advanced-search' ? 'pipe-welding' : p)))] as BannerPage[];
      return { ...DEFAULT_BANNER, ...parsed, pages: mapped };
    }
  } catch { /* fall through to default */ }
  return { ...DEFAULT_BANNER };
}

export function saveBanner(data: BannerData) {
  localStorage.setItem(STORAGE.banner, JSON.stringify(data));
}

export function clearBanner() {
  localStorage.removeItem(STORAGE.banner);
}

/* the banner to show on a page, or null when disabled / not targeted at that page */
export function bannerFor(page: BannerPage): BannerData | null {
  const b = loadBanner();
  return b.enabled && b.message && (b.pages.includes('all') || b.pages.includes(page)) ? b : null;
}

/* longer messages than this show as a full-width strip under the page title instead of a pill beside it */
export const BANNER_PILL_MAX = 60;
export function isLongBanner(message: string): boolean { return message.trim().length > BANNER_PILL_MAX; }
