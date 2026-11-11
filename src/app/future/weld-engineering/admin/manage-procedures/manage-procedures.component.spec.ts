import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ManageProceduresComponent } from './manage-procedures.component';
import { procedures } from '../../../../data/procedures';
import { STORAGE } from '../../../../data/storage-keys';
import { ConfirmService } from '../../../../shared/confirm.service';
import { ToastService } from '../../../../shared/toast.service';
import { keepProcedureStores, testProcedure, fakeRouter } from '../../testing/procedure-test-state';

describe('Manage Procedures', () => {
  keepProcedureStores();
  let router: jasmine.SpyObj<Router>;
  let confirm: ConfirmService;
  let toast: ToastService;
  let page: ManageProceduresComponent;

  beforeEach(() => {
    procedures.set([testProcedure('MP-1', { status: 'active' }), testProcedure('MP-2')]);
    router = fakeRouter();
    TestBed.configureTestingModule({});
    confirm = TestBed.inject(ConfirmService);
    toast = TestBed.inject(ToastService);
    page = TestBed.runInInjectionContext(() => new ManageProceduresComponent(router, confirm, toast));
    TestBed.flushEffects();
  });

  const ids = () => page.table.filtered().map(r => r.id);
  const savedIds = () => (JSON.parse(localStorage.getItem(STORAGE.procedures)!) as { id: string }[]).map(p => p.id);

  it('lists every procedure and filters by status', () => {
    expect(ids()).toEqual(['MP-1', 'MP-2']);
    page.table.setColumnFilter('status', ['draft']);
    expect(ids()).toEqual(['MP-2']);
  });

  it('opens the form to add or edit', () => {
    page.addNew();
    expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering/admin/new']);
    page.edit(procedures()[1]);
    expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering/admin', 'MP-2', 'edit']);
  });

  it('deletes a procedure only after the delete is confirmed, and saves the change', () => {
    page.deleteRow(procedures()[0]);
    expect(confirm.request()!.message).toBe('Delete MP-1?');
    expect(ids()).toEqual(['MP-1', 'MP-2']);

    confirm.resolve(true);
    TestBed.flushEffects();
    expect(ids()).toEqual(['MP-2']);
    expect(savedIds()).toEqual(['MP-2']);
    expect(toast.messages().at(-1)!.detail).toBe('MP-1 deleted');
  });

  it('keeps the procedure when the delete is cancelled', () => {
    page.deleteRow(procedures()[0]);
    confirm.resolve(false);
    TestBed.flushEffects();
    expect(ids()).toEqual(['MP-1', 'MP-2']);
  });
});
