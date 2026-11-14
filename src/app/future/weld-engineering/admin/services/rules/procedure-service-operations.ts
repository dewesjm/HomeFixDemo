/* Weld Engineering's procedure service calls as service tester operations. example: a procedure the
   inputs start filled in with, so each call answers something the first time it's run. */
import { PROCEDURE_STATUS_OPTIONS, type ProcedureStatus } from '../../../../../data/procedures';
import type { ServiceOperation } from '../../../../../shared/service-tester-panel/service-operation';
import { getProcedure, findProcedures, updateProcedureFields } from '../../../procedure-service/procedure-service';
import type { ProcedureKey } from '../../../procedure-service/procedure-record';
import type { ProcedureFilter } from '../../../procedure-service/procedure-filter';

const STATUSES = PROCEDURE_STATUS_OPTIONS.map(o => o.value);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const keyOf = (a: Record<string, unknown>): ProcedureKey => ({ gwp: str(a['gwp']), wtn: str(a['wtn']) });
const fieldsOf = (a: Record<string, unknown>) => a['fields'] as string[] | undefined;
const statusOf = (a: Record<string, unknown>) => a['status'] as ProcedureStatus | undefined;

const keyParams = (example: ProcedureKey) => [
  { name: 'gwp', label: 'GWP', type: 'text' as const, required: true, example: example.gwp },
  { name: 'wtn', label: 'WTN', type: 'text' as const, required: true, example: example.wtn },
];
const fieldsParam = (example = '') => ({
  name: 'fields', label: 'Fields', type: 'list' as const, example,
  placeholder: 'e.g. phMin, phMax, requiredQuals',
  help: 'Field keys, comma separated (Admin > Procedure Sections, Key column). Leave blank for every field.',
});
const statusParam = { name: 'status', label: 'Status', type: 'select' as const, options: STATUSES, help: 'Default: active.' };

export function procedureServiceOperations(example: ProcedureKey): ServiceOperation[] {
  return [
    {
      name: 'getProcedure',
      signature: 'getProcedure({ gwp, wtn }, { fields?, status?, revision? })',
      description: 'One procedure (WTN): its header and sections, or only the fields asked for. Fields it doesn\'t have are listed under missing.',
      writes: false,
      params: [
        ...keyParams(example), fieldsParam(), statusParam,
        { name: 'revision', label: 'Revision', type: 'text', help: 'Default: the current revision. Older revisions aren\'t stored in this demo.' },
      ],
      run: a => getProcedure(keyOf(a), { fields: fieldsOf(a), status: statusOf(a), revision: str(a['revision']) || undefined }),
    },
    {
      name: 'findProcedures',
      signature: 'findProcedures(filter, { fields?, status? })',
      description: 'Every procedure matching all the filter\'s conditions. Answers with headers only unless fields are asked for.',
      writes: false,
      params: [
        {
          name: 'filter', label: 'Filter', type: 'json', example: '{ "baseMetal1Type": "02-CS", "fillerMetalTypes": "mil-70s-6" }',
          help: 'Field key: value. A list field matches when it contains the value; a range when it includes the number; quals when it names the qual.',
        },
        fieldsParam(), statusParam,
      ],
      run: a => findProcedures((a['filter'] ?? {}) as ProcedureFilter, { fields: fieldsOf(a), status: statusOf(a) }),
    },
    {
      name: 'updateProcedureFields',
      signature: 'updateProcedureFields({ gwp, wtn }, values, revisionNote?)',
      description: 'Changes section values with the edit form\'s checks. An Active procedure needs a revision note, added to its Revision Record. In real life only people with access could call it.',
      writes: true,
      params: [
        ...keyParams(example),
        {
          name: 'values', label: 'Values', type: 'json', required: true, example: '{ "phMin": "100", "gasFlowRate": "30 CFH" }',
          help: 'Field key: new value. null clears a field. Lists are ["a", "b"], ranges { "min": 1, "max": 2 }.',
        },
        { name: 'revisionNote', label: 'Revision note', type: 'text', placeholder: 'What changed and why' },
      ],
      run: a => updateProcedureFields(keyOf(a), (a['values'] ?? {}) as Record<string, unknown>, str(a['revisionNote']), 'Services page'),
    },
  ];
}
