// Root component — the app shell: collapsible sidebar (menu + sync status + theme button)
// and the routed content area where each screen renders. Also watches the service worker
// for a new deploy and surfaces a "new version available" reload prompt.
import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { SyncStatusComponent } from './sync-status/sync-status.component';
import { ThemePickerComponent } from './theme-picker/theme-picker.component';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MenuItem } from 'primeng/api';

// How often to ask the SW to check for a new deploy. The browser only auto-checks
// on full reloads (not client-side routing), so a long-open tab needs the nudge.
const UPDATE_POLL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SyncStatusComponent, ThemePickerComponent, PanelMenuModule, ButtonModule, ToastModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'primeng-search-demo';

  private swUpdate = inject(SwUpdate);
  /** True once a new deploy has finished installing and is ready to activate. */
  updateReady = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      // Flag when a newer version has downloaded and is ready to swap in.
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

  /** Activate the waiting worker and reload onto the new version. */
  reloadForUpdate() {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }

  menu: MenuItem[] = [
  { label: 'Jobs',     icon: 'pi pi-table',      routerLink: '/table' },
  { label: 'History',    icon: 'pi pi-history',    routerLink: '/history' },
  { label: 'Adaptive filters',icon: 'pi pi-sliders-h',  routerLink: '/adaptive' },
  {
    label: 'Admin', icon: 'pi pi-cog',
    items: [                                   // ← having `items` makes it a collapsible group
      { label: 'Steps', icon: 'pi pi-sitemap', routerLink: '/admin/steps' },
      { label: 'Characteristic codes', icon: 'pi pi-tag', routerLink: '/admin/characteristics' },
      { label: 'Condition codes', icon: 'pi pi-exclamation-triangle', routerLink: '/admin/conditions' },
      { label: 'Materials', icon: 'pi pi-box', routerLink: '/admin/materials' },
    ]
  },
];
collapsed = signal(true);   // true = minimized by default
toggle() { this.collapsed.update(v => !v); }
}
