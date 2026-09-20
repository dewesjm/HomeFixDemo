// Root component — the app shell: collapsible sidebar (menu + sync status + theme button)
// and the routed content area where each screen renders. Also watches the service worker
// for a new deploy and surfaces a "new version available" reload prompt.
import { Component, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ThemePickerComponent } from './theme-picker/theme-picker.component';
import { ToastHostComponent } from './shared/toast-host.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import {
  LucideTable, LucideHistory, LucideSlidersHorizontal, LucideSettings, LucideWorkflow, LucideTag,
  LucideStepForward, LucideCircleArrowUp, LucideRefreshCw,
  LucideBadgeCheck, LucideMapPin, LucideTarget, LucideMegaphone, LucideClipboardList, LucideLayers,
  LucideShield, LucideLink
} from '@lucide/angular';

// check for version updates periodically, only full refresh will check
const UPDATE_POLL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    ThemePickerComponent, ToastHostComponent, ConfirmDialogComponent,
    LucideCircleArrowUp, LucideRefreshCw, LucideBadgeCheck, LucideMapPin, LucideTarget,
    LucideTable, LucideHistory, LucideSlidersHorizontal, LucideSettings, LucideWorkflow, LucideTag,
    LucideStepForward, LucideMegaphone, LucideClipboardList, LucideLayers,
    LucideShield, LucideLink
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'welding-inspection';

  private swUpdate = inject(SwUpdate);
  /* true once a new deploy is ready to activate */
  updateReady = signal(false);
  adminOpen = signal(false);
  wpAdminOpen = signal(false);
  waAdminOpen = signal(false);
  waAdminOpen2 = signal(false);
  weAdminOpen = signal(false);
  weAdminOpen2 = signal(false);

  @ViewChild('adminDetails') adminDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('wpAdminDetails') wpAdminDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('waAdminDetails') waAdminDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('waAdminDetails2') waAdminDetails2?: ElementRef<HTMLDetailsElement>;
  @ViewChild('weAdminDetails') weAdminDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('weAdminDetails2') weAdminDetails2?: ElementRef<HTMLDetailsElement>;

  constructor() {
    document.addEventListener('click', (e: MouseEvent) => {
      const closeIfOutside = (open: boolean, set: (v: boolean) => void, ref?: ElementRef<HTMLDetailsElement>) => {
        if (open && !(e.target as HTMLElement).closest('.dropdown-wrapper')) {
          set(false);
          if (ref?.nativeElement) ref.nativeElement.open = false;
        }
      };
      closeIfOutside(this.adminOpen(), v => this.adminOpen.set(v), this.adminDetails);
      closeIfOutside(this.wpAdminOpen(), v => this.wpAdminOpen.set(v), this.wpAdminDetails);
      closeIfOutside(this.waAdminOpen(), v => this.waAdminOpen.set(v), this.waAdminDetails);
      closeIfOutside(this.waAdminOpen2(), v => this.waAdminOpen2.set(v), this.waAdminDetails2);
      closeIfOutside(this.weAdminOpen(), v => this.weAdminOpen.set(v), this.weAdminDetails);
      closeIfOutside(this.weAdminOpen2(), v => this.weAdminOpen2.set(v), this.weAdminDetails2);
    });

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

  /* activate the waiting worker, clear stale caches, and reload */
  reloadForUpdate() {
    // Clear persisted workflow & template caches so new stage definitions take effect
    const keysToClear = [
      'homefix:workflows:v2',
      'homefix:stage-templates:v2',
      'homefix:penetrants',
      'homefix:weld-positions',
    ];
    keysToClear.forEach(k => localStorage.removeItem(k));
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
