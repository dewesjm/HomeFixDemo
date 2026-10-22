import { isRoutingLockedField, isDefinitionLockedField, definitionFieldNote } from './stage-rules';

describe('stage rules', () => {
  it('Release to welding and Defer Tack stay locked for Correct but can come off a definition', () => {
    expect(isRoutingLockedField('fitup-insp', 'releaseToWelding')).toBe(true);
    expect(isDefinitionLockedField('fitup-insp', 'releaseToWelding')).toBe(false);
    expect(isRoutingLockedField('fit', 'deferTack')).toBe(true);
    expect(isDefinitionLockedField('fit', 'deferTack')).toBe(false);
    expect(isDefinitionLockedField('repair', 'repairType')).toBe(true);
  });

  it('notes what a routing-read field does on its own step, and that routing ignores it elsewhere', () => {
    expect(definitionFieldNote('fit', 'deferTack')).toContain('Unticked');
    expect(definitionFieldNote('tack', 'deferTack')).toContain('routing ignores it');
    expect(definitionFieldNote('nqc-fitup-insp', 'releaseToWelding')).toContain('Unticked');
    expect(definitionFieldNote('root-ndt-vt5x', 'releaseToWelding')).toContain('routing ignores it');
    expect(definitionFieldNote('fit-weld-buildup', 'deferTack')).toBe('');
    expect(definitionFieldNote('tack', 'weldProcedure')).toBe('');
  });
});
