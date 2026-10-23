import { JOBS, Job } from '../../data/jobs';
import { buildStages } from './build-stages';
import { nextRepairStage, excavationNdtStage, stageFromTemplate } from './added-steps';
import { WorkflowStage } from '../model/workflow-types';
import { routePreviewLabel, SignoffPreview } from './route-preview';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, nInd: '3', ...over });
const noPreview: SignoffPreview = () => ({ target: undefined, reasons: [] });

describe('joint-form route-preview', () => {
  const j = job({ refitNumber: '02', materialType1: '02-CS', materialType2: '02-CS' });
  const stages = buildStages(j);
  const repair = (inputs: Record<string, string>) => stageFromTemplate(nextRepairStage(stages), { originPhase: 'root', originStageId: 'root-ndt-vt5x', ...inputs });

  it('Repair and Excavation use the actual dry run and its rule explanation', () => {
    const rep = repair({ repairType: 'grind' });
    const exc = stageFromTemplate(excavationNdtStage('vt', rep.id));
    for (const st of [rep, exc]) {
      const preview: SignoffPreview = () => ({ target: stages.find(s => s.id === 'fit'), reasons: ['edited table rule'] });
      const label = routePreviewLabel(j, [...stages, rep, exc], st, st.id, preview);
      expect(label).toContain('Fit');
      expect(label).toContain('edited table rule');
      expect(routePreviewLabel(j, [...stages, rep, exc], st, 'tack', preview)).toBe('');
    }
  });

  it('other steps: nothing unless it is the current step; otherwise the dry run\'s target and reasons', () => {
    const fit = stages.find(s => s.id === 'fit')!;
    const tack = stages.find(s => s.id === 'tack')!;
    expect(routePreviewLabel(j, stages, fit, 'tack', noPreview)).toBe('');
    expect(routePreviewLabel(j, stages, { ...fit, signed: true } as WorkflowStage, 'fit', noPreview)).toBe('');
    const toTack: SignoffPreview = () => ({ target: tack, reasons: ['because'] });
    expect(routePreviewLabel(j, stages, fit, 'fit', toTack)).toContain('On signoff, this routes to Tack. Why: because.');
    expect(routePreviewLabel(j, stages, fit, 'fit', noPreview)).toContain('the joint is complete');
  });

  it('a SAT/UNSAT step with nothing picked shows both outcomes', () => {
    const insp = stages.find(s => s.id === 'fitup-insp')!;
    const label = routePreviewLabel(j, stages, insp, 'fitup-insp', r => ({ target: r === 'unsat' ? stages.find(s => s.id === 'fit') : undefined, reasons: [] }));
    expect(label).toContain('On SAT, the joint is complete');
    expect(label).toContain('On UNSAT, this routes back to Fit');
  });
});
