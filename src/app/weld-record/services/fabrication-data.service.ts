/* cross-stage fabrication fields (Welding trade) — separate from routing since these fields
   aren't tied to any one stage and don't affect stage progression */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { show } from '../../data/workflow';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class FabricationDataService {
  private store = inject(WorkflowStore);

  setFabricationData(job: Job, key: string, value: string) {
    this.store.update(job, wf => {
      const prev = wf.fabricationData[key] ?? '';
      const fabricationData = { ...wf.fabricationData, [key]: value };
      return this.store.withHistory(wf, { ...wf, fabricationData }, {
        section: 'Fabrication',
        who: wf.technician,
        action: key,
        from: show(prev),
        to: show(value)
      });
    });
  }
}
