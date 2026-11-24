import { TestBed } from '@angular/core/testing';
import { NonNumberedJointsPageComponent } from './non-numbered-joints-page.component';
import { NON_NUMBERED_JOINTS } from '../../data/non-numbered-joints';
import { newCondition } from '../../shared/filter-engine';

describe('Non-Numbered Joints page', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [NonNumberedJointsPageComponent] });
  });

  it('seeds joints unique by interim part number + order + sequence, with repeating orders and parts', () => {
    const keys = NON_NUMBERED_JOINTS.map(j => `${j.interimPartNumber}|${j.order}|${j.sequenceNumber}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(NON_NUMBERED_JOINTS.map(j => j.order)).size).toBeLessThan(keys.length);
    expect(new Set(NON_NUMBERED_JOINTS.map(j => j.interimPartNumber)).size).toBeLessThan(keys.length);
  });

  it('opens on Standard: the key, find numbers, drawing item and a blank Routing', () => {
    const fixture = TestBed.createComponent(NonNumberedJointsPageComponent);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    expect(page.selectedVariant()).toBe('Standard');
    expect(page.visibleColumns().map(c => c.key)).toEqual(
      ['interimPartNumber', 'order', 'sequenceNumber', 'findNumber1', 'findNumber2', 'manufacturingDrawingItem', 'currentRouting']);
    expect(page.table.total()).toBe(NON_NUMBERED_JOINTS.length);
    expect(page.table.paged().every(r => r.currentRouting === '')).toBeTrue();
  });

  it('keyword search matches order or interim part number only', () => {
    const fixture = TestBed.createComponent(NonNumberedJointsPageComponent);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    const part = NON_NUMBERED_JOINTS[0].interimPartNumber;
    page.table.setGlobalFilter(part);
    expect(page.table.total()).toBe(NON_NUMBERED_JOINTS.filter(j => j.interimPartNumber === part).length);
    page.table.setGlobalFilter(NON_NUMBERED_JOINTS[0].description);
    expect(page.table.total()).toBe(0);
  });

  it('filter bar on List of Hulls matches joints holding any picked hull', () => {
    const fixture = TestBed.createComponent(NonNumberedJointsPageComponent);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    const hull = NON_NUMBERED_JOINTS[0].hulls[0];
    expect(page.optionsFor('hulls').some(o => o.value === hull)).toBeTrue();
    page.setValues({ hulls: [{ ...newCondition('list'), values: [hull] }] });
    fixture.detectChanges();
    expect(page.table.total()).toBe(NON_NUMBERED_JOINTS.filter(j => j.hulls.includes(hull)).length);
    page.setValues({});
    page.table.setColumnFilter('hulls', [hull]);
    expect(page.table.total()).toBe(NON_NUMBERED_JOINTS.filter(j => j.hulls.includes(hull)).length);
  });
});
