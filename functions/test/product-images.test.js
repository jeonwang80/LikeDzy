const test=require('node:test');const assert=require('node:assert/strict');
test('ALL images survive reload, remain outside color roles, and disappear when deleted',async()=>{
 const {normalizeProductImages,removeProductImage}=await import('../../src/utils/productImages.js');
 const p={imageUrls:['navy','green','label'],commonImageUrls:['label','deleted'],colorSwatches:[{name:'Navy',imageUrl:'navy',hoverImageUrl:'label',imageUrls:['navy','label'],images:['label']},{name:'Green',imageUrl:'green',imageUrls:['green']}]};
 const saved=normalizeProductImages(p);assert.deepEqual(saved.commonImageUrls,['label']);assert.deepEqual(saved.colorSwatches[0].imageUrls,['navy']);assert.deepEqual(saved.colorSwatches[0].images,[]);assert.notEqual(saved.colorSwatches[0].hoverImageUrl,'label');
 assert.deepEqual(normalizeProductImages(JSON.parse(JSON.stringify(saved))),saved);
 assert.deepEqual(removeProductImage(saved,'label').commonImageUrls,[]);
 const only=normalizeProductImages({imageUrls:['label'],commonImageUrls:['label'],colorSwatches:[{name:'Navy'}]});assert.equal(only.colorSwatches[0].imageUrl,'');
});
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

test('a representative photo does not remain as a secondary photo of another color',async()=>{
 const {normalizeProductImages}=await import('../../src/utils/productImages.js');
 const p={imageUrls:['white-front','white-back','green-front','label'],commonImageUrls:['label'],colorSwatches:[
  {name:'Green',imageUrl:'green-front',imageUrls:['green-front']},
  {name:'White',imageUrl:'white-front',hoverImageUrl:'white-back',imageUrls:['white-front','white-back','green-front'],images:['green-front']}
 ]};
 const clean=normalizeProductImages(p);
 assert.deepEqual(clean.colorSwatches[1].imageUrls,['white-front','white-back']);
 assert.deepEqual(clean.colorSwatches[1].images,[]);
 assert.deepEqual(clean.commonImageUrls,['label']);
 assert.deepEqual(clean.imageUrls,p.imageUrls);
 assert.deepEqual(normalizeProductImages(clean),clean);
});

test('moving a photo or changing its role removes legacy links before save and reload',async()=>{
 const {assignProductImage,normalizeProductImages}=await import('../../src/utils/productImages.js');
 const p={imageUrls:['green','white'],commonImageUrls:['green'],colorSwatches:[
  {name:'Green',imageUrl:'green',hoverImageUrl:'green',imageUrls:['green'],images:['green']},
  {name:'White',imageUrl:'white',imageUrls:['white']}
 ],colors:[{name:'Green',imageUrl:'green',images:['green']} ]};
 for(const role of [undefined,'primary','hover','none']){
  const moved=normalizeProductImages(JSON.parse(JSON.stringify(assignProductImage(p,'green','White',role))));
  assert.deepEqual(moved.colorSwatches[0].imageUrls,[]);
  assert.deepEqual(moved.colorSwatches[0].images,[]);
  assert.equal(moved.colorSwatches[0].imageUrl,'');
  assert.equal(JSON.stringify(moved.colors).includes('"green"'),false);
  assert.deepEqual(moved.commonImageUrls,[]);
  assert.ok(moved.colorSwatches[1].imageUrls.includes('green'));
 }
 const common=normalizeProductImages(assignProductImage(p,'green','__ALL__'));
 assert.deepEqual(common.commonImageUrls,['green']);
 assert.deepEqual(common.colorSwatches[0].imageUrls,[]);
});

test('an explicitly empty color and image inventory stay empty after reload and presentation',async()=>{
 const {normalizeProductImages,removeProductImage}=await import('../../src/utils/productImages.js');
 const {presentProduct}=await import('../../src/utils/productPresentation.js');
 const p={imageUrls:['green'],colorSwatches:[{name:'White',imageUrls:[]},{name:'Green',imageUrl:'green',imageUrls:['green']}]};
 assert.deepEqual(normalizeProductImages(p).colorSwatches[0].imageUrls,[]);
 const empty=removeProductImage({...p,imageUrl:'green',images:['green']},'green');
 assert.deepEqual(presentProduct(empty).images,[]);
 assert.deepEqual(normalizeProductImages(empty).colorSwatches.map(s=>s.imageUrls),[[],[]]);
});
