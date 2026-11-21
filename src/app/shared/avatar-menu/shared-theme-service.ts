import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import { DOCUMENT } from '@angular/common';

export const SHARED_THEME_DEFAULT = 'navy';

@Injectable({ providedIn: 'root' })
export class SharedThemeService {
  private readonly browser = inject(DOCUMENT).defaultView;
  private readonly current = signal(SHARED_THEME_DEFAULT);
  readonly theme = this.current.asReadonly();
  private revision = 0;

  constructor() {
    const refresh = () => void this.refresh();
    this.browser?.addEventListener('focus', refresh);
    inject(DestroyRef).onDestroy(() => this.browser?.removeEventListener('focus', refresh));
    refresh();
  }

  async refresh(): Promise<void> {
    const revision = ++this.revision;
    const host = this.browser?.location.hostname ?? '';
    const address = ['localhost', '127.0.0.1', '[::1]'].includes(host)
      ? 'http://localhost:3100/sharedTheme'
      : 'https://manage-settings.vercel.app/api/sharedTheme';
    try {
      const response = await fetch(address, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return;
      const result: { theme?: unknown } = await response.json();
      if (revision === this.revision && typeof result.theme === 'string') {
        this.current.set(result.theme);
      }
    } catch {
      // Keep the last theme if the app is offline.
    }
  }
}
