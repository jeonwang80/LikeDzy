const test=require('node:test');const assert=require('node:assert/strict');
test('deleted primary and hover images cannot return through swatches or legacy fields',async()=>{
 const {normalizeProductImages,removeProductImage}=await import('../../src/utils/productImages.js');
 const {resolveProductCardImages}=await import('../../src/utils/productPresentation.js');
 const p={imageUrls:['https://example.test/new1.jpg','https://example.test/new2.jpg'],imageUrl:'https://example.test/old.jpg',images:['https://example.test/old.jpg'],colorSwatches:[{name:'Navy',imageUrl:'https://example.test/old.jpg',hoverImageUrl:'https://example.test/old2.jpg',imageUrls:['https://example.test/old.jpg'],images:['https://example.test/old2.jpg']}],imageVariants:[{imageUrl:'https://example.test/old.jpg',thumbnailUrl:'oldthumb'}]};
 const clean=normalizeProductImages(p);assert.equal(JSON.stringify(clean).includes('old'),false);assert.equal(p.imageUrl,'https://example.test/old.jpg');
 assert.equal(resolveProductCardImages(p).primary,'https://example.test/new1.jpg');
 const removed=removeProductImage(clean,clean.imageUrls[0]);assert.equal(JSON.stringify(removed).includes('new1'),false);
 const empty=removeProductImage(removed,removed.imageUrls[0]);assert.deepEqual(empty.imageUrls,[]);assert.equal(empty.colorSwatches[0].imageUrl,'');
});
test('color groups, pending images and legacy-only products remain supported',async()=>{
 const {normalizeProductImages,removeProductImage}=await import('../../src/utils/productImages.js');
 const legacy={images:['legacy'],colors:[{imageUrl:'legacy'}]};assert.equal(normalizeProductImages(legacy),legacy);
 const p={imageUrls:['red','blue','blob:pending'],colorSwatches:[{name:'Red',imageUrls:['red'],imageUrl:'red'},{name:'Blue',imageUrls:['blue','blob:pending'],imageUrl:'blob:pending'}]};
 const clean=removeProductImage(p,'blob:pending');assert.deepEqual(clean.colorSwatches.map(x=>x.imageUrls),[['red'],['blue']]);assert.equal(clean.colorSwatches[1].imageUrl,'blue');
});
