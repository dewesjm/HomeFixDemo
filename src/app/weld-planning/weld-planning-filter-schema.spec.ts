import { weldJoints } from './weld-planning.data';
import { applyFilters } from './weld-planning-filter-schema';

describe('weld-planning filter schema', () => {
  const rows = weldJoints();

  it('no values: every joint', () => {
    expect(applyFilters(rows, {})).toBe(rows);
    expect(applyFilters(rows, { hull: [], joint: null, rtRoot: '' })).toBe(rows);
  });

  it('text contains, any case', () => {
    const part = rows[0].joint.slice(0, 4).toLowerCase();
    const hits = applyFilters(rows, { joint: part });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(r => r.joint.toLowerCase().includes(part))).toBeTrue();
  });

  it('multiselect is any of the picked values; fields are AND\'d', () => {
    const [a, b] = [...new Set(rows.map(r => r.status))];
    expect(applyFilters(rows, { status: [a, b] }).length).toBe(rows.filter(r => r.status === a || r.status === b).length);
    const hull = rows[0].hull;
    expect(applyFilters(rows, { status: [a], hull: [hull] })).toEqual(rows.filter(r => r.status === a && r.hull === hull));
  });

  it('a date range includes its end day, and needs a start date to filter', () => {
    const created = new Date(rows[0].createdAt);
    const day = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    expect(applyFilters(rows, { createdAt: [day, day] })).toContain(rows[0]);
    expect(applyFilters(rows, { createdAt: [null, new Date(2000, 0, 1)] })).toBe(rows);
  });
});
