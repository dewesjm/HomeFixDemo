/* file attachments on a job's workflow (NDT stages) */
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../shared/toast.service';
import { Job } from '../../data/jobs';
import { Attachment } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private store = inject(WorkflowStore);
  private messages = inject(ToastService);
  private seq = Date.now();

  addAttachment(job: Job, name: string) {
    this.store.update(job, wf => {
      const att: Attachment = { id: `a${++this.seq}`, name, addedBy: wf.technician, addedAt: new Date().toISOString() };
      return this.store.withHistory(wf, { ...wf, attachments: [...wf.attachments, att] }, {
        section: 'Attachments',
        who: wf.technician,
        action: 'Attachment added',
        to: name
      });
    });
    this.messages.add({ severity: 'success', summary: 'Attachment added', detail: name, life: 3000 });
  }

  removeAttachment(job: Job, id: string) {
    this.store.update(job, wf => {
      const att = wf.attachments.find(a => a.id === id);
      return this.store.withHistory(wf, { ...wf, attachments: wf.attachments.filter(a => a.id !== id) }, {
        section: 'Attachments',
        who: wf.technician,
        action: 'Attachment removed',
        to: att?.name ?? id
      });
    });
    this.messages.add({ severity: 'info', summary: 'Attachment removed', life: 3000 });
  }
}
