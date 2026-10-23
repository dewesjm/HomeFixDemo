import { ndtLayerType } from './ndt';

describe('ndtLayerType', () => {
  it('names the weld activity an NDT step inspects', () => {
    expect(ndtLayerType('root-ndt-utrt')).toBe('Root');
    expect(ndtLayerType('layer-ndt-vt5x')).toBe('Layer');
    expect(ndtLayerType('final-ndt-mtpt')).toBe('Final');
    expect(ndtLayerType('excavation-ndt-2')).toBe('Excavation');
    expect(ndtLayerType('fitup-insp')).toBe('');
    expect(ndtLayerType('root')).toBe('');
  });
});
