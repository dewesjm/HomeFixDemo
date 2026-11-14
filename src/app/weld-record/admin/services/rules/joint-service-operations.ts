/* Weld Record's joint service calls (weld-record/joint-service/joint-service.ts) as service tester
   operations. example: a joint the inputs start filled in with, so each call answers something the
   first time it's run. */
import { sent, type OperationParam, type ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import { HISTORY_SECTIONS, type JointFieldDefinition, type JointFilter, type JointKey, type JointSearch, type JointService } from '../../../joint-service/joint-service';
import { SEARCH_COLUMNS } from '../../../joint-service/joint-search';
import type { HistoryEntry } from '../../../model/history';

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/* a field as a droplist entry, under its group */
const fieldChoice = (f: JointFieldDefinition) => ({
  value: f.key, label: `${f.label} (${f.key})`, group: f.group,
  hint: f.choices?.length ? `Value, e.g. ${f.choices[0]}` : 'Value',
});

/* blank parts are left out of the key, so the call shown is the call made */
const keyOf = (a: Record<string, unknown>): JointKey =>
  sent({ hull: str(a['hull']) || undefined, drawing: str(a['drawing']) || undefined, joint: str(a['joint']) || undefined, xrefid: str(a['xrefid']) || undefined });

const keyParams = (example: JointKey): OperationParam[] => [
  { name: 'hull', label: 'Hull', type: 'text', example: example.hull },
  { name: 'drawing', label: 'Drawing', type: 'text', example: example.drawing },
  { name: 'joint', label: 'Joint', type: 'text', example: example.joint },
  { name: 'xrefid', label: 'XREFID', type: 'text', help: 'Or give the XREFID instead (it wins when both are given).' },
];

const openOnlyParam: OperationParam = {
  name: 'openOnly', label: 'Open only', type: 'select', options: ['true', 'false'], help: 'Default: false (closed joints, at Sold, included).',
};
const openOnlyOf = (a: Record<string, unknown>) => (a['openOnly'] === 'true' ? true : a['openOnly'] === 'false' ? false : undefined);

/* fields: every key findJoints takes (getJointFields), for the Filter droplist */
export function jointServiceOperations(svc: JointService, example: JointKey, fields: JointFieldDefinition[]): ServiceOperation[] {
  return [
    {
      name: 'getJoint',
      signature: 'getJoint({ hull, drawing, joint } | { xrefid })',
      description: 'One joint: its record fields, current routing, Refit # and Repair #, and url, its Joint Details link.',
      writes: false,
      params: keyParams(example),
      call: a => [keyOf(a)],
      fn: k => svc.getJoint(k),
    },
    {
      name: 'findJoints',
      signature: 'findJoints(filter, { openOnly? })',
      description: 'For another system\'s logic: every joint matching all the filter\'s conditions, each an exact value (any case) on a joint field or its current routing. Answers whole joints, each with url, its Joint Details link. No search text, sort or paging (that\'s searchJoints).',
      writes: false,
      params: [
        {
          name: 'filter', label: 'Filter', type: 'conditions',
          example: JSON.stringify({ hull: example.hull ?? '', drawing: example.drawing ?? '' }),
          choices: fields.map(fieldChoice),
          help: 'Every condition must hold.',
        },
        openOnlyParam,
      ],
      call: a => [(a['filter'] ?? {}) as JointFilter, sent({ openOnly: openOnlyOf(a) })],
      fn: (f, o) => svc.findJoints(f, o),
    },
    {
      name: 'searchJoints',
      signature: 'searchJoints({ text?, filters?, sort?, page?, pageSize?, openOnly? })',
      description: 'For a list screen: search text (XREFID, hull, drawing, joint, routing, technician), column filters, sort and optional paging, with the total. Answers flat rows, each with url, its Joint Details link.',
      writes: false,
      params: [{
        name: 'query', label: 'Query', type: 'json',
        example: JSON.stringify({ text: example.drawing ?? '', filters: { weldType: ['Butt', 'Socket'] }, sort: { by: 'joint', order: 'asc' }, page: 1, pageSize: 10 }),
        help: `Columns: ${SEARCH_COLUMNS.join(', ')}. A filter's text = contains; a list = any of those values exactly. Add "openOnly": true to leave out closed joints.`,
      }],
      call: a => [(a['query'] ?? {}) as JointSearch],
      fn: q => svc.searchJoints(q),
    },
    {
      name: 'getJointFields',
      signature: 'getJointFields()',
      description: 'Every field a findJoints condition can name: key, label, group, type, whether searchJoints has it as a column, and for fields picked from a list the values joints have now. This page\'s Filter droplist comes from it.',
      writes: false,
      params: [],
      call: () => [],
      fn: () => svc.getJointFields(),
    },
    {
      name: 'getRouting',
      signature: 'getRouting({ hull, drawing, joint } | { xrefid })',
      description: 'Every routing on the joint\'s path in order, signed or not, and which one it is at now.',
      writes: false,
      params: keyParams(example),
      call: a => [keyOf(a)],
      fn: k => svc.getRouting(k),
    },
    {
      name: 'getHistory',
      signature: 'getHistory({ hull, drawing, joint } | { xrefid }, { section? })',
      description: 'The joint\'s History entries, newest first. Pick a section for only those entries.',
      writes: false,
      params: [
        ...keyParams(example),
        { name: 'section', label: 'Section', type: 'select', options: HISTORY_SECTIONS, help: 'Default: every section.' },
      ],
      call: a => [keyOf(a), sent({ section: (str(a['section']) || undefined) as HistoryEntry['section'] | undefined })],
      fn: (k, o) => svc.getHistory(k, o),
    },
  ];
}
