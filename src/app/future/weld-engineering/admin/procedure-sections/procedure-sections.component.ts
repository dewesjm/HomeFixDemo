/* Weld Engineering Admin - Procedure Sections: every procedure section and its fields, numbered by
   list order; add, rename, reorder, move and remove them. Which procedures have a section is ticked
   on each procedure's edit form. Definitions are in weld-engineering/procedure-sections.ts; every change
   goes through the section service (procedure-service/section-service.ts), which runs the checks,
   including what procedure-section-usage.ts blocks. */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideArrowDown, LucideArrowUp, LucideCheck, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';

import { ToastService } from '../../../../shared/toast.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { procedures } from '../../../../data/procedures';
import {
  procedureSections, fieldTypeLabel, EXTRA_FIELD_TYPE_OPTIONS, type ExtraField, type ExtraFieldType, type ProcedureSection
} from '../../procedure-sections';
import { sectionRemoveBlock, fieldRemoveBlock, type UsageBlock } from '../../procedure-section-usage';
import * as sectionService from '../../procedure-service/section-service';
import type { ServiceFailure, ServiceResult } from '../../procedure-service/service-result';
import { ADMIN_TABLE_SOURCES, sourceLabel, type OptionSourceId } from '../../procedure-option-sources';
import { hasFixedFullWidth, parseWidth, widthText, PDF_PAGE_WIDTH_PX } from '../../procedure-field-width';

interface FieldDraftForm { label: string; type: ExtraFieldType; required: boolean; optionsText: string; source: OptionSourceId | ''; }

