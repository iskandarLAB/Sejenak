import test from 'node:test';import assert from 'node:assert/strict';import {wrapPosterText,posterTextBlock} from '../worker/poster-layout.mjs';
const measure=t=>Array.from(t).length*10;
test('Long couple names wrap without leaving poster bounds',()=>{const lines=wrapPosterText(measure,'Reez bin Abdullah & Mayra binti Muhammad',120);assert.ok(lines.length>1);assert.ok(lines.every(l=>measure(l)<=120))});
test('Unbroken names are split instead of overflowing',()=>{const lines=wrapPosterText(measure,'A'.repeat(80),100);assert.equal(lines.length,8);assert.ok(lines.every(l=>measure(l)<=100))});
test('Invitation paragraphs preserve explicit line breaks',()=>{assert.deepEqual(wrapPosterText(measure,'Reez\n&\nMayra',200),['Reez','&','Mayra'])});
test('Poster summarizes long copy within the maximum line count',()=>{const lines=posterTextBlock(measure,'A long invitation message that must fit on a small poster layout',120,3);assert.equal(lines.length,3);assert.ok(lines[2].endsWith('…'));assert.ok(lines.every(l=>measure(l)<=120))});

test('Template artwork extends to 9:16 without cropping corners or leaving gaps',async()=>{
 const{invitationArtworkSlices}=await import('../worker/poster-layout.mjs');const slices=invitationArtworkSlices(1086,1448);assert.equal(slices.length,3);assert.equal(slices[0].sy,0);assert.equal(slices[2].sy+slices[2].sh,1448);assert.equal(slices[0].dy,0);assert.equal(slices[2].dy+slices[2].dh,1920);
 for(let n=1;n<3;n++){assert.equal(slices[n-1].sy+slices[n-1].sh,slices[n].sy);assert.equal(slices[n-1].dy+slices[n-1].dh,slices[n].dy)}
 assert.ok(Math.abs(slices[0].dh/slices[0].sh-1080/1086)<1e-10);
});
