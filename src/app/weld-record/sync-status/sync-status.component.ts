/* top-bar coloured dot for synced / pending / offline; the status text shows on hover */
import { Component, computed, inject } from '@angular/core';
import { SyncService } from '../services/sync.service';
import { TooltipDirective } from '../../shared/tooltip.directive';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <span class="sync-status" [appTooltip]="label()" tooltipPosition="bottom" role="status" [attr.aria-label]="label()">
      <span class="sync-dot" [class]="'sync-dot sync-dot--' + state()"></span>
    </span>
  `,
  styles: [`
    .sync-status { display: inline-flex; align-items: center; padding: .25rem; }
    .sync-dot { width: .65rem; height: .65rem; border-radius: 50%; flex: 0 0 auto; }
    .sync-dot--synced  { background: var(--color-success); }
    .sync-dot--pending { background: var(--color-warning); animation: sync-pulse 1s ease-in-out infinite; }
    .sync-dot--offline { background: var(--color-error); }
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
