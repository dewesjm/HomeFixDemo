import { inspectingLabel } from './built-in-step-rules';

describe('inspectingLabel', () => {
  it('names what an inspection step inspects', () => {
    expect(inspectingLabel('root-ndt-utrt')).toBe('Root');
    expect(inspectingLabel('layer-ndt-vt5x')).toBe('Layer');
    expect(inspectingLabel('final-ndt-mtpt')).toBe('Final');
    expect(inspectingLabel('excavation-ndt-2')).toBe('Excavation');
    expect(inspectingLabel('fitup-insp')).toBe('Fit');
    expect(inspectingLabel('nqc-fitup-insp')).toBe('Fit');
    expect(inspectingLabel('root')).toBe('');
  });
});
