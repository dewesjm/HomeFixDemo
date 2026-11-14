/* Weld Engineering's procedure service calls as service tester operations. example: a procedure the
   inputs start filled in with, so each call answers something the first time it's run. */
import { PROCEDURE_STATUS_OPTIONS, type ProcedureStatus } from '../../../../../data/procedures';
import { sent, type ServiceOperation } from '../../../../../shared/service-tester-panel/service-operation';
import {
  getProcedure, findProcedures, searchProcedures, updateProcedureFields, createProcedure, updateProcedure, deleteProcedure, importProcedures,
} from '../../../procedure-service/procedure-service';
import type { ProcedureKey } from '../../../procedure-service/procedure-record';
import type { ProcedureFilter } from '../../../procedure-service/procedure-filter';
import { SEARCH_COLUMNS, type ProcedureSearch } from '../../../procedure-service/procedure-search';

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
const revisionNoteParam = { name: 'revisionNote', label: 'Revision note', type: 'text' as const, placeholder: 'What changed and why' };
/* by: who the Revision Record names for a change made here */
const BY = 'Services page';
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
      call: a => [keyOf(a), sent({ fields: fieldsOf(a), status: statusOf(a), revision: str(a['revision']) || undefined })],
      fn: getProcedure,
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
      call: a => [(a['filter'] ?? {}) as ProcedureFilter, sent({ fields: fieldsOf(a), status: statusOf(a) })],
      fn: findProcedures,
    },
    {
      name: 'searchProcedures',
      signature: 'searchProcedures({ text?, filters?, sort?, page?, pageSize? })',
      description: 'The rows for a list screen, as Procedure Lookup asks for them: search text, column filters, sort, and paging when page and pageSize are sent. Answers the total matched.',
      writes: false,
      params: [{
        name: 'query', label: 'Query', type: 'json',
        example: '{ "text": "steel", "filters": { "status": ["active", "draft"] }, "sort": { "by": "gwp", "order": "asc" }, "page": 1, "pageSize": 10 }',
        help: `Columns: ${SEARCH_COLUMNS.join(', ')}. Status is active unless filtered. Leave blank for every Active procedure.`,
      }],
      call: a => [(a['query'] ?? {}) as ProcedureSearch],
      fn: searchProcedures,
    },
    {
      name: 'updateProcedureFields',
      signature: 'updateProcedureFields({ gwp, wtn }, values, revisionNote?, by?)',
      description: 'Changes section values with the edit form\'s checks. An Active procedure needs a revision note, added to its Revision Record. In real life only people with access could call it.',
      writes: true,
      params: [
        ...keyParams(example),
        {
          name: 'values', label: 'Values', type: 'json', required: true, example: '{ "phMin": "100", "gasFlowRate": "30 CFH" }',
          help: 'Field key: new value. null clears a field. Lists are ["a", "b"], ranges { "min": 1, "max": 2 }.',
        },
        revisionNoteParam,
      ],
      call: a => [keyOf(a), a['values'] ?? {}, str(a['revisionNote']), BY],
      fn: updateProcedureFields,
    },
    {
      name: 'updateProcedure',
      signature: 'updateProcedure({ gwp, wtn }, changes, revisionNote?, by?)',
      description: 'Changes the header, section ticks, rules, conditions or section values (extraFields replaces them all), with the edit form\'s checks. GWP and WTN can be changed too. An Active procedure needs a revision note.',
      writes: true,
      params: [
        ...keyParams(example),
        {
          name: 'changes', label: 'Changes', type: 'json', required: true, example: '{ "title": "GTAW procedure for process piping" }',
          help: 'Property: new value. Allowed: gwp, wtn, title, status, revision, effectiveDate, weldProcess, processType, application, rules, conditions, sectionIds, extraFields.',
        },
        revisionNoteParam,
      ],
      call: a => [keyOf(a), a['changes'] ?? {}, str(a['revisionNote']), BY],
      fn: updateProcedure,
    },
    {
      name: 'createProcedure',
      signature: 'createProcedure(procedure, by?)',
      description: 'A new procedure. Anything not sent starts blank (Draft) with every section ticked. Runs the edit form\'s checks.',
      writes: true,
      params: [{
        name: 'procedure', label: 'Procedure', type: 'json', required: true,
        example: '{ "gwp": "W-999", "wtn": "01.1-1", "title": "Test procedure", "extraFields": { "baseMetal1Type": "02-CS", "baseMetal2Type": "02-CS" } }',
        help: 'gwp and wtn are required; the other properties are the same as updateProcedure\'s.',
      }],
      call: a => [a['procedure'] ?? {}, BY],
      fn: createProcedure,
    },
    {
      name: 'importProcedures',
      signature: 'importProcedures(rows, revisionNote?, by?)',
      description: 'Many procedures at once (Load Procedures). Each row saves or is refused on its own: an existing GWP + WTN is updated, any other is created. Answers how each row went.',
      writes: true,
      params: [
        {
          name: 'rows', label: 'Rows', type: 'json', required: true,
          example: '[{ "gwp": "W-999", "wtn": "01.1-1", "title": "Test procedure" }, { "gwp": "W-999", "wtn": "01.1-2", "title": "Second" }]',
          help: 'A list of procedures, each with gwp and wtn and the same properties as createProcedure.',
        },
        { ...revisionNoteParam, help: 'Added to each updated Active procedure. Load Procedures sends "Loaded from file".' },
      ],
      call: a => [a['rows'] ?? [], str(a['revisionNote']), BY],
      fn: importProcedures,
    },
    {
      name: 'deleteProcedure',
      signature: 'deleteProcedure({ gwp, wtn })',
      description: 'Deletes the procedure. It can\'t be undone.',
      writes: true,
      params: keyParams(example),
      call: a => [keyOf(a)],
      fn: deleteProcedure,
    },
  ];
}
