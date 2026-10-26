import { Job } from '../../data/jobs';
import { activeAttributeCodes } from './attribute-context';

export type InspectionPhase = 'root' | 'layer' | 'final';
export interface InspectionMethod {
  type: string;
  minRt?: number;
  magnification?: '1X' | '5X';
  scope?: 'ID';
  access?: 'yes' | 'no';
}
export interface InspectionObligation {
  phase: InspectionPhase;
  templateId: string;
  methods: InspectionMethod[];
  sources: string[];
}

/* Each obligation needs one completed inspection; methods within it are alternatives. */
export function resolveAttributeInspections(job: Job, baseline: InspectionObligation[]): InspectionObligation[] {
  const codes = activeAttributeCodes(job);
  const has = (code: string) => codes.some(c => c === code);
  const obligations = baseline.map(o => ({ ...o, sources: [...o.sources], methods: o.methods.map(m => ({ ...m })) }));
  const prefix = ['1', '2'].includes(job.nInd) ? 'nqc-' : '';
  const template = (phase: InspectionPhase, type: string) => `${prefix}${phase}-ndt-${['vt', '5x'].includes(type) ? 'vt5x' : ['mt', 'pt'].includes(type) ? 'mtpt' : 'utrt'}`;
  const add = (phase: InspectionPhase, methods: InspectionMethod[], source: string) => {
    const existing = methods.some(m => m.access) ? undefined : obligations.find(o => o.phase === phase && o.methods.length && o.methods.every(m => methods.some(n => n.type === m.type)));
    if (existing) {
      existing.sources.push(source);
      existing.methods = existing.methods.map(m => {
        const incoming = methods.find(n => n.type === m.type)!;
        return { ...m, ...incoming, ...(m.minRt || incoming.minRt ? { minRt: Math.max(m.minRt ?? 0, incoming.minRt ?? 0) } : {}) };
      });
    } else obligations.push({ phase, templateId: template(phase, methods[0].type), methods, sources: [source] });
  };
  const remove = (phase: InspectionPhase, type?: string) => {
    for (const o of obligations.filter(o => o.phase === phase)) o.methods = type ? o.methods.filter(m => m.type !== type) : [];
  };
  const substitute = (phase: InspectionPhase, original: string, alternatives: InspectionMethod[], source: string) => {
    for (const o of obligations.filter(o => o.phase === phase && o.methods.some(m => m.type === original))) {
      for (const method of alternatives) if (!o.methods.some(m => m.type === method.type)) o.methods.push({ ...method });
      o.sources.push(source);
    }
  };
  if (has('PR')) {
    for (const o of obligations.filter(o => ['root', 'final'].includes(o.phase) && o.methods.some(m => m.type === 'rt'))) {
      o.methods = o.methods.map(m => m.type === 'rt' ? { ...m, access: 'no' as const } : m);
      o.methods.push({ type: 'attribute-not-required', access: 'yes' });
      o.sources.push('PR');
    }
    substitute('root', 'vt', [{ type: 'pt', scope: 'ID', access: 'yes' }], 'PR');
    substitute('root', '5x', [{ type: 'pt', scope: 'ID', access: 'yes' }], 'PR');
  }
  if (has('PM')) substitute('final', 'mt', [{ type: 'pt' }], 'PM');
  if (has('FC') || has('BJ')) {
    remove('final'); add('final', [{ type: 'vt', magnification: '1X' }], has('FC') ? 'FC' : 'BJ');
  }
  if (has('GV')) {
    remove('root'); remove('final');
    add('root', [{ type: '5x', magnification: '5X' }], 'GV');
    add('final', [{ type: 'vt', magnification: '1X' }], 'GV');
  }
  if (has('PU')) { add('final', [{ type: 'pt' }], 'PU'); add('final', [{ type: 'ut' }], 'PU'); }
  if (has('RX')) {
    add('root', [{ type: 'pt' }], 'RX');
    add('final', [{ type: 'rt', minRt: Number(job.rtFinal) || 100 }], 'RX');
  }
  if (has('SI')) for (const phase of ['root', 'final'] as const) substitute(phase, 'rt', [{ type: 'vt', scope: 'ID', access: 'yes' }], 'SI');
  if (has('IA')) for (const phase of ['root', 'layer', 'final'] as const) add(phase, [{ type: 'pt', scope: 'ID', access: 'yes' }, { type: 'mt', scope: 'ID', access: 'yes' }, { type: 'attribute-not-required', access: 'no' }], 'IA');
  if (has('IR')) for (const phase of ['root', 'final'] as const) substitute(phase, 'rt', [{ type: 'pt', scope: 'ID', access: 'yes' }, { type: 'mt', scope: 'ID', access: 'yes' }], 'IR');
  if (has('LR')) substitute('layer', 'pt', [{ type: 'rt', minRt: 60 }], 'LR');
  if (has('RI')) add('final', [
    { type: 'rt', minRt: 60 }, { type: 'pt', scope: 'ID', access: 'yes' },
  ], 'RI');
  if (has('BP')) {
    remove('root', 'vt');
    add('root', [{ type: '5x', magnification: '5X' }], 'BP');
    add('root', [{ type: 'pt' }, { type: 'mt' }], 'BP');
  }
  /* A stricter singleton also satisfies a broader alternative, avoiding duplicate obligations. */
  return obligations.filter(o => o.methods.length).filter((o, i, all) => !all.some((other, j) =>
    j !== i && other.phase === o.phase && other.methods.length <= o.methods.length
    && (other.methods.length < o.methods.length || j < i)
    && other.methods.every(m => o.methods.some(n => n.type === m.type && (m.minRt ?? 0) >= (n.minRt ?? 0) && (!n.scope || n.scope === m.scope) && n.access === m.access))));
}
