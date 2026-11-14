/* Weld Engineering's section service calls (procedure section and field definitions) as service tester
   operations. example: the section and field the inputs start filled in with. */
import { type OperationParam, type ServiceOperation } from '../../../../../shared/service-tester-panel/service-operation';
import {
  addSection, renameSection, shiftSection, removeSection, addField, renameField, shiftField, moveField, setFieldWidth, removeField,
  type NewField,
} from '../../../procedure-service/section-service';
import { EXTRA_FIELD_TYPE_OPTIONS, type FieldWidth } from '../../../procedure-sections';

export interface SectionExample { sectionId: string; sectionName: string; fieldKey: string; fieldLabel: string; }

const str = (v: unknown) => (typeof v === 'string' ? v : '');

const sectionIdParam = (example: string, label = 'Section id'): OperationParam => ({
  name: 'sectionId', label, type: 'text', required: true, example,
  help: 'A section\'s id (Admin > Procedure Sections, "How it\'s stored").',
});
const keyParam = (example: string): OperationParam => ({
  name: 'key', label: 'Field key', type: 'text', required: true, example,
  help: 'Admin > Procedure Sections, Key column.',
});
const placesParam: OperationParam = {
  name: 'places', label: 'Places', type: 'json', required: true, example: '1', help: 'How far to move it; negative = up.',
};

export function sectionServiceOperations(example: SectionExample): ServiceOperation[] {
  return [
    {
      name: 'addSection',
      signature: 'addSection(name)',
      description: 'A new section at the end of the list. No procedure has it ticked yet.',
      writes: true,
      params: [{ name: 'name', label: 'Name', type: 'text', required: true, example: 'Cleaning' }],
      call: a => [str(a['name'])],
      fn: addSection,
    },
    {
      name: 'renameSection',
      signature: 'renameSection(sectionId, name)',
      description: 'Renames a section. Fields and saved values are unaffected.',
      writes: true,
      params: [sectionIdParam(example.sectionId), { name: 'name', label: 'Name', type: 'text', required: true, example: example.sectionName }],
      call: a => [str(a['sectionId']), str(a['name'])],
      fn: renameSection,
    },
    {
      name: 'shiftSection',
      signature: 'shiftSection(sectionId, places)',
      description: 'Moves a section up or down the list, which renumbers the sections.',
      writes: true,
      params: [sectionIdParam(example.sectionId), placesParam],
      call: a => [str(a['sectionId']), a['places']],
      fn: shiftSection,
    },
    {
      name: 'removeSection',
      signature: 'removeSection(sectionId)',
      description: 'Removes a section. Refused while any procedure has it ticked (they are listed) or it holds a locked field.',
      writes: true,
      params: [sectionIdParam(example.sectionId)],
      call: a => [str(a['sectionId'])],
      fn: removeSection,
    },
    {
      name: 'addField',
      signature: 'addField(sectionId, { label, type, required?, options?, source? })',
      description: 'A new field at the end of a section. Its key is made from the label.',
      writes: true,
      params: [
        sectionIdParam(example.sectionId),
        {
          name: 'field', label: 'Field', type: 'json', required: true, example: '{ "label": "Solvent", "type": "text" }',
          help: `type: ${EXTRA_FIELD_TYPE_OPTIONS.map(o => o.value).join(', ')}. list and multi need options; table needs source.`,
        },
      ],
      call: a => [str(a['sectionId']), (a['field'] ?? {}) as NewField],
      fn: addField,
    },
    {
      name: 'renameField',
      signature: 'renameField(key, label)',
      description: 'Changes a field\'s label. Its key never changes, so saved values and other systems\' reads are unaffected.',
      writes: true,
      params: [keyParam(example.fieldKey), { name: 'label', label: 'Label', type: 'text', required: true, example: example.fieldLabel }],
      call: a => [str(a['key']), str(a['label'])],
      fn: renameField,
    },
    {
      name: 'shiftField',
      signature: 'shiftField(key, places)',
      description: 'Moves a field up or down within its section.',
      writes: true,
      params: [keyParam(example.fieldKey), placesParam],
      call: a => [str(a['key']), a['places']],
      fn: shiftField,
    },
    {
      name: 'moveField',
      signature: 'moveField(key, toSectionId)',
      description: 'Moves a field to the end of another section, keeping its key and values. Refused when a procedure with a value doesn\'t have that section ticked (they are listed).',
      writes: true,
      params: [keyParam(example.fieldKey), { ...sectionIdParam('', 'To section id'), name: 'toSectionId' }],
      call: a => [str(a['key']), str(a['toSectionId'])],
      fn: moveField,
    },
    {
      name: 'setFieldWidth',
      signature: 'setFieldWidth(key, width)',
      description: 'The field\'s width on the edit form and PDF.',
      writes: true,
      params: [
        keyParam(example.fieldKey),
        { name: 'width', label: 'Width', type: 'json', example: '"full"', help: 'Pixels (e.g. 120), "full" for a line of its own, or blank / null for Auto.' },
      ],
      call: a => [str(a['key']), (a['width'] ?? null) as FieldWidth | null],
      fn: setFieldWidth,
    },
    {
      name: 'removeField',
      signature: 'removeField(key)',
      description: 'Removes a field. Refused for a locked field, or while any procedure shows a value in it (they are listed).',
      writes: true,
      params: [keyParam(example.fieldKey)],
      call: a => [str(a['key'])],
      fn: removeField,
    },
  ];
}
