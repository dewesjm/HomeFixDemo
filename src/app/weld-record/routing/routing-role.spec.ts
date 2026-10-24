import { getSignoffTypeRows, setSignoffTypeRows } from '../signoff-definition/signoff-types';
import { JOBS, Job } from '../../data/jobs';
import { routingRole } from './routing-role';
import { getAddedTemplate, updateStageTemplate } from './stage-templates';
import { excavationNdtStageFor, insertEngineeringHold, nextRepairStage } from './added-steps';
import { buildStages } from './build-stages';

describe('Configured routing personas', () => {
  const job = (nInd: string): Job => ({ ...JOBS[0], trade: 'Welding', nInd });
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });
  beforeEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });

  for (const nInd of ['1', '2', '3']) {
    it(`defaults Excavation to the appropriate persona for indicator ${nInd}`, () => {
      expect(excavationNdtStageFor(job(nInd), 'pt', 'repair-2').role)
        .toBe(nInd === '3' ? 'Inspector' : 'NQC Inspector');
    });
  }
  it('uses the first matching rule, falls back to the base persona, and supports removing all rules', () => {
    updateStageTemplate('Welding', 'excavation-ndt', {
      role: 'Foreman', roleRules: [
        { when: [{ field: 'nInd', op: 'is', values: ['3'] }], role: 'Engineering' },
        { when: [], role: 'Welding' },
      ],
    });
    expect(excavationNdtStageFor(job('3'), 'pt', 'repair').role).toBe('Engineering');
    expect(routingRole(getAddedTemplate('excavation-ndt'), job('1'))).toBe('Welding');
    updateStageTemplate('Welding', 'excavation-ndt', { roleRules: [] });
    expect(getAddedTemplate('excavation-ndt').roleRules).toEqual([]);
    expect(excavationNdtStageFor(job('3'), 'pt', 'repair').role).toBe('Foreman');
    expect(routingRole({ id: 'custom', label: 'Custom', required: true }, job('1'))).toBe('');
  });
  it('applies persona rules to numbered and inserted routings without changing existing instances', () => {
    const existing = excavationNdtStageFor(job('1'), 'pt', 'repair');
    for (const id of ['nqc-excavation-ndt', 'repair', 'engineering-hold', 'tack']) {
      updateStageTemplate('Welding', id, { roleRules: [{ when: [], role: 'Engineering' }] });
    }
    expect(excavationNdtStageFor(job('1'), 'pt', 'repair-2').role).toBe('Engineering');
    expect(nextRepairStage([], job('1')).role).toBe('Engineering');
    const stages = buildStages(job('1'));
    expect(stages.find(stage => stage.id === 'tack')!.role).toBe('Engineering');
    expect(insertEngineeringHold(stages, 'tack', '', job('1')).find(stage => stage.id === 'engineering-hold')!.role).toBe('Engineering');
    expect(existing.role).toBe('NQC Inspector');
  });
});
