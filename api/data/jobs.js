// Same seeded generator as src/app/data/jobs.ts — pure JS, no imports needed

const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];
const TRADES = ['Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Carpentry', 'Inspection'];
const TAG_POOL = ['Urgent', 'Warranty', 'Follow-up', 'Permit required', 'Safety', 'Recurring', 'Customer supplied', 'Emergency'];

const EQUIPMENT_BY_TRADE = {
  Plumbing:   [{ make: 'Rheem', model: 'Performance 50' }, { make: 'A.O. Smith', model: 'Signature 40' }, { make: 'Kohler', model: 'Cimarron' }, { make: 'Moen', model: '1255 Duralast' }],
  Electrical: [{ make: 'Square D', model: 'QO140M200' }, { make: 'Eaton', model: 'BR2040B200' }, { make: 'Siemens', model: 'P4080B1200' }, { make: 'Leviton', model: 'GFTR1-W' }],
  HVAC:       [{ make: 'Carrier', model: '59TP6' }, { make: 'Trane', model: 'XR16' }, { make: 'Lennox', model: 'EL296V' }, { make: 'Goodman', model: 'GMVC96' }],
  Roofing:    [{ make: 'GAF', model: 'Timberline HDZ' }, { make: 'Owens Corning', model: 'Duration' }, { make: 'CertainTeed', model: 'Landmark Pro' }, { make: 'Malarkey', model: 'Highlander' }],
  Carpentry:  [{ make: 'Simpson Strong-Tie', model: 'LUS28' }, { make: 'Kreg', model: 'K5' }, { make: 'Andersen', model: '400 Series' }, { make: 'Pella', model: 'Lifestyle' }],
  Inspection: [{ make: 'Honeywell', model: 'T6 Pro' }, { make: 'Generac', model: 'Guardian 24kW' }, { make: 'Kidde', model: 'P4010ACSCO' }, { make: 'First Alert', model: 'SC9120B' }]
};

const TITLES_BY_TRADE = {
  Plumbing:   ['Leaking faucet repair', 'Water heater replacement', 'Clogged drain clearing', 'Pipe leak inspection', 'Toilet reseal', 'Sump pump service'],
  Electrical: ['Panel upgrade', 'Outlet replacement', 'Lighting install', 'Wiring inspection', 'GFCI installation', 'Ceiling fan mount'],
  HVAC:       ['Furnace tune-up', 'AC recharge', 'Thermostat install', 'Duct cleaning', 'Filter replacement', 'Heat pump service'],
  Roofing:    ['Shingle repair', 'Gutter cleaning', 'Leak patch', 'Flashing replacement', 'Roof inspection', 'Skylight reseal'],
  Carpentry:  ['Door reframe', 'Deck board repair', 'Cabinet install', 'Trim replacement', 'Window sill repair', 'Shelving build'],
  Inspection: ['Annual safety inspection', 'Pre-sale inspection', 'Mold assessment', 'Foundation check', 'Radon test', 'Code compliance review']
};

function seeded(n) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJobNumber(seed) {
  const rand = seeded(seed * 31 + 7);
  let code = '';
  for (let k = 0; k < 5; k++) code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return code;
}

function generateJobs(count = 120) {
  const rand = seeded(42);
  const out = [];
  for (let i = 0; i < count; i++) {
    const trade = TRADES[Math.floor(rand() * TRADES.length)];
    const titlePool = TITLES_BY_TRADE[trade];
    const equipment = EQUIPMENT_BY_TRADE[trade][Math.floor(rand() * EQUIPMENT_BY_TRADE[trade].length)];
    const dayOffset = Math.floor(rand() * 360) - 180;
    const tagCount = 1 + Math.floor(rand() * 3);
    const tags = [];
    while (tags.length < tagCount) {
      const t = TAG_POOL[Math.floor(rand() * TAG_POOL.length)];
      if (!tags.includes(t)) tags.push(t);
    }
    out.push({
      id: i + 1,
      jobNumber: makeJobNumber(i + 1),
      title: titlePool[Math.floor(rand() * titlePool.length)],
      trade,
      technician: TECHNICIANS[Math.floor(rand() * TECHNICIANS.length)],
      make: equipment.make,
      model: equipment.model,
      estimatedCost: Math.round((75 + rand() * 1925) * 100) / 100,
      estimatedHours: Math.round((0.5 + rand() * 39.5) * 10) / 10,
      inspectionScore: Math.round(rand() * 50) / 10,
      scheduledFor: new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000).toISOString(),
      tags
    });
  }
  return out;
}

// Generate once at startup — in a real service this would be a DB query
const JOBS = generateJobs();

module.exports = { JOBS, TRADES, TECHNICIANS, TAG_POOL };
