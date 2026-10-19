import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solarPosition, solarAltitude, toXYZ, fromXYZ, searchPlaces, countryAt } from '../src/geo.js';
import { places } from '../src/data/places.js';
import { countryFacts } from '../src/data/country-facts.js';

test('solar position agrees with seasonal declination and UTC noon', () => {
  const summer = solarPosition(new Date('2026-06-21T12:00:00Z'));
  const winter = solarPosition(new Date('2026-12-21T12:00:00Z'));
  const equinox = solarPosition(new Date('2026-03-20T12:00:00Z'));
  assert.ok(Math.abs(summer.lat - 23.44) < 0.2);
  assert.ok(Math.abs(winter.lat + 23.44) < 0.2);
  assert.ok(Math.abs(equinox.lat) < 0.3);
  assert.ok(Math.abs(equinox.lon) < 3);
  const midnight = solarPosition(new Date('2026-03-20T00:00:00Z'));
  assert.ok(Math.abs(midnight.lon) > 175);
});
test('day and night are complementary, noon subsolar point is overhead', () => {
  const sun = solarPosition(new Date('2026-10-20T03:00:00Z'));
  assert.ok(solarAltitude(sun.lat, sun.lon, sun) > 89.99);
  assert.ok(solarAltitude(-sun.lat, sun.lon + 180, sun) < -89.99);
});
test('coordinates round-trip in both hemispheres and across the dateline', () => {
  for (const [lat, lon] of [[0,0], [39.9,116.4], [-33.9,151.2], [55,-179], [-80,179]]) {
    const [x,y,z] = toXYZ(lat, lon);
    const result = fromXYZ({x,y,z});
    assert.ok(Math.abs(result.lat - lat) < 1e-9);
    assert.ok(Math.abs(result.lon - lon) < 1e-9);
  }
});
test('Chinese, aliases, English and category filters locate real places', () => {
  assert.equal(searchPlaces(places, '中国')[0].name, '中国');
  assert.equal(searchPlaces(places, '珠峰')[0].name, '珠穆朗玛峰');
  assert.equal(searchPlaces(places, '亚马逊河')[0].name, '亚马孙河');
  assert.equal(searchPlaces(places, 'beijing')[0].name, '北京');
  assert.ok(searchPlaces(places, '山', 'nature').every(p => !['country', 'city', 'region'].includes(p.type)));
  assert.deepEqual(searchPlaces(places, '不存在的地名xyz'), []);
});
test('country picking handles real boundaries and excludes the open ocean', () => {
  const { features } = JSON.parse(readFileSync(new URL('../public/assets/countries.geojson', import.meta.url)));
  assert.equal(countryAt(features, 116.4, 39.9)?.properties.name, '中国');
  assert.equal(countryAt(features, 2.35, 48.86)?.properties.name, '法国');
  assert.equal(countryAt(features, -140, 0), undefined);
});
test('search data has unique IDs, valid coordinates and descriptions', () => {
  assert.ok(places.length >= 400);
  assert.equal(new Set(places.map(p => p.id)).size, places.length);
  assert.ok(places.every(p => p.name && p.description && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180));
});
test('country learning facts match boundary feature IDs and preserve missing values', () => {
  const { features } = JSON.parse(readFileSync(new URL('../public/assets/countries.geojson', import.meta.url)));
  assert.ok(features.every(feature => countryFacts[feature.id]));
  assert.equal(countryFacts.CHN.capital, '北京');
  assert.equal(countryFacts.FRA.continent, '欧洲');
  assert.ok(Object.values(countryFacts).every(f => f.area === null || (Number.isFinite(f.area) && f.area > 0)));
});
