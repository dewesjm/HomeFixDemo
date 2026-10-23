/* Procedure spreadsheets: the CSV export's columns (Admin > Manage Procedures) and the import
   template (Admin > Load Procedures) */
import { CsvColumn } from '../shared/export-csv';
import { downloadXlsxTemplate } from '../shared/spreadsheet-import';
import { Procedure } from '../data/procedures';
import { ProcedureSection, extraValueText } from './procedure-sections';

const PROCEDURE_CSV_COLUMNS: CsvColumn<Procedure>[] = [
  { header: 'WPS', value: r => r.id },
  { header: 'WPS Rev', value: r => r.wpsRev },
  { header: 'Effective Date', value: r => r.effectiveDate },
  { header: 'GWP', value: r => r.gwp },
  { header: 'Title', value: r => r.title },
  { header: 'Status', value: r => r.status },
  { header: 'WTN', value: r => r.wtn },
  { header: 'Weld Process', value: r => r.weldProcess },
  { header: 'Process Type', value: r => r.processType },
  { header: 'Application', value: r => r.application },
  { header: 'Base Metal 1 Type', value: r => r.baseMetal1Type },
  { header: 'Base Metal 2 Type', value: r => r.baseMetal2Type },
  { header: 'Base Metal Thickness Min', value: r => r.baseMetalThicknessMin },
  { header: 'Base Metal Thickness Max', value: r => r.baseMetalThicknessMax },
  { header: 'Joint Type', value: r => r.jointType },
  { header: 'Groove Angle', value: r => r.grooveAngle },
  { header: 'Root Opening', value: r => r.rootOpening },
  { header: 'Backing', value: r => r.backing },
  { header: 'Weld Position', value: r => r.weldPosition },
  { header: 'Weld Progression', value: r => r.weldProgression },
  { header: 'Filler Metal Types', value: r => r.fillerMetalTypes.join('; ') },
  { header: 'Filler Metal Classification', value: r => r.fillerMetalClassification },
  { header: 'Filler Metal Sizes', value: r => r.fillerMetalSizes.join('; ') },
  { header: 'PH Min', value: r => r.phMin },
  { header: 'PH Max', value: r => r.phMax },
  { header: 'IP Min', value: r => r.ipMin },
  { header: 'IP Max', value: r => r.ipMax },
  { header: 'Current Type', value: r => r.currentType },
  { header: 'Power Source', value: r => r.powerSource },
  { header: 'Shielding Gas', value: r => r.shieldingGas },
  { header: 'Gas Flow Rate', value: r => r.gasFlowRate },
  { header: 'Backing Gas', value: r => r.backingGas },
  { header: 'Heat Input Min', value: r => r.heatInputMin },
  { header: 'Heat Input Max', value: r => r.heatInputMax },
  { header: 'Amperage Range', value: r => r.amperageRange },
  { header: 'Voltage Range', value: r => r.voltageRange },
  { header: 'Travel Speed Range', value: r => r.travelSpeedRange },
  { header: 'PWHT Temp', value: r => r.pwhtTemp },
  { header: 'PWHT Time', value: r => r.pwhtTime },
  { header: 'Rules', value: r => r.rules.join('; ') },
  { header: 'Conditions', value: r => r.conditions.join('; ') },
  { header: 'Revision History', value: r => r.revisionHistory.map(rv => `Rev ${rv.wpsRev} (${rv.date}): ${rv.note}`).join('; ') },
];

/* the columns above, then one per added-section field */
export function procedureCsvColumns(sections: ProcedureSection[]): CsvColumn<Procedure>[] {
  return [
    ...PROCEDURE_CSV_COLUMNS,
    ...sections.flatMap(s => s.fields.map(f => ({
      header: `${s.name}: ${f.label}`, value: (r: Procedure) => extraValueText(r.extraFields[f.key]),
    }))),
  ];
}

const PROCEDURE_TEMPLATE_HEADERS = [
  'id', 'title', 'status', 'wtn', 'weldProcess', 'gwp', 'wpsRev', 'effectiveDate', 'processType', 'application',
  'baseMetal1Type', 'baseMetal2Type', 'baseMetalThicknessMin', 'baseMetalThicknessMax',
  'jointType', 'grooveAngle', 'rootOpening', 'backing',
  'weldPosition', 'weldProgression',
  'fillerMetalTypes', 'fillerMetalClassification', 'fillerMetalSizes',
  'phMin', 'phMax', 'ipMin', 'ipMax',
  'currentType', 'powerSource',
  'shieldingGas', 'gasFlowRate', 'backingGas',
  'heatInputMin', 'heatInputMax',
  'amperageRange', 'voltageRange', 'travelSpeedRange',
  'pwhtTemp', 'pwhtTime',
  'rules', 'conditions'
];

export function downloadProcedureXlsxTemplate(): Promise<void> {
  return downloadXlsxTemplate(PROCEDURE_TEMPLATE_HEADERS, 'procedures-import-template.xlsx');
}
