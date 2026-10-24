import { StageTemplate } from '../model/workflow-types';
import { insertionRelativeTargets } from './insertion-target-options';
import { insertionTarget } from './instance-identity';

describe('insertion relative destination choices', () => {
  const target: StageTemplate = { id: 'extra', label: 'Extra', required: true, classification: 'added', lifecycle: 'ordinary' };
  const source = (id: string): StageTemplate => ({ id, label: id, required: true, thenRules: [{ when: [], to: insertionTarget('extra') }] });
  const choices = (sources: StageTemplate[]) => insertionRelativeTargets('extra', [target, ...sources]).map(t => t.id);
  it('offers continuation and source without inventing repair context', () => {
    expect(choices([])).toEqual(['continue', 'insertion-source']);
    expect(choices([source('fit')])).not.toContain('rejecting-ndt');
  });
  it('offers phase returns for inspection sources, and Own Repair only with parent context', () => {
    expect(choices([source('nqc-root-ndt-mtpt')])).toContain('rejecting-vt5x');
    expect(choices([source('root-ndt-mtpt')])).not.toContain('own-repair');
    expect(choices([source('repair')])).toContain('own-repair');
    expect(choices([source('repair'), source('fit')])).not.toContain('own-repair');
  });
  it('inherits context through nested sources and stops cycles', () => {
    const nested = { ...target, id: 'nested', thenRules: [{ when: [], to: insertionTarget('extra') }] };
    expect(choices([nested, { ...source('repair'), thenRules: [{ when: [], to: insertionTarget('nested') }] }])).toContain('own-repair');
    expect(choices([nested, { ...target, thenRules: [{ when: [], to: insertionTarget('nested') }] }])).not.toContain('own-repair');
  });
});
