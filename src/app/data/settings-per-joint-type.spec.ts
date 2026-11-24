/* The four per-joint-type settings tables: Structural has its own, starting empty, and saving one joint
   type's table leaves the other's alone. */
import { loadRoutingSettings } from './routing-settings';
import { getSignoffTypes, setSignoffTypes } from './signoff-types';
import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from './signoff-type-routing';
import { getStepFieldConfig, resetStepFieldConfig, setStepFieldConfig } from './signoff-type-forms';
import { buildStages } from '../weld-record/routing-logic/build-stages';
import { testJob } from '../testing/test-job';
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

  it('Structural starts with empty tables; Pipe keeps its starting rows', () => {
    localStorage.clear();
    expect(loadRoutingSettings('structural')).toEqual([]);
    expect(getSignoffTypes('structural')).toEqual([]);
    expect(getSignoffTypeRoutingRows('structural')).toEqual([]);
    expect(getStepFieldConfig('structural')).toEqual([]);
    expect(loadRoutingSettings('pipe').length).toBeGreaterThan(0);
    expect(getSignoffTypes('pipe').length).toBeGreaterThan(0);
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

  it('a structural joint gets its routings from the Structural table (none yet)', () => {
    localStorage.clear();
    expect(buildStages(testJob({ jointType: 'structural' }))).toEqual([]);
    const pipe = buildStages(testJob());
    expect(pipe.length).toBeGreaterThan(0);
    expect(pipe.every(s => s.jointType === 'pipe')).toBeTrue();
  });

  it('the page URL names Structural; no type is Pipe', () => {
    expect(jointTypeFromParam(null)).toBe('pipe');
    expect(jointTypeFromParam('structural')).toBe('structural');
    expect(jointTypeFromParam('non-numbered')).toBe('pipe');
    expect(jointTypeParam('pipe')).toBeNull();
    expect(jointTypeParam('structural')).toBe('structural');
  });
});
