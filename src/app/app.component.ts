// Root component — the app shell: collapsible sidebar (menu + sync status + theme button)
// and the routed content area where each screen renders. Also watches the service worker
// for a new deploy and surfaces a "new version available" reload prompt.
import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { SyncStatusComponent } from './sync-status/sync-status.component';
import { ThemePickerComponent } from './theme-picker/theme-picker.component';
import { ToastHostComponent } from './shared/toast-host.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import {
  LucideTable, LucideHistory, LucideSlidersHorizontal, LucideSettings, LucideWorkflow, LucideTag,
  LucideTriangleAlert, LucideBox, LucideStepForward, LucideMenu, LucideCircleArrowUp, LucideRefreshCw,
  LucideBadgeCheck
} from '@lucide/angular';

// check for version updates periodically, only full refresh will check
const UPDATE_POLL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    SyncStatusComponent, ThemePickerComponent, ToastHostComponent, ConfirmDialogComponent,
    LucideMenu, LucideCircleArrowUp, LucideRefreshCw, LucideBadgeCheck,
    LucideTable, LucideHistory, LucideSlidersHorizontal, LucideSettings, LucideWorkflow, LucideTag,
    LucideTriangleAlert, LucideBox, LucideStepForward
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'primeng-search-demo';

  private swUpdate = inject(SwUpdate);
  /* true once a new deploy is ready to activate */
  updateReady = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      // check for updates + button to update now, PWA/offline important
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));

      // Check now, on an interval, and whenever the tab regains focus.
      const check = () => this.swUpdate.checkForUpdate().catch(() => { /* offline / transient */ });
      check();
      setInterval(check, UPDATE_POLL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    }
  }

  /* activate the waiting worker and reload */
  reloadForUpdate() {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }

  adminOpen = signal(true);   // Admin submenu expanded by default
  collapsed = signal(true);   // true = minimized by default
  toggle() { this.collapsed.update(v => !v); }
}
