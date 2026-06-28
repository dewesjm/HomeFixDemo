const { Router } = require('express');
const { JOBS, TRADES, TECHNICIANS, TAG_POOL } = require('../data/jobs');

const router = Router();

// GET /jobs
// Query params: title, trade (comma-sep), technician (comma-sep), tags (comma-sep),
//               costMin, costMax, hoursMin, hoursMax, minScore,
//               scheduledFrom, scheduledTo (ISO date strings),
//               page (1-based), pageSize, sort, dir (asc|desc)
router.get('/', (req, res) => {
  const {
    title, trade, technician, tags,
    costMin, costMax, hoursMin, hoursMax, minScore,
    scheduledFrom, scheduledTo,
    page = '1', pageSize = '25',
    sort = 'id', dir = 'asc'
  } = req.query;

  let results = [...JOBS];

  // --- filter ---
  if (title) {
    const q = title.toLowerCase();
    results = results.filter(j => j.title.toLowerCase().includes(q));
  }
  if (trade) {
    const trades = trade.split(',');
    results = results.filter(j => trades.includes(j.trade));
  }
  if (technician) {
    const techs = technician.split(',');
    results = results.filter(j => techs.includes(j.technician));
  }
  if (tags) {
    const wanted = tags.split(',');
    results = results.filter(j => wanted.some(t => j.tags.includes(t)));
  }
  if (costMin !== undefined) results = results.filter(j => j.estimatedCost >= Number(costMin));
  if (costMax !== undefined) results = results.filter(j => j.estimatedCost <= Number(costMax));
  if (hoursMin !== undefined) results = results.filter(j => j.estimatedHours >= Number(hoursMin));
  if (hoursMax !== undefined) results = results.filter(j => j.estimatedHours <= Number(hoursMax));
  if (minScore !== undefined) results = results.filter(j => j.inspectionScore >= Number(minScore));
  if (scheduledFrom) results = results.filter(j => j.scheduledFor >= scheduledFrom);
  if (scheduledTo) results = results.filter(j => j.scheduledFor <= scheduledTo);

  // --- sort ---
  const multiplier = dir === 'desc' ? -1 : 1;
  results.sort((a, b) => {
    const av = a[sort], bv = b[sort];
    if (av < bv) return -1 * multiplier;
    if (av > bv) return 1 * multiplier;
    return 0;
  });

  // --- paginate ---
  const total = results.length;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));
  const items = results.slice((p - 1) * ps, p * ps);

  res.json({
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
    items
  });
});

// GET /jobs/:id
router.get('/:id', (req, res) => {
  const job = JOBS.find(j => j.id === Number(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

module.exports = router;
