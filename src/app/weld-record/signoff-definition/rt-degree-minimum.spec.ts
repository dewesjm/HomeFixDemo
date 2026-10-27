import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { rtDegreeRequired } from './rt-degree-minimum';

const rt = (id: string) => ({ id, signoffType: 'rt', inspectionType: 'rt', inputs: {} }) as unknown as WorkflowStage;

describe('RT degree minimum', () => {
  beforeEach(() => localStorage.clear());

  it("the RT form's default rule: Root from RT Degree Root, Final from RT Degree Final, Layer none", () => {
    const j = { rtRoot: '360', rtFinal: '60' } as Job;
    expect(rtDegreeRequired(j, rt('root-ndt-utrt'))).toBe('360');
    expect(rtDegreeRequired(j, rt('nqc-final-ndt-utrt'))).toBe('60');
    expect(rtDegreeRequired(j, rt('layer-ndt-mtpt'))).toBe('');
    expect(rtDegreeRequired({ rtRoot: 'NA' } as Job, rt('root-ndt-utrt'))).toBe('');
  });
});
