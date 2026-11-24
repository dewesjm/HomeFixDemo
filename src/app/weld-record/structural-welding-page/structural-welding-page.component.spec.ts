import { TestBed } from '@angular/core/testing';
import { StructuralWeldingPageComponent } from './structural-welding-page.component';
import { STRUCTURAL_JOINTS } from '../../data/structural-joints';
import { JOBS } from '../../data/jobs';

describe('Structural Welding page', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [StructuralWeldingPageComponent] });
  });

  it('seeds its own joints: unique hull + drawing + joint, internal ids not shared with pipe joints', () => {
    const keys = STRUCTURAL_JOINTS.map(j => `${j.hull}|${j.drawing}|${j.joint}`);
    expect(new Set(keys).size).toBe(keys.length);
    const pipeIds = new Set(JOBS.map(j => j.id));
    expect(STRUCTURAL_JOINTS.some(j => pipeIds.has(j.id))).toBeFalse();
  });

  it('opens on Standard with every structural joint and searches like Pipe Welding', () => {
    const fixture = TestBed.createComponent(StructuralWeldingPageComponent);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    expect(page.selectedVariant()).toBe('Standard');
    expect(page.visibleColumns().map(c => c.key)).toEqual(['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber']);
    expect(page.table.total()).toBe(STRUCTURAL_JOINTS.length);
    page.table.setGlobalFilter(STRUCTURAL_JOINTS[3].order);
    fixture.detectChanges();
    expect(page.table.total()).toBe(STRUCTURAL_JOINTS.filter(j => j.order.includes(STRUCTURAL_JOINTS[3].order)).length);
    expect(page.fields.some(f => f.key === 'currentRouting')).toBeFalse();
  });
});
