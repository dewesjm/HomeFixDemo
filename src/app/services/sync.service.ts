/* tracks online/offline and pending-sync count; push is stubbed */
import { Injectable, NgZone, computed, inject, signal } from '@angular/core';

export type SyncState = 'synced' | 'pending' | 'offline';

/* combines connectivity + pending-sync count into one status; flush() is a stub */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private zone = inject(NgZone);

  /* true when browser reports a connection */
  online = signal(navigator.onLine);

  /* local changes not yet pushed */
  pending = signal(0);

  /* offline wins, else pending vs synced */
  state = computed<SyncState>(() => {
    if (!this.online()) return 'offline';
    return this.pending() > 0 ? 'pending' : 'synced';
  });

  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    window.addEventListener('online', () => this.zone.run(() => {
      this.online.set(true);
      this.scheduleFlush();          // try to push anything that queued up while offline
    }));
    window.addEventListener('offline', () => this.zone.run(() => {
      this.online.set(false);
    }));
  }

  /* call when local data is mutated/persisted */
  markDirty() {
    this.pending.update(n => n + 1);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer || !this.online() || this.pending() === 0) return;
    // debounce so a burst of edits results in one "push"
    this.flushTimer = setTimeout(() => this.zone.run(() => {
      this.flushTimer = null;
      this.flush();
    }), 1500);
  }

  /* stub: pretend pending changes pushed ok */
  private flush() {
    if (!this.online()) return;
    // TODO: POST/PUT the queued changes to your API here, then on success:
    this.pending.set(0);
  }
}
