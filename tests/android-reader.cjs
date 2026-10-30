/** Run against the debug app in an Android emulator after forwarding its WebView
 * DevTools socket to localhost:9222. Load the official Magi MOBI sample first.
 * This verifies the real Java bridge / WebView, not the browser adapter.
 */
const {connect}=require('./android-cdp.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const c=await connect(Number(process.env.CDP_PORT||9222));
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(expression){for(let i=0;i<80;i++){if(await c.evaluate(expression))return;await pause(100);}throw Error('Timed out: '+expression);}
 async function open(id){
  await c.evaluate(`if(!document.querySelector('#reading').hidden)document.querySelector('#reader-back').click()`);
  await c.evaluate(`document.querySelector('[data-tab="library"]').click()`);
  const selector=`[data-open="${id}"]`;
  await until(`!!document.querySelector(${JSON.stringify(selector)})`);
  await c.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await until(`!!document.querySelector('foliate-view')?.renderer?.getContents()[0]?.doc?.body?.innerText?.trim()`);
 }
 try{
  assert.equal(await c.evaluate('!!window.Android'),true);
  const books=await c.evaluate(`(async()=>{const {call}=await import('./platform.js');return (await call('loadState')).books})()`);
  const txt=books.find(b=>b.demo),mobi=books.find(b=>b.format==='MOBI'&&b.title.includes('Gift of the Magi'));
  assert.ok(txt&&mobi,'Preload the bundled demo and the official Magi MOBI in this test device');
  await open(txt.id);
  const demo=await c.evaluate(`(()=>{const v=document.querySelector('foliate-view');const d=v.renderer.getContents()[0].doc;return {text:d.body.innerText,url:d.URL}})()`);
  assert.match(demo.text,/Mara opened the window/);assert.match(demo.url,/^blob:https:\/\/appassets\.androidplatform\.net\//);
  await open(mobi.id);
  const story=await c.evaluate(`(async()=>{const v=document.querySelector('foliate-view');await v.goTo(2);const d=v.renderer.getContents()[0].doc;return {text:d.body.innerText,visible:v.lastLocation.range.toString()}})()`);
  assert.match(story.text,/One dollar and eighty-seven cents/);assert.ok(story.visible.length>20);
  const before=await c.evaluate(`document.querySelector('#progress-label').textContent`);
  await c.evaluate(`document.querySelector('#next').click()`);await pause(250);
  const after=await c.evaluate(`document.querySelector('#progress-label').textContent`);assert.notEqual(before,after);
  const dictionary=await c.evaluate(`(async()=>{const {call}=await import('./platform.js');return call('lookup',{word:'quiet'})})()`);
  assert.match(dictionary.zh,/安静/);
  const bounds=await c.evaluate(`({width:innerWidth,height:innerHeight,header:document.querySelector('#reader-header').getBoundingClientRect().top,footer:document.querySelector('#reader-footer').getBoundingClientRect().bottom})`);
  assert.equal(bounds.header,0);assert.ok(bounds.footer<=bounds.height);
  console.log('PASS Android-native TXT, MOBI, page turn, SQLite bridge and toolbar bounds',bounds);
 }finally{c.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
