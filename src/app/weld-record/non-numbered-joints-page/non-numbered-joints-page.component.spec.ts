import { TestBed } from '@angular/core/testing';
import { NonNumberedJointsPageComponent } from './non-numbered-joints-page.component';
import { NON_NUMBERED_JOINTS } from '../../data/non-numbered-joints';

describe('Non-Numbered Joints page', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [NonNumberedJointsPageComponent] }));

  it('seeds joints unique by interim part number + order + sequence, with repeating orders and parts', () => {
    const keys = NON_NUMBERED_JOINTS.map(j => `${j.interimPartNumber}|${j.order}|${j.sequenceNumber}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(NON_NUMBERED_JOINTS.map(j => j.order)).size).toBeLessThan(keys.length);
    expect(new Set(NON_NUMBERED_JOINTS.map(j => j.interimPartNumber)).size).toBeLessThan(keys.length);
  });

  it('keyword search matches order or interim part number and returns every joint sharing it', () => {
    const page = TestBed.createComponent(NonNumberedJointsPageComponent).componentInstance;
    const part = NON_NUMBERED_JOINTS[0].interimPartNumber;
    page.table.setGlobalFilter(part);
    expect(page.table.total()).toBe(NON_NUMBERED_JOINTS.filter(j => j.interimPartNumber === part).length);
    page.table.setGlobalFilter(NON_NUMBERED_JOINTS[0].order);
    expect(page.table.total()).toBe(NON_NUMBERED_JOINTS.filter(j => j.order === NON_NUMBERED_JOINTS[0].order).length);
    page.table.setGlobalFilter(NON_NUMBERED_JOINTS[0].description);
    expect(page.table.total()).toBe(0);
  });
});
