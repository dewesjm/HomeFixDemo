import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Job } from '../../../data/jobs';
import { StageTemplate } from '../../model/workflow-types';
import { updateStageTemplate } from '../../routing/stage-templates';

@Component({
  selector: 'app-routing-description', standalone: true, imports: [FormsModule],
  template: `
    <dialog class="modal modal-open" aria-labelledby="routing-description-title" (close)="closed.emit()"
            (keydown.escape)="closed.emit(); $event.stopPropagation()">
      <div class="modal-box max-w-xl">
        <h3 id="routing-description-title" class="text-lg font-semibold">{{ routing().label }}</h3>
        <p class="text-sm my-2">Describe this routing in plain English. This is reference text; routing rules control what happens.</p>
        <label for="routing-description" class="block font-semibold mb-2">Description</label>
        <textarea id="routing-description" class="textarea textarea-bordered w-full" rows="6"
                  placeholder="Explain when this routing is used and what needs to happen…" [(ngModel)]="description"></textarea>
        @if (error) { <p class="text-error" role="alert">{{ error }}</p> }
        <div class="modal-action">
          <button type="button" class="btn btn-sm" (click)="closed.emit()">Cancel</button>
          <button type="button" class="btn btn-sm btn-primary" (click)="save()">Save description</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" (click)="closed.emit()">Close description</button></form>
    </dialog>
  `,
})
export class RoutingDescriptionComponent implements OnInit {
  routing = input.required<StageTemplate>();
  trade = input.required<Job['trade']>();
  closed = output<void>();
  description = '';
  error = '';

  ngOnInit() { this.description = this.routing().description ?? ''; }

  save() {
    try {
      updateStageTemplate(this.trade(), this.routing().id, { description: this.description.trim() });
      this.closed.emit();
    } catch {
      this.error = 'The description could not be saved. Try again.';
    }
  }
}
