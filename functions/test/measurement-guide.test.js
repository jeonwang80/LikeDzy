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
