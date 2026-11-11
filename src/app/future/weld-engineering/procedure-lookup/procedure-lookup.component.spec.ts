import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ProcedureLookupComponent } from './procedure-lookup.component';
import { procedures } from '../../../data/procedures';
import { renameField } from '../procedure-sections';
import { keepProcedureStores, testProcedure, fakeRouter } from '../testing/procedure-test-state';

const steel = testProcedure('LK-1', {
  title: 'Steel pipe', status: 'active', wtn: '01.1-1', effectiveDate: '2026-01-15',
  extraFields: { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS', fillerMetalTypes: ['mil-70s-3', 'mil-70s-6'] },
});
const alloy = testProcedure('LK-2', {
  title: 'Alloy plate', status: 'draft', wtn: '02.2-1', weldProcess: 'FCAW', effectiveDate: '2026-03-01',
  extraFields: { baseMetal1Type: '04-AS', baseMetal2Type: '04-AS', fillerMetalTypes: ['mil-80s-50'] },
});
/* has base metal values saved but its Base Metal section unticked */
const hidden = testProcedure('LK-3', {
  title: 'No base metal section', wtn: '03.3-1',
  extraFields: { baseMetal1Type: '02-CS' },
  sectionIds: [],
});

describe('Procedure Lookup', () => {
  keepProcedureStores();
  let router: jasmine.SpyObj<Router>;
  let page: ProcedureLookupComponent;

  beforeEach(() => {
    procedures.set([steel, alloy, hidden]);
    router = fakeRouter();
    TestBed.configureTestingModule({});
    page = TestBed.runInInjectionContext(() => new ProcedureLookupComponent(router));
    TestBed.flushEffects();
  });

  const ids = () => page.table.filtered().map(r => r.gwp);

  it('lists every procedure with its section values, blank when the section is not ticked', () => {
    expect(ids()).toEqual(['LK-1', 'LK-2', 'LK-3']);
    const row = (gwp: string) => page.table.rows().find(r => r.gwp === gwp)!;
    expect(row('LK-1').baseMetal1Type).toBe('02-CS');
    expect(row('LK-1').fillerMetalTypes).toEqual(['mil-70s-3', 'mil-70s-6']);
    expect(row('LK-3').baseMetal1Type).toBe('');
    expect(row('LK-3').fillerMetalTypes).toEqual([]);
  });

  it('searches by title, WTN or GWP and shows nothing when none match', () => {
    page.table.setGlobalFilter('alloy');
    expect(ids()).toEqual(['LK-2']);
    page.table.setGlobalFilter('03.3-1');
    expect(ids()).toEqual(['LK-3']);
    page.table.setGlobalFilter('no such procedure');
    expect(ids()).toEqual([]);
  });

  it('filters status and process by the values picked', () => {
    page.table.setColumnFilter('status', ['active']);
    expect(ids()).toEqual(['LK-1']);
    page.table.clearFilters();
    page.table.setColumnFilter('weldProcess', ['FCAW']);
    expect(ids()).toEqual(['LK-2']);
  });

  it('matches a filler type filter when any of the procedure\'s filler types is picked', () => {
    page.table.setColumnFilter('fillerMetalTypes', ['mil-70s-6']);
    expect(ids()).toEqual(['LK-1']);
    page.table.setColumnFilter('fillerMetalTypes', ['mil-70s-6', 'mil-80s-50']);
    expect(ids()).toEqual(['LK-1', 'LK-2']);
  });

  it('filters Effective Date by the date as shown, not as stored', () => {
    page.table.setColumnFilter('effectiveDate', '2026-03-01');
    expect(ids()).toEqual([]);
    page.table.setColumnFilter('effectiveDate', '03/01/2026');
    expect(ids()).toEqual(['LK-2']);
    page.table.setColumnFilter('effectiveDate', '2026');
    expect(ids()).toEqual(['LK-1', 'LK-2', 'LK-3']);
  });

  it('shows filler types by their labels', () => {
    expect(page.fillerLabels(['mil-70s-3', 'unknown'])).toBe('MIL-70S-3, unknown');
  });

  it('takes column headings from the field definitions, so a renamed field shows its new name', () => {
    expect(page.label('baseMetal1Type')).toBe('Base Metal 1 Type');
    renameField('baseMetal1Type', 'Material A');
    expect(page.label('baseMetal1Type')).toBe('Material A');
  });

  it('opens a procedure\'s detail page', () => {
    page.openProcedure(alloy);
    expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering/procedures', 'LK-2', '02.2-1']);
  });
});
