/* rows to CSV string, triggers a browser download */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/* CSV download, UTF-8 BOM for Excel, fields quoted as needed */
export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  const esc = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const head = columns.map(c => esc(c.header)).join(',');
  const body = rows.map(r => columns.map(c => esc(c.value(r))).join(',')).join('\r\n');
  const BOM = String.fromCharCode(0xfeff);   /* makes Excel read as UTF-8 */
  const csv = BOM + head + '\r\n' + body;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
