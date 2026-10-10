import { permissionSummary } from './admin-groups';

describe('permissionSummary', () => {
  it('lists allowed permissions by category in permission-list order', () => {
    expect(permissionSummary(['signoff-root', 'edit-fabrication', 'signoff-tack'])).toEqual([
      { category: 'Sign-off', labels: 'Tack, Root' },
      { category: 'Data Entry', labels: 'Edit fabrication fields' },
    ]);
  });

  it('is empty when nothing is allowed', () => {
    expect(permissionSummary([])).toEqual([]);
  });
});
