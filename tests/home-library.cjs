const {chromium}=require('./test-env.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:require('./test-env.cjs').chromePath,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-25T15:59:50+00:00')});
  await page.goto(require('./test-env.cjs').baseURL);await page.locator('#daily-phrase').waitFor();
  assert.equal(await page.locator('#page-title').innerText(),'阅读');
  assert.equal(await page.locator('#daily-phrase').getAttribute('data-date'),'2026-10-25');
  assert.equal(await page.locator('#books').count(),0);
  assert.doesNotMatch(await page.locator('#main').innerText(),/LEAF LIBRARY|YOUR OWN PAGES|CONTINUE READING|把世界|离线词典已就绪/);
  const today=await page.locator('.phrase-text').innerText();
  await page.clock.fastForward(3500);
  await page.screenshot({path:process.cwd()+'/outputs/home-0.1.2.png'});
  await page.clock.fastForward(7000);
  assert.equal(await page.locator('#daily-phrase').getAttribute('data-date'),'2026-10-26');
  const tomorrow=await page.locator('.phrase-text').innerText();assert.notEqual(today,tomorrow);
  // Opening a fresh page on the same date must not randomly choose another phrase.
  await page.reload();await page.locator('#daily-phrase').waitFor();assert.equal(await page.locator('.phrase-text').innerText(),tomorrow);
  await page.locator('[data-tab="library"]').click();
  assert.equal(await page.locator('#page-title').innerText(),'书架');
  assert.equal(await page.locator('#continue').count(),0);assert.equal(await page.locator('#daily-phrase').count(),0);
  assert.doesNotMatch(await page.locator('#main').innerText(),/LEAF LIBRARY|YOUR OWN PAGES|把世界|离线词典/);
  await page.locator('#book-search').fill('not a book');assert.match(await page.locator('#books').innerText(),/没有找到/);
  await page.locator('#book-search').fill('Quiet');assert.equal(await page.locator('[data-open]').count(),1);
  await page.screenshot({path:process.cwd()+'/outputs/library-0.1.2.png'});
  await page.locator('[data-open]').click();await page.waitForFunction(()=>!!document.querySelector('foliate-view')?.lastLocation);
  const readerTitle=await page.locator('#reader-title').innerText();if(await page.locator('#reader-status').isVisible())await page.locator('#reader-status').click();await page.locator('#reader-back').click();
  assert.equal(await page.locator('#page-title').innerText(),'书架');
  await page.locator('[data-tab="home"]').click();assert.equal(await page.locator('.continue-info h2').innerText(),readerTitle);
  // Android may pause timers in the background; resuming must check the current date.
  await page.clock.setSystemTime(new Date('2026-10-27T02:00:00+00:00'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.locator('#daily-phrase').getAttribute('data-date'),'2026-10-27');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS independent pages, book-only cards, search, reader return, stable daily phrase, midnight and resume refresh');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
