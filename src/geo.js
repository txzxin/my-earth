// Approximate apparent solar position, based on NOAA's solar calculation equations.
export function solarPosition(date = new Date()) {
  const rad = Math.PI / 180;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const L = (280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360;
  const M = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * rad;
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(M) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * M) * (0.019993 - 0.000101 * t) + Math.sin(3 * M) * 0.000289;
  const omega = (125.04 - 1934.136 * t) * rad;
  const lambda = (L + C - 0.00569 - 0.00478 * Math.sin(omega)) * rad;
  const epsilon = (23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega)) * rad;
  const lat = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) / rad;
  const y = Math.tan(epsilon / 2) ** 2;
  const equation = 4 / rad * (y * Math.sin(2 * L * rad) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L * rad) - 0.5 * y * y * Math.sin(4 * L * rad) - 1.25 * e * e * Math.sin(2 * M));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const lon = ((180 - minutes / 4 - equation / 4 + 540) % 360) - 180;
  return { lat, lon };
}

export function toXYZ(lat, lon, radius = 1) {
  const phi = lat * Math.PI / 180, theta = lon * Math.PI / 180;
  return [radius * Math.cos(phi) * Math.cos(theta), radius * Math.sin(phi), -radius * Math.cos(phi) * Math.sin(theta)];
}

export function fromXYZ({ x, y, z }) {
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(y / r) * 180 / Math.PI, lon: Math.atan2(-z, x) * 180 / Math.PI };
}

export function solarAltitude(lat, lon, sun) {
  const a = toXYZ(lat, lon), b = toXYZ(sun.lat, sun.lon);
  return Math.asin(Math.max(-1, Math.min(1, a.reduce((sum, v, i) => sum + v * b[i], 0)))) * 180 / Math.PI;
}

export function searchPlaces(places, query, type = 'all') {
  const q = query.trim().toLocaleLowerCase();
  const category = p => type === 'all' || p.type === type || (type === 'nature' && !['country', 'city', 'region'].includes(p.type));
  return places.filter(category).map(p => {
    const fields = [p.name, p.en, ...(p.aliases || [])].map(s => String(s).toLocaleLowerCase());
    const score = !q ? 1 : fields.some(s => s === q) ? 100 : fields.some(s => s.startsWith(q)) ? 70 : fields.some(s => s.includes(q)) ? 40 : 0;
    return { p, score };
  }).filter(r => r.score).sort((a, b) => b.score - a.score).slice(0, q ? 40 : 8).map(r => r.p);
}

export function insideRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function countryAt(features, lon, lat) {
  return features.find(f => {
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polygons.some(poly => insideRing(lon, lat, poly[0]) && !poly.slice(1).some(hole => insideRing(lon, lat, hole)));
  });
}
