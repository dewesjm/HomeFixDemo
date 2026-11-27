/* The four per-joint-type settings tables: Structural has its own, starting from Pipe's rows for its steps plus
   ET, and saving one joint type's table leaves the other's alone. */
import { loadRoutingSettings } from './routing-settings';
import { getSignoffTypes, setSignoffTypes } from './signoff-types';
import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from './signoff-type-routing';
import { getStepFieldConfig, resetStepFieldConfig, setStepFieldConfig } from './signoff-type-forms';
import { buildStages } from '../weld-record/routing-logic/build-stages';
import { testJob } from '../testing/test-job';
import { STRUCTURAL_JOINTS } from './structural-joints';
import { seededWorkflow } from './seeded-workflow';
import { jointTypeFromParam, jointTypeParam } from '../weld-record/admin/joint-type-settings/joint-type-settings';

describe('settings per joint type', () => {
  afterEach(() => {
    localStorage.clear();
    setSignoffTypes('pipe', getSignoffTypes('pipe'));
    setSignoffTypeRoutingRows('pipe', getSignoffTypeRoutingRows('pipe'));
    resetStepFieldConfig('pipe');
    resetStepFieldConfig('structural');
    localStorage.clear();
  });

  it("Structural starts from Pipe's rows for its steps, plus ET; Pipe keeps its starting rows", () => {
    localStorage.clear();
    const ids = loadRoutingSettings('structural').map(s => s.id);
    expect(ids).toEqual(['fit', 'fitup-insp', 'root-weld', 'root-ndt-vt5x', 'root-ndt-mtpt', 'root-ndt-et', 'root-ndt-utrt',
      'final-weld', 'final-ndt-vt5x', 'final-ndt-mtpt', 'final-ndt-et', 'final-ndt-utrt', 'review-o63', 'review-o04', 'sold',
      'repair', 'excavation-ndt', 'engineering-hold']);
    const types = getSignoffTypes('structural').map(t => t.value);
    expect(types).toContain('et');
    for (const left of ['pre-fit', 'tack', 'deferred-tack', 'fitup-release', 'interim']) expect(types).not.toContain(left);
    expect(getSignoffTypeRoutingRows('structural').find(r => r.stepId === 'final-ndt-et')?.types).toEqual([{ type: 'et' }]);
    const forms = getStepFieldConfig('structural');
    expect(forms.find(d => d.typeId === 'fit')?.fields.some(f => f.key === 'deferTack')).toBeFalse();
    expect(forms.find(d => d.typeId === 'review-o63')?.fields.some(f => f.key === 'verifyPipeSize')).toBeFalse();
    expect(forms.some(d => d.typeId === 'et')).toBeTrue();
    expect(loadRoutingSettings('pipe').some(s => s.id === 'tack')).toBeTrue();
    expect(getSignoffTypes('pipe').some(t => t.value === 'et')).toBeFalse();
  });

  it("saving one joint type's table leaves the other's alone", () => {
    const pipeTypes = getSignoffTypes('pipe');
    setSignoffTypes('structural', [{ label: 'Fit', value: 'fit' }]);
    setSignoffTypeRoutingRows('structural', [{ stepId: 'fit', types: [{ type: 'fit', default: true }] }]);
    setStepFieldConfig('structural', [{ typeId: 'fit', fields: [{ key: 'comments' }] }]);
    expect(getSignoffTypes('structural').map(t => t.value)).toEqual(['fit']);
    expect(getSignoffTypes('pipe')).toEqual(pipeTypes);
    expect(getSignoffTypeRoutingRows('pipe').length).toBeGreaterThan(1);
    expect(getStepFieldConfig('pipe').some(d => d.typeId === 'vt')).toBeTrue();
  });

  it('a structural joint gets its routings from the Structural table: no NQC rows, ET when asked for', () => {
    localStorage.clear();
    const structural = buildStages(testJob({ jointType: 'structural', etFinal: 'Yes' }));
    expect(structural.map(s => s.id)).toEqual(['fit', 'fitup-insp', 'root-weld', 'root-ndt-vt5x', 'final-weld', 'final-ndt-vt5x',
      'final-ndt-et', 'review-o63', 'sold']);
    expect(structural.every(s => s.jointType === 'structural')).toBeTrue();
    expect(buildStages(testJob({ jointType: 'structural', nInd: '1' })).map(s => s.id)).toContain('fitup-insp');
    const pipe = buildStages(testJob());
    expect(pipe.length).toBeGreaterThan(0);
    expect(pipe.every(s => s.jointType === 'pipe')).toBeTrue();
  });

  it('every sample structural joint seeds a workflow, some with ET and some partway through', () => {
    localStorage.clear();
    const flows = STRUCTURAL_JOINTS.map(j => seededWorkflow(j));
    expect(flows.some(wf => wf.stages.some(s => s.id.endsWith('-ndt-et')))).toBeTrue();
    expect(flows.some(wf => wf.stages.some(s => s.signed))).toBeTrue();
    expect(flows.every(wf => wf.stages.every(s => !s.id.startsWith('nqc-')))).toBeTrue();
  });

  it('the page URL names Structural; no type is Pipe', () => {
    expect(jointTypeFromParam(null)).toBe('pipe');
    expect(jointTypeFromParam('structural')).toBe('structural');
    expect(jointTypeFromParam('non-numbered')).toBe('pipe');
    expect(jointTypeParam('pipe')).toBeNull();
    expect(jointTypeParam('structural')).toBe('structural');
  });
});
