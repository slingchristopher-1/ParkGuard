// Downloads every Dutch paid-parking zone from the RDW open data portal and
// bundles them as a static GeoJSON. Same source and same output shape as the
// Python version in jurgen-th/ParkMatiq, ported to Node so it runs here.
//
//   npm run zones
//
// Source: opendata.rdw.nl (Socrata) — open licence, no key, no per-request cost.
// The app never calls RDW at runtime; it reads the generated file.
//
// Paid parking is a weekly schedule, not one number: most zones are free in the
// evening and on Sunday, so a single rate overcharges anyone parking outside
// paid hours. Each zone points at a schedule of [weekday, startMin, endMin,
// eurPerHour] windows; schedules are shared, so they live in a top-level map.
//
// Every id in these datasets is unique only *within* an areamanagerid, so every
// join is keyed on (areamanagerid, id). Joining on the bare id silently mixes
// another municipality's tariff into a zone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const BASE = 'https://opendata.rdw.nl/resource/';
const DATASETS = {
  geometry: 'nsk3-v9n7',
  regulation: 'qtex-qwd8',
  timeframe: 'ixf8-gtwq',
  fare: '534e-5vdg',
  area: 'adw6-9hsg',
  manager: '2uc2-nnv3',
};
const PAGE = 50000;
const TODAY = new Date().toISOString().slice(0, 10).replace(/-/g, '');

// The dataset also carries special-day rows (FEESTDAG, KOOPZONDAG, ...) that we
// skip: holidays would need an NL holiday calendar, and the event rows only ever
// *add* paid hours, so ignoring them never overcharges.
const DAYS = {
  ZONDAG: 0, MAANDAG: 1, DINSDAG: 2, WOENSDAG: 3,
  DONDERDAG: 4, VRIJDAG: 5, ZATERDAG: 6,
};
const SAMPLE_MINUTES = 60;
const DAY_MINUTES = 1440;
// No Dutch street tariff comes near this. Above it is a day ticket encoded as an
// hourly rate; charging it would be far worse than marking the tariff unknown.
const MAX_PLAUSIBLE_RATE = 15.0;

async function fetchAll(dataset) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = `${BASE}${DATASETS[dataset]}.json?$limit=${PAGE}&$offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${dataset}: HTTP ${res.status}`);
    const batch = await res.json();
    rows.push(...batch);
    process.stdout.write(`\r  ${dataset}: ${rows.length}`);
    if (batch.length < PAGE) break;
  }
  process.stdout.write('\n');
  return rows;
}

// ── WKT ──────────────────────────────────────────────────────────────────────
function nest(s, i = 0) {
  const items = [];
  while (i < s.length) {
    const c = s[i];
    if (c === '(') {
      const [child, next] = nest(s, i + 1);
      items.push(child);
      i = next;
    } else if (c === ')') {
      return [items, i + 1];
    } else if (c === ',') {
      i += 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== '(' && s[j] !== ')') j += 1;
      const text = s.slice(i, j).trim().replace(/,$/, '').trim();
      if (text) items.push(text);
      i = j;
    }
  }
  return [items, i];
}

// 6 decimals is ~0.1 m, finer than any zone boundary needs, and keeps the file
// the phone downloads about a third smaller than RDW's 9-decimal source.
function ring(node) {
  const text = Array.isArray(node) ? node[0] : node;
  return text.split(',')
    .filter(p => p.trim())
    .map(pt => pt.trim().split(/\s+/).map(x => Math.round(parseFloat(x) * 1e6) / 1e6));
}

function parseWkt(wkt) {
  const s = (wkt || '').trim();
  if (!s.includes('(')) return null;
  const [tree] = nest(s, s.indexOf('(') + 1);
  if (s.startsWith('MULTIPOLYGON')) {
    return { type: 'MultiPolygon', coordinates: tree.map(poly => poly.map(ring)) };
  }
  if (s.startsWith('POLYGON')) {
    return { type: 'Polygon', coordinates: tree.map(ring) };
  }
  return null;
}

// ── tariffs ──────────────────────────────────────────────────────────────────
// RDW splits a tariff into duration bands, each charging `amountfarepart` per
// `stepsizefarepart` minutes. Reading the first band as the hourly rate is wrong
// wherever a municipality encodes a start fee in a 0–1 minute band; walking the
// bands handles start fees and progressive scales alike. Run it out to a full
// day and the same function yields the dagtarief, because a capped tariff is
// encoded as a trailing band charging 0.00.
function costForStay(parts, minutes) {
  const bands = [];
  for (const p of parts) {
    const start = parseInt(p.startdurationfarepart, 10);
    const end = parseInt(p.enddurationfarepart, 10);
    const amt = parseFloat(p.amountfarepart);
    const step = parseFloat(p.stepsizefarepart);
    if ([start, end, amt, step].some(Number.isNaN)) continue;
    if (step > 0 && end > start) bands.push([start, end, amt, step]);
  }
  bands.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let total = 0;
  let covered = 0;
  for (const [start, end, amt, step] of bands) {
    const lo = Math.max(start, covered);
    const hi = Math.min(end, minutes);
    if (hi <= lo) continue;              // already covered by an overlapping row
    total += ((hi - lo) / step) * amt;
    covered = hi;
    if (covered >= minutes) break;
  }
  return Math.round(total * 100) / 100;
}

