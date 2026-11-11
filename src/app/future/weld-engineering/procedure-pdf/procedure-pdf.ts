/* Procedure -> pdfmake document definition. Pure data transform, no rendering/DOM -- keeps this
   trivially unit-testable. The only place that touches the actual pdfmake renderer is
   procedure-pdf-actions.ts (procedurePdfDataUrl/downloadProcedurePdf).

   Layout: Revision Record, then the sections (Admin > Procedure Sections, weld-engineering/
   procedure-sections.ts) this procedure has, with their numbers, then its Rules/Conditions. Every page
   carries a header reminding the reader to verify the revision before use. */
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Procedure } from '../../../data/procedures';
import { OVERRIDE_PARTS, sectionsOnProcedure, type ExtraField, type ProcedureSection } from '../procedure-sections';
import { extraValueText, isBlank, isOverride } from '../procedure-field-values';
import { formatDate } from '../../../shared/date-format';
import { packFieldLines } from './pdf-field-lines';

/* a label row over a value row; equal columns unless widths are given */
function limitsTable(rows: [string, string][], widths?: number[], bottom = 12): Content {
  return {
    table: {
      widths: widths ?? rows.map(() => '*'),
      body: [
        rows.map(([label]) => ({ text: label, bold: true, fillColor: '#eeeeee' })),
        rows.map(([, value]) => value || '-'),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#999999',
      vLineColor: () => '#999999',
    },
    margin: [0, 4, 0, bottom] as [number, number, number, number],
  };
}

function revisionRecord(p: Procedure): Content[] {
  if (!p.revisionHistory.length) {
    return [
      { text: 'Revision Record', style: 'sectionHeader' },
      { text: 'No revisions recorded.', italics: true, margin: [0, 0, 0, 12] },
    ];
  }
  return [
    { text: 'Revision Record', style: 'sectionHeader' },
    {
      table: {
        widths: ['auto', 'auto', 'auto', '*'],
        body: [
          [{ text: 'Rev', bold: true, fillColor: '#eeeeee' }, { text: 'Date', bold: true, fillColor: '#eeeeee' },
           { text: 'By', bold: true, fillColor: '#eeeeee' }, { text: 'Note', bold: true, fillColor: '#eeeeee' }],
          ...p.revisionHistory.map(rv => [rv.wpsRev, formatDate(rv.date), rv.by, rv.note]),
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#999999',
        vLineColor: () => '#999999',
      },
      margin: [0, 4, 0, 12] as [number, number, number, number],
    },
  ];
}

/* One section: its plain fields in lines (pdf-field-lines.ts), then each qualification requirement as a list and each
   override group as its own table (only when it has a value). A section with no fields prints its
   heading only. */
function section(p: Procedure, s: ProcedureSection, n: number): Content[] {
  const out: Content[] = [{ text: `${n}. ${s.name}`, style: 'sectionHeader' }];
  const value = (f: ExtraField) => p.extraFields[f.key];
  const plain = s.fields.filter(f => f.type !== 'quals' && f.type !== 'override');
  const lines = packFieldLines(plain.map(f => ({ label: f.label, value: extraValueText(f, value(f)), width: f.width })));
  lines.forEach((line, i) => out.push(limitsTable(
    line.cells.map(c => [c.label, c.value]), line.widths, i === lines.length - 1 ? 12 : 2,
  )));
  for (const f of s.fields) {
    if (f.type === 'quals') {
      if (f.label !== s.name) out.push({ text: f.label, bold: true });
      out.push({ ul: [extraValueText(f, value(f)) || '-'], margin: [0, 4, 0, 12] });
    }
    const o = value(f);
    if (f.type === 'override' && isOverride(o) && !isBlank(o)) {
      out.push(
        { text: f.label, style: 'sectionHeader' },
        limitsTable(OVERRIDE_PARTS.filter(part => part.key !== 'note').map(part => [part.label, o[part.key]])),
      );
      if (o.note) out.push({ text: o.note, italics: true, margin: [0, -8, 0, 12] });
    }
  }
  return out;
}

export function procedureDocDefinition(p: Procedure, sections: ProcedureSection[]): TDocumentDefinitions {
  const content: Content[] = [
    { text: p.id, style: 'procedureId' },
    { text: p.title, style: 'title' },
    { text: `Status: ${p.status}    Weld Process: ${p.weldProcess}`, style: 'meta', margin: [0, 0, 0, 4] },
    { text: `WPS Rev: ${p.wpsRev || '-'}    Effective Date: ${p.effectiveDate || '-'}    GWP: ${p.gwp || '-'}    WTN: ${p.wtn || '-'}`, style: 'meta', margin: [0, 0, 0, 12] },

    ...revisionRecord(p),

    ...sectionsOnProcedure(p.sectionIds, sections).flatMap(({ section: s, number }) => section(p, s, number)),

    { text: 'Rules', style: 'sectionHeader' },
    { ul: p.rules.length ? p.rules : ['-'], margin: [0, 4, 0, 12] },

    { text: 'Specific Conditions', style: 'sectionHeader' },
    { ul: p.conditions.length ? p.conditions : ['-'], margin: [0, 4, 0, 12] },
  ];

  return {
    content,
    header: () => ({
      text: `This document was printed from Weld Engineering. Verify revision prior to use. Printed on ${formatDate(new Date())}`,
      style: 'pageHeader',
      margin: [40, 16, 40, 0] as [number, number, number, number],
    }),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${p.gwp || '-'} - ${p.wtn || '-'}, Rev ${p.wpsRev || '-'}`, alignment: 'left' },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right' },
      ],
      style: 'pageFooter',
      margin: [40, 0, 40, 16] as [number, number, number, number],
    }),
    styles: {
      procedureId: { fontSize: 20, bold: true },
      title: { fontSize: 13, margin: [0, 2, 0, 2] },
      meta: { fontSize: 9, color: '#555555' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
      pageHeader: { fontSize: 7, color: '#888888', italics: true },
      pageFooter: { fontSize: 8, color: '#555555' },
    },
    defaultStyle: { fontSize: 10 },
    pageMargins: [40, 60, 40, 60],
  };
}
