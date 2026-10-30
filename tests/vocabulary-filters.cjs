const {chromium,chromePath,baseURL}=require('./test-env.cjs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:chromePath,args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(baseURL);await p.locator('#continue').waitFor();const seed=await p.evaluate(()=>JSON.parse(localStorage.getItem('leaf-state')));
 seed.wordTags=['日常表达','描写','容易混淆','长标签用来验证小屏幕换行显示','旅行','工作','情绪','自然'];
 seed.words=[{word:'quiet',meaning:'安静的',sentence:'A quiet room.',bookId:'old',bookTitle:'A Quiet Room',tags:['日常表达'],createdAt:3},{word:'grass',meaning:'草',tags:[],createdAt:2}];
 await p.addInitScript(s=>{if(!sessionStorage.getItem('filter-seed')){localStorage.setItem('leaf-state',JSON.stringify(s));sessionStorage.setItem('filter-seed','1');}},seed);
 await p.reload();await p.locator('#continue').waitFor();await p.locator('[data-tab="words"]').tap();
 // Touch opens the app sheet, with the selected choice and dismiss-without-change behavior.
 await p.locator('#word-book-trigger').tap();assert.equal(await p.locator('#sheet-title').innerText(),'选择书籍');assert.equal(await p.locator('.filter-option[aria-pressed="true"] > span').first().innerText(),'全部书籍');
 await p.getByRole('button',{name:'A Quiet Room',exact:true}).tap();assert.equal(await p.locator('[data-card]').count(),1);assert.match(await p.locator('#word-book-trigger').innerText(),/A Quiet Room/);
 await p.locator('#word-book-trigger').tap();await p.locator('#scrim').tap({position:{x:8,y:8}});assert.equal(await p.locator('[data-card]').count(),1);
 await p.locator('#word-book-trigger').tap();await p.getByRole('button',{name:'全部书籍',exact:true}).tap();assert.equal(await p.locator('[data-card]').count(),2);
 await p.locator('#word-tag-trigger').tap();await p.locator('#filter-search').fill('不存在');assert.match(await p.locator('.filter-empty').innerText(),/没有匹配/);await p.locator('#filter-search').fill('未分类');await p.getByRole('button',{name:'未分类',exact:true}).tap();assert.equal(await p.locator('[data-card="grass"]').count(),1);assert.equal(await p.locator('[data-card="quiet"]').count(),0);
 await p.locator('#word-tag-trigger').tap();await p.getByRole('button',{name:'全部标签',exact:true}).tap();
 // Direct shortcut retains old labels, applies only to the intended word, and permits creation.
 await p.locator('[data-word-tags="quiet"]').tap();assert.equal(await p.locator('#sheet-title').innerText(),'设置标签');assert.ok(await p.getByLabel('日常表达',{exact:true}).isChecked());
 await p.getByLabel('描写',{exact:true}).check();await p.locator('#apply-tags').tap();assert.match(await p.locator('[data-card="quiet"] .word-tags').innerText(),/日常表达[\s\S]*描写/);assert.equal(await p.locator('[data-card="grass"] .word-tags').count(),0);
 await p.locator('[data-word-tags="grass"]').tap();await p.locator('#new-tag').fill('植物');await p.locator('#create-tag').tap();await p.locator('#apply-tags').tap();assert.match(await p.locator('[data-card="grass"] .word-tags').innerText(),/植物/);
 await p.locator('[data-word-tags="quiet"]').tap();await p.getByLabel('日常表达',{exact:true}).uncheck();await p.locator('.sheet-close').tap();assert.match(await p.locator('[data-card="quiet"] .word-tags').innerText(),/日常表达/);
 for(const width of [393,320]){await p.setViewportSize({width,height:852});for(const night of [false,true]){
  await p.evaluate(night=>document.body.classList.toggle('theme-night',night),night);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const button=await p.locator('[data-word-tags="quiet"]').boundingBox(),card=await p.locator('[data-card="quiet"]').boundingBox();assert.ok(button.width>=44&&button.height>=44);assert.ok(button.x+button.width<=card.x+card.width+1);
  await p.screenshot({path:`outputs/vocabulary-shortcut-${width}-${night?'night':'day'}-0.1.10.png`});
  for(const id of ['word-book','word-tag']){await p.locator('#'+id+'-trigger').tap();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const colors=await p.locator('.filter-option').first().evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));assert.notEqual(colors.background,colors.color);await p.screenshot({path:`outputs/${id}-${width}-${night?'night':'day'}-0.1.10.png`});await p.keyboard.press('Escape');assert.equal(await p.locator('#sheet').isVisible(),false);}
  await p.locator('[data-word-tags="quiet"]').tap();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`outputs/tag-editor-${width}-${night?'night':'day'}-0.1.10.png`});await p.locator('.sheet-close').tap();
 }}
 await p.reload();await p.locator('#continue').waitFor();await p.locator('[data-tab="words"]').tap();assert.match(await p.locator('[data-card="quiet"] .word-tags').innerText(),/日常表达[\s\S]*描写/);assert.match(await p.locator('[data-card="grass"] .word-tags').innerText(),/植物/);
 await p.locator('#organize-words').tap();assert.equal(await p.locator('[data-word-tags]').count(),0);assert.deepEqual(errors,[]);console.log('PASS themed touch filter sheets, search/empty/cancel, direct tag edit/create/cancel, correct word, persistence, 44px targets, day/night at 393px and 320px');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
