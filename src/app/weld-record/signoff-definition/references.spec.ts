import { showsReferences } from './stage-rules';
import { setStepFieldConfig, resetStepFieldConfig, DEFAULT_TYPE_DEFINITIONS } from './step-field-config';

describe('showsReferences', () => {
  afterEach(() => resetStepFieldConfig());

  it('shows on RT, UT and Repair by default, on every step and round that offers them', () => {
    for (const id of ['rt', 'ut', 'repair']) expect(showsReferences(id)).withContext(id).toBeTrue();
    for (const step of [{ id: 'root-ndt-utrt', signoffType: 'rt' }, { id: 'nqc-final-ndt-utrt', signoffType: 'ut' }, { id: 'repair-2', signoffType: 'repair' }]) {
      expect(showsReferences(step)).withContext(step.id).toBeTrue();
    }
  });

  it('does not show on VT, 5X, MT, PT, Excavation NDT or non-NDT Types by default', () => {
    for (const id of ['vt', '5x', 'mt', 'pt', 'excavation-ndt', 'pre-fit', 'fit', 'fitup-insp', 'root', '']) {
      expect(showsReferences(id)).withContext(id).toBeFalse();
    }
    expect(showsReferences({ id: 'excavation-ndt-2', signoffType: 'rt' })).toBeTrue();
  });

  it('follows the definition when References is ticked or unticked', () => {
    setStepFieldConfig([
      ...DEFAULT_TYPE_DEFINITIONS.filter(a => a.typeId !== 'rt' && a.typeId !== 'sold'),
      { typeId: 'rt', fields: [] },
      { typeId: 'sold', fields: [{ key: 'references' }] },
    ]);
    expect(showsReferences('rt')).toBeFalse();
    expect(showsReferences('sold')).toBeTrue();
  });
});
