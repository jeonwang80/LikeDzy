import assert from 'node:assert/strict';
import { sampleEdgeColor, getImageBackground, sampleCanvasColor } from '../src/utils/imageBackground.js';
import { normalizeProductImages } from '../src/utils/productImages.js';
const rgba = new Uint8ClampedArray(40 * 40 * 4);
for (let y=0;y<40;y++) for(let x=0;x<40;x++){const i=(y*40+x)*4; const edge=x<4||x>36||y<4||y>36;rgba.set(edge?[240,241,242,255]:[20,30,40,255],i);}
assert.equal(sampleEdgeColor(rgba,40,40),'#f0f1f2');
assert.throws(()=>sampleEdgeColor(new Uint8ClampedArray(400),10,10));
const p={imageUrls:['a','b'],imageVariants:[{imageUrl:'a',thumbnailUrl:'thumb'}],imageBackgrounds:[{imageUrl:'a',color:'#123456',mode:'manual'},{imageUrl:'b',color:'#ffffff',mode:'auto'},{imageUrl:'deleted',color:'#000000'}]};
assert.equal(getImageBackground(p,'thumb'),'#123456');
assert.equal(getImageBackground(p,'b'),'#ffffff');
assert.equal(getImageBackground(p,'missing'),undefined);
assert.equal(normalizeProductImages(p).imageBackgrounds.length,2);
assert.equal(getImageBackground({imageBackgrounds:[{imageUrl:'a',color:'red;'}]},'a'),undefined);
console.log('PASS: edge sampling, transparent input, thumbnail mapping, per-photo lookup, deletion cleanup, invalid colour');

const canvas={width:10,height:20,getContext:()=>({getImageData:(x,y)=>{assert.equal(x,9);assert.equal(y,0);return {data:[12,34,56,255]};}})};
assert.equal(sampleCanvasColor(canvas,100,-5),'#0c2238');
assert.equal(sampleCanvasColor({width:1,height:1,getContext:()=>({getImageData:()=>({data:[0,0,0,0]})})},0,0),null);
