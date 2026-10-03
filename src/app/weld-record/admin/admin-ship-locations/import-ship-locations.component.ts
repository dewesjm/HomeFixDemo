/* Admin → Ship Locations → Import: bulk-add rows from a .csv/.xlsx file or a sample set; the shared
   load/validate/save flow is BulkImport, the frame is app-import-grid. Rows already on the list are errors. */
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

import { BulkImport } from '../../../shared/bulk-import';
import { ImportGridComponent } from '../../../shared/import-grid.component';
import { ShipLocationEntry, PSCL_VALUES, getShipLocations, setShipLocations } from '../../../data/ship-locations';
import { HULLS } from '../../../data/jobs';
import { parseCsvImport, parseXlsxImport } from '../../../weld-planning/weld-planning.data';
import { downloadCsv } from '../../../data/export-csv';

type ImportRow = ShipLocationEntry & { _errors: string[]; _saved: boolean };

const keyOf = (e: ShipLocationEntry) => [e.hull, e.deck, e.frame, e.pscl, e.usage].join('|');
const blank = (): ImportRow => ({ _errors: [], _saved: false, hull: '', deck: '', frame: '', pscl: '', usage: '' });

@Component({
  selector: 'app-import-ship-locations',
  standalone: true,
  imports: [FormsModule, RouterLink, ImportGridComponent, LucideArrowLeft],
  templateUrl: './import-ship-locations.component.html'
})
export class ImportShipLocationsComponent extends BulkImport<ImportRow> {
  protected readonly noun = 'ship locations';
  hulls = HULLS;
  psclValues = PSCL_VALUES;

  protected parseFile(file: File): Promise<Record<string, string>[]> {
    return file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? parseXlsxImport(file) : file.text().then(parseCsvImport);
  }

  protected fromRaw(raw: Record<string, string>): ImportRow {
    const get = (...keys: string[]) => String(keys.map(k => raw[k]).find(v => v) ?? '').trim();
    return {
      ...blank(),
      hull: get('Hull', 'hull').toUpperCase(),
      deck: get('Deck', 'deck'),
      frame: get('Frame', 'frame'),
      pscl: get('P/S/CL', 'pscl', 'PSCL').toUpperCase(),
      usage: get('Usage', 'usage'),
    };
  }

  validateRow(row: ImportRow) {
    const errors: string[] = [];
    if (!HULLS.includes(row.hull)) errors.push('Hull not found');
    if (!row.deck.trim()) errors.push('Deck required');
    if (!row.frame.trim()) errors.push('Frame required');
    if (!PSCL_VALUES.includes(row.pscl)) errors.push('P/S/CL must be P, S or CL');
    if (!row.usage.trim()) errors.push('Usage required');
    if (getShipLocations().some(e => keyOf(e) === keyOf(row))) errors.push('Already on the list');
    row._errors = errors;
  }

  /* re-check a row after it's edited in the grid */
  revalidate(row: ImportRow) {
    this.validateRow(row);
    this.errorCount.set(this.rows().filter(r => !r._saved && r._errors.length > 0).length);
  }

  protected sampleRows(): ImportRow[] {
    const hull = HULLS[0];
    return [
      { ...blank(), hull, deck: 'D6', frame: 'F70', pscl: 'P', usage: 'Tank' },
      { ...blank(), hull, deck: 'D6', frame: 'F70', pscl: 'S', usage: 'Tank' },
      { ...blank(), hull, deck: 'D6', frame: 'F74', pscl: 'CL', usage: 'Machinery' },
    ];
  }

  downloadTemplate() {
    downloadCsv('ship-locations-template', ['Hull', 'Deck', 'Frame', 'P/S/CL', 'Usage'].map(h => ({ header: h, value: () => '' })), []);
  }

  protected saveRow(row: ImportRow) {
    const entries = getShipLocations();
    const entry: ShipLocationEntry = { hull: row.hull, deck: row.deck.trim(), frame: row.frame.trim(), pscl: row.pscl, usage: row.usage.trim() };
    if (entries.some(e => keyOf(e) === keyOf(entry))) throw new Error('duplicate');
    setShipLocations([...entries, entry]);
  }
}
