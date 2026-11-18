/* Procedure -> pdfmake document definition. Pure data transform, no rendering/DOM -- keeps this
   trivially unit-testable. The only place that touches the actual pdfmake renderer is
   procedure-pdf-actions.ts (procedurePdfDataUrl/downloadProcedurePdf).

   Layout: Revision Record, then the sections (Admin > Procedure Sections, weld-engineering/
   procedure-sections.ts) this procedure has, with their numbers, then its Rules/Conditions. Every page
   carries a header reminding the reader to verify the revision before use. */
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { procedureName, type Procedure } from '../../../data/procedures';
import { OVERRIDE_PARTS, sectionsOnProcedure, columnAsField, type ExtraField, type ExtraFieldValue, type ImageRef, type ProcedureSection } from '../procedure-sections';
import { extraValueText, isBlank, isBlankRow, isGrid, isImages, isOverride } from '../procedure-field-values';
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
          [{ text: 'Revision', bold: true, fillColor: '#eeeeee' }, { text: 'Date', bold: true, fillColor: '#eeeeee' },
           { text: 'By', bold: true, fillColor: '#eeeeee' }, { text: 'Note', bold: true, fillColor: '#eeeeee' }],
          ...p.revisionHistory.map(rv => [rv.revision, formatDate(rv.date), rv.by, rv.note]),
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

/* an image file as a data: URL, or null when it isn't stored */
export type ImageLookup = (id: string) => string | null;

const GRID_LAYOUT = {
  hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#999999', vLineColor: () => '#999999',
};

/* a grid: its label, then a table with a heading row of the column labels and a row per grid row */
function gridTable(f: ExtraField, v: ExtraFieldValue | undefined): Content[] {
  const columns = f.columns ?? [];
  const rows = isGrid(v) ? v.rows.filter(r => !isBlankRow(r)) : [];
  if (!columns.length) return [];
  return [
    { text: f.label, bold: true, margin: [0, 4, 0, 0] as [number, number, number, number] },
    {
      table: {
        headerRows: 1,
        widths: columns.map(() => '*'),
        body: [
          columns.map(c => ({ text: c.label, bold: true, fillColor: '#eeeeee' })),
          ...(rows.length
            ? rows.map(r => columns.map(c => extraValueText(columnAsField(c), r[c.key]) || '-'))
            : [columns.map(() => '-')]),
        ],
      },
      layout: GRID_LAYOUT,
      margin: [0, 4, 0, 12] as [number, number, number, number],
    },
  ];
}

/* images two to a line, each fitted in its half of the page with its caption under it */
function imageBlock(f: ExtraField, v: ExtraFieldValue | undefined, imageUrl: ImageLookup): Content[] {
  const images = isImages(v) ? v.images : [];
  if (!images.length) return [];
  const cell = (i: ImageRef): Content => {
    const url = imageUrl(i.id);
    return { stack: [
      url ? { image: url, fit: [240, 200] } : { text: `${i.name} (image not found)`, italics: true },
      ...(i.caption ? [{ text: i.caption, fontSize: 9, italics: true, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
    ] };
  };
  const out: Content[] = [{ text: f.label, bold: true, margin: [0, 4, 0, 4] as [number, number, number, number] }];
  for (let i = 0; i < images.length; i += 2) {
    out.push({
      columns: [cell(images[i]), images[i + 1] ? cell(images[i + 1]) : { text: '' }],
      columnGap: 16, margin: [0, 0, 0, 10] as [number, number, number, number],
    });
  }
  return out;
}

/* One section: its plain fields in lines (pdf-field-lines.ts), then each qualification requirement as a list, each
   override group as its own table (only when it has a value), each grid as a table and each images
   field's pictures. A section with no fields prints its heading only. */
function section(p: Procedure, s: ProcedureSection, n: number, imageUrl: ImageLookup): Content[] {
  const out: Content[] = [{ text: `${n}. ${s.name}`, style: 'sectionHeader' }];
  const value = (f: ExtraField) => p.extraFields[f.key];
  const plain = s.fields.filter(f => !['quals', 'override', 'grid', 'images'].includes(f.type));
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
    if (f.type === 'grid') out.push(...gridTable(f, o));
    if (f.type === 'images') out.push(...imageBlock(f, o, imageUrl));
  }
  return out;
}

/* imageUrl: where the images come from; procedure-pdf-actions.ts passes the stored ones */
export function procedureDocDefinition(p: Procedure, sections: ProcedureSection[], imageUrl: ImageLookup = () => null): TDocumentDefinitions {
  const content: Content[] = [
    { text: procedureName(p), style: 'procedureId' },
    { text: p.title, style: 'title' },
    { text: `Status: ${p.status}    Weld Process: ${p.weldProcess}`, style: 'meta', margin: [0, 0, 0, 4] },
    { text: `Revision: ${p.revision || '-'}    Effective Date: ${p.effectiveDate || '-'}`, style: 'meta', margin: [0, 0, 0, 12] },

    ...revisionRecord(p),

    ...sectionsOnProcedure(p.sectionIds, sections).flatMap(({ section: s, number }) => section(p, s, number, imageUrl)),

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
        { text: `${p.gwp || '-'} - ${p.wtn || '-'}, Revision ${p.revision || '-'}`, alignment: 'left' },
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
