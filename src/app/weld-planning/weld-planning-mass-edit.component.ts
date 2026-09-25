import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideArrowLeft, LucideCheckCircle, LucideAlertTriangle } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import {
  addWeldJoint, updateWeldJoint, weldJoints, parseXlsxImport, parseCsvImport, downloadXlsxTemplate,
  JOINT_STATUS_OPTIONS, JOINT_TYPE_OPTIONS, JOINT_EXTRA_FIELDS, blankJointExtras, shipForHull,
  type WeldJoint, type JointExtraKey, type JointStatus, type JointType
} from './weld-planning.data';

type EditableRow = {
  _id: string;
  _raw: Record<string, string>;
  _errors: string[];
  _saved: boolean;
  hull: string;
  joint: string;
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
  rtRoot: string;
  rtFinal: string;
  ndtRoot: string;
  ndtEach: string;
  ndtFinal: string;
  ut: string;
  vt: string;
  notes: string;
  createdBy: string;
  /* Joint Info / Joining / Additional Data / Attribute Codes: not table columns, carried through import and save */
  extras: Record<JointExtraKey, string>;
};

function pickExtras(j: WeldJoint): Record<JointExtraKey, string> {
  return Object.fromEntries(JOINT_EXTRA_FIELDS.map(f => [f.key, j[f.key] ?? ''])) as Record<JointExtraKey, string>;
}

/* import columns use the field key or its label (the CSV export's header); Ship is set from the Hull on save */
function extrasFromRaw(raw: Record<string, string>): Record<JointExtraKey, string> {
  const out = blankJointExtras();
  for (const f of JOINT_EXTRA_FIELDS) out[f.key] = String(raw[f.key] ?? raw[f.label] ?? '');
  return out;
}

const VALID_TYPES = new Set(['pipe', 'structural']);

