/* top-bar coloured dot for synced / pending / offline; the status text shows on hover, or on tap
   for touch screens (tapping anywhere else hides it) */
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { SyncService } from '../services/sync.service';
import { TooltipDirective } from '../../shared/tooltip.directive';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <button type="button" class="sync-status" [appTooltip]="label()" tooltipPosition="bottom"
            [class.tooltip-open]="open()" [attr.aria-label]="label()" (click)="open.set(!open())">
      <span class="sync-dot" [class]="'sync-dot sync-dot--' + state()"></span>
    </button>
  `,
  styles: [`
    .sync-status { display: inline-flex; align-items: center; padding: .4rem; cursor: pointer; }
    .sync-dot { width: .65rem; height: .65rem; border-radius: 50%; flex: 0 0 auto; }
    .sync-dot--synced  { background: var(--color-success); }
    .sync-dot--pending { background: var(--color-warning); animation: sync-pulse 1s ease-in-out infinite; }
    .sync-dot--offline { background: var(--color-error); }
    @keyframes sync-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  `]
})
export class SyncStatusComponent {
  private sync = inject(SyncService);
  private host = inject(ElementRef<HTMLElement>);
  open = signal(false);

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  state = this.sync.state;

  label = computed(() => {
    switch (this.state()) {
      case 'offline': return 'Offline';
      case 'pending': return `${this.sync.pending()} pending`;
      default:        return 'Synced';
    }
  });
}
