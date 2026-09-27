/* The frame shared by the spreadsheet import pages: row/error/saved counts, file / template /
   sample / Save All / Done actions, the editable grid with a status column, and the empty state.
   The page supplies its columns as two templates:
     <app-import-grid [importer]="this" noun="joints" doneLink="/weld-planning">
       <ng-template #headerCells><th>Hull</th>…</ng-template>
       <ng-template #rowCells let-row><td><input [(ngModel)]="row.hull" /></td>…</ng-template>
     </app-import-grid>
   With [fileActions]="false" the file buttons are hidden and an [importEmpty] element replaces the
   empty state (Mass Edit's paste box); it can open the file picker with the grid's openFilePicker(). */
import { Component, ElementRef, TemplateRef, contentChild, input, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideSave, LucideCheckCircle, LucideAlertTriangle } from '@lucide/angular';

import { BulkImport } from './bulk-import';

@Component({
  selector: 'app-import-grid',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, LucideSave, LucideCheckCircle, LucideAlertTriangle],
  template: `
    <input #fileInput type="file" accept=".xlsx,.csv" hidden (change)="importer().onFileSelected($event)" />

    <div class="import-actions">
      @if (importer().loading()) {
        <span class="c-muted">Processing...</span>
      }
      @if (importer().rows().length > 0) {
        <span class="c-muted">{{ importer().rows().length }} rows</span>
        <span [class.c-red]="importer().errorCount() > 0" [class.c-green]="importer().errorCount() === 0">
          {{ importer().errorCount() }} errors
        </span>
        <span class="c-green">{{ importer().savedCount() }} saved</span>
      }
      <span class="spacer"></span>
      @if (importer().rows().length === 0 && !importer().loading() && fileActions()) {
        <button type="button" class="btn btn-sm" (click)="importer().downloadTemplate()">Download Template</button>
        <button type="button" class="btn btn-sm" (click)="openFilePicker()">Choose File</button>
        <button type="button" class="btn btn-sm btn-primary" (click)="importer().loadSample()">Use Sample</button>
      }
      @if (importer().rows().length > 0 && importer().savedCount() === 0) {
        <button type="button" class="btn btn-sm btn-primary" (click)="importer().saveAll()" [disabled]="importer().saving()">
          <svg lucideSave class="size-4"></svg> Save All ({{ importer().rows().length - importer().errorCount() }} valid)
        </button>
      }
      @if (importer().savedCount() > 0 && importer().savedCount() === importer().rows().length) {
        <a [routerLink]="doneLink()" class="btn btn-sm btn-primary">Done</a>
      }
    </div>

    @if (importer().rows().length > 0) {
      <div class="overflow-x-auto">
        <table class="table table-sm import-table">
          <thead>
            <tr>
              <th class="import-status-cell">#</th>
              <ng-container [ngTemplateOutlet]="headerCells()" />
            </tr>
          </thead>
          <tbody>
            @for (row of importer().rows(); track $index; let i = $index) {
              <tr [class]="row._saved ? 'table-success' : (row._errors.length > 0 ? 'table-error' : '')">
                <td class="import-status-cell">
                  @if (row._saved) {
                    <svg lucideCheckCircle class="size-4 c-green"></svg>
                  } @else if (row._errors.length > 0) {
                    <span class="cursor-help" [title]="row._errors.join(', ')">
                      <svg lucideAlertTriangle class="size-4 c-red"></svg>
                    </span>
                  } @else {
                    {{ i + 1 }}
                  }
                </td>
                <ng-container [ngTemplateOutlet]="rowCells()" [ngTemplateOutletContext]="{ $implicit: row }" />
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!importer().loading()) {
      @if (fileActions()) {
        <div class="import-empty">
          <p>Import a .xlsx or .csv file to bulk-load {{ noun() }}.</p>
          <div class="import-empty-actions">
            <button type="button" class="btn btn-sm" (click)="openFilePicker()">Choose File</button>
            <button type="button" class="btn btn-sm btn-ghost underline" (click)="importer().downloadTemplate()">Download Template</button>
            <button type="button" class="btn btn-sm btn-primary" (click)="importer().loadSample()">Use Sample</button>
          </div>
        </div>
      } @else {
        <ng-content select="[importEmpty]" />
      }
    }
  `,
})
export class ImportGridComponent {
  importer = input.required<BulkImport<any>>();
  noun = input.required<string>();
  doneLink = input.required<string>();
  fileActions = input(true);

  headerCells = contentChild.required<TemplateRef<unknown>>('headerCells');
  rowCells = contentChild.required<TemplateRef<unknown>>('rowCells');
  private fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  openFilePicker() {
    this.fileInput().nativeElement.click();
  }
}
