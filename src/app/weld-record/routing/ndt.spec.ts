import { ndtLayerType } from './ndt';

describe('ndtLayerType', () => {
  it('names what an inspection step inspects', () => {
    expect(ndtLayerType('root-ndt-utrt')).toBe('Root');
    expect(ndtLayerType('layer-ndt-vt5x')).toBe('Layer');
    expect(ndtLayerType('final-ndt-mtpt')).toBe('Final');
    expect(ndtLayerType('excavation-ndt-2')).toBe('Excavation');
    expect(ndtLayerType('fitup-insp')).toBe('Fit');
    expect(ndtLayerType('nqc-fitup-insp')).toBe('Fit');
    expect(ndtLayerType('root')).toBe('');
  });
});
