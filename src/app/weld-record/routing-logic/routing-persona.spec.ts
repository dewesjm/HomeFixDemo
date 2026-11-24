import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from '../../data/signoff-type-routing';
import { JOBS, Job } from '../../data/jobs';
import { routingPersona } from './routing-persona';
import { closesJoint } from './current-routing';
import { getAddedTemplate, updateStageTemplate } from './routing-settings-rules';
import { excavationNdtStageFor, insertEngineeringHold, nextRepairStage } from './inserted-routing/added-routings';
import { buildStages } from './build-stages';

describe('Sold', () => {
  /* clearing storage alone leaves the cached Routing Settings; re-setting the type rows drops that cache */
  beforeEach(() => { localStorage.clear(); setSignoffTypeRoutingRows('pipe', getSignoffTypeRoutingRows('pipe')); });
  afterEach(() => { localStorage.clear(); setSignoffTypeRoutingRows('pipe', getSignoffTypeRoutingRows('pipe')); });
  const soldRole = () => buildStages(JOBS[0]).find(s => s.id === 'sold')!.role;

  it('closes the joint and starts on the View persona', () => {
    expect(closesJoint('sold')).toBeTrue();
    expect(soldRole()).toBe('View');
  });
  it('takes its persona from Routing Settings', () => {
    updateStageTemplate('pipe', 'sold', { persona: 'O04 Records' });
    expect(soldRole()).toBe('O04 Records');
  });
});

describe('Configured routing personas', () => {
  const job = (nInd: string): Job => ({ ...JOBS[0], nInd });
  afterEach(() => { localStorage.clear(); setSignoffTypeRoutingRows('pipe', getSignoffTypeRoutingRows('pipe')); });
  beforeEach(() => { localStorage.clear(); setSignoffTypeRoutingRows('pipe', getSignoffTypeRoutingRows('pipe')); });

  for (const nInd of ['1', '2', '3']) {
    it(`defaults Excavation to the appropriate persona for indicator ${nInd}`, () => {
      expect(excavationNdtStageFor(job(nInd), 'pt', 'repair-2').role)
        .toBe(nInd === '3' ? 'Inspector' : 'NQC Inspector');
    });
  }
  it('uses the first matching rule, falls back to the base persona, and supports removing all rules', () => {
    updateStageTemplate('pipe', 'excavation-ndt', {
      persona: 'Foreman', personaRules: [
        { when: [{ field: 'nInd', op: 'is', values: ['3'] }], persona: 'Engineering' },
        { when: [], persona: 'Welding' },
      ],
    });
    expect(excavationNdtStageFor(job('3'), 'pt', 'repair').role).toBe('Engineering');
    expect(routingPersona(getAddedTemplate('pipe', 'excavation-ndt'), job('1'))).toBe('Welding');
    updateStageTemplate('pipe', 'excavation-ndt', { personaRules: [] });
    expect(getAddedTemplate('pipe', 'excavation-ndt').personaRules).toEqual([]);
    expect(excavationNdtStageFor(job('3'), 'pt', 'repair').role).toBe('Foreman');
    expect(routingPersona({ id: 'custom', label: 'Custom', required: true }, job('1'))).toBe('');
  });
  it('applies persona rules to numbered and inserted routings without changing existing instances', () => {
    const existing = excavationNdtStageFor(job('1'), 'pt', 'repair');
    for (const id of ['nqc-excavation-ndt', 'repair', 'engineering-hold', 'tack']) {
      updateStageTemplate('pipe', id, { personaRules: [{ when: [], persona: 'Engineering' }] });
    }
    expect(excavationNdtStageFor(job('1'), 'pt', 'repair-2').role).toBe('Engineering');
    expect(nextRepairStage([], job('1')).persona).toBe('Engineering');
    const stages = buildStages(job('1'));
    expect(stages.find(stage => stage.id === 'tack')!.role).toBe('Engineering');
    expect(insertEngineeringHold(stages, 'tack', '', job('1')).find(stage => stage.id === 'engineering-hold')!.role).toBe('Engineering');
    expect(existing.role).toBe('NQC Inspector');
  });
});
