/* Shown by Signoff when the stage has deviations: lists each one (entered vs required), asks for a
   reason and the sign-off password, then signs. Replaces the plain sign-off confirm in that case. */
import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeviationItem } from '../../data/workflow';

export interface DeviationAcceptRequest { stageLabel: string; items: DeviationItem[]; routingNote: string }

@Component({
  selector: 'app-deviation-accept-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <dialog #dlg class="modal" (cancel)="cancelled.emit()">
      @if (request(); as req) {
        <div class="modal-box max-w-3xl">
          <h3 class="text-lg font-semibold">Accept deviations — {{ req.stageLabel }}</h3>
          <p class="py-2">
            These values are outside what the procedure allows. Signing records them as deviations and puts the
            joint on hold: no later step can be signed until the deviation is dealt with.
          </p>
          <div class="overflow-x-auto">
            <table class="table">
              <thead><tr><th>Item</th><th>Entered</th><th>Required</th></tr></thead>
              <tbody>
                @for (i of req.items; track $index) {
                  <tr>
                    <td class="font-semibold">{{ i.label }}</td>
                    <td class="text-error">{{ i.entered }}</td>
                    <td>{{ i.required }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <label class="block mt-3">
            <span class="meta mb-1 block">Reason <span class="text-error">*</span></span>
            <textarea #reasonBox class="textarea textarea-bordered w-full" rows="2"
                      placeholder="Why the work was done this way"
                      [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
          </label>
          <p class="py-3">
            By signing, I certify that all recorded values are accurate and that the deviations above are what was
            actually done.{{ req.routingNote }}
          </p>
          <label class="block">
            <span class="meta mb-1 block">Password</span>
            <input type="password" class="input input-bordered w-full"
                   autocomplete="off" data-lpignore="true" data-1p-ignore="true"
                   placeholder="Enter password to confirm"
                   [ngModel]="password()" (ngModelChange)="password.set($event)" />
          </label>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancel</button>
            <button type="button" class="btn btn-warning" [disabled]="!reason().trim() || !password().trim()"
                    (click)="accepted.emit(reason().trim())">
              Accept and sign
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" (click)="cancelled.emit()">close</button>
        </form>
      }
    </dialog>
  `
})
export class DeviationAcceptDialogComponent {
  request = input<DeviationAcceptRequest | null>(null);
  accepted = output<string>();
  cancelled = output<void>();

  reason = signal('');
  password = signal('');

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private reasonBox = viewChild<ElementRef<HTMLTextAreaElement>>('reasonBox');

  constructor() {
    effect(() => {
      const open = !!this.request();
      const el = this.dlg().nativeElement;
      if (open && !el.open) { this.reason.set(''); this.password.set(''); el.showModal(); }
      if (!open && el.open) el.close();
    });
    effect(() => this.reasonBox()?.nativeElement.focus());
  }
}
