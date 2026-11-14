/* The only file that touches the actual pdfmake renderer -- keeps procedure-pdf.ts's document-
   definition logic (the part worth unit testing) free of any pdfmake runtime/DOM dependency.
   Called only by the procedure service's getProcedurePdf (procedure-service/procedure-service.ts). */
import { Procedure } from '../../../data/procedures';
import { procedureSections } from '../procedure-sections';
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

/* the procedure's PDF file, base64 encoded */
export async function procedurePdfBase64(p: Procedure): Promise<string> {
  const pm = await pdfMake();
  return pm.createPdf(procedureDocDefinition(p, procedureSections())).getBase64();
}
