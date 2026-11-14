/* Weld Record's joint service calls (weld-record/joint-service/joint-service.ts) as service tester
   operations. example: a joint the inputs start filled in with, so each call answers something the
   first time it's run. */
import { sent, type OperationParam, type ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import { HISTORY_SECTIONS, type JointKey, type JointService } from '../../../joint-service/joint-service';
import type { HistoryEntry } from '../../../model/history';

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/* blank parts are left out of the key, so the call shown is the call made */
const keyOf = (a: Record<string, unknown>): JointKey =>
  sent({ hull: str(a['hull']) || undefined, drawing: str(a['drawing']) || undefined, joint: str(a['joint']) || undefined, xrefid: str(a['xrefid']) || undefined });

const keyParams = (example: JointKey): OperationParam[] => [
  { name: 'hull', label: 'Hull', type: 'text', example: example.hull },
  { name: 'drawing', label: 'Drawing', type: 'text', example: example.drawing },
  { name: 'joint', label: 'Joint', type: 'text', example: example.joint },
  { name: 'xrefid', label: 'XREFID', type: 'text', help: 'Or give the XREFID instead (it wins when both are given).' },
];

export function jointServiceOperations(svc: JointService, example: JointKey): ServiceOperation[] {
  return [
    {
      name: 'getJoint',
      signature: 'getJoint({ hull, drawing, joint } | { xrefid })',
      description: 'One joint: its record fields, current routing, Refit # and Repair #.',
      writes: false,
      params: keyParams(example),
      call: a => [keyOf(a)],
      fn: k => svc.getJoint(k),
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
