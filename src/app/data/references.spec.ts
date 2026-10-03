import { showsReferences } from './workflow';

describe('showsReferences', () => {
  it('shows on Root/Final NDT RT/UT and VT/5X, Layer NDT RT/UT, Repair and Excavation NDT', () => {
    for (const id of ['root-ndt-utrt', 'root-ndt-vt5x', 'layer-ndt-utrt', 'final-ndt-utrt', 'final-ndt-vt5x',
                      'repair', 'repair-2', 'excavation-ndt', 'excavation-ndt-3']) {
      expect(showsReferences(id)).withContext(id).toBeTrue();
    }
  });

  it('does not show on MT/PT, Layer NDT VT/5X or non-NDT steps', () => {
    for (const id of ['root-ndt-mtpt', 'layer-ndt-mtpt', 'final-ndt-mtpt', 'layer-ndt-vt5x',
                      'pre-fit', 'fit', 'fitup-insp', 'root-weld', '']) {
      expect(showsReferences(id)).withContext(id).toBeFalse();
    }
  });
});
