/* Procedure -> pdfmake document definition. Pure data transform, no rendering/DOM -- keeps this
   trivially unit-testable. The only place that touches the actual pdfmake renderer is
   procedure-pdf-actions.ts (openProcedurePdf/downloadProcedurePdf). */
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Procedure } from '../data/procedures';

const hasOverride = (p: Procedure): boolean =>
  !!(p.overridePhMin || p.overridePhMax || p.overrideIpMin || p.overrideIpMax || p.overrideNote);

function limitsTable(headerLabel: string, rows: [string, string][]): Content {
  return {
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        rows.map(([label]) => ({ text: label, bold: true, fillColor: '#eeeeee' })),
        rows.map(([, value]) => value || '—'),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#999999',
      vLineColor: () => '#999999',
    },
    margin: [0, 4, 0, 12] as [number, number, number, number],
  };
}

export function procedureDocDefinition(p: Procedure): TDocumentDefinitions {
  const content: Content[] = [
    { text: p.id, style: 'procedureId' },
    { text: p.title, style: 'title' },
    { text: `Status: ${p.status}    Weld Process: ${p.weldProcess}`, style: 'meta', margin: [0, 0, 0, 12] },

    { text: 'PH/IP Requirements', style: 'sectionHeader' },
    limitsTable('PH/IP Requirements', [
      ['PH Min', p.phMin], ['PH Max', p.phMax], ['IP Min', p.ipMin], ['IP Max', p.ipMax],
    ]),
  ];

  if (hasOverride(p)) {
    content.push(
      { text: 'Override Requirements', style: 'sectionHeader' },
      limitsTable('Override Requirements', [
        ['Override PH Min', p.overridePhMin], ['Override PH Max', p.overridePhMax],
        ['Override IP Min', p.overrideIpMin], ['Override IP Max', p.overrideIpMax],
      ]),
    );
    if (p.overrideNote) content.push({ text: p.overrideNote, italics: true, margin: [0, -8, 0, 12] });
  }

  content.push(
    { text: 'Applicable WTNs', style: 'sectionHeader' },
    { ul: p.wtns.length ? p.wtns : ['—'], margin: [0, 4, 0, 12] },

    { text: 'Rules', style: 'sectionHeader' },
    { ul: p.rules.length ? p.rules : ['—'], margin: [0, 4, 0, 12] },

    { text: 'Specific Conditions', style: 'sectionHeader' },
    { ul: p.conditions.length ? p.conditions : ['—'], margin: [0, 4, 0, 12] },

    { text: 'Qualifications Required', style: 'sectionHeader' },
    { ul: p.qualificationsRequired.length ? p.qualificationsRequired : ['—'], margin: [0, 4, 0, 12] },
  );

  return {
    content,
    styles: {
      procedureId: { fontSize: 20, bold: true },
      title: { fontSize: 13, margin: [0, 2, 0, 2] },
      meta: { fontSize: 9, color: '#555555' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
    },
    defaultStyle: { fontSize: 10 },
    pageMargins: [40, 40, 40, 40],
  };
}