// RDW writes times as HHMM-in-an-int ('930', '2400').
function hhmmToMinutes(value) {
  const v = parseInt(value, 10);
  return Math.floor(v / 100) * 60 + (v % 100);
}

// Free windows (rate 0) are left out — absence of a window means free.
function windowsFor(rows, rateOf, codesUsed) {
  const out = [];
  for (const r of rows) {
    const day = DAYS[r.daytimeframe];
    const code = r.farecalculationcode;
    if (day === undefined || !code) continue;
    const rate = rateOf[code];
    if (!rate) continue;
    codesUsed?.add(code);

    const start = hhmmToMinutes(r.starttimetimeframe);
    const end = hhmmToMinutes(r.endtimetimeframe);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;

    if (end > start) {
      out.push([day, start, end, rate]);
    } else if (end < start) {
      // Runs past midnight (18:00–02:00): split across two days.
      out.push([day, start, 1440, rate]);
      out.push([(day + 1) % 7, 0, end, rate]);
    }
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out;
}

// Keep rows whose end date is in the future; on duplicates keep the latest start.
function activeRows(rows, endField, keyFields, startField) {
  const best = new Map();
  for (const r of rows) {
    if ((r[endField] || '0').slice(0, 8) <= TODAY) continue;
    const k = keyFields.map(f => r[f]).join('\u0000');
    const prev = best.get(k);
    if (!prev || (r[startField] || '0') > (prev[startField] || '0')) best.set(k, r);
  }
  return best;
}

const pair = (a, b) => `${a}\u0000${b}`;

async function main() {
  console.log('Fetching all-NL parking data from RDW open data (paged)...');
  const [geometry, regulation, timeframe, fare, areas, managers] = [
    await fetchAll('geometry'),
    await fetchAll('regulation'),
    await fetchAll('timeframe'),
    await fetchAll('fare'),
    await fetchAll('area'),
    await fetchAll('manager'),
  ];

  // (manager, areaid) -> active paid-parking regulationid
  const reg = activeRows(
    regulation.filter(r => r.usageid === 'BETAALDP'),
    'enddatearearegulation', ['areamanagerid', 'areaid'], 'startdatearearegulation'
  );
  const areaToReg = new Map([...reg].map(([k, v]) => [k, v.regulationid]));

  // manager -> { farecalculationcode: EUR/hour }, plus the 24-hour cost (dagtarief)
  const fareParts = new Map();
  for (const r of fare) {
    if ((r.enddatefarepart || '0').slice(0, 8) <= TODAY) continue;
    const k = pair(r.areamanagerid, r.farecalculationcode);
    if (!fareParts.has(k)) fareParts.set(k, []);
    fareParts.get(k).push(r);
  }
  const fareRate = new Map();
  const fareDay = new Map();
  for (const [k, parts] of fareParts) {
    const [mid, code] = k.split('\u0000');
    if (!fareRate.has(mid)) { fareRate.set(mid, {}); fareDay.set(mid, {}); }
    fareRate.get(mid)[code] = costForStay(parts, SAMPLE_MINUTES);
    fareDay.get(mid)[code] = costForStay(parts, DAY_MINUTES);
  }

  // (manager, regulationid) -> weekly windows + the day cap that applies
  const tfRows = new Map();
  for (const r of timeframe) {
    if ((r.enddatetimeframe || '0').slice(0, 8) <= TODAY) continue;
    const k = pair(r.areamanagerid, r.regulationid);
    if (!tfRows.has(k)) tfRows.set(k, []);
    tfRows.get(k).push(r);
  }
  const schedule = new Map();
  const dayCap = new Map();
  for (const [k, rows] of tfRows) {
    const mid = k.split('\u0000')[0];
    const codes = new Set();
    const w = windowsFor(rows, fareRate.get(mid) || {}, codes);
    if (!w.length) continue;
    schedule.set(k, w);
    // Where a zone's windows use several fare codes, the highest cap is the only
    // one guaranteed not to under-bill a day spent across all of them.
    const caps = [...codes].map(c => fareDay.get(mid)?.[c]).filter(v => v !== undefined);
    dayCap.set(k, caps.length ? Math.max(...caps) : null);
  }

  // (manager, areaid) -> zone name, preferring a currently active row
  const areaDesc = new Map();
  for (const r of areas) {
    const k = pair(r.areamanagerid, r.areaid);
    const live = (r.enddatearea || '0').slice(0, 8) > TODAY;
    const prev = areaDesc.get(k);
    if (!prev || (live && !prev[1])) areaDesc.set(k, [r.areadesc || '', live]);
  }

  // areamanagerid -> municipality. Managers are versioned; an id can carry an
  // expired row (merged municipalities), so prefer a live one.
  const mgrName = new Map();
  for (const r of managers) {
    if (!r.areamanagerid || !r.areamanagerdesc) continue;
    const live = (r.enddateareamanagerid || '0').slice(0, 8) > TODAY;
    const prev = mgrName.get(r.areamanagerid);
    if (!prev || (live && !prev[1])) mgrName.set(r.areamanagerid, [r.areamanagerdesc, live]);
  }
  const managerName = mid => mgrName.get(mid)?.[0] ?? '';

  const polygons = geometry
    .map(g => [g, parseWkt(g.areageometryastext)])
    .filter(([, geom]) => geom);

  // Pass 1: every polygon that has its own paid-parking regulation. A zone can
  // span several geometry rows under one areaid, so this is a list — keying it
  // by areaid would drop every extra part of a split zone.
  const resolved = [];
  const unpriced = [];
  const implausible = [];
  for (const [g, geom] of polygons) {
    const key = pair(g.areamanagerid, g.areaid);
    const rid = areaToReg.get(key);
    if (!rid) continue;                  // permit-only, garage, P+R, umbrella
    const sKey = pair(g.areamanagerid, rid);
    const w = schedule.get(sKey);
    if (!w) { unpriced.push([g, geom]); continue; }
    const top = Math.max(...w.map(x => x[3]));
    if (top > MAX_PLAUSIBLE_RATE) {
      implausible.push([managerName(g.areamanagerid), areaDesc.get(key)?.[0] || g.areaid, top]);
      unpriced.push([g, geom]);
      continue;
    }
    resolved.push([g, geom, sKey, top]);
  }

  // Pass 2: municipalities that sell paid parking but produced no priced zone at
  // all — their polygons and regulations live in different areaid namespaces, so
  // nothing joins and the app would report the whole city as free parking.
  const pricedMgrs = new Set(resolved.map(([g]) => g.areamanagerid));
  const paidMgrs = new Set([...areaToReg.keys()].map(k => k.split('\u0000')[0]));
  const gapMgrs = [...paidMgrs].filter(m => !pricedMgrs.has(m));
  if (gapMgrs.length) {
    const gap = new Set(gapMgrs);
    for (const [g, geom] of polygons) {
      if (gap.has(g.areamanagerid)) unpriced.push([g, geom]);
    }
  }

  // Only the schedules actually referenced are published, under a short id.
  const schedId = new Map();
  const schedules = {};
  for (const [, , key] of resolved) {
    if (!schedId.has(key)) {
      schedId.set(key, `s${schedId.size}`);
      schedules[schedId.get(key)] = schedule.get(key);
    }
  }

  const feature = (g, geom, sched, top, cap) => ({
    type: 'Feature',
    geometry: geom,
    properties: {
      areaid: g.areaid,
      areamanagerid: g.areamanagerid,
      municipality: managerName(g.areamanagerid),
      desc: areaDesc.get(pair(g.areamanagerid, g.areaid))?.[0] || `Zone ${g.areaid}`,
      sched,
      maxEurPerHour: top,
      dayCap: cap,
    },
  });

  // Unpriced first so priced zones draw on top of any overlap.
  const features = [
    ...unpriced.map(([g, geom]) => feature(g, geom, null, null, null)),
    ...resolved.map(([g, geom, key, top]) =>
      feature(g, geom, schedId.get(key), top, dayCap.get(key) ?? null)),
  ];

  const fc = {
    type: 'FeatureCollection',
    metadata: {
      source: 'RDW Open Data Parkeren (opendata.rdw.nl), all Dutch municipalities',
      license: 'open data, free to use',
      generated: TODAY,
      note: 'Tarieven indicatief — weekly paid windows per zone; sched null = paid zone with an unresolved tariff',
    },
    schedules,
    features,
  };

  const out = path.join(root, 'src/data/nl-parking-zones.geojson');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(fc), 'utf8');

  const pricedNames = new Set([...pricedMgrs].map(managerName));
  console.log(`Polygon rows: ${polygons.length}`);
  console.log(`Wrote ${features.length} zones (${resolved.length} priced, ${unpriced.length} tariff unknown) across ${pricedNames.size} priced municipalities`);
  console.log(`${Object.keys(schedules).length} distinct weekly schedules → ${path.relative(root, out)}`);
  if (gapMgrs.length) {
    console.log('Paid parking but no priced zone (published as unknown): ' +
      gapMgrs.map(managerName).sort().join(', '));
  }
  for (const [mun, desc, rate] of implausible) {
    console.log(`  implausible rate EUR ${rate}/h → tariff unknown: ${mun} — ${desc}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
