const test = require('node:test');
const assert = require('node:assert/strict');

test('launch promotion respects enable switch and exact schedule boundaries', async () => {
  const { normalizePromotion, promotionIsActive } = await import('../../src/utils/launchPromotion.js');
  const start = Date.parse('2026-10-05T00:00:00+09:00');
  const end = Date.parse('2026-10-06T00:00:00+09:00');
  const config = normalizePromotion({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
  assert.equal(promotionIsActive(config, start - 1), false);
  assert.equal(promotionIsActive(config, start), true);
  assert.equal(promotionIsActive(config, end - 1), true);
  assert.equal(promotionIsActive(config, end), false);
  assert.equal(promotionIsActive({ ...config, enabled: false }, start), false);
  assert.equal(promotionIsActive({ ...config, startsAt: 'invalid' }, start), false);
});

test('promotion links stay in storefront and incomplete images use bundled assets', async () => {
  const { normalizePromotion, safePromotionLink, DEFAULT_PROMOTION } = await import('../../src/utils/launchPromotion.js');
  for (const href of ['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', '/admin']) {
    assert.equal(safePromotionLink(href), DEFAULT_PROMOTION.href);
  }
  assert.equal(safePromotionLink('/?view=product&productId=test'), '/?view=product&productId=test');
  assert.deepEqual(normalizePromotion({ images: ['broken'] }).images, DEFAULT_PROMOTION.images);
});

test('hide for today expires at next local midnight, not after 24 hours', async () => {
  const { nextLocalMidnight } = await import('../../src/utils/launchPromotion.js');
  const now = new Date(2026, 9, 5, 23, 59, 0);
  assert.equal(nextLocalMidnight(now.getTime()), new Date(2026, 9, 6).getTime());
});
