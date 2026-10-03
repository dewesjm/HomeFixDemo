/* Shared logic for the spreadsheet import pages (Import Joints, Load Procedures): load rows from a
   file or a sample, validate them, save the valid ones. Pages extend this and render with
   app-import-grid; each supplies only its own parsing, validation, sample and save. */
import { inject, signal } from '@angular/core';

import { ToastService } from './toast.service';

interface ImportRowState {
  _errors: string[];
  _saved: boolean;
}

export abstract class BulkImport<R extends ImportRowState> {
  protected toast = inject(ToastService);

  rows = signal<R[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorCount = signal(0);
  savedCount = signal(0);

  /* plural noun for messages, e.g. 'procedures' */
  protected abstract readonly noun: string;
  protected abstract parseFile(file: File): Promise<Record<string, string>[]>;
  protected abstract fromRaw(raw: Record<string, string>): R;
  abstract validateRow(row: R): void;
  /* add or update one row; throw to count it as failed */
  protected abstract saveRow(row: R): void;
  protected abstract sampleRows(): R[];
  abstract downloadTemplate(): void | Promise<void>;
  /* 'saved', 'created', 'updated' */
  protected savedVerb(): string { return 'saved'; }

  /* replace the grid contents: validate every row and reset the counts */
  protected setRows(rows: R[]) {
    rows.forEach(r => this.validateRow(r));
    this.rows.set(rows);
    this.errorCount.set(rows.filter(r => r._errors.length > 0).length);
    this.savedCount.set(0);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loading.set(true);
    try {
      const rows = (await this.parseFile(file)).map(raw => this.fromRaw(raw));
      this.setRows(rows);
      this.toast.add({ severity: 'info', summary: 'Loaded', detail: `${rows.length} rows loaded from file` });
    } catch (e: any) {
      this.toast.add({ severity: 'error', summary: 'Parse error', detail: e.message || 'Could not read file' });
    } finally {
      this.loading.set(false);
      input.value = '';
    }
  }

  loadSample() {
    const rows = this.sampleRows();
    this.setRows(rows);
    this.toast.add({ severity: 'info', summary: 'Sample loaded', detail: `${rows.length} sample rows ready to review and save` });
  }

  async saveAll() {
    this.saving.set(true);
    const pending = this.rows().filter(r => !r._saved && r._errors.length === 0);
    let saved = 0;
    let failed = 0;

    for (const row of pending) {
      try {
        this.saveRow(row);
        row._saved = true;
        saved++;
      } catch {
        failed++;
      }
    }

    this.savedCount.set(this.rows().filter(r => r._saved).length);
    this.errorCount.set(this.rows().filter(r => !r._saved && r._errors.length > 0).length);
    if (saved > 0) this.toast.add({ severity: 'success', summary: 'Saved', detail: `${saved} ${this.noun} ${this.savedVerb()}` });
    if (failed > 0) this.toast.add({ severity: 'error', summary: 'Failed', detail: `${failed} rows failed to save` });

    this.saving.set(false);
  }
}
