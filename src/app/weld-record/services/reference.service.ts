/* a job's References (file names on its workflow), see showsReferences() (the step's definition) */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { Reference } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private store = inject(WorkflowStore);
  private messages = inject(ToastService);
  private seq = Date.now();

  addReference(job: Job, name: string) {
    this.store.update(job, wf => {
      const att: Reference = { id: `a${++this.seq}`, name, addedBy: wf.technician, addedAt: new Date().toISOString() };
      return this.store.withHistory(wf, { ...wf, references: [...wf.references, att] }, {
        section: 'References',
        who: wf.technician,
        action: 'Reference added',
        to: name
      });
    });
    this.messages.add({ severity: 'success', summary: 'Reference added', detail: name, life: 3000 });
  }

  removeReference(job: Job, id: string) {
    this.store.update(job, wf => {
      const att = wf.references.find(a => a.id === id);
      return this.store.withHistory(wf, { ...wf, references: wf.references.filter(a => a.id !== id) }, {
        section: 'References',
        who: wf.technician,
        action: 'Reference removed',
        to: att?.name ?? id
      });
    });
    this.messages.add({ severity: 'info', summary: 'Reference removed', life: 3000 });
  }
}
