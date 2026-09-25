/* sidebar dot showing synced / pending / offline */
import { Component, computed, inject } from '@angular/core';
import { SyncService } from '../services/sync.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  template: `
    <span class="sync-status" [class]="'sync-status--' + state()">
      <span class="sync-dot"></span>
      <span class="sync-label">{{ label() }}</span>
    </span>
  `,
  styles: [`
    .sync-status { display: inline-flex; align-items: center; gap: .4rem; font-size: .9rem; font-weight: 600; }
    .sync-dot { width: .65rem; height: .65rem; border-radius: 50%; flex: 0 0 auto; }
    .sync-status--synced  .sync-dot { background: var(--color-success); }
    .sync-status--pending .sync-dot { background: var(--color-warning); animation: sync-pulse 1s ease-in-out infinite; }
    .sync-status--offline .sync-dot { background: var(--color-error); }
    .sync-status--synced  { color: var(--color-success); }
    .sync-status--pending { color: var(--color-warning); }
    .sync-status--offline { color: var(--color-error); }
    @keyframes sync-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  `]
})
export class SyncStatusComponent {
  private sync = inject(SyncService);

  state = this.sync.state;

  label = computed(() => {
    switch (this.state()) {
      case 'offline': return 'Offline';
      case 'pending': return `${this.sync.pending()} pending`;
      default:        return 'Synced';
    }
  });
}
