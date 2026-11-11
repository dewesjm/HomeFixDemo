/* Procedure spreadsheets: the CSV export's columns (Admin > Manage Procedures) and the import
   template (Admin > Load Procedures) */
import { CsvColumn } from '../../shared/export-csv';
import { downloadXlsxTemplate } from '../../shared/spreadsheet-import';
import { Procedure } from '../../data/procedures';
import { OVERRIDE_PARTS, type ExtraField, type ExtraFieldValue, type OverrideValue, type ProcedureSection } from './procedure-sections';
import { extraValueText, fieldChoices, isOverride } from './procedure-field-values';

const HEADER_CSV_COLUMNS: CsvColumn<Procedure>[] = [
  { header: 'GWP', value: r => r.gwp },
  { header: 'WTN', value: r => r.wtn },
  { header: 'Revision', value: r => r.revision },
  { header: 'Effective Date', value: r => r.effectiveDate },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'Weld Process', value: r => r.weldProcess },
  { header: 'Process Type', value: r => r.processType },
  { header: 'Application', value: r => r.application },
];

const TAIL_CSV_COLUMNS: CsvColumn<Procedure>[] = [
  { header: 'Rules', value: r => r.rules.join('; ') },
  { header: 'Conditions', value: r => r.conditions.join('; ') },
  { header: 'Revision History', value: r => r.revisionHistory.map(rv => `Revision ${rv.revision} (${rv.date}): ${rv.note}`).join('; ') },
];

/* One spreadsheet column per section field (an override group gets one per part). The export and
   Load Procedures use the same columns, so an export can be loaded back: id is the template
   heading, header the export heading, and aliases older headings the import still accepts. */
export interface SectionColumn {
  id: string;
  header: string;
  aliases: string[];
  sectionId: string;
  field: ExtraField;
  part?: keyof OverrideValue;
}

export function sectionColumns(sections: ProcedureSection[]): SectionColumn[] {
  return sections.flatMap(s => s.fields.flatMap((f): SectionColumn[] => f.type === 'override'
    ? OVERRIDE_PARTS.map(part => ({
        id: `${f.key}.${part.key}`, header: `${s.name}: ${f.label} ${part.label}`,
        aliases: [`Override ${part.label}`], sectionId: s.id, field: f, part: part.key,
      }))
    : [{ id: f.key, header: `${s.name}: ${f.label}`, aliases: [f.label], sectionId: s.id, field: f }]));
}

/* a value as spreadsheet text: pick-many lists are '; ' separated labels */
export function columnText(col: SectionColumn, value: ExtraFieldValue | undefined): string {
  if (col.part) return isOverride(value) ? value[col.part] ?? '' : '';
  if (Array.isArray(value)) {
    const choices = fieldChoices(col.field, value);
    return value.map(v => choices.find(c => c.value === v)?.label ?? v).join('; ');
  }
  return extraValueText(col.field, value);
}

/* the header columns, one per section field (blank on a procedure without that section), then
   Rules, Conditions and Revision History */
export function procedureCsvColumns(sections: ProcedureSection[]): CsvColumn<Procedure>[] {
  return [
    ...HEADER_CSV_COLUMNS,
    ...sectionColumns(sections).map(col => ({
      header: col.header,
      value: (r: Procedure) => r.sectionIds.includes(col.sectionId) ? columnText(col, r.extraFields[col.field.key]) : '',
    })),
    ...TAIL_CSV_COLUMNS,
  ];
}

export const PROCEDURE_HEADER_TEMPLATE_COLUMNS = [
  'gwp', 'wtn', 'title', 'status', 'weldProcess', 'revision', 'effectiveDate', 'processType', 'application',
];

export function downloadProcedureXlsxTemplate(sections: ProcedureSection[]): Promise<void> {
  return downloadXlsxTemplate(
    [...PROCEDURE_HEADER_TEMPLATE_COLUMNS, ...sectionColumns(sections).map(c => c.id), 'rules', 'conditions'],
    'procedures-import-template.xlsx'
  );
}
