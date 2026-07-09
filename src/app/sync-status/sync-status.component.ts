/* sidebar dot showing synced / pending / offline */
import { Component, computed, inject } from '@angular/core';
import { TooltipDirective } from '../shared/tooltip.directive';
import { SyncService } from '../services/sync.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <span class="sync-status" [class]="'sync-status--' + state()" [appTooltip]="tooltip()" tooltipPosition="bottom">
      <span class="sync-dot"></span>
      <span class="sync-label">{{ label() }}</span>
    </span>
  `,
  styles: [`
    .sync-status { display: inline-flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 600; }
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
