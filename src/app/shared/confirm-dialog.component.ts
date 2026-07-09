/* Renders the pending confirm request, if any, as a native <dialog> + DaisyUI modal. */
import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <dialog #dlg class="modal">
      @if (confirm.request(); as req) {
        <div class="modal-box">
          @if (req.header) {
            <h3 class="text-lg font-semibold">{{ req.header }}</h3>
          }
          <p class="py-4">{{ req.message }}</p>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" (click)="respond(false)">
              {{ req.rejectLabel ?? 'Cancel' }}
            </button>
            <button type="button" class="btn btn-primary" (click)="respond(true)">
              {{ req.acceptLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" (click)="respond(false)">close</button>
        </form>
      }
    </dialog>
  `
})
export class ConfirmDialogComponent {
  confirm = inject(ConfirmService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const open = !!this.confirm.request();
      const el = this.dlg().nativeElement;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    });
  }

  respond(accepted: boolean) {
    this.confirm.resolve(accepted);
  }
}
