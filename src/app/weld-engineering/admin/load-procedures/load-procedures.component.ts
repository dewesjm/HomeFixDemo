/* Weld Engineering Admin - Load Procedures: bulk import via file or a sample set, mirrors
   weld-planning-mass-edit.component.ts's Import Joints (non-edit) flow. */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideSave, LucideArrowLeft, LucideCheckCircle, LucideAlertTriangle } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import {
  addProcedure, updateProcedure, getProcedure, parseProcedureCsvImport, parseProcedureXlsxImport,
  downloadProcedureXlsxTemplate, PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES, type ProcedureStatus
} from '../../../data/procedures';

type EditableRow = {
  _existing: boolean;
  _errors: string[];
  _saved: boolean;
  id: string;
  title: string;
  status: string;
  wtn: string;
  weldProcess: string;
  gwp: string;
  wpsRev: string;
  effectiveDate: string;
  processType: string;
  application: string;
  baseMetal1Type: string;
  baseMetal2Type: string;
  fillerMetalTypes: string;
  fillerMetalSizes: string;
  phMin: string; phMax: string; ipMin: string; ipMax: string;
  rules: string;
  conditions: string;
  qualificationsRequired: string;
};

const VALID_STATUSES = new Set(['active', 'draft', 'retired']);
const splitList = (s: string) => s.split(';').map(v => v.trim()).filter(Boolean);
/* Filler Metal Types/Sizes must match FILLER_METAL_TYPE_OPTIONS/FILLER_METAL_SIZE_OPTIONS values
   (procedures.ts) for the Weld Record cascade to pick them up -- normalize casing and stray quotes
   from a pasted size like '1/16"' so a plain lowercase/no-quote entry isn't required. */
