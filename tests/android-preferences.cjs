// Requires an installed debug APK and its WebView DevTools socket forwarded to :9222.
const {connect}=require('./android-cdp.cjs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),fs=require('node:fs');
const adb=(...args)=>execFileSync(require('./test-env.cjs').adbPath,['-s',(process.env.ANDROID_SERIAL||'emulator-5554'),...args],{encoding:'utf8'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const c=await connect();const e=x=>c.evaluate(x),click=s=>e(`document.querySelector(${JSON.stringify(s)}).click()`);async function until(x){for(let i=0;i<100;i++){if(await e(x))return;await pause(100);}throw Error('Timeout '+x);}
try{
 await until(`!!document.querySelector('#continue')`);const books=await e(`(async()=>{const {call}=await import('./platform.js');return (await call('loadState')).books})()`),book=books.find(b=>b.demo);assert.ok(book);
 await click('[data-tab="library"]');await click(`[data-open="${book.id}"]`);await until(`!!document.querySelector('foliate-view')?.lastLocation`);await click('#reader-menu');
 const fonts=await e(`Array.from(document.querySelector('#reading-font').options,x=>x.value)`);assert.equal(fonts.length,7);let loaded=[];
 for(const font of fonts){await e(`(()=>{const s=document.querySelector('#reading-font');s.value=${JSON.stringify(font)};s.dispatchEvent(new Event('change'))})()`);await pause(100);loaded.push(await e(`(async()=>{const d=document.querySelector('foliate-view').renderer.getContents()[0].doc;const family=d.defaultView.getComputedStyle(d.querySelector('p')).fontFamily;const faces=await d.fonts.load('20px '+family.split(',')[0]);return {family,loaded:faces.length>0&&faces.every(f=>f.status==='loaded')};})()`));assert.ok(loaded.at(-1).loaded,JSON.stringify(loaded.at(-1)));}
 await click('[data-align="justify"]');await e(`(()=>{const s=document.querySelector('#reading-font');s.value='noto-serif';s.dispatchEvent(new Event('change'));const v=document.querySelector('#volume-keys');if(!v.checked)v.click()})()`);await click('.sheet-close');await pause(500);
 const cfi=()=>e(`document.querySelector('foliate-view').lastLocation.cfi`);
 await e(`document.querySelector('foliate-view').goTo(0)`);await pause(400);const start=await cfi();
 const vol=()=>adb('shell','cmd','media_session','volume','--stream','3','--get').match(/volume is (\d+)/)?.[1];const initialVolume=vol();
 adb('shell','input','keyevent','KEYCODE_VOLUME_DOWN');await pause(500);const next=await cfi();assert.notEqual(next,start,'volume down should turn page');assert.equal(vol(),initialVolume,'paging should preserve media volume');
 adb('shell','input','keyevent','KEYCODE_VOLUME_UP');await pause(500);assert.equal(await cfi(),start,'volume up should return to original page');
 adb('shell','input','keyevent','--longpress','KEYCODE_VOLUME_DOWN');await pause(500);assert.equal(await cfi(),next,'long press must turn only one page');
 await click('#reader-menu');const panelCfi=await cfi();adb('shell','input','keyevent','KEYCODE_VOLUME_DOWN');await pause(400);assert.equal(await cfi(),panelCfi,'settings panel must block volume paging');await click('.sheet-close');
 await click('#reader-menu');await e(`document.querySelector('#volume-keys').checked&&document.querySelector('#volume-keys').click()`);await click('.sheet-close');const disabledCfi=await cfi();adb('shell','input','keyevent','KEYCODE_VOLUME_DOWN');await pause(400);assert.equal(await cfi(),disabledCfi,'disabled volume paging must not move page');
 // Enable again for a screenshot and leave a useful preference on this test device.
 await click('#reader-menu');await click('#volume-keys');await pause(1200);
 fs.writeFileSync('outputs/android-preferences-0.1.4.png',execFileSync(require('./test-env.cjs').adbPath,['-s',(process.env.ANDROID_SERIAL||'emulator-5554'),'exec-out','screencap','-p'],{maxBuffer:1e7}));
 const result={fonts:loaded,volumeDown:true,volumeUp:true,longPressSinglePage:true,volumePreserved:true,panelBlocked:true,disabledBlocked:true};fs.writeFileSync('outputs/android-preferences-0.1.4-results.json',JSON.stringify(result,null,2));console.log('PASS Android-native seven fonts, alignment, physical volume down/up, long press, media volume unchanged, panel and disabled gating');
}finally{c.close();}})().catch(e=>{console.error(e);process.exitCode=1});
