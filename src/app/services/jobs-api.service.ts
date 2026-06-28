// REFERENCE ONLY — not used by the Angular app.
// This service shows what connecting to api/server.js would look like.
// The app reads from src/app/data/jobs.ts (in-memory mock) instead.
// To wire it up: inject JobsApiService into the components and replace the
// static JOBS / TRADE_OPTIONS imports with calls to getJobs() / getOptions().

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Job } from '../data/jobs';
import { FilterField } from '../data/filter-schema';

export interface JobsPage {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: Job[];
}

export interface OptionList {
  label: string;
  value: string;
}

export interface JobOptions {
  trades:      OptionList[];
  technicians: OptionList[];
  tags:        OptionList[];
}

export type JobFilterParams = Partial<{
  title:         string;
  trade:         string;   // comma-separated list
  technician:    string;   // comma-separated list
  tags:          string;   // comma-separated list
  costMin:       string;
  costMax:       string;
  hoursMin:      string;
  hoursMax:      string;
  minScore:      string;
  scheduledFrom: string;   // ISO date string
  scheduledTo:   string;   // ISO date string
  page:          string;
  pageSize:      string;
  sort:          string;
  dir:           'asc' | 'desc';
}>;

const API_BASE = 'http://localhost:3000'; //environment file in real life

@Injectable({ providedIn: 'root' })
export class JobsApiService {
  private http = inject(HttpClient);

  getJobs(filters: JobFilterParams = {}): Observable<JobsPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value);
      }
    }
    return this.http.get<JobsPage>(`${API_BASE}/jobs`, { params });
  }

  getJob(id: number): Observable<Job> {
    return this.http.get<Job>(`${API_BASE}/jobs/${id}`);
  }

  getOptions(): Observable<JobOptions> {
    return this.http.get<JobOptions>(`${API_BASE}/options`);
  }

  getFilterSchema(): Observable<FilterField[]> {
    return this.http.get<FilterField[]>(`${API_BASE}/filter-schema`);
  }
}
