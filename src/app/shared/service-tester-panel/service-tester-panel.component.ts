/* Service tester: pick one of a system's service operations, fill in its parameters and run it to
   see the exact response. The page around it passes the operations (service-operation.ts). */
import { Component, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlay, LucideRotateCcw } from '@lucide/angular';

import { readArgs, startingInputs, type ServiceOperation } from './service-operation';

interface Run { operation: string; args: Record<string, unknown>; response: unknown; }

@Component({
  selector: 'app-service-tester-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlay, LucideRotateCcw],
  templateUrl: './service-tester-panel.component.html'
})
export class ServiceTesterPanelComponent {
  operations = input.required<ServiceOperation[]>();

  selectedName = signal('');
  selected = computed(() => this.operations().find(o => o.name === this.selectedName()) ?? this.operations()[0]);
  inputs: Record<string, string> = {};
  problem = signal('');
  last = signal<Run | null>(null);

  constructor() {
    /* a different operation starts from its own example inputs and clears the last response */
    effect(() => {
      const op = this.selected();
      this.inputs = op ? startingInputs(op) : {};
      this.problem.set('');
      this.last.set(null);
    });
  }

  run() {
    const op = this.selected();
    if (!op) return;
    const read = readArgs(op, this.inputs);
    if ('problem' in read) {
      this.problem.set(read.problem);
      return;
    }
    this.problem.set('');
    let response: unknown;
    try { response = op.run(read.args); } catch (e) { response = { error: String(e) }; }
    this.last.set({ operation: op.name, args: read.args, response });
  }

  reset() {
    const op = this.selected();
    if (op) this.inputs = startingInputs(op);
    this.problem.set('');
    this.last.set(null);
  }
}
