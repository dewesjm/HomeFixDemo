import { TestBed } from '@angular/core/testing';
import { TypeExceptionsComponent } from './type-exceptions.component';
import { getSignoffTypeRows } from '../../signoff-definition/signoff-types';

describe('Type exceptions grid', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  const create = () => { const f = TestBed.createComponent(TypeExceptionsComponent); f.detectChanges(); return f; };
  it('shows both seeded routings and only makes the grip draggable', () => {
    const f = create(); const host: HTMLElement = f.nativeElement;
    expect(host.querySelectorAll('tbody tr').length).toBe(2);
    expect(host.textContent).toContain('NQC Excavation NDT');
    expect(host.textContent).toContain('Excavation NDT');
    expect(host.querySelector('tr[draggable]')).toBeNull();
    expect(host.querySelectorAll('button[draggable="true"]').length).toBe(2);
  });
  it('cancels drafts and saves changes without changing another routing or its source', () => {
    const f = create(); const c = f.componentInstance; const row = c.rows[0];
    const before = structuredClone(getSignoffTypeRows());
    c.edit(row); row.rule.to = 'mt'; c.cancel(row);
    expect(c.rows[0].rule.to).toBe('5x');
    c.edit(c.rows[0]); c.rows[0].rule.to = 'ut'; c.save(c.rows[0]);
    const after = getSignoffTypeRows();
    expect(after.find(r => r.stepId === row.routing)!.typeExceptions![0].to).toBe('ut');
    expect(after.find(r => r.stepId === row.routing)!.typeSource).toBe('rejecting-inspection');
    for (const r of before.filter(r => r.stepId !== row.routing)) {
      expect(after.find(a => a.stepId === r.stepId)?.typeExceptions ?? []).toEqual(r.typeExceptions ?? []);
    }
    c.add(); c.cancel(c.rows[0]); expect(c.rows.length).toBe(2);
  });
  it('reorders only within the same routing and retains order on reload', () => {
    const f = create(); const c = f.componentInstance;
    c.add(); const added = c.rows[0]; added.routing = 'excavation-ndt'; added.rule.to = 'mt'; c.save(added);
    c.move(added, 1);
    expect(getSignoffTypeRows().find(r => r.stepId === added.routing)!.typeExceptions!.map(r => r.to)).toEqual(['5x', 'mt']);
    c.dragId = added.id;
    const other = c.rows.find(r => r.routing !== added.routing)!;
    c.drop(new Event('drop') as DragEvent, other);
    expect(getSignoffTypeRows().find(r => r.stepId === added.routing)!.typeExceptions!.map(r => r.to)).toEqual(['5x', 'mt']);
    expect(create().componentInstance.rows.filter(r => r.routing === added.routing).map(r => r.rule.to)).toEqual(['5x', 'mt']);
  });
});
