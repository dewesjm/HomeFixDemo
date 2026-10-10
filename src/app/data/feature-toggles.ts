/* Admin > Feature Toggles: demo-only switches, stored in localStorage. */
import { signal } from '@angular/core';
import { STORAGE } from './storage-keys';

export interface FeatureToggles {
  routingPreview: boolean;       /* "Demo only - On signoff, this routes to ..." under each step's Signoff button */
  classicPipeWelding: boolean;   /* the old Pipe Welding table at /pipe-search-classic, with its own menu entry */
}

const DEFAULT_TOGGLES: FeatureToggles = { routingPreview: true, classicPipeWelding: false };

function load(): FeatureToggles {
  try {
    const raw = localStorage.getItem(STORAGE.featureToggles);
    if (raw) return { ...DEFAULT_TOGGLES, ...JSON.parse(raw) };
  } catch { /* fall through to default */ }
  return { ...DEFAULT_TOGGLES };
}

/* read by the menu and routes as well as Admin > Feature Toggles, so a switch takes effect right away */
export const featureToggles = signal<FeatureToggles>(load());

export function setFeatureToggle(key: keyof FeatureToggles, on: boolean) {
  featureToggles.update(t => ({ ...t, [key]: on }));
  localStorage.setItem(STORAGE.featureToggles, JSON.stringify(featureToggles()));
}
