/* Puts the shared admin table look (admin-tables.css) on the routed content while an admin page is
   open. One routed content scope also covers nested editors and shared import grids. */
import { Directive, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { isAdminTableUrl } from './admin-table-scope';

@Directive({
  selector: '[appAdminTableScope]', standalone: true,
  host: { '[class.admin-table-scope]': 'adminPage()' },
})
export class AdminTableScopeDirective {
  private router = inject(Router);
  readonly adminPage = signal(isAdminTableUrl(this.router.url));

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(event => this.adminPage.set(isAdminTableUrl(event.urlAfterRedirects)));
  }
}
