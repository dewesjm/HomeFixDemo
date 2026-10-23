import { typeChange } from './type-change';
import { stageFromTemplate, nextRepairStage, excavationNdtStage } from '../../routing/added-steps';

describe('Repair round Type changes', () => {
  it('clears entered Repair values but retains the round’s rejecting inspection', () => {
    const repair = stageFromTemplate(nextRepairStage([{ id: 'repair' }]), {
      originPhase: 'final', originStageId: 'nqc-final-ndt-mtpt', originInspectionType: 'pt', repairType: 'cut',
    });
    const change = typeChange('Welding', repair, 'repair');
    expect(change.inputs).toEqual({ originPhase: 'final', originStageId: 'nqc-final-ndt-mtpt', originInspectionType: 'pt' });
  });
  it('keeps the resolved exception outcome while loading the shared form', () => {
    const excavation = stageFromTemplate(excavationNdtStage('5x', 'repair-2'), { typeChangedFromPtTo5x: 'yes', procedureUsed: 'old' });
    const change = typeChange('Welding', excavation, '5x');
    expect(change.inputs).toEqual({ typeChangedFromPtTo5x: 'yes' });
    expect(change.signoffType).toBe('5x');
    expect(change.fields?.map(f => f.key)).toContain('procedureUsed');
    expect(change.fields?.map(f => f.key)).not.toContain('typeChangedFromPtTo5x');
  });
});
