import { TestBed } from '@angular/core/testing';
import { AdminDefectCodesComponent } from './admin-defect-codes.component';
import { getDefectCodes } from '../../../data/defect-codes';

describe('Defect Codes status editor', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ imports: [AdminDefectCodesComponent] }); });
  afterEach(() => localStorage.clear());
  it('cancels retirement, saves it and retains it on reload', async () => {
    const fixture = TestBed.createComponent(AdminDefectCodesComponent);
    const editor = fixture.componentInstance;
    const row = editor.rows()[0];
    editor.startEdit(row); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Defect Code status"]')).toBeTruthy();
    await fixture.whenStable();
    const status = fixture.nativeElement.querySelector('[aria-label="Defect Code status"]') as HTMLInputElement;
    expect(status.type).toBe('checkbox');
    expect(status.checked).toBeTrue();
    status.click(); fixture.detectChanges();
    expect(editor.rows()[0].active).toBeFalse();
    editor.cancelEdit(row);
    expect(editor.rows()[0].active).toBeTrue();
    editor.startEdit(editor.rows()[0]); editor.updateActive(editor.rows()[0], false);
    editor.saveEdit(editor.rows()[0]); fixture.detectChanges();
    expect(getDefectCodes()[0].active).toBeFalse();
    expect(TestBed.createComponent(AdminDefectCodesComponent).componentInstance.rows()[0].status).toBe('Inactive');
    expect(fixture.nativeElement.querySelector('svg[lucideTrash2]')).toBeNull();
    fixture.destroy();
  });
});
