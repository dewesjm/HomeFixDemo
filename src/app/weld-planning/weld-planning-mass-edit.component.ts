import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { BulkImport } from '../shared/bulk-import';
import { ImportGridComponent } from '../shared/import-grid.component';
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

/* an existing joint as an editable grid row (Mass Edit) */
function toEditable(j: WeldJoint): EditableRow {
  return {
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
  };
}

@Component({
  selector: 'app-weld-planning-mass-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, ImportGridComponent, LucideArrowLeft],
  template: `
    <div>
      <div class="page-header">
        <a routerLink="/weld-planning" class="back-link">
          <svg lucideArrowLeft class="size-4"></svg> Weld Planning
        </a>
        <span class="c-muted">/</span>
        <h2 class="section-title">{{ isEditMode() ? 'Mass Edit' : 'Import Joints' }}</h2>
      </div>

      <app-import-grid #grid [importer]="this" noun="joints" doneLink="/weld-planning" [fileActions]="!isEditMode()">
        <ng-template #headerCells>
          <th class="min-w-20">Hull</th>
          <th class="min-w-20">Joint</th>
          <th class="min-w-20">Type</th>
          <th class="min-w-24">Drawing</th>
          <th class="min-w-24">Design</th>
          <th class="min-w-20">Weld</th>
          <th class="min-w-24">Status</th>
          <th class="min-w-24">Material 1</th>
          <th class="min-w-40">Notes</th>
        </ng-template>
        <ng-template #rowCells let-row>
          <td><input class="input input-xs w-full" [(ngModel)]="row.hull" /></td>
          <td><input class="input input-xs w-full" [(ngModel)]="row.joint" [class.input-error]="!row.joint" /></td>
          <td>
            <select class="select select-xs w-full" [(ngModel)]="row.jointType">
              @for (t of jointTypes; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </td>
          <td><input class="input input-xs w-full" [(ngModel)]="row.drawing" /></td>
          <td><input class="input input-xs w-full" [(ngModel)]="row.jointDesign" /></td>
          <td><input class="input input-xs w-full" [(ngModel)]="row.weldType" /></td>
          <td>
            <select class="select select-xs w-full" [(ngModel)]="row.status">
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </td>
          <td><input class="input input-xs w-full" [(ngModel)]="row.materialType1" /></td>
          <td><input class="input input-xs w-full" [(ngModel)]="row.notes" /></td>
        </ng-template>

        <div importEmpty class="import-paste-box">
          <p class="font-semibold mb-2">Paste Joints</p>
          <p class="mb-3">Enter joints separated by commas or new lines, then click Find to load them for editing.</p>
          <textarea class="textarea textarea-bordered w-full" rows="4"
                    placeholder="ST-10005, ST-10012, SW-10008&#10;or one per line"
                    [ngModel]="pasteInput()" (ngModelChange)="pasteInput.set($event)"></textarea>
          <div class="import-empty-actions mt-3">
            <button type="button" class="btn btn-sm btn-primary" (click)="findJoints()" [disabled]="!pasteInput().trim()">
              Find Joints
            </button>
            <button type="button" class="btn btn-sm" (click)="grid.openFilePicker()">Import File Instead</button>
          </div>
          @if (findResult(); as r) {
            <div class="mt-3" [class.c-amber]="r.notFound.length" [class.c-green]="!r.notFound.length">
              Found {{ r.found }} of {{ r.total }} joints.
              @if (r.notFound.length) {
                Not found: {{ r.notFound.join(', ') }}
              }
            </div>
          }
        </div>
      </app-import-grid>
    </div>
  `
})
export class WeldPlanningMassEditComponent extends BulkImport<EditableRow> implements OnInit {
  private route = inject(ActivatedRoute);
  protected readonly noun = 'joints';

  isEditMode = signal(false);
  statuses = JOINT_STATUS_OPTIONS;
  jointTypes = JOINT_TYPE_OPTIONS;

