import { formFlex, parseWidth, widthText, hasFixedFullWidth } from './procedure-field-width';
import { withFieldWidth, procedureSections, findField, type ExtraField, type ProcedureSection } from './procedure-sections';
import { setFieldWidth } from './procedure-service/section-service';
import { keepProcedureStores } from './testing/procedure-test-state';

const field = (over: Partial<ExtraField> = {}): ExtraField =>
  ({ key: 'k', label: 'K', type: 'text', required: false, options: [], ...over });

describe('procedure field width', () => {
  keepProcedureStores();

  it('reads a typed pixel width, refusing blanks, text and widths under the minimum', () => {
    expect(parseWidth(' 240.4 ')).toEqual({ width: 240 });
    expect(parseWidth('')).toEqual({ problem: 'Enter a width in pixels.' });
    expect(parseWidth('wide')).toEqual({ problem: 'Enter a width in pixels.' });
    expect(parseWidth('20')).toEqual({ problem: 'Width must be at least 60 px.' });
  });

  it('describes each setting; qualification and override fields are always a full line', () => {
    expect(widthText(field())).toBe('Auto');
    expect(widthText(field({ width: 180 }))).toBe('180 px');
    expect(widthText(field({ width: 'full' }))).toBe('Full line');
    expect(widthText(field({ type: 'quals' }))).toBe('Full line');
    expect(hasFixedFullWidth(field({ type: 'override' }))).toBeTrue();
  });

  it('sizes a field on the edit form: Auto as before, a set width that only shrinks, or a full line', () => {
    expect(formFlex(field())).toBeNull();
    expect(formFlex(field({ type: 'multi' }))).toBe('1 1 100%');
    expect(formFlex(field({ type: 'multi', width: 300 }))).toBe('0 1 300px');
    expect(formFlex(field({ width: 'full' }))).toBe('1 1 100%');
  });

  it('sets and clears a field\'s width and saves it, leaving other fields alone', () => {
    const list: ProcedureSection[] = [{ id: 's', name: 'S', fields: [field(), field({ key: 'j', label: 'J' })] }];
    const set = withFieldWidth(list, 'k', 220);
    expect(set[0].fields[0].width).toBe(220);
    expect(set[0].fields[1]).toEqual(list[0].fields[1]);
    expect('width' in withFieldWidth(set, 'k', undefined)[0].fields[0]).toBeFalse();

    setFieldWidth('shieldingGas', 'full');
    expect(findField('shieldingGas', procedureSections())!.width).toBe('full');
  });
});
