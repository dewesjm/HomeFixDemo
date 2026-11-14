/* Serialize rows as CSV for Excel or download. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/* UTF-8 BOM for Excel, with fields quoted as needed. */
export function csvText<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const esc = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const head = columns.map(c => esc(c.header)).join(',');
  const body = rows.map(r => columns.map(c => esc(c.value(r))).join(',')).join('\r\n');
  const BOM = String.fromCharCode(0xfeff);   /* makes Excel read as UTF-8 */
  return BOM + head + '\r\n' + body;
}

export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  const blob = new Blob([csvText(columns, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
