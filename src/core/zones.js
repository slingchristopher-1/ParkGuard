// Dutch paid-parking zones, from the RDW open data snapshot that
// scripts/build-zones.mjs bundles. Nothing is fetched from RDW at runtime.
//
// A zone is not one price: it carries a weekly schedule of
// [weekday, startMinute, endMinute, eurPerHour] windows, so an evening or
// Sunday stay prices at zero rather than at the weekday rate.
import zonesUrl from '../data/nl-parking-zones.geojson?url';

// One cached fetch. Resolving to null is deliberately different from an empty
// list: missing data must read as "tariff unknown", never as "free parking".
let cache = null;

export function loadZones() {
  if (!cache) {
    cache = fetch(zonesUrl)
      .then(r => { if (!r.ok) throw new Error(`zones ${r.status}`); return r.json(); })
      .catch(() => { cache = null; return null; });
  }
  return cache;
}

// Cheap bounding box so a lookup skips the ~3k zones nowhere near the point
// instead of walking every polygon.
function bbox(f) {
  if (f.__bbox) return f.__bbox;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  const scan = ring => {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };
  const g = f.geometry;
  if (g?.type === 'Polygon') g.coordinates.forEach(scan);
  else if (g?.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(scan));
  f.__bbox = [minLon, minLat, maxLon, maxLat];
  return f.__bbox;
}

function pointInRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const hit = (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

// Inside the outer ring and outside every hole. RDW zones carry holes — free
// side streets and courtyards cut out of a paid zone — and ignoring them
// charges for free parking.
function pointInPolygon(lat, lon, rings) {
  if (!pointInRing(lat, lon, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lat, lon, rings[i])) return false;
  }
  return true;
}

function pointInFeature(lat, lon, geom) {
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInPolygon(lat, lon, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some(p => pointInPolygon(lat, lon, p));
  return false;
}

// The zone containing the point, or null. A point can fall in both a priced zone
// and one whose tariff could not be resolved, where a municipality files the
// same street twice; the priced one wins because it tells the driver more.
export function zoneForPoint(lat, lon, data) {
  if (lat == null || lon == null || !data?.features) return null;

  let fallback = null;
  for (const f of data.features) {
    const [minLon, minLat, maxLon, maxLat] = bbox(f);
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    if (!pointInFeature(lat, lon, f.geometry)) continue;

    const p = f.properties;
    const zone = {
      windows: p.sched ? data.schedules?.[p.sched] ?? null : null,
      maxRate: p.maxEurPerHour ?? null,
      dayCap: p.dayCap ?? null,
      desc: p.desc,
      areaid: p.areaid,
      municipality: p.municipality || '',
    };
    if (zone.windows) return zone;
    fallback ??= zone;
  }
  return fallback;
}

// EUR/hour in force at `when`, or 0 when parking is free then.
export function rateAt(windows, when = new Date()) {
  if (!windows?.length) return 0;
  const day = when.getDay();
  const minute = when.getHours() * 60 + when.getMinutes();
  for (const [d, start, end, rate] of windows) {
    if (d === day && minute >= start && minute < end) return rate;
  }
  return 0;
}

// What to show, and what to charge, for a position. `rate` is null when the
// tariff could not be resolved — the app must say so rather than guess.
export async function zoneAt(lat, lon, when = new Date()) {
  const data = await loadZones();
  if (!data) return { status: 'unknown', label: 'Tariff unknown', rate: null };

  const zone = zoneForPoint(lat, lon, data);
  if (!zone) return { status: 'free', label: 'No paid zone here', rate: 0, zone: null };
  if (!zone.windows) {
    return { status: 'unknown', label: `${zone.desc} — tariff unknown`, rate: null, zone };
  }

  const rate = rateAt(zone.windows, when);
  return {
    status: rate > 0 ? 'paid' : 'free-now',
    label: zone.desc,
    municipality: zone.municipality,
    rate,
    dayCap: zone.dayCap,
    zone,
  };
}
