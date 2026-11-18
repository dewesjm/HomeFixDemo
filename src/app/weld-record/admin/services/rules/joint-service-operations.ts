/* Weld Record's joint service calls (weld-record/joint-service/joint-service.ts) as service tester
   operations. example: a joint the inputs start filled in with, so each call answers something the
   first time it's run. */
import { sent, type OperationParam, type ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import type { JointKey } from '../../../joint-link-logic/joint-lookup';
import { HISTORY_SECTIONS, type JointFieldDefinition, type JointFilter, type JointSearch, type JointService } from '../../../joint-service/joint-service';
import { SEARCH_COLUMNS } from '../../../joint-service/joint-search';
import type { HistoryEntry } from '../../../model/history';
import { FABRICATION_FIELDS } from '../../../fabrication-logic/fabrication-fields';
import type { JointRoutingWritesService } from '../../../joint-service/joint-routing-writes.service';
import type { JointSignoffService } from '../../../joint-service/joint-signoff.service';
import type { JointRecordEditsService } from '../../../joint-service/joint-record-edits.service';

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

const reasonParam: OperationParam = { name: 'reason', label: 'Reason', type: 'text', required: true };
const routingParam: OperationParam = { name: 'routingId', label: 'Routing ID', type: 'text', required: true };

export function jointRecordOperations(svc: JointRecordEditsService, example: JointKey): ServiceOperation[] {
  return [
    {
      name: 'correctRouting',
      signature: 'correctRouting(key, routingId, changes, reason)',
      description: 'Corrects editable answers on a signed routing and records the changes in History.',
      writes: true,
      params: [...keyParams(example), routingParam, reasonParam,
        { name: 'changes', label: 'Changes', type: 'json', required: true, help: 'Group field values under inputs or signoffInputs.' }],
      call: a => [keyOf(a), str(a['routingId']), a['changes'], str(a['reason'])],
      fn: (key, routingId, changes, reason) => svc.correctRouting(key, routingId, changes, reason),
    },
    {
      name: 'setFabricationData',
      signature: 'setFabricationData(key, field, value)',
      description: 'Updates one editable Fabrication field and returns the current Fabrication values, including any dependent fields cleared by the change.',
      writes: true,
      params: [
        ...keyParams(example),
        { name: 'field', label: 'Field', type: 'select', required: true, options: FABRICATION_FIELDS.map(f => f.key), example: 'weldMemo' },
        { name: 'value', label: 'Value', type: 'text', help: 'Enter the stored value for a dropdown field. Leave blank to clear the field.' },
      ],
      call: a => [keyOf(a), str(a['field']), str(a['value'])],
      fn: (k, f, v) => svc.setFabricationData(k, f, v),
    },
    {
      name: 'addReference',
      signature: 'addReference(key, name)',
      description: 'Adds a reference file name to the demo joint and returns its current references.',
      writes: true,
      params: [...keyParams(example), { name: 'name', label: 'File name', type: 'text', required: true }],
      call: a => [keyOf(a), str(a['name'])],
      fn: (key, name) => svc.addReference(key, name),
    },
    {
      name: 'removeReference',
      signature: 'removeReference(key, id)',
      description: 'Removes a reference by ID and returns the remaining references. Add Reference returns IDs.',
      writes: true,
      params: [...keyParams(example), { name: 'id', label: 'Reference ID', type: 'text', required: true }],
      call: a => [keyOf(a), str(a['id'])],
      fn: (key, id) => svc.removeReference(key, id),
    },
  ];
}

export function jointSignoffOperations(svc: JointSignoffService, example: JointKey): ServiceOperation[] {
  return [
    {
      name: 'signRouting',
      signature: 'signRouting(key, routingId)',
      description: 'Signs the current routing using the joint’s existing form answers and returns the resulting routing. Get the routing ID with getRouting.',
      writes: true,
      params: [...keyParams(example), routingParam],
      call: a => [keyOf(a), str(a['routingId'])],
      fn: (key, routingId) => svc.signRouting(key, routingId),
    },
    {
      name: 'releaseToWelding',
      signature: 'releaseToWelding(key)',
      description: 'Releases a joint at Fit-Up Release and returns its next routing. Requires the Foreman persona and Fit-Up Release permission.',
      writes: true,
      params: keyParams(example),
      call: a => [keyOf(a)],
      fn: k => svc.releaseToWelding(k),
    },
  ];
}

export function jointRoutingOperations(svc: JointRoutingWritesService, example: JointKey): ServiceOperation[] {
  return [
    {
      name: 'deprogress',
      signature: 'deprogress(key, reason)',
      description: 'Reverses the latest eligible signoff and returns the resulting routing.',
      writes: true,
      params: [...keyParams(example), reasonParam],
      call: a => [keyOf(a), str(a['reason'])],
      fn: (key, reason) => svc.deprogress(key, reason),
    },
    {
      name: 'setRouting',
      signature: 'setRouting(key, routingId, reason)',
      description: 'Performs a Routing Override and returns the resulting routing. Use getRouting to find a required target routing ID.',
      writes: true,
      params: [...keyParams(example), routingParam, reasonParam],
      call: a => [keyOf(a), str(a['routingId']), str(a['reason'])],
      fn: (key, routingId, reason) => svc.setRouting(key, routingId, reason),
    },
  ];
}

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
        { name: 'section', label: 'Section', type: 'select', options: [...HISTORY_SECTIONS], help: 'Default: every section.' },
      ],
      call: a => [keyOf(a), sent({ section: (str(a['section']) || undefined) as HistoryEntry['section'] | undefined })],
      fn: (k, o) => svc.getHistory(k, o),
    },
  ];
}
