import { TestBed } from '@angular/core/testing';

import { LoadProceduresComponent, LOAD_REVISION_NOTE } from './load-procedures.component';
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
    procedures.set([testProcedure('GWP-OLD', {
      wtn: '01.1-1', title: 'Old title',
      extraFields: { phMin: '100', jointType: 'Groove' }, sectionIds: ['sec-preheat-interpass'],
      revisionHistory: [{ revision: '0', date: '2026-01-01', note: 'First', by: 'User' }],
    })]);
    TestBed.configureTestingModule({});
    toast = TestBed.inject(ToastService);
    page = TestBed.runInInjectionContext(() => new LoadProceduresComponent());
  });

  /* load rows the way a parsed file would arrive, by heading */
  const load = (raws: Record<string, string>[]) => (page as any).setRows(raws.map(r => (page as any).fromRaw(r)));
  const savedGwps = () => (JSON.parse(localStorage.getItem(STORAGE.procedures)!) as { gwp: string }[]).map(p => p.gwp);

  it('reads template headings, export headings and older headings', () => {
    load([
      { gwp: 'G1', wtn: '01.1-1', phMin: '150', revision: '2' },
      { GWP: 'G2', WTN: '02.2-1', Revision: '3', 'Preheat & Interpass Temperatures: PH Min': '175' },
      { gwp: 'G3', wtn: '03.3-1', 'PH Min': '200', 'Override PH Min': '90' },
    ]);
    const [a, b, c] = page.rows();
    expect(a.cells['phMin']).toBe('150');
    expect(a.revision).toBe('2');
    expect(b.gwp).toBe('G2');
    expect(b.revision).toBe('3');
    expect(b.cells['phMin']).toBe('175');
    expect(c.cells['phMin']).toBe('200');
    expect(c.cells['override.phMin']).toBe('90');
    expect(a.status).toBe('draft');
  });

  it('marks rows missing GWP or WTN, with an unknown status, or with unreadable cells', () => {
    load([
      { gwp: '', wtn: '' },
      { gwp: 'G', wtn: 'W', status: 'pending', phMin: 'warm' },
      { gwp: 'G', wtn: 'W2' },
    ]);
    expect(page.rows()[0]._errors).toEqual(['GWP required', 'WTN required']);
    expect(page.rows()[1]._errors).toEqual(['Invalid status', 'Preheat & Interpass Temperatures: PH Min must be a number or NC.']);
    expect(page.rows()[2]._errors).toEqual([]);
    expect(page.errorCount()).toBe(2);
  });

  it('saves only valid rows; a fixed row saves on the next try without saving the others twice', async () => {
    load([
      { gwp: 'G1', wtn: 'W1', rules: 'One; Two ;', conditions: 'Shop only' },
      { gwp: 'G2', wtn: 'W2', phMin: 'warm' },
    ]);
    await page.saveAll();
    expect(savedGwps()).toEqual(['GWP-OLD', 'G1']);
    expect(getProcedure('G1', 'W1')!.rules).toEqual(['One', 'Two']);
    expect(getProcedure('G1', 'W1')!.conditions).toEqual(['Shop only']);
    expect(page.savedCount()).toBe(1);
    expect(page.errorCount()).toBe(1);

    const added = spyOn(toast, 'add').and.callThrough();
    const fixed = page.rows()[1];
    fixed.cells['phMin'] = 'NC';
    page.validateRow(fixed);
    await page.saveAll();
    expect(getProcedure('G2', 'W2')!.extraFields['phMin']).toBe('NC');
    expect(page.savedCount()).toBe(2);
    expect(page.errorCount()).toBe(0);
    expect(added).toHaveBeenCalledOnceWith(jasmine.objectContaining({ detail: '1 procedures saved' }));
  });

  it('gives a new procedure every section and Import as its creator', async () => {
    load([{ gwp: 'G', wtn: 'W' }]);
    await page.saveAll();
    const p = getProcedure('G', 'W')!;
    expect(p.sectionIds).toEqual(procedureSections().map(s => s.id));
    expect(p.createdBy).toBe('Import');
  });

  it('updates an existing procedure: blank cells keep its values, and its ticks and revision history stay', async () => {
    load([{ gwp: 'GWP-OLD', wtn: '01.1-1', title: 'New title', phMin: '', jointType: 'Fillet' }]);
    await page.saveAll();
    const p = getProcedure('GWP-OLD', '01.1-1')!;
    expect(procedures().length).toBe(1);
    expect(p.title).toBe('New title');
    expect(p.extraFields['phMin']).toBe('100');
    expect(p.extraFields['jointType']).toBe('Fillet');
    expect(p.sectionIds).toEqual(['sec-preheat-interpass']);
    expect(p.revisionHistory.length).toBe(1);
  });

  it('a later row for the same procedure keeps what an earlier row in the file set', async () => {
    load([
      { gwp: 'GWP-OLD', wtn: '01.1-1', jointType: 'Fillet' },
      { gwp: 'GWP-OLD', wtn: '01.1-1', phMin: '150' },
    ]);
    await page.saveAll();
    const p = getProcedure('GWP-OLD', '01.1-1')!;
    expect(p.extraFields['jointType']).toBe('Fillet');
    expect(p.extraFields['phMin']).toBe('150');
    expect(page.savedCount()).toBe(2);
  });

  it('gives a changed Active procedure the automatic revision note', async () => {
    procedures.update(list => list.map(p => ({ ...p, status: 'active' as const })));
    load([{ gwp: 'GWP-OLD', wtn: '01.1-1', status: 'active', title: 'New title' }]);
    await page.saveAll();
    expect(getProcedure('GWP-OLD', '01.1-1')!.revisionHistory.at(-1))
      .toEqual(jasmine.objectContaining({ note: LOAD_REVISION_NOTE, by: 'Import' }));
  });

  it('shows why the procedure service refused a row and leaves it unsaved', async () => {
    procedures.update(list => [...list, testProcedure('GWP-MET', { wtn: '1', extraFields: { baseMetal1Type: '02-CS' } })]);
    load([{ gwp: 'GWP-MET', wtn: '2', baseMetal1Type: '04-AS' }]);
    await page.saveAll();
    expect(getProcedure('GWP-MET', '2')).toBeUndefined();
    expect(page.rows()[0]._errors).toEqual(['GWP GWP-MET is already 02-CS / - (see WTN 1)']);
    expect(page.errorCount()).toBe(1);
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
