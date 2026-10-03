/* cross-stage fabrication fields (Welding trade) — separate from routing since these fields
   aren't tied to any one stage and don't affect stage progression */
import { Injectable, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { show } from '../../data/workflow';
import { SHIP_LOCATION_DEPENDENTS, shipLocationOptions } from '../../data/ship-locations';
import { WorkflowStore } from './workflow-store.service';

@Injectable({ providedIn: 'root' })
export class FabricationDataService {
  private store = inject(WorkflowStore);

  setFabricationData(job: Job, key: string, value: string) {
    this.store.update(job, wf => {
      const prev = wf.fabricationData[key] ?? '';
      let fabricationData = { ...wf.fabricationData, [key]: value };
      let next = this.store.withHistory(wf, { ...wf, fabricationData }, {
        section: 'Fabrication',
        who: wf.technician,
        action: key,
        from: show(prev),
        to: show(value)
      });
      /* a Frame/Usage no longer offered for the new Deck/Frame/P-S-CL is blanked, each with its own entry */
      for (const dep of SHIP_LOCATION_DEPENDENTS[key] ?? []) {
        const old = fabricationData[dep] ?? '';
        if (!old || shipLocationOptions(dep, job.hull, fabricationData).some(o => o.value === old)) continue;
        fabricationData = { ...fabricationData, [dep]: '' };
        next = this.store.withHistory(next, { ...next, fabricationData }, {
          section: 'Fabrication', who: wf.technician, action: dep, from: show(old), to: show('')
        });
      }
      return next;
    });
  }
}
