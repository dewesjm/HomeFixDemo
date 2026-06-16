/* sidebar dot showing synced / pending / offline */
import { Component, computed, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { SyncService } from '../services/sync.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [TooltipModule],
  template: `
    <span class="sync-status" [class]="'sync-status--' + state()" [pTooltip]="tooltip()" tooltipPosition="bottom">
      <span class="sync-dot"></span>
      <span class="sync-label">{{ label() }}</span>
    </span>
  `,
  styles: [`
    .sync-status { display: inline-flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 600; }
    .sync-dot { width: .65rem; height: .65rem; border-radius: 50%; flex: 0 0 auto; }
    .sync-status--synced  .sync-dot { background: var(--p-green-500); }
    .sync-status--pending .sync-dot { background: var(--p-amber-500); animation: sync-pulse 1s ease-in-out infinite; }
    .sync-status--offline .sync-dot { background: var(--p-red-500); }
    .sync-status--synced  { color: var(--p-green-600); }
    .sync-status--pending { color: var(--p-amber-600); }
    .sync-status--offline { color: var(--p-red-600); }
    @keyframes sync-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  `]
})
export class SyncStatusComponent {
  private sync = inject(SyncService);

  state = this.sync.state;

  label = computed(() => {
    switch (this.state()) {
      case 'offline': return 'Offline';
      case 'pending': return 'Pending sync';
      default:        return 'Synced';
    }
  });

  tooltip = computed(() => {
    const p = this.sync.pending();
    switch (this.state()) {
      case 'offline': return 'No connection — changes are saved locally and will sync when you’re back online.';
      case 'pending': return `${p} change${p === 1 ? '' : 's'} waiting to sync…`;
      default:        return 'All changes synced.';
    }
  });
}
