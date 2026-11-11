/* Weld Engineering Admin - Load Procedures: bulk import via file or a sample set, mirrors
   Import Joints; the shared load/validate/save flow is BulkImport, the frame is app-import-grid. */
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { BulkImport } from '../../../../shared/bulk-import';
import { ImportGridComponent } from '../../../../shared/import-grid.component';
import {
  addProcedure, updateProcedure, getProcedure, PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES, type ProcedureStatus
} from '../../../../data/procedures';
import { parseCsvRows, parseXlsxRows } from '../../../../shared/spreadsheet-import';
import { downloadProcedureXlsxTemplate, sectionColumns } from '../../procedure-files';
import { procedureSections } from '../../procedure-sections';
import { applyCells, cellProblems } from './rules/procedure-import';

type EditableRow = {
  _existing: boolean;
  _errors: string[];
  _saved: boolean;
  title: string;
  status: string;
  wtn: string;
  weldProcess: string;
  gwp: string;
  revision: string;
  effectiveDate: string;
  processType: string;
  application: string;
  /* section field cells as typed, by column id (procedure-files.ts sectionColumns) */
  cells: Record<string, string>;
  rules: string;
  conditions: string;
};

const VALID_STATUSES = new Set(['active', 'draft', 'retired']);
const splitList = (s: string) => s.split(';').map(v => v.trim()).filter(Boolean);

@Component({
  selector: 'app-load-procedures',
  standalone: true,
  imports: [FormsModule, RouterLink, ImportGridComponent, LucideArrowLeft],
  templateUrl: './load-procedures.component.html'
})
export class LoadProceduresComponent extends BulkImport<EditableRow> {
  protected readonly noun = 'procedures';
  statuses = PROCEDURE_STATUS_OPTIONS;
  weldProcesses = WELD_PROCESSES;
  /* one column per section field, from Admin > Procedure Sections */
  columns = sectionColumns(procedureSections());

  protected parseFile(file: File): Promise<Record<string, string>[]> {
    return file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      ? parseXlsxRows(file)
      : file.text().then(parseCsvRows);
  }

  protected fromRaw(raw: Record<string, string>): EditableRow {
    return {
      _existing: false, _errors: [], _saved: false,
      title: raw['title'] || raw['Title'] || '',
      status: raw['status'] || raw['Status'] || 'draft',
      wtn: raw['wtn'] || raw['WTN'] || '',
      weldProcess: raw['weldProcess'] || raw['Weld Process'] || '',
      gwp: raw['gwp'] || raw['GWP'] || '',
      revision: raw['revision'] || raw['Revision'] || '',
      effectiveDate: raw['effectiveDate'] || raw['Effective Date'] || '',
      processType: raw['processType'] || raw['Process Type'] || '',
      application: raw['application'] || raw['Application'] || '',
      cells: Object.fromEntries(this.columns.map(c =>
        [c.id, [c.id, c.header, ...c.aliases].map(h => raw[h]).find(v => v) ?? ''])),
      rules: raw['rules'] || raw['Rules'] || '',
      conditions: raw['conditions'] || raw['Conditions'] || '',
    };
  }

  validateRow(row: EditableRow) {
    const errors: string[] = [];
    if (!row.gwp) errors.push('GWP required');
    if (!row.wtn) errors.push('WTN required');
    if (!VALID_STATUSES.has(row.status)) errors.push('Invalid status');
    row._errors = [...errors, ...cellProblems(this.columns, row.cells)];
  }

  protected sampleRows(): EditableRow[] {
    const row = (r: Omit<EditableRow, '_existing' | '_errors' | '_saved'>): EditableRow =>
      ({ _existing: false, _errors: [], _saved: false, ...r });
    return [
      row({ title: 'GTAW procedure for pipe joints', status: 'active', wtn: '05.5-1', weldProcess: 'GTAW', gwp: 'W-901', revision: '0', effectiveDate: '2026-01-15', processType: 'Manual', application: 'Process Piping',
        cells: { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS', fillerMetalTypes: 'MIL-70S-6; MIL-70S-3', fillerMetalSizes: '1/16; 3/32', requiredQuals: 'WELD412', phMin: '100', phMax: '300', ipMin: '60', ipMax: '250' },
        rules: 'Preheat required for base metal thickness over 1 inch.; Visual inspection required prior to any NDT.', conditions: 'Applies to shop welding only.' }),
      row({ title: 'GTAW procedure for pipe joints', status: 'active', wtn: '05.5-2', weldProcess: 'GTAW', gwp: 'W-901', revision: '1', effectiveDate: '2026-02-01', processType: 'Manual', application: 'Process Piping',
        cells: { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS', fillerMetalTypes: 'MIL-80S-50', fillerMetalSizes: '3/32; 1/8', requiredQuals: 'WELD412 AND (WELD427 OR WELD403)', phMin: 'NC', phMax: '350', ipMin: '100', ipMax: '300' },
        rules: 'Interpass temperature shall not exceed 350°F.', conditions: 'Requires qualified welder certification on file.' }),
      row({ title: 'FCAW procedure for pipe joints', status: 'draft', wtn: '05.5A-3', weldProcess: 'FCAW', gwp: 'W-902', revision: '0', effectiveDate: '2026-03-01', processType: 'Semiautomatic', application: 'Surface Structure',
        cells: { baseMetal1Type: '04-AS', baseMetal2Type: '04-AS', fillerMetalTypes: 'MIL-70S-3', fillerMetalSizes: '1/8; 5/32; 3/16', phMin: '150', phMax: 'NC', ipMin: 'NC', ipMax: '400' },
        rules: 'Backing gas required for all root passes.; PWHT required when specified on the drawing.', conditions: 'Ambient temperature shall be above 32°F during welding.' }),
    ];
  }

  downloadTemplate() {
    downloadProcedureXlsxTemplate(procedureSections());
  }

  /* a blank cell keeps an existing procedure's value; a new procedure gets every section ticked */
  protected saveRow(row: EditableRow) {
    const existing = getProcedure(row.gwp, row.wtn);
    const payload = {
      title: row.title,
      status: row.status as ProcedureStatus,
      wtn: row.wtn,
      weldProcess: row.weldProcess,
      gwp: row.gwp, revision: row.revision, effectiveDate: row.effectiveDate,
      processType: row.processType, application: row.application,
      rules: splitList(row.rules),
      conditions: splitList(row.conditions),
      extraFields: applyCells(this.columns, row.cells, existing?.extraFields ?? {}),
      sectionIds: existing?.sectionIds ?? procedureSections().map(s => s.id),
      revisionHistory: existing?.revisionHistory ?? [],
      createdBy: 'Import',
    };
    if (existing) {
      updateProcedure(row.gwp, row.wtn, payload);
    } else {
      addProcedure(payload);
    }
  }
}