  pasteInput = signal('');
  findResult = signal<{ found: number; total: number; notFound: string[] } | null>(null);

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('mode') === 'edit') {
      this.isEditMode.set(true);
      this.setRows(weldJoints().map(toEditable));
    }
  }

  protected parseFile(file: File): Promise<Record<string, string>[]> {
    return file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      ? parseXlsxImport(file)
      : file.text().then(parseCsvImport);
  }

  protected fromRaw(raw: Record<string, string>): EditableRow {
    return {
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
  }

  validateRow(row: EditableRow) {
    const errors: string[] = [];
    if (!row.joint) errors.push('Joint required');
    if (!VALID_TYPES.has(row.jointType)) errors.push('Invalid joint type');
    row._errors = errors;
  }

  protected override savedVerb() {
    return this.isEditMode() ? 'updated' : 'created';
  }

  protected saveRow(row: EditableRow) {
    const fields = {
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
    };
    if (this.isEditMode() && row._id) updateWeldJoint(row._id, fields);
    else addWeldJoint({ ...fields, createdBy: 'Import' });
  }

  async downloadTemplate() {
    await downloadXlsxTemplate();
    this.toast.add({ severity: 'info', summary: 'Downloaded', detail: 'Template file saved' });
  }

  protected sampleRows(): EditableRow[] {
    return [
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'D5145', joint: 'FW-10014', description: 'Main header to 4" reducer', status: 'development', priority: 'medium', jointType: 'pipe', drawing: 'H711-1234', drawingRev: 'B', jointDesign: 'C-18', weldType: 'Butt', pipeSize: '4"', wallThickness: '0.250"', materialType1: '02-CS', materialType2: '02-CS', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: '', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'D5145', joint: 'SW-10008', description: '90 elbow connection', status: 'unlocked', priority: 'medium', jointType: 'pipe', drawing: 'H711-1234', drawingRev: 'B', jointDesign: 'P-9', weldType: 'Socket', pipeSize: '3"', wallThickness: '0.219"', materialType1: '02-CS', materialType2: '02-CS', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: 'Standard procedure', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'N6612', joint: 'ST-10005', description: 'I-beam splice connection', status: 'development', priority: 'low', jointType: 'structural', drawing: 'S720-4518', drawingRev: 'A', jointDesign: 'V-22', weldType: 'Butt', pipeSize: '', wallThickness: '', materialType1: '04-AS', materialType2: '02-CS', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: '', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'N6612', joint: 'LO-10017', description: 'Nozzle to header', status: 'locked', priority: 'high', jointType: 'pipe', drawing: 'S720-4518', drawingRev: 'C', jointDesign: 'C-65', weldType: 'Boss', pipeSize: '6"', wallThickness: '0.219"', materialType1: '13-SS316', materialType2: '13-SS316', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: 'PWHT required', createdBy: 'Sample', extras: blankJointExtras() },
      { _id: '', _raw: {}, _errors: [], _saved: false, hull: 'T8080', joint: 'ST-10012', description: 'Pipe support to beam', status: 'development', priority: 'medium', jointType: 'structural', drawing: 'H731-5002', drawingRev: 'A', jointDesign: 'P-12', weldType: 'Attachment', pipeSize: '', wallThickness: '', materialType1: '02-CS', materialType2: '02-CS', rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: 'X', notes: '', createdBy: 'Sample', extras: blankJointExtras() },
    ];
  }

  findJoints() {
    const ids = this.pasteInput().split(/[,\n\r]+/).map(s => s.trim()).filter(Boolean);
    if (!ids.length) return;

    const all = weldJoints();
    const found: WeldJoint[] = [];
    const notFound: string[] = [];
    for (const id of ids) {
      const match = all.find(j => j.joint === id);
      if (match) found.push(match);
      else notFound.push(id);
    }

    this.findResult.set({ found: found.length, total: ids.length, notFound });
    if (found.length) {
      this.setRows(found.map(toEditable));
      this.toast.add({ severity: 'info', summary: 'Found', detail: `${found.length} joints loaded for editing` });
    }
  }
}
