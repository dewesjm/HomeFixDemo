import { isAdminTableUrl } from './admin-table-scope';

describe('Admin table route scope', () => {
  it('includes each system and nested admin editors, excluding ordinary pages and query links', () => {
    for (const url of ['/admin/repair-codes', '/admin/signoff-fields', '/weld-planning/admin',
      '/weld-engineering/admin/sections', '/weld-engineering/admin/abc/edit', '/admin;mode=edit/routing?tab=2'])
      expect(isAdminTableUrl(url)).withContext(url).toBeTrue();
    for (const url of ['/pipe-search', '/jobs/abc', '/weld-planning', '/weld-engineering',
      '/administration', '/jobs/abc?return=/admin/routing', '/history#admin'])
      expect(isAdminTableUrl(url)).withContext(url).toBeFalse();
  });
});
