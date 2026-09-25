import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideX, LucideArrowLeft } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { WELD_TYPES, PIPE_SIZES, WALL_THICKNESSES, MATERIALS_1, MATERIALS_2, HULLS } from '../data/jobs';
import {
  addWeldJoint, updateWeldJoint, getWeldJoint, NDT_FIELDS,
  JOINT_STATUS_OPTIONS, JOINT_TYPE_OPTIONS,
  adminJointDesigns, JOINT_EXTRA_FIELDS, blankJointExtras, shipForHull,
  type JointExtraGroup,
  type WeldJoint
} from './weld-planning.data';


@Component({
  selector: 'app-weld-planning-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideX, LucideArrowLeft],
  templateUrl: './weld-planning-form.component.html'
})
export class WeldPlanningFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  isEdit = signal(false);
  jointId = signal('');

  form: WeldJoint = {
    id: '', hull: '', joint: '',
    description: '',
    status: 'development', priority: 'medium', jointType: 'pipe',
    drawing: '', drawingRev: '',
    jointDesign: '', weldType: '', pipeSize: '', wallThickness: '',
    materialType1: '', materialType2: '',
    rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: '',
    notes: '',
    ...blankJointExtras(),
    createdBy: 'User', createdAt: '', updatedAt: ''
  };

  isLocked = signal(false);

  statusOptions = JOINT_STATUS_OPTIONS;
  jointTypeOptions = JOINT_TYPE_OPTIONS;
  pipeSizes = PIPE_SIZES;
  wallThicknesses = WALL_THICKNESSES;
  materials1 = MATERIALS_1;
  materials2 = MATERIALS_2;
  weldTypes = WELD_TYPES;
  hulls = HULLS;

  ndtFields = NDT_FIELDS;
  designOptions = adminJointDesigns;

  extraFields(group: JointExtraGroup) {
    return JOINT_EXTRA_FIELDS.filter(f => f.group === group);
  }

  /* Ship follows the Hull, same as the weld record */
  onHullChange(hull: string) {
    this.form.ship = shipForHull(hull);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.jointId.set(id);
      const existing = getWeldJoint(id);
      if (existing) {
        this.form = { ...existing };
        if (existing.status === 'locked') {
          this.isLocked.set(true);
          this.toast.add({ severity: 'warn', summary: 'Locked', detail: 'This joint is locked and cannot be edited' });
          this.router.navigate(['/weld-planning', id]);
        }
      } else {
        this.router.navigate(['/weld-planning']);
      }
    }
  }

  save() {
    if (!this.form.joint) {
      this.toast.add({ severity: 'warn', summary: 'Required fields', detail: 'Joint is required' });
      return;
    }

    if (this.isEdit()) {
      updateWeldJoint(this.jointId(), this.form);
      this.toast.add({ severity: 'success', summary: 'Updated', detail: `${this.form.joint} updated` });
    } else {
      const { id, createdAt, updatedAt, ...rest } = this.form;
      addWeldJoint(rest);
      this.toast.add({ severity: 'success', summary: 'Created', detail: `${this.form.joint} created` });
    }
    this.router.navigate(['/weld-planning']);
  }

  cancel() {
    this.router.navigate(['/weld-planning']);
  }
}
