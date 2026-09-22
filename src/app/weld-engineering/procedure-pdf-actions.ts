/* The only file that touches the actual pdfmake renderer -- keeps procedure-pdf.ts's document-
   definition logic (the part worth unit testing) free of any pdfmake runtime/DOM dependency. */
import { Procedure } from '../data/procedures';
import { procedureDocDefinition } from './procedure-pdf';

let vfsReady: Promise<any> | null = null;

async function pdfMake() {
  const mod = await import('pdfmake/build/pdfmake');
  const pm = (mod as any).default ?? mod;
  if (!vfsReady) {
    vfsReady = import('pdfmake/build/vfs_fonts').then(fontsMod => {
      pm.vfs = (fontsMod as any).default ?? fontsMod;
    });
  }
  await vfsReady;
  return pm;
}

export async function openProcedurePdf(p: Procedure): Promise<void> {
  const pm = await pdfMake();
  pm.createPdf(procedureDocDefinition(p)).open();
}

export async function downloadProcedurePdf(p: Procedure): Promise<void> {
  const pm = await pdfMake();
  pm.createPdf(procedureDocDefinition(p)).download(`${p.id}.pdf`);
}

/* data: URL for embedding in an <iframe> preview */
export async function procedurePdfDataUrl(p: Procedure): Promise<string> {
  const pm = await pdfMake();
  return pm.createPdf(procedureDocDefinition(p)).getDataUrl();
}
