/* Weld Engineering - one procedure (GWP+WTN): its PDF from the procedure service (getProcedurePdf)
   shown inline, with Download. */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideDownload } from '@lucide/angular';

import { getProcedure, type Procedure } from '../../../data/procedures';
import { getProcedurePdf, type ProcedurePdf } from '../procedure-service/procedure-service';

@Component({
  selector: 'app-procedure-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowLeft, LucideDownload],
  templateUrl: './procedure-detail.component.html'
})
export class ProcedureDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  procedure = signal<Procedure | null>(null);
  pdf = signal<ProcedurePdf | null>(null);
  pdfUrl = signal<SafeResourceUrl | null>(null);
  error = signal('');

  async ngOnInit() {
    const params = this.route.snapshot.paramMap;
    const found = getProcedure(params.get('gwp') ?? '', params.get('wtn') ?? '');
    if (!found) {
      this.router.navigate(['/weld-engineering']);
      return;
    }
    this.procedure.set(found);
    /* Lookup lists every status, so ask for this procedure's own */
    const r = await getProcedurePdf({ gwp: found.gwp, wtn: found.wtn }, { status: found.status });
    if (!r.ok) {
      this.error.set(r.error);
      return;
    }
    this.pdf.set(r.data);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`data:${r.data.contentType};base64,${r.data.base64}`));
  }

  download() {
    const pdf = this.pdf();
    if (!pdf) return;
    const a = document.createElement('a');
    a.href = `data:${pdf.contentType};base64,${pdf.base64}`;
    a.download = pdf.fileName;
    a.click();
  }
}
