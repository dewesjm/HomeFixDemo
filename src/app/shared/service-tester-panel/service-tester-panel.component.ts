/* Service tester: pick one of a system's service operations, fill in its parameters, see the full call
   it makes and run it to see the exact response. The page around it passes the operations
   (service-operation.ts). */
import { Component, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideCopy, LucidePlay, LucideRotateCcw } from '@lucide/angular';

import { callText, readArgs, startingInputs, type ServiceOperation } from './service-operation';

interface Run { call: string; response: unknown; }

@Component({
  selector: 'app-service-tester-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideCopy, LucidePlay, LucideRotateCcw],
  templateUrl: './service-tester-panel.component.html'
})
export class ServiceTesterPanelComponent {
  operations = input.required<ServiceOperation[]>();

  selectedName = signal('');
  selected = computed<ServiceOperation | undefined>(() => this.operations().find(o => o.name === this.selectedName()) ?? this.operations()[0]);
  inputs: Record<string, string> = {};
  problem = signal('');
  last = signal<Run | null>(null);
  copied = signal(false);

  constructor() {
    /* a different operation starts from its own example inputs and clears the last response */
    effect(() => {
      const op = this.selected();
      this.inputs = op ? startingInputs(op) : {};
      this.problem.set('');
      this.last.set(null);
    });
  }

  /* the call the current inputs make, or why the inputs can't make one yet */
  fullCall(): { text: string; problem: string } {
    const op = this.selected();
    if (!op) return { text: '', problem: '' };
    const read = readArgs(op, this.inputs);
    return 'problem' in read ? { text: '', problem: read.problem } : { text: callText(op.name, op.call(read.args)), problem: '' };
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
    const args = op.call(read.args);
    let response: unknown;
    try { response = op.fn(...args); } catch (e) { response = { error: String(e) }; }
    this.last.set({ call: callText(op.name, args), response });
  }

  async copyCall() {
    const { text } = this.fullCall();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch { /* clipboard blocked: the call stays visible to copy by hand */ }
  }

  reset() {
    const op = this.selected();
    if (op) this.inputs = startingInputs(op);
    this.problem.set('');
    this.last.set(null);
  }
}
