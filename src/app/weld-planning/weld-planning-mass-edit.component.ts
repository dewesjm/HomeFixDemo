import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideSave, LucideX, LucideArrowLeft, LucideCheckCircle, LucideAlertTriangle } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import {
  addJointPlan, parseXlsxImport, parseCsvImport, downloadXlsxTemplate,
  JOINT_STATUS_OPTIONS, JOINT_PRIORITY_OPTIONS, JOINT_TYPE_OPTIONS,
  type JointPlan, type JointStatus, type JointPriority, type JointType
} from './weld-planning.data';

type EditableRow = {
  _raw: Record<string, string>;
  _errors: string[];
  _saved: boolean;
  jointNumber: string;
  projectNumber: string;
  joint: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  jointType: string;
  drawing: string;
  drawingRev: string;
  jointDesign: string;
  weldType: string;
  pipeSize: string;
  wallThickness: string;
  materialType1: string;
  materialType2: string;
  wps: string;
  ndt: string;
  pwht: string;
  assignedTo: string;
  estimatedHours: number;
  notes: string;
  createdBy: string;
};

const VALID_STATUSES = new Set(['planned', 'in-progress', 'completed', 'on-hold', 'cancelled']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const VALID_TYPES = new Set(['pipe', 'structural']);

@Component({
  selector: 'app-weld-planning-mass-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideX, LucideArrowLeft, LucideCheckCircle, LucideAlertTriangle],
  template: `
    <div style="max-width: 1400px; margin: 0 auto; padding: 1rem">
      <div class="page-header">
        <a routerLink="/weld-planning" class="back-link">
          <svg lucideArrowLeft class="size-4"></svg> Weld Planning
        </a>
        <span style="color: var(--app-text-muted)">/</span>
        <h2 class="section-title">Mass Import</h2>
        <span class="spacer"></span>
        <span class="match-count">{{ rows().length }} rows</span>
        <button class="btn btn-sm" (click)="downloadTemplate()">
          Download Template
        </button>
      </div>

      <!-- File picker (hidden) -->
      <input #fileInput type="file" accept=".xlsx,.csv" style="display: none" (change)="onFileSelected($event)" />

      <!-- Status bar -->
      <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap">
        @if (loading()) {
          <span style="color: var(--app-text-muted)">Processing file...</span>
        }
        @if (rows().length > 0) {
          <span class="badge badge-info badge-sm">{{ rows().length }} rows loaded</span>
          <span class="badge badge-sm" [class]="errorCount() > 0 ? 'badge-error' : 'badge-success'">
            {{ errorCount() }} errors
          </span>
          <span class="badge badge-sm badge-success">{{ savedCount() }} saved</span>
        }
        <span class="spacer"></span>
        @if (rows().length === 0 && !loading()) {
          <button class="btn btn-sm" (click)="fileInput.click()">Choose File (.xlsx or .csv)</button>
        }
        @if (rows().length > 0 && savedCount() === 0) {
          <button class="btn btn-sm btn-primary" (click)="saveAll()" [disabled]="saving()">
            <svg lucideSave class="size-4"></svg> Save All ({{ rows().length - errorCount() }} valid)
          </button>
        }
        @if (savedCount() > 0 && savedCount() === rows().length) {
          <a routerLink="/weld-planning" class="btn btn-sm btn-primary">Done</a>
        }
      </div>

      @if (rows().length > 0) {
        <div style="overflow-x: auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th style="min-width: 3rem; text-align: center">#</th>
                <th style="min-width: 4rem">Status</th>
                <th style="min-width: 6rem">Joint #</th>
                <th style="min-width: 5rem">Project</th>
                <th style="min-width: 5rem">Joint</th>
                <th style="min-width: 5rem">Type</th>
                <th style="min-width: 10rem">Title</th>
                <th style="min-width: 6rem">Drawing</th>
                <th style="min-width: 6rem">Design</th>
                <th style="min-width: 5rem">Weld</th>
                <th style="min-width: 6rem">Status</th>
                <th style="min-width: 5rem">Priority</th>
                <th style="min-width: 6rem">Material 1</th>
                <th style="min-width: 6rem">WPS</th>
                <th style="min-width: 10rem">Notes</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index; let i = $index) {
                <tr [class]="row._saved ? 'table-success' : (row._errors.length > 0 ? 'table-error' : '')">
                  <td style="text-align: center; font-size: 0.75rem; color: var(--app-text-muted)">{{ i + 1 }}</td>
                  <td style="text-align: center">
                    @if (row._saved) {
                      <svg lucideCheckCircle class="size-4" style="color: var(--color-success)"></svg>
                    } @else if (row._errors.length > 0) {
                      <div [title]="row._errors.join(', ')" style="cursor: help">
                        <svg lucideAlertTriangle class="size-4" style="color: var(--color-error)"></svg>
                      </div>
                    }
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.jointNumber" [class.input-error]="!row.jointNumber" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.projectNumber" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.joint" />
                  </td>
                  <td>
                    <select class="select select-xs w-full" [(ngModel)]="row.jointType">
                      @for (t of jointTypes; track t.value) {
                        <option [value]="t.value">{{ t.label }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.title" [class.input-error]="!row.title" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.drawing" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.jointDesign" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.weldType" />
                  </td>
                  <td>
                    <select class="select select-xs w-full" [(ngModel)]="row.status">
                      @for (s of statuses; track s.value) {
                        <option [value]="s.value">{{ s.label }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <select class="select select-xs w-full" [(ngModel)]="row.priority">
                      @for (p of priorities; track p.value) {
                        <option [value]="p.value">{{ p.label }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.materialType1" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.wps" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.notes" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading()) {
        <div style="text-align: center; padding: 3rem; color: var(--app-text-muted)">
          <p>Import a .xlsx or .csv file to mass-load joint plans.</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem">
            <button class="btn btn-sm btn-ghost" (click)="downloadTemplate()" style="text-decoration: underline">
              Download template
            </button>
            to see expected column headers.
          </p>
        </div>
      }
    </div>
  `
})
export class WeldPlanningMassEditComponent {
  private router = inject(Router);
  private toast = inject(ToastService);

  rows = signal<EditableRow[]>([]);
  loading = signal(false);
  saving = signal(false);

  statuses = JOINT_STATUS_OPTIONS;
  priorities = JOINT_PRIORITY_OPTIONS;
  jointTypes = JOINT_TYPE_OPTIONS;

  errorCount = signal(0);
  savedCount = signal(0);

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loading.set(true);
    try {
      let parsed: Record<string, string>[];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsed = await parseXlsxImport(file);
      } else {
        const text = await file.text();
        parsed = parseCsvImport(text);
      }

      const editable: EditableRow[] = parsed.map(raw => {
        const row: EditableRow = {
          _raw: raw, _errors: [], _saved: false,
          jointNumber: raw['jointNumber'] || raw['joint_number'] || '',
          projectNumber: raw['projectNumber'] || raw['project_number'] || '',
          joint: raw['joint'] || '',
          title: raw['title'] || '',
          description: raw['description'] || '',
          status: raw['status'] || 'planned',
          priority: raw['priority'] || 'medium',
          jointType: raw['jointType'] || raw['joint_type'] || 'pipe',
          drawing: raw['drawing'] || '',
          drawingRev: raw['drawingRev'] || raw['drawing_rev'] || '',
          jointDesign: raw['jointDesign'] || raw['joint_design'] || '',
          weldType: raw['weldType'] || raw['weld_type'] || '',
          pipeSize: raw['pipeSize'] || raw['pipe_size'] || '',
          wallThickness: raw['wallThickness'] || raw['wall_thickness'] || '',
          materialType1: raw['materialType1'] || raw['material_1'] || '',
          materialType2: raw['materialType2'] || raw['material_2'] || '',
          wps: raw['wps'] || '',
          ndt: raw['ndt'] || '',
          pwht: raw['pwht'] || '',
          assignedTo: raw['assignedTo'] || raw['assigned_to'] || '',
          estimatedHours: parseFloat(raw['estimatedHours'] || raw['estimated_hours'] || '0') || 0,
          notes: raw['notes'] || '',
          createdBy: 'Import',
        };
        return row;
      });

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
    if (!row.jointNumber) errors.push('Joint # required');
    if (!row.title) errors.push('Title required');
    if (!VALID_STATUSES.has(row.status)) errors.push('Invalid status');
    if (!VALID_PRIORITIES.has(row.priority)) errors.push('Invalid priority');
    if (!VALID_TYPES.has(row.jointType)) errors.push('Invalid joint type (must be pipe or structural)');
    row._errors = errors;
  }

  async saveAll() {
    this.saving.set(true);
    const pending = this.rows().filter(r => !r._saved && r._errors.length === 0);
    let saved = 0;
    let failed = 0;

    for (const row of pending) {
      try {
        addJointPlan({
          jointNumber: row.jointNumber,
          projectNumber: row.projectNumber,
          joint: row.joint,
          title: row.title,
          description: row.description,
          status: row.status as JointStatus,
          priority: row.priority as JointPriority,
          jointType: row.jointType as JointType,
          drawing: row.drawing,
          drawingRev: row.drawingRev,
          jointDesign: row.jointDesign,
          weldType: row.weldType,
          pipeSize: row.pipeSize,
          wallThickness: row.wallThickness,
          materialType1: row.materialType1,
          materialType2: row.materialType2,
          wps: row.wps,
          ndt: row.ndt,
          pwht: row.pwht,
          assignedTo: row.assignedTo,
          estimatedHours: row.estimatedHours,
          notes: row.notes,
          createdBy: 'Import',
        });
        row._saved = true;
        saved++;
      } catch {
        failed++;
      }
    }

    this.savedCount.set(this.rows().filter(r => r._saved).length);
    this.errorCount.set(this.rows().filter(r => !r._saved && r._errors.length > 0).length);

    if (saved > 0) {
      this.toast.add({ severity: 'success', summary: 'Saved', detail: `${saved} joint plans created` });
    }
    if (failed > 0) {
      this.toast.add({ severity: 'error', summary: 'Failed', detail: `${failed} rows failed to save` });
    }

    this.saving.set(false);
  }

  async downloadTemplate() {
    await downloadXlsxTemplate();
    this.toast.add({ severity: 'info', summary: 'Downloaded', detail: 'Template file saved' });
  }
}
