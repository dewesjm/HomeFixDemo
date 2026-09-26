/* Admin > Feature Toggles: demo-only switches, stored in localStorage. */
import { STORAGE } from './storage-keys';

export interface FeatureToggles {
  routingPreview: boolean;   /* "Demo only - On signoff, this routes to ..." under each step's Signoff button */
}

const DEFAULT_TOGGLES: FeatureToggles = { routingPreview: true };

export function loadFeatureToggles(): FeatureToggles {
  try {
    const raw = localStorage.getItem(STORAGE.featureToggles);
    if (raw) return { ...DEFAULT_TOGGLES, ...JSON.parse(raw) };
  } catch { /* fall through to default */ }
  return { ...DEFAULT_TOGGLES };
}

export function saveFeatureToggles(t: FeatureToggles) {
  localStorage.setItem(STORAGE.featureToggles, JSON.stringify(t));
}
