import { availableRuleTargets, resolveRuleTarget } from './rule-targets';
import { stageFromTemplate, nextRepairStage, excavationNdtStage } from '../inserted-routing/added-routings';
import { testJob } from '../../../testing/test-job';

describe('Round-relative routing targets', () => {
  it('resolves a later Excavation round through its own Repair', () => {
    const first = stageFromTemplate('pipe', nextRepairStage([], testJob()), { originStageId: 'root-ndt-vt5x', originPhase: 'root' });
    const second = stageFromTemplate('pipe', nextRepairStage([first], testJob()), { originStageId: 'nqc-final-ndt-mtpt', originPhase: 'final' });
    const exc = stageFromTemplate('pipe', excavationNdtStage('pt', second.id, testJob()));
    const stages = [first, second, exc];
    expect(resolveRuleTarget(stages, exc, 'own-repair')).toBe('repair-2');
    expect(resolveRuleTarget(stages, exc, 'rejecting-ndt')).toBe('nqc-final-ndt-mtpt');
    expect(resolveRuleTarget(stages, exc, 'rejecting-utrt')).toBe('final-ndt-utrt');
    expect(resolveRuleTarget(stages, exc, 'rejecting-vt5x')).toBe('final-ndt-vt5x');
    expect(resolveRuleTarget(stages, exc, 'rejecting-nqc-utrt')).toBe('nqc-final-ndt-utrt');
    expect(resolveRuleTarget(stages, exc, 'rejecting-nqc-vt5x')).toBe('nqc-final-ndt-vt5x');
  });
  it('offers only targets supported by a routing’s context', () => {
    expect(availableRuleTargets('fit').map(t => t.id)).not.toContain('add-excavation-ndt');
    expect(availableRuleTargets('repair-2').map(t => t.id)).toContain('add-excavation-ndt');
    expect(availableRuleTargets('excavation-ndt-2').map(t => t.id)).toContain('own-repair');
    expect(availableRuleTargets('root-ndt-mtpt').map(t => t.id)).toContain('repair');
  });
});
