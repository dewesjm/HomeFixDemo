/* Weld Planning spreadsheets: the CSV export's columns and the Import Joints template */
import { CsvColumn } from '../shared/export-csv';
import { downloadXlsxTemplate } from '../shared/spreadsheet-import';
import { WeldJoint, NDT_FIELDS, JOINT_EXTRA_FIELDS } from '../data/weld-planning';

export const WELD_JOINT_CSV_COLUMNS: CsvColumn<WeldJoint>[] = [
  { header: 'XREFID', value: r => r.id },
  { header: 'Hull', value: r => r.hull },
  { header: 'Joint', value: r => r.joint },
  { header: 'Type', value: r => r.jointType },
  { header: 'Status', value: r => r.status },
  { header: 'Priority', value: r => r.priority },
  { header: 'Drawing', value: r => r.drawing },
  { header: 'Drawing Rev', value: r => r.drawingRev },
  { header: 'Joint Design', value: r => r.jointDesign },
  { header: 'Weld Type', value: r => r.weldType },
  { header: 'Pipe Size', value: r => r.pipeSize },
  { header: 'Wall Thickness', value: r => r.wallThickness },
  { header: 'Material 1', value: r => r.materialType1 },
  { header: 'Material 2', value: r => r.materialType2 },
  ...NDT_FIELDS.map(f => ({ header: f.label, value: (r: WeldJoint) => r[f.key] })),
  ...JOINT_EXTRA_FIELDS.map(f => ({ header: f.label, value: (r: WeldJoint) => r[f.key] })),
  { header: 'Notes', value: r => r.notes },
];

const WELD_JOINT_TEMPLATE_HEADERS = [
  'hull', 'joint', 'description',
  'status', 'priority', 'jointType', 'drawing', 'drawingRev',
  'jointDesign', 'weldType', 'pipeSize', 'wallThickness',
  'materialType1', 'materialType2', ...NDT_FIELDS.map(f => f.key),
  ...JOINT_EXTRA_FIELDS.filter(f => !f.readonly).map(f => f.key),
  'notes'
];

export function downloadWeldJointXlsxTemplate(): Promise<void> {
  return downloadXlsxTemplate(WELD_JOINT_TEMPLATE_HEADERS, 'weld-planning-import-template.xlsx');
}
