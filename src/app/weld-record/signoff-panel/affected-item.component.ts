/* Weld Build-Up's Affected Item: the joint members the build-up affects, each with its MIC verified
   row as the step's definition sets it (affectedMicRule); at least one must be picked */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../model/workflow-types';
import { affectedMicRule } from '../signoff-definition/shown-fields';
import { buildConditionContext } from '../signoff-definition/condition-context';
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
            @let mic = micRule(it.rule);
            @if (isAffected(it.key) && mic.shown) {
              <span class="w-[25ch] shrink-0 truncate" [title]="it.micLabel + ': ' + (micValue(it.mic) || '-')">{{ it.micLabel }}: <span class="mono">{{ micValue(it.mic) || '-' }}</span></span>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" class="checkbox checkbox-xs" [class.checkbox-error]="!!ctx().fieldError(st.id, 'affectedItem') && st.inputs[it.micVerified] !== 'yes'"
                       [disabled]="!fieldsEditable()"
                       [checked]="st.inputs[it.micVerified] === 'yes'"
                       (change)="st.inputs[it.micVerified] = $any($event.target).checked ? 'yes' : ''; ctx().clearFieldError(st.id, 'affectedItem')" />
                <span>{{ it.micLabel }} verified@if (mic.required) {<span class="text-error">*</span>}</span>
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

  /* the two joint members a weld build-up can affect, with their MIC (fabricationData key), the
     input their MIC verified checkbox saves to and the definition field that sets its rules */
  affectedItemSlots = [
    { key: 'joiningItem', mic: 'id1', micLabel: 'MIC 1', micVerified: 'micVerified1', rule: 'affectedMicVerified1' },
    { key: 'joinToItem', mic: 'id2', micLabel: 'MIC 2', micVerified: 'micVerified2', rule: 'affectedMicVerified2' },
  ] as const;

  isAffected(key: string): boolean {
    return (this.stage().inputs['affectedItems'] as string | undefined)?.includes(key) ?? false;
  }

  micRule(key: 'affectedMicVerified1' | 'affectedMicVerified2') {
    const wf = this.ctx().wf();
    return affectedMicRule(this.stage(), buildConditionContext(this.stage(), this.ctx().job, wf.stages, wf.fabricationData), key);
  }

  micValue(mic: string): string {
    return this.ctx().wf().fabricationData[mic] ?? '';
  }

  fieldsEditable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
