import { addedRoutingSetup } from './added-routing-configuration';
import { StageTemplate } from '../../model/stage-template';
import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from '../../../data/signoff-type-routing';
import { getSignoffTypes, setSignoffTypes } from '../../../data/signoff-types';
import { getStepFieldConfig, setStepFieldConfig, resetStepFieldConfig } from '../../../data/signoff-type-forms';

describe('ordinary inserted routing setup', () => {
  const template: StageTemplate = { id: 'extra', label: 'Extra', required: true, classification: 'added', lifecycle: 'ordinary', role: 'Inspector', status: 'draft' };
  beforeEach(() => { localStorage.clear(); resetStepFieldConfig(); });
  afterEach(() => { localStorage.clear(); resetStepFieldConfig(); });

  it('requires an offered, known Type and its form', () => {
    expect(addedRoutingSetup(template).errors.join(' ')).toContain('Offer at least one');
    setSignoffTypeRoutingRows([...getSignoffTypeRoutingRows(), { stepId: 'extra', types: [{ type: 'unknown' }] }]);
    expect(addedRoutingSetup(template).errors.join(' ')).toContain('Unknown Type');
    setSignoffTypes([...getSignoffTypes(), { value: 'unknown', label: 'Extra Type' }]);
    expect(addedRoutingSetup(template).errors.join(' ')).toContain('Configure a form');
    setStepFieldConfig([...getStepFieldConfig(), { typeId: 'unknown', fields: [{ key: 'comments' }] }]);
    expect(addedRoutingSetup(template).errors).toEqual([]);
  });

  it('rejects a Type signing another routing and multiple defaults', () => {
    setSignoffTypeRoutingRows([...getSignoffTypeRoutingRows(), { stepId: 'extra', types: [{ type: 'final-weld', default: true }, { type: 'vt', default: true }] }]);
    const errors = addedRoutingSetup({ ...template, role: 'View' }).errors.join(' ');
    expect(errors).toContain('another routing');
    expect(errors).toContain('at most one default');
    expect(errors).toContain('signing persona');
  });
});
