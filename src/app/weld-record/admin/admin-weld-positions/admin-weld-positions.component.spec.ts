import { TestBed } from '@angular/core/testing';
import { AdminWeldPositionsComponent } from './admin-weld-positions.component';
import { getWeldPositions } from '../../../data/weld-positions';

describe('Weld Positions status editor', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ imports: [AdminWeldPositionsComponent] }); });
  afterEach(() => localStorage.clear());
  it('cancels retirement, saves it and retains it on reload', async () => {
    const fixture = TestBed.createComponent(AdminWeldPositionsComponent);
    const editor = fixture.componentInstance;
    const row = editor.rows()[0];
    editor.startEdit(row); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Weld Position status"]')).toBeTruthy();
    await fixture.whenStable();
    const status = fixture.nativeElement.querySelector('[aria-label="Weld Position status"]') as HTMLInputElement;
    expect(status.type).toBe('checkbox');
    expect(status.checked).toBeTrue();
    status.click(); fixture.detectChanges();
    expect(editor.rows()[0].active).toBeFalse();
    editor.cancelEdit(row);
    expect(editor.rows()[0].active).toBeTrue();
    editor.startEdit(editor.rows()[0]); editor.updateActive(editor.rows()[0], false);
    editor.saveEdit(editor.rows()[0]); fixture.detectChanges();
    expect(getWeldPositions()[0].active).toBeFalse();
    expect(TestBed.createComponent(AdminWeldPositionsComponent).componentInstance.rows()[0].status).toBe('Inactive');
    fixture.destroy();
  });
});
