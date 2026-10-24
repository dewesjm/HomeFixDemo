import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminTableScopeDirective } from './admin-table-scope.directive';

@Component({ standalone: true, template: '' })
class EmptyPage {}

@Component({ standalone: true, imports: [AdminTableScopeDirective], template: `
  <main appAdminTableScope><table class="table"><thead><tr><th>Name</th><th>Value</th></tr></thead>
    <tbody><tr><td>Nested editor<table class="table"><tbody><tr><td>Condition</td></tr></tbody></table></td><td>Value</td></tr></tbody>
  </table></main>
` })
class TableHarness {}

describe('Admin table grid presentation', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TableHarness], providers: [provideRouter([{ path: '**', component: EmptyPage }])] }));

  it('applies cell outlines on all systems and nested tables, removing the scope outside admin', async () => {
    const fixture = TestBed.createComponent(TableHarness);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const host: HTMLElement = fixture.nativeElement;
    for (const url of ['/admin/routing', '/weld-planning/admin', '/weld-engineering/admin/sections']) {
      await router.navigateByUrl(url); fixture.detectChanges();
      expect(host.querySelector('main')!.classList.contains('admin-table-scope')).toBeTrue();
      for (const cell of Array.from(host.querySelectorAll('th, td'))) {
        const style = getComputedStyle(cell);
        expect(style.borderLeftWidth).withContext(url).toBe('1px');
        expect(style.borderRightWidth).toBe('1px');
        expect(style.borderTopWidth).toBe('1px');
        expect(style.borderBottomWidth).toBe('1px');
        expect(style.verticalAlign).toBe('top');
      }
      for (const table of Array.from(host.querySelectorAll('table')))
        expect(getComputedStyle(table).borderCollapse).toBe('collapse');
    }
    await router.navigateByUrl('/pipe-search'); fixture.detectChanges();
    expect(host.querySelector('main')!.classList.contains('admin-table-scope')).toBeFalse();
    fixture.destroy();
  });

  it('styles an admin page opened directly before the content wrapper is created', async () => {
    await TestBed.inject(Router).navigateByUrl('/admin/repair-codes');
    const fixture = TestBed.createComponent(TableHarness); fixture.detectChanges();
    expect(getComputedStyle(fixture.nativeElement.querySelector('td')).borderLeftWidth).toBe('1px');
    fixture.destroy();
  });
});
