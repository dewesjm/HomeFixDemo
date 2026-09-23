// Root component — the app shell: collapsible sidebar (menu + sync status + theme button)
// and the routed content area where each screen renders. Also watches the service worker
// for a new deploy and surfaces a "new version available" reload prompt.
import { Component, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ThemePickerComponent } from './theme-picker/theme-picker.component';
import { ToastHostComponent } from './shared/toast-host.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import {
  LucideTable, LucideHistory, LucideSlidersHorizontal, LucideSettings, LucideWorkflow, LucideTag,
  LucideStepForward, LucideCircleArrowUp, LucideRefreshCw,
  LucideBadgeCheck, LucideMapPin, LucideTarget, LucideMegaphone, LucideClipboardList, LucideLayers,
    LucideShield, LucideLink, LucideUpload, LucideSearch, LucideExternalLink, LucideUserCog,
    LucideList, LucideListTree
} from '@lucide/angular';
import { getQuickLinks, QuickLink } from './data/quick-links';

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
  LucideShield, LucideLink, LucideUpload, LucideSearch, LucideExternalLink, LucideUserCog,
  LucideList, LucideListTree
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'welding-inspection';

  private swUpdate = inject(SwUpdate);
  private router = inject(Router);
  /* true once a new deploy is ready to activate */
  updateReady = signal(false);

  @ViewChild('pipeWeldingDetails') pipeWeldingDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('wpDetails') wpDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('waDetails') waDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('weDetails') weDetails?: ElementRef<HTMLDetailsElement>;
  @ViewChild('qlDetails') qlDetails?: ElementRef<HTMLDetailsElement>;

  /* demo only: admin-configurable shortcut links, shown in the top nav */
  quickLinks = signal<QuickLink[]>(getQuickLinks());

  private suppressToggle = false;

  activeSystem = signal('Weld Record');

  /* Weld Record's Admin section: nested submenu (default) vs. all items flattened into one list */
  weldRecordAdminFlat = signal(false);
  toggleWeldRecordAdminFlat() { this.weldRecordAdminFlat.update(v => !v); }

  private closeAll(except?: ElementRef<HTMLDetailsElement>) {
    this.suppressToggle = true;
    [this.pipeWeldingDetails, this.wpDetails, this.waDetails, this.weDetails, this.qlDetails].forEach(ref => {
      if (ref && ref !== except) {
        ref.nativeElement.open = false;
        /* also collapse nested Admin submenus so they are closed next time */
        ref.nativeElement.querySelectorAll('details').forEach(d => d.open = false);
      }
    });
    setTimeout(() => this.suppressToggle = false, 0);
  }

  onPipeWeldingToggle(e: Event) { if (!this.suppressToggle) setTimeout(() => this.closeAll(this.pipeWeldingDetails)); }
  onWpToggle(e: Event)  { if (!this.suppressToggle) setTimeout(() => this.closeAll(this.wpDetails)); }
  onWaToggle(e: Event)  { if (!this.suppressToggle) setTimeout(() => this.closeAll(this.waDetails)); }
  onWeToggle(e: Event)  { if (!this.suppressToggle) setTimeout(() => this.closeAll(this.weDetails)); }
  onQlToggle(e: Event)  { if (!this.suppressToggle) setTimeout(() => this.closeAll(this.qlDetails)); }

  constructor() {
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      /* close on outside click, or when a real (non-disabled) menu link is chosen */
      const link = target.closest('.dropdown-wrapper a');
      if (!target.closest('.dropdown-wrapper') || (link && !link.classList.contains('menu-disabled'))) {
        this.closeAll();
      }
    });

    /* derive active system from current route */
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      const url = e.urlAfterRedirects || e.url;
      if (url.startsWith('/weld-planning')) this.activeSystem.set('Weld Planning');
      else if (url.startsWith('/assignments') || url.startsWith('/history') || url.startsWith('/adaptive') || url.startsWith('/admin') || url.startsWith('/pipe-search')) this.activeSystem.set('Weld Record');
      else if (url.startsWith('/weld-assignment')) this.activeSystem.set('Weld Dispatch');
      else if (url.startsWith('/weld-engineering')) this.activeSystem.set('Weld Engineering');
    });

    /* also set on initial load */
    const initUrl = this.router.url;
    if (initUrl.startsWith('/weld-planning')) this.activeSystem.set('Weld Planning');
    else if (initUrl.startsWith('/weld-assignment')) this.activeSystem.set('Weld Dispatch');
    else if (initUrl.startsWith('/weld-engineering')) this.activeSystem.set('Weld Engineering');
    else this.activeSystem.set('Weld Record');

    if (this.swUpdate.isEnabled) {
      // check for updates + button to update now, PWA/offline important
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));
      /* a corrupted worker cache (e.g. mid-deploy) falls back to the network silently; offer the same reload */
      this.swUpdate.unrecoverable.subscribe(() => this.updateReady.set(true));

      // On an interval and whenever the tab regains focus (the worker also checks by itself on page load).
      const check = () => this.swUpdate.checkForUpdate().catch(() => { /* offline / transient */ });
      setInterval(check, UPDATE_POLL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    }
  }

  /* activate the waiting worker and reload. Saved data is left alone: outdated caches are cleared on the
     next load only when CURRENT_VERSION changed (see WorkflowStore), not on every deploy. */
  reloadForUpdate() {
    this.swUpdate.activateUpdate().catch(() => false).then(() => document.location.reload());
  }
}
