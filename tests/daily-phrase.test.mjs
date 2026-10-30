import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyPhraseFor,nextPhraseUpdate,phrases,dailyBackgrounds} from '../app/src/main/assets/web/daily-phrases.js';
test('a calendar day keeps the same phrase, even near midnight',()=>{
 const a=dailyPhraseFor(new Date(2026,9,25,0,0,0));const b=dailyPhraseFor(new Date(2026,9,25,23,59,59));
 assert.equal(a.text,b.text);assert.equal(a.key,'2026-10-25');assert.ok(a.meaning&&a.example&&a.translation);
});
test('midnight selects a different phrase and handles month and year boundaries',()=>{
 for(const [a,b] of [[new Date(2026,9,25,23,59,59),new Date(2026,9,26)],[new Date(2026,9,31),new Date(2026,10,1)],[new Date(2026,11,31),new Date(2027,0,1)]])assert.notEqual(dailyPhraseFor(a).text,dailyPhraseFor(b).text);
 assert.equal(nextPhraseUpdate(new Date(2026,9,25,23,59,59)),1000);
});
test('every phrase in one full rotation is unique',()=>{
 const texts=new Set();for(let i=0;i<phrases.length;i++)texts.add(dailyPhraseFor(new Date(2026,0,1+i)).text);
 assert.equal(texts.size,phrases.length);assert.equal(phrases.length,60);
});

test('backgrounds are stable per local date and rotate through all bundled scenes',()=>{
 const names=new Set();for(let i=0;i<dailyBackgrounds.length;i++){const a=dailyPhraseFor(new Date(2026,9,25+i,0));const b=dailyPhraseFor(new Date(2026,9,25+i,23));assert.equal(a.background,b.background);names.add(a.background);assert.notEqual(a.background,dailyPhraseFor(new Date(2026,9,26+i)).background);}
 assert.equal(names.size,dailyBackgrounds.length);
});
