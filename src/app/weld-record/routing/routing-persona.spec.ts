import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from '../../data/signoff-type-routing';
import { JOBS, Job } from '../../data/jobs';
import { closingRole, routingRole } from './routing-persona';
import { closesJoint } from './current-routing';
import { getAddedTemplate, updateStageTemplate } from './routing-settings-rules';
import { excavationNdtStageFor, insertEngineeringHold, nextRepairStage } from './inserted/added-routings';
import { buildStages } from './build-stages';

describe('Sold', () => {
  it('closes the joint and its persona follows the Records Review', () => {
    expect(closesJoint('sold')).toBeTrue();
    expect(closingRole(true)).toBe('O63 Records');
    expect(closingRole(false)).toBe('O04 Records');
  });
});

describe('Configured routing personas', () => {
  const job = (nInd: string): Job => ({ ...JOBS[0], nInd });
  afterEach(() => { localStorage.clear(); setSignoffTypeRoutingRows(getSignoffTypeRoutingRows()); });
  beforeEach(() => { localStorage.clear(); setSignoffTypeRoutingRows(getSignoffTypeRoutingRows()); });

  for (const nInd of ['1', '2', '3']) {
    it(`defaults Excavation to the appropriate persona for indicator ${nInd}`, () => {
      expect(excavationNdtStageFor(job(nInd), 'pt', 'repair-2').role)
        .toBe(nInd === '3' ? 'Inspector' : 'NQC Inspector');
    });
  }
  it('uses the first matching rule, falls back to the base persona, and supports removing all rules', () => {
    updateStageTemplate('excavation-ndt', {
      role: 'Foreman', roleRules: [
        { when: [{ field: 'nInd', op: 'is', values: ['3'] }], role: 'Engineering' },
        { when: [], role: 'Welding' },
      ],
    });
    expect(excavationNdtStageFor(job('3'), 'pt', 'repair').role).toBe('Engineering');
    expect(routingRole(getAddedTemplate('excavation-ndt'), job('1'))).toBe('Welding');
    updateStageTemplate('excavation-ndt', { roleRules: [] });
    expect(getAddedTemplate('excavation-ndt').roleRules).toEqual([]);
    expect(excavationNdtStageFor(job('3'), 'pt', 'repair').role).toBe('Foreman');
    expect(routingRole({ id: 'custom', label: 'Custom', required: true }, job('1'))).toBe('');
  });
  it('applies persona rules to numbered and inserted routings without changing existing instances', () => {
    const existing = excavationNdtStageFor(job('1'), 'pt', 'repair');
    for (const id of ['nqc-excavation-ndt', 'repair', 'engineering-hold', 'tack']) {
      updateStageTemplate(id, { roleRules: [{ when: [], role: 'Engineering' }] });
    }
    expect(excavationNdtStageFor(job('1'), 'pt', 'repair-2').role).toBe('Engineering');
    expect(nextRepairStage([], job('1')).role).toBe('Engineering');
    const stages = buildStages(job('1'));
    expect(stages.find(stage => stage.id === 'tack')!.role).toBe('Engineering');
    expect(insertEngineeringHold(stages, 'tack', '', job('1')).find(stage => stage.id === 'engineering-hold')!.role).toBe('Engineering');
    expect(existing.role).toBe('NQC Inspector');
  });
});
