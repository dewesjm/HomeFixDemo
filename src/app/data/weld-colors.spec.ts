import { getWeldColors, setWeldColors, weldColorOptions } from './weld-colors';
import { STORAGE } from './storage-keys';
import { lookupCatalogField } from '../weld-record/signoff-definition/field-catalog';

describe('weld colors', () => {
  beforeEach(() => localStorage.removeItem(STORAGE.weldColors));
  afterEach(() => localStorage.removeItem(STORAGE.weldColors));

  it('keeps the existing six stored values as defaults', () => {
    expect(weldColorOptions().map(o => o.value)).toEqual([
      'shiny-silver', 'straw', 'light-blue', 'dark-blue', 'gray-powder', 'yellow-powder',
    ]);
  });

  it('updates catalog options without reloading the application', () => {
    const field = lookupCatalogField('weldColor')!;
    setWeldColors([{ code: 'straw', name: 'Pale Straw' }, { code: 'purple', name: 'Purple' }]);
    expect(field.options).toEqual([{ value: 'straw', label: 'Pale Straw' }, { value: 'purple', label: 'Purple' }]);
    expect(getWeldColors()).toEqual([{ code: 'straw', name: 'Pale Straw' }, { code: 'purple', name: 'Purple' }]);
    setWeldColors([]);
    expect(field.options).toEqual([]);
  });

  it('uses defaults when saved data is malformed', () => {
    for (const raw of ['{', '{}', '[null]']) {
      localStorage.setItem(STORAGE.weldColors, raw);
      expect(getWeldColors().length).toBe(6);
    }
  });
});
