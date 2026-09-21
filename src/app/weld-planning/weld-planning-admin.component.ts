import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideSave, LucidePlus, LucideTrash2, LucideArrowLeft } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { ConfirmService } from '../shared/confirm.service';
import {
  adminJointDesigns, persistAdminJointDesigns,
  type AdminJointDesign
} from './weld-planning.data';

@Component({
  selector: 'app-weld-planning-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucidePlus, LucideTrash2, LucideArrowLeft],
  templateUrl: './weld-planning-admin.component.html'
})
export class WeldPlanningAdminComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  /* Joint Designs */
  designs = signal<AdminJointDesign[]>([...adminJointDesigns()]);
  newDesignCode = '';
  newDesignLabel = '';

  /* ── Joint Designs ── */
  addDesign() {
    if (!this.newDesignCode.trim() || !this.newDesignLabel.trim()) return;
    const designs = [...this.designs(), {
      code: this.newDesignCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
      label: this.newDesignLabel.trim(),
      active: true
    }];
    this.designs.set(designs);
    this.newDesignCode = '';
    this.newDesignLabel = '';
  }

  toggleDesignActive(code: string) {
    this.designs.update(list => list.map(d =>
      d.code === code ? { ...d, active: !d.active } : d
    ));
  }

  removeDesign(code: string) {
    this.confirm.confirm({
      header: 'Remove Joint Design',
      message: 'Remove this design option?',
      acceptLabel: 'Remove',
      accept: () => {
        this.designs.update(list => list.filter(d => d.code !== code));
      }
    });
  }

  saveDesigns() {
    persistAdminJointDesigns(this.designs());
    this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Joint designs updated' });
  }
}
