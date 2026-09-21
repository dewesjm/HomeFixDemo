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
      return { ...DEFAULT_BANNER, pages: parsed.pages ?? ['all'], ...parsed };
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
