import { Component, effect, ElementRef, input, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideWorkflow } from '@lucide/angular';

@Component({
  selector: 'app-routing-bar',
  standalone: true,
  imports: [CommonModule, LucideWorkflow],
  templateUrl: './routing-bar.component.html'
})
export class RoutingBarComponent {
  steps = input.required<{ label: string; disabled: boolean; stageIndex: number }[]>();
  selectedStep = input.required<number>();

  private scrollContainer = viewChild.required<ElementRef<HTMLElement>>('scrollContainer');

  constructor() {
    effect(() => {
      const idx = this.selectedStep();
      const steps = untracked(() => this.steps());
      const pos = steps.findIndex(s => s.stageIndex === idx);
      if (pos < 0) return;
      queueMicrotask(() => {
        const container = this.scrollContainer().nativeElement;
        const el = container.querySelectorAll('.routing-step')[pos] as HTMLElement | null;
        if (!el) return;
        const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      });
    });
  }
}
