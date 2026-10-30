const {chromium,chromePath,baseURL}=require('./test-env.cjs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:chromePath,args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,timezoneId:'Asia/Shanghai'}),p=await context.newPage(),errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(baseURL).origin){external.push(route.request().url());return route.abort();}return route.continue();});
 await p.clock.install({time:new Date('2026-10-28T04:00:00Z')});await p.goto(baseURL);await p.locator('#daily-phrase').waitFor();
 assert.equal(await p.locator('.phrase-text').innerText(),'find common ground');const first=await p.locator('#daily-phrase').getAttribute('data-background');
 // Every bundled scene decodes offline; the card uses the day's local image.
 const scenes=await p.evaluate(async()=>{const {dailyBackgrounds}=await import('./daily-phrases.js');return Promise.all(dailyBackgrounds.map(async name=>{const img=new Image();img.src=`./images/daily/${name}.svg`;await img.decode();return {name,width:img.naturalWidth,height:img.naturalHeight};}));});assert.equal(scenes.length,8);assert.ok(scenes.every(s=>s.width>0&&s.height>0));
 for(const width of [393,320,760]){await p.setViewportSize({width,height:900});await p.waitForTimeout(100);
  const size=await p.locator('.phrase-text').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return {lines:r.getClientRects().length,font:parseFloat(getComputedStyle(el).fontSize),overflow:el.scrollWidth>el.clientWidth+1};});assert.equal(size.lines,1,`find common ground must fit at ${width}px`);assert.ok(size.font>=22);assert.equal(size.overflow,false);
  for(const night of [false,true]){await p.evaluate(night=>document.body.classList.toggle('theme-night',night),night);await p.locator('#daily-phrase').scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`outputs/daily-card-${width}-${night?'night':'day'}-0.1.11.png`});}
 }
 await p.setViewportSize({width:320,height:852});
 // ResizeObserver applies responsive typography on the next layout frame.
 // In CI this test can reach the unchanged first date before that frame.
 await p.waitForFunction(()=>{const el=document.querySelector('.phrase-text');return el.scrollWidth<=el.clientWidth+1;});
 // Exercise all phrases on a narrow viewport: no horizontal clipping, and long phrases may wrap.
 await p.evaluate(async()=>{const {phrases}=await import('./daily-phrases.js');window.__phraseCount=phrases.length;});
 for(let day=0;day<60;day++){await p.clock.setSystemTime(new Date(Date.UTC(2026,9,28+day,4)));await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));const box=await p.locator('.phrase-text').evaluate(el=>({width:el.scrollWidth,available:el.clientWidth}));assert.ok(box.width<=box.available+1,`phrase ${day} overflows`);}
 await p.clock.setSystemTime(new Date('2026-10-28T15:59:59Z'));await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await p.locator('#daily-phrase').getAttribute('data-background'),first);await p.clock.fastForward(1500);assert.equal(await p.locator('#daily-phrase').getAttribute('data-date'),'2026-10-29');const next=await p.locator('#daily-phrase').getAttribute('data-background');assert.notEqual(next,first);
 await p.reload();await p.locator('#daily-phrase').waitFor();assert.equal(await p.locator('#daily-phrase').getAttribute('data-background'),next);
 await p.locator('[data-tab="library"]').click();await p.clock.setSystemTime(new Date('2026-10-30T02:00:00Z'));await p.locator('[data-tab="home"]').click();assert.equal(await p.locator('#daily-phrase').getAttribute('data-date'),'2026-10-30');assert.notEqual(await p.locator('#daily-phrase').getAttribute('data-background'),next);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('PASS short phrase single-line at 320/393/760px, all 60 phrases fit, all 8 scenes decode offline, daily image midnight/reload/resume, day/night screenshots, no external requests');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
