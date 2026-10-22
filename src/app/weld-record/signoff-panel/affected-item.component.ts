/* Weld Build-Up's Affected Item: the joint members the build-up affects, each with its MIC verified
   when its MCL requires traceability; at least one must be picked */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../../data/workflow';
import { requiresTraceability } from '../../data/mcl-traceability';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-affected-item',
  standalone: true,
  host: { class: 'block' },
  template: `
    @let st = stage();
    <div class="flex flex-col gap-1 mb-sm">
      <span class="stage-field-label">Affected Item<span class="text-error">*</span></span>
      @for (it of affectedItemSlots; track it.key) {
        @if (ctx().job[it.key]) {
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <!-- item and MIC are fixed 25ch columns so rows line up -->
            <label class="flex items-center gap-1.5 cursor-pointer w-[25ch] shrink-0">
              <input type="checkbox" class="checkbox checkbox-sm" [class.checkbox-error]="!!ctx().fieldError(st.id, 'affectedItem')"
                     [disabled]="!fieldsEditable()"
                     [checked]="isAffected(it.key)"
                     (change)="ctx().toggleAffectedItem(st, it.key, $event)" />
              <span class="truncate" [title]="ctx().job[it.key]">{{ ctx().job[it.key] }}</span>
            </label>
            @if (isAffected(it.key) && micRequired(ctx().job[it.mcl])) {
              <span class="w-[25ch] shrink-0 truncate" [title]="it.micLabel + ': ' + (micValue(it.mic) || '-')">{{ it.micLabel }}: <span class="mono">{{ micValue(it.mic) || '-' }}</span></span>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" class="checkbox checkbox-xs" [class.checkbox-error]="!!ctx().fieldError(st.id, 'affectedItem') && st.inputs[it.micVerified] !== 'yes'"
                       [disabled]="!fieldsEditable()"
                       [checked]="st.inputs[it.micVerified] === 'yes'"
                       (change)="st.inputs[it.micVerified] = $any($event.target).checked ? 'yes' : ''; ctx().clearFieldError(st.id, 'affectedItem')" />
                <span>{{ it.micLabel }} verified<span class="text-error">*</span></span>
              </label>
            }
          </div>
        }
      }
      @if (ctx().fieldError(st.id, 'affectedItem'); as err) {
        <div class="field-error">{{ err }}</div>
      }
    </div>
  `
})
export class AffectedItemComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  /* the two joint members a weld build-up can affect, with their MCL, MIC (fabricationData key)
     and MIC-verified keys */
  affectedItemSlots = [
    { key: 'joiningItem', mcl: 'mcl1', mic: 'id1', micLabel: 'MIC 1', micVerified: 'micVerified1' },
    { key: 'joinToItem', mcl: 'mcl2', mic: 'id2', micLabel: 'MIC 2', micVerified: 'micVerified2' },
  ] as const;

  isAffected(key: string): boolean {
    return (this.stage().inputs['affectedItems'] as string | undefined)?.includes(key) ?? false;
  }

  /* MIC 1/MIC 2 (fabricationData id1/id2) only show for a joint member whose MCL requires
     traceability per the admin MCL Traceability table (mcl-traceability.ts) */
  micRequired(mclValue: string): boolean {
    return requiresTraceability(mclValue);
  }

  micValue(mic: string): string {
    return this.ctx().wf().fabricationData[mic] ?? '';
  }

  fieldsEditable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
