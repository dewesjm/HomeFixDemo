const express = require('express');
const cors = require('cors');
const jobsRouter = require('./routes/jobs');
const { TRADES, TECHNICIANS, TAG_POOL } = require('./data/jobs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── routes ──────────────────────────────────────────────────────────────────

app.use('/jobs', jobsRouter);

// GET /options
// Returns the valid values for each filterable enum field.
// The Angular app calls this once on startup to populate dropdowns
// instead of hard-coding them in the frontend.
app.get('/options', (_req, res) => {
  res.json({
    trades:      TRADES.map(t => ({ label: t, value: t })),
    technicians: TECHNICIANS.map(t => ({ label: t, value: t })),
    tags:        TAG_POOL.map(t => ({ label: t, value: t }))
  });
});

// GET /filter-schema
// Returns the metadata that drives the search UI.
// In SAP this would describe which fields exist, their types, and value ranges.
app.get('/filter-schema', (_req, res) => {
  res.json([
    { key: 'title',          label: 'Title contains',  type: 'text',        group: 'Job',        field: 'title' },
    { key: 'trade',          label: 'Trade',            type: 'multiselect', group: 'Job',        field: 'trade',          optionsKey: 'trades' },
    { key: 'technician',     label: 'Technician',       type: 'multiselect', group: 'Job',        field: 'technician',     optionsKey: 'technicians' },
    { key: 'estimatedHours', label: 'Est. hours',       type: 'range',       group: 'Scheduling', field: 'estimatedHours', min: 0, max: 40 },
    { key: 'estimatedCost',  label: 'Est. cost ($)',    type: 'range',       group: 'Cost',       field: 'estimatedCost',  min: 0, max: 2000 },
    { key: 'inspectionScore',label: 'Min score',        type: 'rating',      group: 'Cost',       field: 'inspectionScore' },
    { key: 'scheduledFor',   label: 'Scheduled',        type: 'daterange',   group: 'Scheduling', field: 'scheduledFor' },
    { key: 'tags',           label: 'Tags (any of)',    type: 'tags',        group: 'Job',        field: 'tags',           optionsKey: 'tags' }
  ]);
});

// ─── health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Jobs service running on http://localhost:${PORT}`);
});
