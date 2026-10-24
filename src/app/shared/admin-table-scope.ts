/* Admin routes in each system share the same table presentation. */
export function isAdminTableUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0];
  return path.split('/').some(segment => segment.split(';', 1)[0] === 'admin');
}
