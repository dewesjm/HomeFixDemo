import { showsReferences } from './stage-rules';
import { setStepFieldConfig, resetStepFieldConfig, DEFAULT_STEP_FIELD_ACTIVATIONS } from './step-field-config';

describe('showsReferences', () => {
  afterEach(() => resetStepFieldConfig());

  it('shows on RT/UT (Root, Layer, Final NDT) and Repair by default', () => {
    for (const id of ['root-ndt-utrt', 'layer-ndt-utrt', 'final-ndt-utrt', 'nqc-root-ndt-utrt', 'repair', 'repair-2']) {
      expect(showsReferences(id)).withContext(id).toBeTrue();
    }
  });

  it('does not show on 5X/VT, MT/PT, Excavation NDT or non-NDT steps by default', () => {
    for (const id of ['root-ndt-vt5x', 'layer-ndt-vt5x', 'final-ndt-vt5x', 'root-ndt-mtpt', 'layer-ndt-mtpt',
                      'final-ndt-mtpt', 'excavation-ndt', 'excavation-ndt-2', 'pre-fit', 'fit', 'fitup-insp', 'root-weld', '']) {
      expect(showsReferences(id)).withContext(id).toBeFalse();
    }
  });

  it('follows the definition when References is ticked or unticked', () => {
    setStepFieldConfig([
      ...DEFAULT_STEP_FIELD_ACTIVATIONS.filter(a => a.stepId !== 'root-ndt-utrt' && a.stepId !== 'sold'),
      { stepId: 'root-ndt-utrt', fields: [] },
      { stepId: 'sold', fields: [{ key: 'references' }] },
    ]);
    expect(showsReferences('root-ndt-utrt')).toBeFalse();
    expect(showsReferences('sold')).toBeTrue();
  });
});
