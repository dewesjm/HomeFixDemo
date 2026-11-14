/* Service tester: pick one of a system's service operations, fill in its parameters, see the full call
   it makes and run it to see the exact response. A call that answers later (a Promise) is waited for;
   a file in the response is offered for download. The page around it passes the operations
   (service-operation.ts). */
import { Component, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideCopy, LucideDownload, LucidePlay, LucidePlus, LucideRotateCcw, LucideX } from '@lucide/angular';

import {
  callText, choiceGroups, readArgs, responseFile, shownResponse, startingInputs,
  type ConditionRow, type OperationParam, type ParamChoice, type ParamInput, type ResponseFile, type ServiceOperation,
} from './service-operation';

import { downloadFile } from '../download-file';

interface Run { call: string; response: unknown; file: ResponseFile | null; }

@Component({
  selector: 'app-service-tester-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideCopy, LucideDownload, LucidePlay, LucidePlus, LucideRotateCcw, LucideX],
  templateUrl: './service-tester-panel.component.html'
})
export class ServiceTesterPanelComponent {
  operations = input.required<ServiceOperation[]>();

  selectedName = signal('');
  selected = computed<ServiceOperation | undefined>(() => this.operations().find(o => o.name === this.selectedName()) ?? this.operations()[0]);
  inputs: Record<string, ParamInput> = {};
  problem = signal('');
  last = signal<Run | null>(null);
  copied = signal(false);
  running = signal(false);

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

  readonly groups = choiceGroups;

  /* a picks input's picked values / a conditions input's rows */
  picked(name: string): string[] { return this.inputs[name] as string[]; }
  rows(name: string): ConditionRow[] { return this.inputs[name] as ConditionRow[]; }

  choiceLabel(p: OperationParam, value: string): string {
    return p.choices?.find(c => c.value === value)?.label ?? value;
  }

  /* picks: the droplist adds the chosen value, then goes back to its prompt */
  pick(name: string, select: HTMLSelectElement) {
    const value = select.value;
    select.value = '';
    if (value && !this.picked(name).includes(value)) this.inputs[name] = [...this.picked(name), value];
  }

  unpick(name: string, value: string) {
    this.inputs[name] = this.picked(name).filter(v => v !== value);
  }

  addRow(name: string) { this.inputs[name] = [...this.rows(name), { key: '', value: '' }]; }
  removeRow(name: string, i: number) { this.inputs[name] = this.rows(name).filter((_, n) => n !== i); }

  /* a condition row's value box placeholder: its choice's hint */
  hint(p: OperationParam, key: string): string {
    return p.choices?.find((c: ParamChoice) => c.value === key)?.hint ?? 'Value';
  }

  async run() {
    const op = this.selected();
    if (!op || this.running()) return;
    const read = readArgs(op, this.inputs);
    if ('problem' in read) {
      this.problem.set(read.problem);
      return;
    }
    this.problem.set('');
    const args = op.call(read.args);
    let response: unknown;
    try { response = op.fn(...args); } catch (e) { response = { error: String(e) }; }
    if (response instanceof Promise) {
      this.running.set(true);
      try { response = await response; } catch (e) { response = { error: String(e) }; }
      this.running.set(false);
      /* the operation was changed while it ran: its answer isn't for the inputs on screen */
      if (this.selected() !== op) return;
    }
    this.last.set({ call: callText(op.name, args), response: shownResponse(response), file: responseFile(response) });
  }

  download(file: ResponseFile) {
    downloadFile(file);
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
