import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wordAt,normalizeWord,splitChapters,sentenceAt,escapeHTML,validateState,highlightContext} from '../app/src/main/assets/web/core.js';
test('word selection supports possessives and hyphens without selecting punctuation',()=>{assert.equal(wordAt("It's a well-known story.",2).word,"It's");assert.equal(wordAt('well-known',5).word,'known');assert.equal(wordAt('well-known',2).word,'well');assert.equal(wordAt('well-known',4),null);assert.equal(wordAt('well-known',5).compound,'well-known');assert.equal(wordAt('hello, world',5),null);assert.equal(normalizeWord('“Reader’s!”'),"reader's");});
test('TXT parsing retains all chapters and introductory paragraphs',()=>{const c=splitChapters('Preface\r\n\r\nHello.\r\nChapter I\r\nA story.\r\nChapter Two — The Gate\r\nMore.');assert.equal(c.length,3);assert.equal(c[0].title,'正文');assert.match(c[0].text,/Preface/);assert.equal(c[2].title,'Chapter Two — The Gate');assert.equal(c[2].text,'More.');});
test('context preserves sentence punctuation and imported text is escaped',()=>{assert.equal(sentenceAt('He waited. She opened the book! Then left.','book'),'She opened the book!');assert.equal(escapeHTML('<script>"x"</script>'),'&lt;script&gt;&quot;x&quot;&lt;/script&gt;');});
test('restore rejects malformed data without inventing empty collections',()=>{assert.throws(()=>validateState({version:1,books:[],words:[]}));assert.throws(()=>validateState({version:1,books:[{id:'x'}],words:[],settings:{}}));assert.equal(validateState({version:1,books:[],words:[],settings:{}}).version,1);});
test('context highlights complete surface words and escapes imported markup',async()=>{
 const {highlightContext}=await import('../app/src/main/assets/web/core.js');
 assert.equal(highlightContext('They went home, then went out.','went'),'They <mark class="query-highlight">went</mark> home, then <mark class="query-highlight">went</mark> out.');
 assert.equal(highlightContext('Going home is ongoing.','go'),'Going home is ongoing.');
 assert.equal(highlightContext('Reader’s <b>book</b>.',"reader's"),'<mark class="query-highlight">Reader’s</mark> &lt;b&gt;book&lt;/b&gt;.');
});
test('reading font and alignment values are limited to bundled choices',async()=>{
 const {readingFonts,selectedFont,selectedAlignment}=await import('../app/src/main/assets/web/reading-preferences.js');
 assert.equal(readingFonts.length,7);assert.equal(new Set(readingFonts.map(f=>f.file)).size,7);
 assert.equal(selectedFont('missing').id,'noto-serif');assert.equal(selectedAlignment('justify'),'justify');assert.equal(selectedAlignment('left; color:red'),'left');
});
test('hyphens split at the tapped component while apostrophes remain intact',()=>{
 assert.equal(wordAt('state-of-the-art',9).word,'the');assert.equal(wordAt('well‑known',6).word,'known');assert.equal(wordAt('well‑known',6).compound,'well‑known');assert.equal(wordAt("don't",3).word,"don't");assert.equal(highlightContext('a well-known bird','known'),'a well-<mark class="query-highlight">known</mark> bird');
});
test('short swipe and blank edge rules reject vertical and long-press gestures',async()=>{
 const {swipeDirection,edgeDirection}=await import('../app/src/main/assets/web/reader-interactions.js');assert.equal(swipeDirection(-30,2,200),'next');assert.equal(swipeDirection(30,2,200),'prev');assert.equal(swipeDirection(10,1,100),null);assert.equal(swipeDirection(30,50,100),null);assert.equal(swipeDirection(40,0,800),null);assert.equal(edgeDirection(5,400),'prev');assert.equal(edgeDirection(395,400),'next');assert.equal(edgeDirection(200,400),null);
});
test('reader day/night colors and window brightness are explicit and bounded',async()=>{
 const {readingPalette,brightnessValue,flattenChapters}=await import('../app/src/main/assets/web/reader-chrome.js');
 assert.deepEqual(readingPalette('night'),{background:'#000000',text:'#ffffff'});assert.equal(readingPalette('paper').text,'#000000');assert.equal(brightnessValue({brightnessMode:'system',brightnessLevel:35}),-1);assert.equal(brightnessValue({brightnessMode:'manual',brightnessLevel:35}),.35);assert.equal(brightnessValue({brightnessMode:'manual',brightnessLevel:0}),.05);assert.equal(brightnessValue({brightnessMode:'manual',brightnessLevel:150}),1);
 assert.deepEqual(flattenChapters([{label:'I',href:'one',subitems:[{label:'II',href:'two'}]}]).map(x=>[x.label,x.depth]),[['I',0],['II',1]]);
});
