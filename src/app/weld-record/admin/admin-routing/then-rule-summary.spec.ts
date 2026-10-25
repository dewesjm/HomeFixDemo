import { thenRuleSummary } from './then-rule-summary';

describe('Then go to summaries', () => {
  it('separates the thickness condition from its destination without repeating the inspection requirement', () => {
    const text = thenRuleSummary({ when: [{ field: 'self.allowableThicknessExceededN1', op: 'is', values: ['yes'] }], to: 'rejecting-utrt' }, [{
      key: 'self.allowableThicknessExceededN1',
      label: 'This routing: Allowable thickness has been exceeded (Nuclear Indicator 1) - Volumetric inspection (UT/RT) is required',
      values: ['yes'], valueLabel: () => 'Yes', get: () => 'yes',
    }], 'Rejecting phase’s UT/RT');
    expect(text).toBe('If Allowable thickness has been exceeded (Nuclear Indicator 1) is Yes → Then go to Rejecting phase’s UT/RT');
  });

  it('describes an unconditional destination without an empty If', () => {
    expect(thenRuleSummary({ when: [], to: 'fit' }, [], 'Fit')).toBe('Always → Then go to Fit');
  });
});
