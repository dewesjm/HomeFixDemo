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
    LucideShield, LucideLink, LucideUpload, LucideSearch
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
  LucideShield, LucideLink, LucideUpload, LucideSearch
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'welding-inspection';

  private swUpdate = inject(SwUpdate);
  /* true once a new deploy is ready to activate */
  updateReady = signal(false);

  @ViewChild('ewrDetails') ewrDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('wpDetails') wpDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('waDetails') waDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('weDetails') weDetails?: ElementRef<HTMLDetailsElement>;

  private suppressToggle = false;
  activeSystem = signal('Weld Record');

  private closeAll(except?: ElementRef<HTMLDetailsElement>) {
    this.suppressToggle = true;
    [this.ewrDetails, this.wpDetails, this.waDetails, this.weDetails].forEach(ref => {
      if (ref && ref !== except) ref.nativeElement.open = false;
    });
    setTimeout(() => this.suppressToggle = false, 0);
  }

  onEwrToggle(e: Event) { if (!this.suppressToggle) { this.activeSystem.set('Weld Record'); setTimeout(() => this.closeAll(this.ewrDetails)); } }
  onWpToggle(e: Event)  { if (!this.suppressToggle) { this.activeSystem.set('Weld Planning'); setTimeout(() => this.closeAll(this.wpDetails)); } }
  onWaToggle(e: Event)  { if (!this.suppressToggle) { this.activeSystem.set('Weld Assignment'); setTimeout(() => this.closeAll(this.waDetails)); } }
  onWeToggle(e: Event)  { if (!this.suppressToggle) { this.activeSystem.set('Weld Engineering'); setTimeout(() => this.closeAll(this.weDetails)); } }

  constructor() {
    document.addEventListener('click', (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.dropdown-wrapper')) {
        this.closeAll();
      }
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
