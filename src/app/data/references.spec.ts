import { showsReferences } from './workflow';

describe('showsReferences', () => {
  it('shows on RT/UT (Root, Layer, Final NDT) and Repair', () => {
    for (const id of ['root-ndt-utrt', 'layer-ndt-utrt', 'final-ndt-utrt', 'repair', 'repair-2']) {
      expect(showsReferences(id)).withContext(id).toBeTrue();
    }
  });

  it('does not show on VT/5X, MT/PT, Excavation NDT or non-NDT steps', () => {
    for (const id of ['root-ndt-vt5x', 'layer-ndt-vt5x', 'final-ndt-vt5x', 'root-ndt-mtpt', 'layer-ndt-mtpt',
                      'final-ndt-mtpt', 'excavation-ndt', 'excavation-ndt-2', 'pre-fit', 'fit', 'fitup-insp', 'root-weld', '']) {
      expect(showsReferences(id)).withContext(id).toBeFalse();
    }
  });
});
