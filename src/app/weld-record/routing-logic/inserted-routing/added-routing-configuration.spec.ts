import { addedRoutingSetup } from './added-routing-configuration';
import { StageTemplate } from '../../model/stage-template';
import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from '../../../data/signoff-type-routing';
import { getSignoffTypes, setSignoffTypes } from '../../../data/signoff-types';
import { getStepFieldConfig, setStepFieldConfig, resetStepFieldConfig } from '../../../data/signoff-type-forms';

describe('ordinary inserted routing setup', () => {
  const template: StageTemplate = { id: 'extra', label: 'Extra', required: true, classification: 'added', lifecycle: 'ordinary', persona: 'Inspector', status: 'draft' };
  beforeEach(() => { localStorage.clear(); resetStepFieldConfig('pipe'); });
  afterEach(() => {
    localStorage.clear();
    resetStepFieldConfig('pipe');
    setSignoffTypeRoutingRows('pipe', getSignoffTypeRoutingRows('pipe'));
    setSignoffTypes('pipe', getSignoffTypes('pipe'));
  });

  it('requires an offered, known Type and its form', () => {
    expect(addedRoutingSetup('pipe', template).errors.join(' ')).toContain('Offer at least one');
    setSignoffTypeRoutingRows('pipe', [...getSignoffTypeRoutingRows('pipe'), { stepId: 'extra', types: [{ type: 'unknown' }] }]);
    expect(addedRoutingSetup('pipe', template).errors.join(' ')).toContain('Unknown Type');
    setSignoffTypes('pipe', [...getSignoffTypes('pipe'), { value: 'unknown', label: 'Extra Type' }]);
    expect(addedRoutingSetup('pipe', template).errors.join(' ')).toContain('Configure a form');
    setStepFieldConfig('pipe', [...getStepFieldConfig('pipe'), { typeId: 'unknown', fields: [{ key: 'comments' }] }]);
    expect(addedRoutingSetup('pipe', template).errors).toEqual([]);
  });

  it('rejects a Type signing another routing and multiple defaults', () => {
    setSignoffTypeRoutingRows('pipe', [...getSignoffTypeRoutingRows('pipe'), { stepId: 'extra', types: [{ type: 'final-weld', default: true }, { type: 'vt', default: true }] }]);
    const errors = addedRoutingSetup('pipe', { ...template, persona: 'View' }).errors.join(' ');
    expect(errors).toContain('another routing');
    expect(errors).toContain('at most one default');
    expect(errors).toContain('signing persona');
  });
});
