import { fieldMoveBlock, fieldRemoveBlock, sectionRemoveBlock, type UsingProcedure } from './procedure-section-usage';
import type { ProcedureSection } from './procedure-sections';

const taco: ProcedureSection = {
  id: 's1', name: 'Taco Tuesday', fields: [
    { key: 'salsa', label: 'Salsa', type: 'text', required: false, options: [] },
  ],
};
const lunch: ProcedureSection = {
  id: 's2', name: 'Lunch', fields: [
    { key: 'ph', label: 'PH', type: 'limit', required: false, options: [], locked: true },
    { key: 'drink', label: 'Drink', type: 'text', required: false, options: [] },
  ],
};
const empty: ProcedureSection = { id: 's3', name: 'Dinner', fields: [] };
const sections = [taco, lunch, empty];

const proc = (id: string, sectionIds: string[], extraFields: UsingProcedure['extraFields']): UsingProcedure =>
  ({ id, wtn: `wtn-${id}`, sectionIds, extraFields });

describe('procedure section usage', () => {
  it('blocks removing a section with a locked field, or one ticked on a procedure, naming those procedures', () => {
    expect(sectionRemoveBlock(lunch, [])?.procedures).toEqual([]);
    const block = sectionRemoveBlock(taco, [proc('B', ['s1'], {}), proc('A', ['s1'], {}), proc('C', [], {})]);
    expect(block?.procedures).toEqual(['A (WTN wtn-A)', 'B (WTN wtn-B)']);
    expect(sectionRemoveBlock(empty, [proc('A', ['s1'], {})])).toBeNull();
  });

  it('blocks removing a field only while a procedure shows a value in it', () => {
    expect(fieldRemoveBlock('ph', sections, [])).not.toBeNull();
    expect(fieldRemoveBlock('salsa', sections, [proc('A', ['s1'], { salsa: '' })])).toBeNull();
    /* a value in an unticked section is hidden, so it doesn't count */
    expect(fieldRemoveBlock('salsa', sections, [proc('A', [], { salsa: 'Hot' })])).toBeNull();
    expect(fieldRemoveBlock('salsa', sections, [proc('A', ['s1'], { salsa: 'Hot' })])?.procedures).toEqual(['A (WTN wtn-A)']);
  });

  it('blocks a move that would hide a value, naming the procedures to tick first', () => {
    const procs = [proc('A', ['s2'], { ph: '50' }), proc('B', ['s2', 's3'], { ph: '60' }), proc('C', ['s2'], {})];
    expect(fieldMoveBlock('ph', 's3', sections, procs)?.procedures).toEqual(['A (WTN wtn-A)']);
    expect(fieldMoveBlock('ph', 's3', sections, procs.slice(1))).toBeNull();
  });

  it('blocks a move into a section that already has that label', () => {
    const withDrink: ProcedureSection = { ...empty, fields: [{ key: 'drink_2', label: 'drink', type: 'text', required: false, options: [] }] };
    expect(fieldMoveBlock('drink', 's3', [taco, lunch, withDrink], [])?.problem).toContain('already has');
  });
});
