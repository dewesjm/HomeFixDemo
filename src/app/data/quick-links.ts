/* Admin-configurable shortcut links (localStorage-backed), shown in the top nav */
import { STORAGE } from './storage-keys';

export interface QuickLink {
  id: string;
  label: string;
  url: string;
}

const LS_KEY = STORAGE.quickLinks;
const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-1', label: 'Google', url: 'https://www.google.com' },
];

export function getQuickLinks(): QuickLink[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_QUICK_LINKS;
  } catch { return DEFAULT_QUICK_LINKS; }
}

export function setQuickLinks(links: QuickLink[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(links));
}
