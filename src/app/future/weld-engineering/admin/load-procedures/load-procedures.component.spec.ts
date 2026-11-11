import { TestBed } from '@angular/core/testing';

import { LoadProceduresComponent } from './load-procedures.component';
import { procedures, getProcedure } from '../../../../data/procedures';
import { STORAGE } from '../../../../data/storage-keys';
import { ToastService } from '../../../../shared/toast.service';
import { procedureSections } from '../../procedure-sections';
import { keepProcedureStores, testProcedure } from '../../testing/procedure-test-state';

describe('Load Procedures', () => {
  keepProcedureStores();
  let page: LoadProceduresComponent;
  let toast: ToastService;

  beforeEach(() => {
    procedures.set([testProcedure('LP-OLD', {
      gwp: 'GWP-OLD', wtn: '01.1-1', title: 'Old title',
      extraFields: { phMin: '100', jointType: 'Groove' }, sectionIds: ['sec-preheat-interpass'],
      revisionHistory: [{ wpsRev: '0', date: '2026-01-01', note: 'First', by: 'User' }],
    })]);
    TestBed.configureTestingModule({});
    toast = TestBed.inject(ToastService);
    page = TestBed.runInInjectionContext(() => new LoadProceduresComponent());
  });

  /* load rows the way a parsed file would arrive, by heading */
  const load = (raws: Record<string, string>[]) => (page as any).setRows(raws.map(r => (page as any).fromRaw(r)));
  const savedIds = () => (JSON.parse(localStorage.getItem(STORAGE.procedures)!) as { id: string }[]).map(p => p.id);

  it('reads template headings, export headings and older headings', () => {
    load([
      { id: 'LP-1', gwp: 'G1', wtn: '01.1-1', phMin: '150' },
      { Procedure: 'LP-2', GWP: 'G2', WTN: '02.2-1', 'Preheat & Interpass Temperatures: PH Min': '175' },
      { id: 'LP-3', gwp: 'G3', wtn: '03.3-1', 'PH Min': '200', 'Override PH Min': '90' },
    ]);
    const [a, b, c] = page.rows();
    expect(a.cells['phMin']).toBe('150');
    expect(b.id).toBe('LP-2');
    expect(b.cells['phMin']).toBe('175');
    expect(c.cells['phMin']).toBe('200');
    expect(c.cells['override.phMin']).toBe('90');
    expect(a.status).toBe('draft');
  });

  it('marks rows missing ID, GWP or WTN, with an unknown status, or with unreadable cells', () => {
    load([
      { id: '', gwp: '', wtn: '' },
      { id: 'LP-1', gwp: 'G', wtn: 'W', status: 'pending', phMin: 'warm' },
      { id: 'LP-2', gwp: 'G', wtn: 'W2' },
    ]);
    expect(page.rows()[0]._errors).toEqual(['Procedure ID required', 'GWP required', 'WTN required']);
    expect(page.rows()[1]._errors).toEqual(['Invalid status', 'Preheat & Interpass Temperatures: PH Min must be a number or NC.']);
    expect(page.rows()[2]._errors).toEqual([]);
    expect(page.errorCount()).toBe(2);
  });

  it('saves only valid rows; a fixed row saves on the next try without saving the others twice', async () => {
    load([
      { id: 'LP-1', gwp: 'G1', wtn: 'W1', rules: 'One; Two ;', conditions: 'Shop only' },
      { id: 'LP-2', gwp: 'G2', wtn: 'W2', phMin: 'warm' },
    ]);
    await page.saveAll();
    expect(savedIds()).toEqual(['LP-OLD', 'LP-1']);
    expect(getProcedure('LP-1')!.rules).toEqual(['One', 'Two']);
    expect(getProcedure('LP-1')!.conditions).toEqual(['Shop only']);
    expect(page.savedCount()).toBe(1);
    expect(page.errorCount()).toBe(1);

    const added = spyOn(toast, 'add').and.callThrough();
    const fixed = page.rows()[1];
    fixed.cells['phMin'] = 'NC';
    page.validateRow(fixed);
    await page.saveAll();
    expect(getProcedure('LP-2')!.extraFields['phMin']).toBe('NC');
    expect(page.savedCount()).toBe(2);
    expect(page.errorCount()).toBe(0);
    expect(added).toHaveBeenCalledOnceWith(jasmine.objectContaining({ detail: '1 procedures saved' }));
  });

  it('gives a new procedure every section and Import as its creator', async () => {
    load([{ id: 'LP-NEW', gwp: 'G', wtn: 'W' }]);
    await page.saveAll();
    const p = getProcedure('LP-NEW')!;
    expect(p.sectionIds).toEqual(procedureSections().map(s => s.id));
    expect(p.createdBy).toBe('Import');
  });

  it('updates an existing procedure: blank cells keep its values, and its ticks and revision history stay', async () => {
    load([{ id: 'LP-OLD', gwp: 'GWP-OLD', wtn: '01.1-1', title: 'New title', phMin: '', jointType: 'Fillet' }]);
    await page.saveAll();
    const p = getProcedure('LP-OLD')!;
    expect(procedures().length).toBe(1);
    expect(p.title).toBe('New title');
    expect(p.extraFields['phMin']).toBe('100');
    expect(p.extraFields['jointType']).toBe('Fillet');
    expect(p.sectionIds).toEqual(['sec-preheat-interpass']);
    expect(p.revisionHistory.length).toBe(1);
  });

  it('loads a valid sample set', () => {
    page.loadSample();
    expect(page.rows().length).toBe(3);
    expect(page.errorCount()).toBe(0);
  });

  it('reports a file it cannot read and keeps the grid as it was', async () => {
    const file = { name: 'broken.csv', text: () => Promise.reject(new Error('Disk read failed')) };
    const input = { files: [file], value: 'broken.csv' };
    await page.onFileSelected({ target: input } as unknown as Event);
    expect(toast.messages().at(-1)).toEqual(jasmine.objectContaining({ severity: 'error', detail: 'Disk read failed' }));
    expect(page.rows()).toEqual([]);
    expect(page.loading()).toBeFalse();
    expect(input.value).toBe('');
  });
});
