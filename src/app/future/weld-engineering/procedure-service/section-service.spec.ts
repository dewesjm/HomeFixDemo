import { procedures } from '../../../data/procedures';
import { STORAGE } from '../../../data/storage-keys';
import { procedureSections, findField, sectionOfField } from '../procedure-sections';
import { keepProcedureStores, testProcedure } from '../testing/procedure-test-state';
import {
  addSection, renameSection, shiftSection, removeSection, addField, renameField, shiftField, moveField, setFieldWidth, removeField,
} from './section-service';

const savedNames = () => (JSON.parse(localStorage.getItem(STORAGE.procedureSections)!) as { name: string }[]).map(s => s.name);
const sectionNamed = (name: string) => procedureSections().find(s => s.name === name)!;

describe('section service', () => {
  keepProcedureStores();
  beforeEach(() => procedures.set([
    testProcedure('SEC-1', { wtn: '01.1-1', extraFields: { grooveAngle: '60' } }),
    testProcedure('SEC-2', { wtn: '02.2-1', sectionIds: ['sec-base-metal'] }),
  ]));

  describe('sections', () => {
    it('adds a section at the end, saved, and answers it with its number', () => {
      const r = addSection(' Cleaning ');
      if (!r.ok) return fail(r.error);
      expect(r.data.section).toEqual(jasmine.objectContaining({ name: 'Cleaning', fields: [], number: procedureSections().length }));
      expect(savedNames().at(-1)).toBe('Cleaning');
    });

    it('refuses a blank or repeated name', () => {
      expect(addSection('  ')).toEqual({ ok: false, error: 'Enter a section name.', title: 'Section not added' });
      expect(addSection('gas')).toEqual(jasmine.objectContaining({ ok: false, error: 'There is already a section with that name.' }));
      expect(renameSection('sec-gas', 'Base Metal')).toEqual(jasmine.objectContaining({ ok: false, title: 'Section not renamed' }));
    });

    it('renames and reorders by id; an unknown id or a move past either end is refused', () => {
      expect(renameSection('sec-gas', 'Shielding').ok).toBeTrue();
      const moved = shiftSection('sec-gas', -1);
      if (!moved.ok) return fail(moved.error);
      expect(moved.data.section.number).toBe(7);
      expect(shiftSection('sec-base-metal', -1)).toEqual(jasmine.objectContaining({ ok: false, error: 'Base Metal can\'t move that far: it\'s section 1 of 11.' }));
      expect(shiftSection('sec-gas', 0)).toEqual(jasmine.objectContaining({ ok: false, title: 'Section not moved' }));
      expect(renameSection('nope', 'X')).toEqual(jasmine.objectContaining({ ok: false, title: 'Not found' }));
    });

    it('refuses removing a ticked section and lists the procedures; removes an unticked one', () => {
      const r = removeSection('sec-joint-design');
      expect(r).toEqual(jasmine.objectContaining({ ok: false, title: 'Joint Design can\'t be removed', procedures: ['GWP SEC-1 / WTN 01.1-1'] }));
      expect(removeSection('sec-base-metal')).toEqual(jasmine.objectContaining({ ok: false, error: 'It has locked fields. Move them to another section first.' }));
      const added = addSection('Cleaning');
      if (!added.ok) return fail(added.error);
      expect(removeSection(added.data.section.id)).toEqual({ ok: true, data: { removed: { sectionId: added.data.section.id } } });
      expect(savedNames()).not.toContain('Cleaning');
    });
  });

  describe('fields', () => {
    it('adds a field with a key from the label and answers it with its section', () => {
      const r = addField('sec-gas', { label: 'Purge Time', type: 'list', options: [' 5 min', '', '10 min'] });
      if (!r.ok) return fail(r.error);
      expect(r.data.field).toEqual({ key: 'purge_time', label: 'Purge Time', type: 'list', required: false, options: ['5 min', '10 min'] });
      expect(r.data.section).toEqual({ id: 'sec-gas', number: 8, name: 'Gas' });
    });

    it('refuses a field with a bad type, no choices, an unknown source or a repeated label', () => {
      const refused = (input: Parameters<typeof addField>[1]) => {
        const r = addField('sec-gas', input);
        return r.ok ? '' : r.error;
      };
      expect(refused({ label: 'X', type: 'quals' })).toBe('That field type can\'t be added.');
      expect(refused({ label: 'X', type: 'list' })).toBe('Enter at least one choice for a list field.');
      expect(refused({ label: 'X', type: 'table', source: 'nope' as never })).toContain('Source must be one of');
      expect(refused({ label: 'shielding gas', type: 'text' })).toBe('This section already has a field with that label.');
    });

    it('renames, reorders and sets the width by key, keeping the key', () => {
      expect(renameField('shieldingGas', 'Gas Mix').ok).toBeTrue();
      expect(shiftField('shieldingGas', 2).ok).toBeTrue();
      expect(sectionNamed('Gas').fields.map(f => f.key)).toEqual(['gasFlowRate', 'backingGas', 'shieldingGas']);
      expect(shiftField('shieldingGas', 1)).toEqual(jasmine.objectContaining({ ok: false, error: 'Gas Mix can\'t move that far: it\'s field 3 of 3.' }));
      expect(setFieldWidth('shieldingGas', 120).ok).toBeTrue();
      expect(findField('shieldingGas', procedureSections())!.width).toBe(120);
      expect(setFieldWidth('shieldingGas', null).ok).toBeTrue();
      expect(findField('shieldingGas', procedureSections())!.width).toBeUndefined();
      expect(setFieldWidth('shieldingGas', 10)).toEqual(jasmine.objectContaining({ ok: false, error: 'Width must be at least 60 px.' }));
      expect(setFieldWidth('requiredQuals', 'full')).toEqual(jasmine.objectContaining({ ok: false, error: 'Welder Qualifications is always a full line.' }));
    });

    it('refuses a move that would hide a value and lists the procedures; moves otherwise', () => {
      const added = addSection('Cleaning');
      if (!added.ok) return fail(added.error);
      const cleaning = added.data.section.id;
      expect(moveField('grooveAngle', cleaning)).toEqual(jasmine.objectContaining({ ok: false, procedures: ['GWP SEC-1 / WTN 01.1-1'] }));
      expect(moveField('grooveAngle', 'sec-joint-design')).toEqual(jasmine.objectContaining({ ok: false, error: 'Groove Angle is already in Joint Design.' }));
      expect(moveField('rootOpening', cleaning).ok).toBeTrue();
      expect(sectionOfField('rootOpening', procedureSections())!.id).toBe(cleaning);
    });

    it('refuses removing a locked field or one with a value; removes an unused one', () => {
      expect(removeField('phMin')).toEqual(jasmine.objectContaining({ ok: false, error: 'Locked fields can\'t be removed.' }));
      expect(removeField('grooveAngle')).toEqual(jasmine.objectContaining({ ok: false, procedures: ['GWP SEC-1 / WTN 01.1-1'] }));
      expect(removeField('rootOpening')).toEqual({ ok: true, data: { removed: { key: 'rootOpening' } } });
      expect(removeField('rootOpening')).toEqual(jasmine.objectContaining({ ok: false, title: 'Not found' }));
    });
  });
});