@Component({
  selector: 'app-weld-planning-mass-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideArrowLeft, LucideCheckCircle, LucideAlertTriangle],
  template: `
    <div>
      <div class="page-header">
        <a routerLink="/weld-planning" class="back-link">
          <svg lucideArrowLeft class="size-4"></svg> Weld Planning
        </a>
        <span style="color: var(--app-text-muted)">/</span>
        <h2 class="section-title">{{ isEditMode() ? 'Mass Edit' : 'Import Joints' }}</h2>
      </div>

      <!-- File picker (hidden) -->
      <input #fileInput type="file" accept=".xlsx,.csv" style="display: none" (change)="onFileSelected($event)" />

      <!-- Actions bar -->
      <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap">
        @if (loading()) {
          <span style="color: var(--app-text-muted)">Processing...</span>
        }
        @if (rows().length > 0) {
          <span style="font-size: 0.85rem; color: var(--app-text-muted)">{{ rows().length }} rows</span>
          <span style="font-size: 0.85rem" [style.color]="errorCount() > 0 ? 'var(--color-error)' : 'var(--color-success)'">
            {{ errorCount() }} errors
          </span>
          <span style="font-size: 0.85rem; color: var(--color-success)">{{ savedCount() }} saved</span>
        }
        <span class="spacer"></span>
        @if (rows().length === 0 && !loading() && !isEditMode()) {
          <button class="btn btn-sm" (click)="downloadTemplate()">Download Template</button>
          <button class="btn btn-sm" (click)="fileInput.click()">Choose File</button>
          <button class="btn btn-sm btn-primary" (click)="loadSample()">Use Sample</button>
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
                <th style="min-width: 5rem">Hull</th>
                <th style="min-width: 5rem">Joint</th>
                <th style="min-width: 5rem">Type</th>
                <th style="min-width: 6rem">Drawing</th>
                <th style="min-width: 6rem">Design</th>
                <th style="min-width: 5rem">Weld</th>
                <th style="min-width: 6rem">Status</th>
                <th style="min-width: 6rem">Material 1</th>
                <th style="min-width: 10rem">Notes</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index; let i = $index) {
                <tr [class]="row._saved ? 'table-success' : (row._errors.length > 0 ? 'table-error' : '')">
                  <td style="text-align: center; font-size: 0.75rem; color: var(--app-text-muted)">
                    @if (row._saved) {
                      <svg lucideCheckCircle class="size-4" style="color: var(--color-success)"></svg>
                    } @else if (row._errors.length > 0) {
                      <div [title]="row._errors.join(', ')" style="cursor: help">
                        <svg lucideAlertTriangle class="size-4" style="color: var(--color-error)"></svg>
                      </div>
                    } @else {
                      {{ i + 1 }}
                    }
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.hull" />
                  </td>
                  <td>
                    <input class="input input-xs w-full" [(ngModel)]="row.joint" [class.input-error]="!row.joint" />
                  </td>
                  <td>
                    <select class="select select-xs w-full" [(ngModel)]="row.jointType">
                      @for (t of jointTypes; track t.value) {
                        <option [value]="t.value">{{ t.label }}</option>
                      }
                    </select>
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
                    <input class="input input-xs w-full" [(ngModel)]="row.materialType1" />
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
        @if (isEditMode()) {
          <div style="padding: 1.5rem; border: 1px dashed var(--app-border); border-radius: 0.5rem; max-width: 600px; margin: 2rem auto; text-align: center">
            <p style="color: var(--app-text); font-weight: 600; margin-bottom: 0.5rem">Paste Joints</p>
            <p style="font-size: 0.85rem; color: var(--app-text-muted); margin-bottom: 0.75rem">
              Enter joints separated by commas or new lines, then click Find to load them for editing.
            </p>
            <textarea class="textarea textarea-bordered w-full" rows="4"
                      placeholder="ST-10005, ST-10012, SW-10008&#10;or one per line"
                      [ngModel]="pasteInput()" (ngModelChange)="pasteInput.set($event)"></textarea>
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; justify-content: center">
              <button class="btn btn-sm btn-primary" (click)="findJoints()" [disabled]="!pasteInput().trim()">
                Find Joints
              </button>
              <button class="btn btn-sm" (click)="fileInput.click()">Import File Instead</button>
            </div>
            @if (findResult()) {
              <div style="margin-top: 0.75rem; font-size: 0.85rem" [style.color]="findResult()!.notFound.length ? 'var(--color-warning)' : 'var(--color-success)'">
                Found {{ findResult()!.found }} of {{ findResult()!.total }} joints.
                @if (findResult()!.notFound.length) {
                  Not found: {{ findResult()!.notFound.join(', ') }}
                }
              </div>
            }
          </div>
        } @else {
          <div style="text-align: center; padding: 3rem; color: var(--app-text-muted)">
            <p>Import a .xlsx or .csv file to mass-load joints.</p>
            <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem">
              <button class="btn btn-sm" (click)="fileInput.click()">Choose File</button>
              <button class="btn btn-sm btn-ghost" (click)="downloadTemplate()" style="text-decoration: underline">
                Download Template
              </button>
              <button class="btn btn-sm btn-primary" (click)="loadSample()">
                Use Sample
              </button>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class WeldPlanningMassEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  rows = signal<EditableRow[]>([]);
  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);

  statuses = JOINT_STATUS_OPTIONS;
  jointTypes = JOINT_TYPE_OPTIONS;

  errorCount = signal(0);
  savedCount = signal(0);
  pasteInput = signal('');
  findResult = signal<{ found: number; total: number; notFound: string[] } | null>(null);

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('mode') === 'edit') {
      this.isEditMode.set(true);
      this.loadExistingRows();
    }
  }

  loadExistingRows() {
    const all = weldJoints();
    const editable: EditableRow[] = all.map(j => ({
      _id: j.id,
      _raw: {},
      _errors: [],
      _saved: false,
      hull: j.hull,
      joint: j.joint,
      description: j.description,
      status: j.status,
      priority: j.priority || 'medium',
      jointType: j.jointType,
      drawing: j.drawing,
      drawingRev: j.drawingRev,
      jointDesign: j.jointDesign,
      weldType: j.weldType,
      pipeSize: j.pipeSize,
      wallThickness: j.wallThickness,
      materialType1: j.materialType1,
      materialType2: j.materialType2,
      rtRoot: j.rtRoot, rtFinal: j.rtFinal, ndtRoot: j.ndtRoot, ndtEach: j.ndtEach,
      ndtFinal: j.ndtFinal, ut: j.ut, vt: j.vt,
      notes: j.notes,
      createdBy: j.createdBy,
      extras: pickExtras(j),
    }));
    editable.forEach(row => this.validateRow(row));
    this.rows.set(editable);
    this.errorCount.set(0);
    this.savedCount.set(0);
  }

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
          _id: '',
          _raw: raw, _errors: [], _saved: false,
          hull: raw['hull'] || '',
          joint: raw['joint'] || '',
          description: raw['description'] || '',
          status: raw['status'] || 'development',
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
          rtRoot: raw['rtRoot'] || '', rtFinal: raw['rtFinal'] || '', ndtRoot: raw['ndtRoot'] || '', ndtEach: raw['ndtEach'] || '',
          ndtFinal: raw['ndtFinal'] || '', ut: raw['ut'] || '', vt: raw['vt'] || '',
          notes: raw['notes'] || '',
          createdBy: 'Import',
          extras: extrasFromRaw(raw),
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
    if (!row.joint) errors.push('Joint required');
    if (!VALID_TYPES.has(row.jointType)) errors.push('Invalid joint type');
    row._errors = errors;
  }

  async saveAll() {
    this.saving.set(true);
    const pending = this.rows().filter(r => !r._saved && r._errors.length === 0);
    let saved = 0;
    let failed = 0;

    for (const row of pending) {
      try {
        if (this.isEditMode() && row._id) {
          updateWeldJoint(row._id, {
            hull: row.hull,
            joint: row.joint,
            description: row.description,
            status: row.status as JointStatus,
            priority: row.priority as any,
            jointType: row.jointType as JointType,
            drawing: row.drawing,
            drawingRev: row.drawingRev,
            jointDesign: row.jointDesign,
            weldType: row.weldType,
            pipeSize: row.pipeSize,
            wallThickness: row.wallThickness,
            materialType1: row.materialType1,
            materialType2: row.materialType2,
            rtRoot: row.rtRoot, rtFinal: row.rtFinal, ndtRoot: row.ndtRoot, ndtEach: row.ndtEach,
            ndtFinal: row.ndtFinal, ut: row.ut, vt: row.vt,
            notes: row.notes,
            ...row.extras, ship: shipForHull(row.hull),
          });
        } else {
          addWeldJoint({
            hull: row.hull,
            joint: row.joint,
            description: row.description,
            status: row.status as JointStatus,
            priority: row.priority as any,
            jointType: row.jointType as JointType,
            drawing: row.drawing,
            drawingRev: row.drawingRev,
            jointDesign: row.jointDesign,
            weldType: row.weldType,
            pipeSize: row.pipeSize,
            wallThickness: row.wallThickness,
            materialType1: row.materialType1,
            materialType2: row.materialType2,
            rtRoot: row.rtRoot, rtFinal: row.rtFinal, ndtRoot: row.ndtRoot, ndtEach: row.ndtEach,
            ndtFinal: row.ndtFinal, ut: row.ut, vt: row.vt,
            notes: row.notes,
            ...row.extras, ship: shipForHull(row.hull),
            createdBy: 'Import',
          });
        }
        row._saved = true;
        saved++;
      } catch {
        failed++;
      }
    }

    this.savedCount.set(this.rows().filter(r => r._saved).length);
    this.errorCount.set(this.rows().filter(r => !r._saved && r._errors.length > 0).length);

    const action = this.isEditMode() ? 'updated' : 'created';
    if (saved > 0) {
      this.toast.add({ severity: 'success', summary: 'Saved', detail: `${saved} joints ${action}` });
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

  loadSample() {
    const sample: EditableRow[] = [
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'D5145', joint: 'FW-10014', description: 'Main header to 4" reducer', status: 'development', priority: 'medium', jointType: 'pipe', drawing: 'H711-1234', drawingRev: 'B', jointDesign: 'C-18', weldType: 'Butt', pipeSize: '4"', wallThickness: '0.250"', materialType1: '02-CS', materialType2: '03-ER70', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: '', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'D5145', joint: 'SW-10008', description: '90 elbow connection', status: 'unlocked', priority: 'medium', jointType: 'pipe', drawing: 'H711-1234', drawingRev: 'B', jointDesign: 'P-9', weldType: 'Socket', pipeSize: '3"', wallThickness: '0.219"', materialType1: '02-CS', materialType2: '02-E70', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: 'Standard procedure', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'N6612', joint: 'ST-10005', description: 'I-beam splice connection', status: 'development', priority: 'low', jointType: 'structural', drawing: 'S720-4518', drawingRev: 'A', jointDesign: 'V-22', weldType: 'Butt', pipeSize: '', wallThickness: '', materialType1: '04-AS', materialType2: '03-ER70', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: '', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'N6612', joint: 'LO-10017', description: 'Nozzle to header', status: 'locked', priority: 'high', jointType: 'pipe', drawing: 'S720-4518', drawingRev: 'C', jointDesign: 'C-65', weldType: 'Boss', pipeSize: '6"', wallThickness: '0.219"', materialType1: '13-SS316', materialType2: '16-SS316', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: 'PWHT required', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'T8080', joint: 'ST-10012', description: 'Pipe support to beam', status: 'development', priority: 'medium', jointType: 'structural', drawing: 'H731-5002', drawingRev: 'A', jointDesign: 'P-12', weldType: 'Attachment', pipeSize: '', wallThickness: '', materialType1: '02-CS', materialType2: '02-E70', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: '', createdBy: 'Sample', extras: blankJointExtras() },
    ];
    sample.forEach(r => this.validateRow(r));
    this.rows.set(sample);
    this.errorCount.set(0);
    this.savedCount.set(0);
    this.toast.add({ severity: 'info', summary: 'Sample loaded', detail: '5 sample rows ready to review and save' });
  }

  findJoints() {
    const raw = this.pasteInput();
    const ids = raw.split(/[,\n\r]+/).map(s => s.trim()).filter(Boolean);
    if (!ids.length) return;

    const all = weldJoints();
    const found: WeldJoint[] = [];
    const notFound: string[] = [];

    for (const id of ids) {
      const match = all.find(j => j.joint === id);
      if (match) {
        found.push(match);
      } else {
        notFound.push(id);
      }
    }

    this.findResult.set({ found: found.length, total: ids.length, notFound });

    if (found.length) {
      const editable: EditableRow[] = found.map(j => ({
        _id: j.id,
        _raw: {}, _errors: [], _saved: false,
        hull: j.hull,
        joint: j.joint,
        description: j.description,
        status: j.status,
        priority: j.priority || 'medium',
        jointType: j.jointType,
        drawing: j.drawing,
        drawingRev: j.drawingRev,
        jointDesign: j.jointDesign,
        weldType: j.weldType,
        pipeSize: j.pipeSize,
        wallThickness: j.wallThickness,
        materialType1: j.materialType1,
        materialType2: j.materialType2,
        rtRoot: j.rtRoot, rtFinal: j.rtFinal, ndtRoot: j.ndtRoot, ndtEach: j.ndtEach,
        ndtFinal: j.ndtFinal, ut: j.ut, vt: j.vt,
        notes: j.notes,
        createdBy: j.createdBy,
        extras: pickExtras(j),
      }));
      editable.forEach(row => this.validateRow(row));
      this.rows.set(editable);
      this.errorCount.set(0);
      this.savedCount.set(0);
      this.toast.add({ severity: 'info', summary: 'Found', detail: `${found.length} joints loaded for editing` });
    }
  }
}