@Component({
  selector: 'app-procedure-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlus, LucidePencil, LucideTrash2, LucideArrowUp, LucideArrowDown, LucideCheck, LucideX],
  templateUrl: './procedure-sections.component.html'
})
export class ProcedureSectionsComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  sections = procedureSections;
  typeOptions = EXTRA_FIELD_TYPE_OPTIONS;
  tableSources = ADMIN_TABLE_SOURCES;
  typeLabel = fieldTypeLabel;
  fixedFullWidth = hasFixedFullWidth;
  widthText = widthText;
  pageWidthPx = PDF_PAGE_WIDTH_PX;

  newSectionName = '';
  /* the "add a field" inputs under each section, by section id */
  drafts: Record<string, FieldDraftForm> = {};

  /* first procedure with any section values, for the "How it's stored" example */
  example = computed(() => procedures().find(p => Object.keys(p.extraFields).length) ?? null);

  procedureTotal = computed(() => procedures().length);

  /* a refused removal or move, shown under the section it happened in */
  blocked = signal<(UsageBlock & { sectionId: string; heading: string }) | null>(null);

  /* inline renames: the section id or field key being renamed, and the typed name */
  renamingSection = signal<string | null>(null);
  renamingField = signal<string | null>(null);
  nameDraft = '';

  /* how many procedures have this section ticked */
  procedureCount(sectionId: string): number {
    return procedures().filter(p => p.sectionIds.includes(sectionId)).length;
  }

  draftFor(sectionId: string): FieldDraftForm {
    return this.drafts[sectionId] ??= { label: '', type: 'text', required: false, optionsText: '', source: '' };
  }

  /* typed choices, or the table/list the choices come from */
  choicesText(f: ExtraField): string {
    if (f.source) return sourceLabel(f.source);
    return f.options.join(', ') || '-';
  }

  /* a refused change: the procedures blocking it under the section, anything else as a toast */
  private refused(result: ServiceFailure, sectionId: string) {
    if (result.procedures) {
      this.blocked.set({ problem: result.error, procedures: result.procedures, sectionId, heading: `${result.title}.` });
    } else {
      this.toast.add({ severity: 'warn', summary: result.title, detail: result.error });
    }
  }

  /* true when the change was made */
  private done(result: ServiceResult<unknown>, sectionId = ''): boolean {
    if (!result.ok) this.refused(result, sectionId);
    return result.ok;
  }

  addSection() {
    if (!this.done(sectionService.addSection(this.newSectionName))) return;
    this.toast.add({ severity: 'success', summary: 'Section added', detail: this.newSectionName.trim() });
    this.newSectionName = '';
  }

  addField(section: ProcedureSection) {
    const form = this.draftFor(section.id);
    const draft = {
      label: form.label, type: form.type, required: form.required,
      options: form.optionsText.split(',').map(o => o.trim()).filter(Boolean),
      source: form.source || undefined,
    };
    if (!this.done(sectionService.addField(section.id, draft))) return;
    this.toast.add({ severity: 'success', summary: 'Field added', detail: `${section.name}: ${draft.label.trim()}` });
    delete this.drafts[section.id];
  }

  /* ── Rename ── */
  startSectionRename(s: ProcedureSection) {
    this.renamingField.set(null);
    this.renamingSection.set(s.id);
    this.nameDraft = s.name;
  }

  saveSectionRename(s: ProcedureSection) {
    if (!this.done(sectionService.renameSection(s.id, this.nameDraft))) return;
    this.renamingSection.set(null);
  }

  startFieldRename(f: ExtraField) {
    this.renamingSection.set(null);
    this.renamingField.set(f.key);
    this.nameDraft = f.label;
  }

  saveFieldRename(f: ExtraField) {
    if (!this.done(sectionService.renameField(f.key, this.nameDraft))) return;
    this.renamingField.set(null);
  }

  cancelRename() {
    this.renamingSection.set(null);
    this.renamingField.set(null);
  }

  /* ── Width ── */
  /* the field whose pixel width is being typed, and the typed text */
  sizingField = signal<string | null>(null);
  widthDraft = '';

  widthMode(f: ExtraField): 'auto' | 'full' | 'px' {
    if (this.sizingField() === f.key || typeof f.width === 'number') return 'px';
    return f.width === 'full' ? 'full' : 'auto';
  }

  /* Auto and Full line save straight away; Pixels waits for a typed width */
  setWidthMode(f: ExtraField, mode: string) {
    if (mode === 'px') {
      this.sizingField.set(f.key);
      this.widthDraft = typeof f.width === 'number' ? String(f.width) : '';
      return;
    }
    this.sizingField.set(null);
    this.done(sectionService.setFieldWidth(f.key, mode === 'full' ? 'full' : null));
  }

  startWidthEdit(f: ExtraField) {
    this.setWidthMode(f, 'px');
  }

  saveWidth(f: ExtraField) {
    const parsed = parseWidth(this.widthDraft);
    if ('problem' in parsed) {
      this.toast.add({ severity: 'warn', summary: 'Width not set', detail: parsed.problem });
      return;
    }
    if (!this.done(sectionService.setFieldWidth(f.key, parsed.width))) return;
    this.sizingField.set(null);
  }

  /* back to how it was; a field that had no pixel width yet goes back to its earlier setting */
  cancelWidth() {
    this.sizingField.set(null);
  }

  /* ── Reorder and move ── */
  shiftSection(s: ProcedureSection, delta: number) {
    this.done(sectionService.shiftSection(s.id, delta));
  }

  shiftField(f: ExtraField, delta: number) {
    this.done(sectionService.shiftField(f.key, delta));
  }

  /* other sections a field can move to */
  moveTargets(section: ProcedureSection): ProcedureSection[] {
    return this.sections().filter(s => s.id !== section.id);
  }

  moveField(section: ProcedureSection, f: ExtraField, select: HTMLSelectElement) {
    const targetId = select.value;
    select.value = '';
    if (!targetId) return;
    if (!this.done(sectionService.moveField(f.key, targetId), section.id)) return;
    this.blocked.set(null);
    const target = this.sections().find(s => s.id === targetId);
    this.toast.add({ severity: 'success', summary: 'Field moved', detail: `${f.label} to ${target?.name}` });
  }

  /* ── Remove ──
     The blocks are checked before asking to confirm, so nobody confirms a removal that would be refused;
     the service checks them again. */
  removeSection(s: ProcedureSection) {
    const block = sectionRemoveBlock(s, procedures());
    if (block) {
      this.blocked.set({ ...block, sectionId: s.id, heading: `${s.name} can't be removed.` });
      return;
    }
    this.blocked.set(null);
    this.confirm.confirmDelete(`section ${s.name}`, () => {
      if (!this.done(sectionService.removeSection(s.id), s.id)) return;
      this.toast.add({ severity: 'success', summary: 'Section removed', detail: s.name });
    });
  }

  removeField(section: ProcedureSection, f: ExtraField) {
    const block = fieldRemoveBlock(f.key, this.sections(), procedures());
    if (block) {
      this.blocked.set({ ...block, sectionId: section.id, heading: `${f.label} can't be removed.` });
      return;
    }
    this.blocked.set(null);
    this.confirm.confirmDelete(`field ${f.label}`, () => {
      if (!this.done(sectionService.removeField(f.key), section.id)) return;
      this.toast.add({ severity: 'success', summary: 'Field removed', detail: `${section.name}: ${f.label}` });
    });
  }
}
