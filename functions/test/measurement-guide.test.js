const test = require('node:test');
const assert = require('node:assert/strict');
test('size guide rejects missing/invalid measurements and duplicate size aliases', async () => {
 const { createPoloGuide, validateGuide, displayMeasurement } = await import('../../src/utils/measurementGuide.js');
 const guide = createPoloGuide(); assert.equal(validateGuide(guide), '');
 assert.equal(displayMeasurement(105, 'in'), '41.3'); assert.equal(guide.rows[0].chest, 105);
 for (const value of ['', -1, Infinity, 'bad', 501]) { const invalid = structuredClone(guide); invalid.rows[0].chest = value; assert.ok(validateGuide(invalid)); }
 const duplicate = structuredClone(guide); duplicate.rows[0].size = 'XXL'; assert.ok(validateGuide(duplicate));
 assert.ok(validateGuide({ rows: [] })); assert.equal(validateGuide(undefined), '');
});

test('legacy tops retain their measurements when saved in the typed format', async () => {
 const { createPoloGuide, guideType, serializeGuide } = await import('../../src/utils/measurementGuide.js');
 const legacy = createPoloGuide();
 assert.equal(guideType(legacy), 'tops');
 assert.deepEqual(serializeGuide(legacy), { version: 2, type: 'tops', rows: legacy.rows });
});

test('pants and hats require their own measurements without invented defaults', async () => {
 const { createBlankGuide, validateGuide, serializeGuide } = await import('../../src/utils/measurementGuide.js');
 for (const [type, values] of Object.entries({
  pants: { outseam: '100', waist: '80', hip: '100', thigh: '60', rise: '28', legOpening: '40' },
  hats: { headCircumference: '58', height: '12', brimLength: '7' },
 })) {
  const blank = createBlankGuide(type);
  assert.ok(validateGuide(blank));
  assert.ok(blank.rows.every(row => Object.entries(row).every(([key, value]) => key === 'size' || value === '')));
  const guide = { ...blank, rows: [{ size: ' FREE ', ...values, chest: 999 }] };
  assert.equal(validateGuide(guide), '');
  const saved = serializeGuide(guide);
  assert.deepEqual(saved, { version: 2, type, rows: [{ size: 'FREE', ...Object.fromEntries(Object.entries(values).map(([key,value]) => [key, Number(value)])) }] });
  for (const key of Object.keys(values)) {
   const invalid = structuredClone(guide); delete invalid.rows[0][key];
   assert.ok(validateGuide(invalid), `${type} requires ${key}`);
  }
 }
 assert.ok(validateGuide({ type: 'unknown', rows: [{ size: 'FREE' }] }));
});

test('measurement display converts stored strings and leaves missing dimensions blank', async () => {
 const { displayMeasurement } = await import('../../src/utils/measurementGuide.js');
 assert.equal(displayMeasurement('58', 'in'), '22.8');
 assert.equal(displayMeasurement('12', 'cm'), '12');
 for (const value of [undefined, null, '', ' ', 'bad']) assert.equal(displayMeasurement(value, 'cm'), '—');
});
