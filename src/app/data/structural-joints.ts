/* Structural Welding's joints: mock seed data, a separate set from Pipe Welding's (in real life a
   different source). Same fields as a pipe joint for now; structural fields come with the requirements. */
import { generateJobs, type Job } from './jobs';

export const STRUCTURAL_JOINTS: Job[] = generateJobs(160, { seed: 4242, idOffset: 100000 });
