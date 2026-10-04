import { JOBS, Job } from '../jobs';
import { buildStages, nextRepairStage, excavationNdtStage, stageFromTemplate, WorkflowStage } from '../workflow';
import { routePreviewLabel, SignoffPreview } from './route-preview';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, ...over });
const noPreview: SignoffPreview = () => ({ target: undefined, reasons: [] });

describe('joint-form route-preview', () => {
  const j = job({ refitNumber: '02', materialType1: '02-CS', materialType2: '02-CS' });
  const stages = buildStages(j);
  const repair = (inputs: Record<string, string>) => stageFromTemplate(nextRepairStage(stages), { originPhase: 'root', originStageId: 'root-ndt-vt5x', ...inputs });

  it('Repair: says where each Repair Code routes, Allowable thickness exceeded first', () => {
    expect(routePreviewLabel(j, stages, repair({ repairType: 'grind' }), null, noPreview)).toContain('Why: Repair Code is Grind Only.');
    expect(routePreviewLabel(j, stages, repair({ repairType: 'cut' }), null, noPreview)).toContain('Refit # goes up to 03');
    expect(routePreviewLabel(j, stages, repair({ repairType: 'weld-repair' }), null, noPreview)).toContain('Excavation NDT');
    expect(routePreviewLabel(j, stages, repair({ repairType: 'grind', allowableThicknessExceeded: 'yes' }), null, noPreview))
      .toContain('Allowable thickness exceeded is checked');
    expect(routePreviewLabel(j, stages, repair({}), null, noPreview)).toBe('');
  });

  it('Excavation NDT routes back to the original inspection', () => {
    const rep = repair({ repairType: 'weld-repair', originInspectionType: 'vt' });
    const exc = stageFromTemplate(excavationNdtStage('vt', rep.id));
    expect(routePreviewLabel(j, [...stages, rep, exc], exc, null, noPreview)).toContain('On SAT, this routes back to');
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
