/* Procedure -> pdfmake document definition. Pure data transform, no rendering/DOM -- keeps this
   trivially unit-testable. The only place that touches the actual pdfmake renderer is
   procedure-pdf-actions.ts (openProcedurePdf/downloadProcedurePdf).

   Layout: Revision Record, then 1. Base Metal, 2. Joint Design, 3. Welding Position, 4. Filler Metal,
   5. Welder Qualifications, 6. Preheat & Interpass Temperatures, 7. Equipment, 8. Gas, 9. Heat Input,
   10. Parameters, 11. Heat Treatment -- followed by the procedure's WTNs/Rules/Conditions. Every page
   carries a header reminding the reader to verify the revision before use. */
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Procedure, hasOverride } from '../data/procedures';

function limitsTable(rows: [string, string][]): Content {
  return {
    table: {
      widths: rows.map(() => '*'),
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

function numberedSection(n: number, title: string, rows: [string, string][]): Content[] {
  return [
    { text: `${n}. ${title}`, style: 'sectionHeader' },
    limitsTable(rows),
  ];
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
          ...p.revisionHistory.map(rv => [rv.wpsRev, rv.date, rv.by, rv.note]),
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

export function procedureDocDefinition(p: Procedure): TDocumentDefinitions {
  const content: Content[] = [
    { text: p.id, style: 'procedureId' },
    { text: p.title, style: 'title' },
    { text: `Status: ${p.status}    Weld Process: ${p.weldProcess}`, style: 'meta', margin: [0, 0, 0, 4] },
    { text: `WPS Rev: ${p.wpsRev || '—'}    Effective Date: ${p.effectiveDate || '—'}    GWP: ${p.gwp || '—'}    WTN: ${p.wtn || '—'}`, style: 'meta', margin: [0, 0, 0, 12] },

    ...revisionRecord(p),

    ...numberedSection(1, 'Base Metal', [
      ['Base Metal 1 Type', p.baseMetal1Type], ['Base Metal 2 Type', p.baseMetal2Type],
      ['Thickness Min', p.baseMetalThicknessMin], ['Thickness Max', p.baseMetalThicknessMax],
    ]),

    ...numberedSection(2, 'Joint Design', [
      ['Joint Type', p.jointType], ['Groove Angle', p.grooveAngle],
      ['Root Opening', p.rootOpening], ['Backing', p.backing],
    ]),

    ...numberedSection(3, 'Welding Position', [
      ['Position', p.weldPosition], ['Progression', p.weldProgression],
    ]),

    ...numberedSection(4, 'Filler Metal', [
      ['Filler Metal Type', p.fillerMetalType], ['Classification', p.fillerMetalClassification],
      ['Size Range', p.fillerMetalSizeRange],
    ]),

    { text: '5. Welder Qualifications', style: 'sectionHeader' },
    { ul: p.qualificationsRequired.length ? p.qualificationsRequired : ['—'], margin: [0, 4, 0, 12] },

    ...numberedSection(6, 'Preheat & Interpass Temperatures', [
      ['PH Min', p.phMin], ['PH Max', p.phMax], ['IP Min', p.ipMin], ['IP Max', p.ipMax],
    ]),
  ];

  if (hasOverride(p)) {
    content.push(
      { text: 'Override Requirements', style: 'sectionHeader' },
      limitsTable([
        ['Override PH Min', p.overridePhMin], ['Override PH Max', p.overridePhMax],
        ['Override IP Min', p.overrideIpMin], ['Override IP Max', p.overrideIpMax],
      ]),
    );
    if (p.overrideNote) content.push({ text: p.overrideNote, italics: true, margin: [0, -8, 0, 12] });
  }

  content.push(
    ...numberedSection(7, 'Equipment', [
      ['Current Type', p.currentType], ['Power Source', p.powerSource],
    ]),

    ...numberedSection(8, 'Gas', [
      ['Shielding Gas', p.shieldingGas], ['Gas Flow Rate', p.gasFlowRate], ['Backing Gas', p.backingGas],
    ]),

    ...numberedSection(9, 'Heat Input', [
      ['Heat Input Min', p.heatInputMin], ['Heat Input Max', p.heatInputMax],
    ]),

    ...numberedSection(10, 'Parameters', [
      ['Amperage Range', p.amperageRange], ['Voltage Range', p.voltageRange], ['Travel Speed Range', p.travelSpeedRange],
    ]),

    ...numberedSection(11, 'Heat Treatment', [
      ['PWHT Temp', p.pwhtTemp], ['PWHT Time', p.pwhtTime],
    ]),

    { text: 'Rules', style: 'sectionHeader' },
    { ul: p.rules.length ? p.rules : ['—'], margin: [0, 4, 0, 12] },

    { text: 'Specific Conditions', style: 'sectionHeader' },
    { ul: p.conditions.length ? p.conditions : ['—'], margin: [0, 4, 0, 12] },
  );

  return {
    content,
    header: () => ({
      text: `This document was printed from Weld Engineering. Verify revision prior to use. Printed on ${new Date().toLocaleDateString()}`,
      style: 'pageHeader',
      margin: [40, 16, 40, 0] as [number, number, number, number],
    }),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${p.gwp || '—'} - ${p.wtn || '—'}, Rev ${p.wpsRev || '—'}`, alignment: 'left' },
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
