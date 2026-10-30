// Validate downloaded reading samples using the app's actual import and reader flows.
const {chromium}=require('./test-env.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.join(process.cwd(),'outputs/reading-test-pack');
 const files=JSON.parse(fs.readFileSync(path.join(root,'sources.json'),'utf8'));
 const browser=await chromium.launch({executablePath:require('./test-env.cjs').chromePath,headless:true,args:['--no-sandbox']});
 const results=[];
 try{for(const sample of files){
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(require('./test-env.cjs').baseURL);await page.locator('[data-tab="library"]').click();await page.locator('#import').waitFor();
   await page.locator('#import').click();const chooser=page.waitForEvent('filechooser');await page.locator('#import-file').click();await (await chooser).setFiles(path.join(root,sample.file));
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('leaf-state')||'{}').books?.length===2,{},{timeout:30000});
   await page.locator('[data-open]').last().click();
   await page.waitForFunction(()=>{const v=document.querySelector('foliate-view');return v?.book?.sections?.length&&v?.renderer?.getContents?.()?.length;},{},{timeout:30000});
   const details=await page.evaluate(()=>{const v=document.querySelector('foliate-view');return {sections:v.book.sections.length,tocItems:v.book.toc?.length||0,text:v.renderer.getContents()[0]?.doc?.body?.textContent?.slice(0,150)};});
   assert.equal(errors.length,0,errors.join('\n'));assert.equal(await page.locator('#reading').isVisible(),true);
   await page.locator('#next').click();await page.waitForTimeout(120);
   if(sample.file.endsWith('.epub')&&sample.file.includes('happy-prince')){
    await page.locator('#toc').click();const items=page.locator('.toc-item');const n=await items.count();assert.ok(n>=5);await items.nth(Math.min(2,n-1)).click();await page.waitForTimeout(150);details.chapterNavigation=true;
   }
   results.push({file:sample.file,ok:true,...details});console.log('PASS',sample.file,details.sections,'sections',details.tocItems,'TOC items');
  }catch(e){results.push({file:sample.file,ok:false,error:e.message});console.log('FAIL',sample.file,e.message);}
  finally{await context.close();}
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(results,null,2));
 if(results.some(r=>!r.ok))process.exitCode=1;
})();
