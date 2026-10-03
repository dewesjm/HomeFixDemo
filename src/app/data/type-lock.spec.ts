import { typeLockReason, WorkflowStage } from './workflow';
import { Job } from './jobs';

describe('typeLockReason', () => {
  const job = { ndtEach: '5X' } as Job;
  const stage = (id: string, options = 1, role = 'Inspector') =>
    ({ id, role, routingOptions: Array.from({ length: options }, (_, i) => ({ label: `T${i}`, value: `t${i}` })) }) as unknown as WorkflowStage;

  it('names NDT Each on a Layer NDT step with one Type', () => {
    expect(typeLockReason(stage('layer-ndt-vt5x'), job)).toBe('Type is set by NDT Each (5X).');
  });

  it('explains Excavation NDT with one Type', () => {
    expect(typeLockReason(stage('excavation-ndt-2'), job)).toBe('Type is the same inspection that rejected the joint.');
  });

  it('is blank when the Type can be picked or the step is not locked', () => {
    expect(typeLockReason(stage('layer-ndt-mtpt', 2), job)).toBe('');
    expect(typeLockReason(stage('root-ndt-vt5x'), job)).toBe('');
    expect(typeLockReason(stage('layer-ndt-vt5x', 1, 'Welder'), job)).toBe('');
  });
});
