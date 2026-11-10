/* roles a step routes to; Pipe Welding filters its queue by these */
export const ROLES = ['Fitting', 'Welding', 'Foreman', 'Inspector', 'NQC Inspector', 'O63 Records', 'O04 Records', 'Engineering', 'View'] as const;
export type Role = typeof ROLES[number];
export const DEFAULT_ROLE: Role = 'View';
