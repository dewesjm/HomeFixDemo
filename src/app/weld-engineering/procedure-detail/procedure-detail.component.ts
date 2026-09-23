import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideDownload } from '@lucide/angular';

import { getProcedure, type Procedure } from '../../data/procedures';
import { procedurePdfDataUrl, downloadProcedurePdf } from '../procedure-pdf/procedure-pdf-actions';

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
  pdfUrl = signal<SafeResourceUrl | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const found = id ? getProcedure(id) : undefined;
    if (!found) {
      this.router.navigate(['/weld-engineering']);
      return;
    }
    this.procedure.set(found);
    const dataUrl = await procedurePdfDataUrl(found);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl));
  }

  download() {
    const p = this.procedure();
    if (p) downloadProcedurePdf(p);
  }
}
