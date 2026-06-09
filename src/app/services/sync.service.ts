// State service — tracks online/offline (real, via navigator + events) and a pending-sync
// count. The actual push to a backend is stubbed (no server in this app).
import { Injectable, NgZone, computed, inject, signal } from '@angular/core';

export type SyncState = 'synced' | 'pending' | 'offline';

/**
 * Tracks two things and combines them into a single status:
 *   1. Connectivity  — real, from the browser's navigator.onLine + online/offline events.
 *   2. Pending sync  — how many local changes haven't been pushed to a backend yet.
 *
 * NOTE: there is no backend in this app, so `flush()` is a stub that simulates a
 * successful push after a short delay. Replace its body with a real API call.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private zone = inject(NgZone);

  /** True when the browser reports a network connection. */
  online = signal(navigator.onLine);

  /** Count of local changes not yet pushed to the server. */
  pending = signal(0);

  /** Offline wins over everything; otherwise pending vs. fully synced. */
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

  /** Call whenever local data is mutated/persisted. */
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

  /** STUB: pretend the pending changes were pushed to a backend successfully. */
  private flush() {
    if (!this.online()) return;
    // TODO: POST/PUT the queued changes to your API here, then on success:
    this.pending.set(0);
  }
}