const splitFillerList = (s: string) => splitList(s).map(v => v.toLowerCase().replace(/"/g, ''));

@Component({
  selector: 'app-load-procedures',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideArrowLeft, LucideCheckCircle, LucideAlertTriangle],
  templateUrl: './load-procedures.component.html'
})
export class LoadProceduresComponent {
  private toast = inject(ToastService);

  rows = signal<EditableRow[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorCount = signal(0);
  savedCount = signal(0);

  statuses = PROCEDURE_STATUS_OPTIONS;
  weldProcesses = WELD_PROCESSES;

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loading.set(true);
    try {
      let parsed: Record<string, string>[];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsed = await parseProcedureXlsxImport(file);
      } else {
        const text = await file.text();
        parsed = parseProcedureCsvImport(text);
      }

      const editable: EditableRow[] = parsed.map(raw => ({
        _existing: false, _errors: [], _saved: false,
        id: raw['id'] || raw['Procedure'] || '',
        title: raw['title'] || raw['Title'] || '',
        status: raw['status'] || raw['Status'] || 'draft',
        wtn: raw['wtn'] || raw['WTN'] || '',
        weldProcess: raw['weldProcess'] || raw['Weld Process'] || '',
        gwp: raw['gwp'] || raw['GWP'] || '',
        wpsRev: raw['wpsRev'] || raw['WPS Rev'] || '',
        effectiveDate: raw['effectiveDate'] || raw['Effective Date'] || '',
        processType: raw['processType'] || raw['Process Type'] || '',
        application: raw['application'] || raw['Application'] || '',
        baseMetal1Type: raw['baseMetal1Type'] || raw['Base Metal 1 Type'] || '',
        baseMetal2Type: raw['baseMetal2Type'] || raw['Base Metal 2 Type'] || '',
        fillerMetalTypes: raw['fillerMetalTypes'] || raw['Filler Metal Types'] || raw['fillerMetalType'] || raw['Filler Metal Type'] || '',
        fillerMetalSizes: raw['fillerMetalSizes'] || raw['Filler Metal Sizes'] || '',
        phMin: raw['phMin'] || raw['PH Min'] || '',
        phMax: raw['phMax'] || raw['PH Max'] || '',
        ipMin: raw['ipMin'] || raw['IP Min'] || '',
        ipMax: raw['ipMax'] || raw['IP Max'] || '',
        rules: raw['rules'] || raw['Rules'] || '',
        conditions: raw['conditions'] || raw['Conditions'] || '',
        qualificationsRequired: raw['qualificationsRequired'] || raw['Qualifications Required'] || '',
      }));

      editable.forEach(row => this.validateRow(row));
      this.rows.set(editable);
      this.errorCount.set(editable.filter(r => r._errors.length > 0).length);
      this.savedCount.set(0);
      this.toast.add({ severity: 'info', summary: 'Loaded', detail: `${editable.length} rows loaded from file` });
    } catch (e: any) {
      this.toast.add({ severity: 'error', summary: 'Parse error', detail: e.message || 'Could not read file' });
    } finally {
      this.loading.set(false);
      input.value = '';
    }
  }

  validateRow(row: EditableRow) {
    const errors: string[] = [];
    if (!row.id) errors.push('Procedure ID required');
    if (!row.gwp) errors.push('GWP required');
    if (!row.wtn) errors.push('WTN required');
    if (!VALID_STATUSES.has(row.status)) errors.push('Invalid status');
    row._errors = errors;
  }

  loadSample() {
    const sample: EditableRow[] = [
      { _existing: false, _errors: [], _saved: false, id: 'W-901-1', title: 'GTAW procedure for pipe joints', status: 'active', wtn: '05.5-1', weldProcess: 'GTAW', gwp: 'W-901', wpsRev: '0', effectiveDate: '2026-01-15', processType: 'Manual', application: 'Process Piping', baseMetal1Type: 'Carbon Steel', baseMetal2Type: 'Carbon Steel', fillerMetalTypes: 'mil-70s-6; mil-70s-3', fillerMetalSizes: '1/16; 3/32', phMin: '100', phMax: '300', ipMin: '60', ipMax: '250', rules: 'Preheat required for base metal thickness over 1 inch.; Visual inspection required prior to any NDT.', conditions: 'Applies to shop welding only.', qualificationsRequired: 'ASME Section IX welder qualification' },
      { _existing: false, _errors: [], _saved: false, id: 'W-901-2', title: 'GTAW procedure for pipe joints', status: 'active', wtn: '05.5-2', weldProcess: 'GTAW', gwp: 'W-901', wpsRev: '1', effectiveDate: '2026-02-01', processType: 'Manual', application: 'Process Piping', baseMetal1Type: 'Stainless Steel', baseMetal2Type: 'Stainless Steel', fillerMetalTypes: 'mil-80s-50', fillerMetalSizes: '3/32; 1/8', phMin: 'NC', phMax: '350', ipMin: '100', ipMax: '300', rules: 'Interpass temperature shall not exceed 350°F.', conditions: 'Requires qualified welder certification on file.', qualificationsRequired: 'AWS D1.1 structural welder certification' },
      { _existing: false, _errors: [], _saved: false, id: 'W-902-1', title: 'FCAW procedure for pipe joints', status: 'draft', wtn: '05.5A-3', weldProcess: 'FCAW', gwp: 'W-902', wpsRev: '0', effectiveDate: '2026-03-01', processType: 'Semiautomatic', application: 'Surface Structure', baseMetal1Type: 'Low Alloy Steel', baseMetal2Type: 'Low Alloy Steel', fillerMetalTypes: 'mil-70s-3', fillerMetalSizes: '1/8; 5/32; 3/16', phMin: '150', phMax: 'NC', ipMin: 'NC', ipMax: '400', rules: 'Backing gas required for all root passes.; PWHT required when specified on the drawing.', conditions: 'Ambient temperature shall be above 32°F during welding.', qualificationsRequired: 'Position qualification: 6G' },
    ];
    sample.forEach(r => this.validateRow(r));
    this.rows.set(sample);
    this.errorCount.set(0);
    this.savedCount.set(0);
    this.toast.add({ severity: 'info', summary: 'Sample loaded', detail: '3 sample rows ready to review and save' });
  }

  downloadTemplate() {
    downloadProcedureXlsxTemplate();
  }

  async saveAll() {
    this.saving.set(true);
    const pending = this.rows().filter(r => !r._saved && r._errors.length === 0);
    let saved = 0;
    let failed = 0;

    for (const row of pending) {
      try {
        /* fields the bulk-import grid doesn't collect: keep the existing record's values on update
           (don't blank out a procedure's WPS detail sections just because it was re-imported) rather
           than defaulting to '' the way the pre-existing override* fields already do below. */
        const existing = getProcedure(row.id);
        const payload = {
          id: row.id,
          title: row.title,
          status: row.status as ProcedureStatus,
          wtn: row.wtn,
          weldProcess: row.weldProcess,
          gwp: row.gwp, wpsRev: row.wpsRev, effectiveDate: row.effectiveDate,
          processType: row.processType, application: row.application, baseMetal1Type: row.baseMetal1Type,
          baseMetal2Type: row.baseMetal2Type,
          baseMetalThicknessMin: existing?.baseMetalThicknessMin ?? '', baseMetalThicknessMax: existing?.baseMetalThicknessMax ?? '',
          jointType: existing?.jointType ?? '', grooveAngle: existing?.grooveAngle ?? '',
          rootOpening: existing?.rootOpening ?? '', backing: existing?.backing ?? '',
          weldPosition: existing?.weldPosition ?? '', weldProgression: existing?.weldProgression ?? '',
          fillerMetalTypes: splitFillerList(row.fillerMetalTypes),
          fillerMetalClassification: existing?.fillerMetalClassification ?? '',
          fillerMetalSizes: row.fillerMetalSizes ? splitFillerList(row.fillerMetalSizes) : existing?.fillerMetalSizes ?? [],
          phMin: row.phMin, phMax: row.phMax, ipMin: row.ipMin, ipMax: row.ipMax,
          overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
          currentType: existing?.currentType ?? '', powerSource: existing?.powerSource ?? '',
          shieldingGas: existing?.shieldingGas ?? '', gasFlowRate: existing?.gasFlowRate ?? '', backingGas: existing?.backingGas ?? '',
          heatInputMin: existing?.heatInputMin ?? '', heatInputMax: existing?.heatInputMax ?? '',
          amperageRange: existing?.amperageRange ?? '', voltageRange: existing?.voltageRange ?? '', travelSpeedRange: existing?.travelSpeedRange ?? '',
          pwhtTemp: existing?.pwhtTemp ?? '', pwhtTime: existing?.pwhtTime ?? '',
          rules: splitList(row.rules),
          conditions: splitList(row.conditions),
          qualificationsRequired: splitList(row.qualificationsRequired),
          revisionHistory: existing?.revisionHistory ?? [],
          createdBy: 'Import',
        };
        if (existing) {
          const { id, ...rest } = payload;
          updateProcedure(id, rest);
        } else {
          addProcedure(payload);
        }
        row._saved = true;
        saved++;
      } catch {
        failed++;
      }
    }

    this.savedCount.set(this.rows().filter(r => r._saved).length);
    this.errorCount.set(this.rows().filter(r => !r._saved && r._errors.length > 0).length);
    if (saved > 0) this.toast.add({ severity: 'success', summary: 'Saved', detail: `${saved} procedures saved` });
    if (failed > 0) this.toast.add({ severity: 'error', summary: 'Failed', detail: `${failed} rows failed to save` });

    this.saving.set(false);
  }
}
