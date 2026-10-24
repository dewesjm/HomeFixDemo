import { TestBed } from '@angular/core/testing';
import { AdminWeldColorsComponent } from './admin-weld-colors.component';
import { getWeldColors } from '../../../data/weld-colors';
import { STORAGE } from '../../../data/storage-keys';
import { weldColorError } from './weld-color-validation';

describe('Admin Weld Colors', () => {
  beforeEach(() => localStorage.removeItem(STORAGE.weldColors));
  afterEach(() => localStorage.removeItem(STORAGE.weldColors));

  function create() {
    return TestBed.createComponent(AdminWeldColorsComponent).componentInstance;
  }

  it('saves a new color and discards a cancelled new row', () => {
    const component = create();
    component.addRow();
    const row = component.rows()[0];
    component.updateCode(row, 'purple');
    component.updateName(row, 'Purple');
    component.saveEdit(row);
    expect(getWeldColors()[0]).toEqual({ code: 'purple', name: 'Purple' });
    component.addRow();
    component.cancelEdit(component.rows()[0]);
    expect(component.rows().length).toBe(7);
    expect(getWeldColors().length).toBe(7);
  });

  it('rejects duplicate codes and restores cancelled edits', () => {
    const component = create();
    component.addRow();
    const row = component.rows()[0];
    component.updateCode(row, 'straw');
    component.updateName(row, 'Another Straw');
    component.saveEdit(row);
    expect(component.editingId()).toBe(row.uid);
    expect(getWeldColors().length).toBe(6);
    component.cancelEdit(row);
    const existing = component.rows()[0];
    component.startEdit(existing);
    component.updateName(existing, 'Changed');
    component.cancelEdit(existing);
    expect(component.rows()[0].name).toBe(existing.name);
    expect(getWeldColors()[0].name).toBe(existing.name);
  });

  it('validates blank names, duplicate names and invalid codes', () => {
    expect(weldColorError({ code: 'purple', name: '' }, [])).toBeTruthy();
    expect(weldColorError({ code: 'bad code', name: 'Purple' }, [])).toBeTruthy();
    expect(weldColorError({ code: 'purple', name: ' STRAW ' }, [{ code: 'straw', name: 'Straw' }])).toBeTruthy();
  });
});
