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
  wtns: string;                    /* semicolon-separated, same as PROCEDURE_CSV_COLUMNS */
  weldProcess: string;
  phMin: string; phMax: string; ipMin: string; ipMax: string;
  rules: string;
  conditions: string;
  qualificationsRequired: string;
};

const VALID_STATUSES = new Set(['active', 'draft', 'retired']);
const splitList = (s: string) => s.split(';').map(v => v.trim()).filter(Boolean);

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
        wtns: raw['wtns'] || raw['WTNs'] || '',
        weldProcess: raw['weldProcess'] || raw['Weld Process'] || '',
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
    if (!VALID_STATUSES.has(row.status)) errors.push('Invalid status');
    row._errors = errors;
  }

  loadSample() {
    const sample: EditableRow[] = [
      { _existing: false, _errors: [], _saved: false, id: 'W-901', title: 'GTAW procedure for pipe joints', status: 'active', wtns: '07:11.5-3', weldProcess: 'GTAW', phMin: '120', phMax: '180', ipMin: '90', ipMax: '150', rules: 'Preheat required for base metal thickness over 1 inch.; Visual inspection required prior to any NDT.', conditions: 'Applies to shop welding only.', qualificationsRequired: 'ASME Section IX welder qualification' },
      { _existing: false, _errors: [], _saved: false, id: 'W-902', title: 'SMAW procedure for structural joints', status: 'active', wtns: '09:10.8-4', weldProcess: 'SMAW', phMin: 'NC', phMax: '170', ipMin: '85', ipMax: '140', rules: 'Interpass temperature shall not exceed 350°F.', conditions: 'Requires qualified welder certification on file.', qualificationsRequired: 'AWS D1.1 structural welder certification' },
      { _existing: false, _errors: [], _saved: false, id: 'W-903', title: 'FCAW procedure for pipe joints', status: 'draft', wtns: '08:14.2-2; 07:12.0-1', weldProcess: 'FCAW', phMin: '115', phMax: 'NC', ipMin: 'NC', ipMax: '145', rules: 'Backing gas required for all root passes.; PWHT required when specified on the drawing.', conditions: 'Ambient temperature shall be above 32°F during welding.', qualificationsRequired: 'Position qualification: 6G' },
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
        const payload = {
          id: row.id,
          title: row.title,
          status: row.status as ProcedureStatus,
          wtns: splitList(row.wtns),
          weldProcess: row.weldProcess,
          phMin: row.phMin, phMax: row.phMax, ipMin: row.ipMin, ipMax: row.ipMax,
          overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
          rules: splitList(row.rules),
          conditions: splitList(row.conditions),
          qualificationsRequired: splitList(row.qualificationsRequired),
          createdBy: 'Import',
        };
        if (getProcedure(row.id)) {
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
