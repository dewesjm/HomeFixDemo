import { formInputFields } from '../../signoff-definition/form-fields';
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
  it('keeps original inspection context while loading the selected shared form', () => {
    const excavation = stageFromTemplate(excavationNdtStage('5x', 'repair-2'), { originInspectionType: 'pt', procedureUsed: 'old' });
    const change = typeChange('Welding', excavation, '5x');
    expect(change.inputs).toEqual({ originInspectionType: 'pt' });
    expect(change.signoffType).toBe('5x');
    expect(formInputFields({ ...excavation, ...change }).map(f => f.key)).toContain('procedureUsed');
    expect(formInputFields({ ...excavation, ...change }).map(f => f.key)).not.toContain('originInspectionType');
  });
});
