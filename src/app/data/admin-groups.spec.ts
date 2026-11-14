import { permissionSummary } from './admin-groups';

describe('permissionSummary', () => {
  it('lists allowed permissions by category in permission-list order', () => {
    expect(permissionSummary(['force-routing', 'view', 'manage-routing', 'edit-fabrication'])).toEqual([
      { category: 'Access', labels: ['Search records'] },
      { category: 'Routing', labels: ['Manage routing', 'Routing Override'] },
      { category: 'Data Entry', labels: ['Edit fabrication fields'] },
    ]);
  });

  it('is empty when nothing is allowed', () => {
    expect(permissionSummary([])).toEqual([]);
  });
});
