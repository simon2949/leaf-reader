// Requires a debug APK on a test emulator and WebView CDP forwarded to port 9222.
const {connect}=require('./android-cdp.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const c=await connect();try{
 const broken=process.argv.includes('--expect-broken');
 await c.evaluate(`(async()=>{for(let n=0;n<200;n++){if(typeof window.appBack==='function'&&document.querySelector('[data-tab="home"]'))return;await new Promise(r=>setTimeout(r,100));}throw Error('App did not initialize');})()`);
 await c.evaluate(`(async()=>{for(let n=0;n<4&&!document.querySelector('#daily-phrase');n++){window.appBack();await new Promise(r=>setTimeout(r,100));}document.querySelector('[data-tab="home"]').click();})()`);
 const result=await c.evaluate(`(async()=>{const {dailyBackgrounds}=await import('./daily-phrases.js');const scenes=[];for(const name of dailyBackgrounds){const url='./images/daily/'+name+'.svg',r=await fetch(url);const image=new Image();image.src=url;let decoded=true;try{await image.decode();}catch{decoded=false;}scenes.push({name,status:r.status,type:r.headers.get('content-type'),decoded,width:image.naturalWidth});}return {url:location.href,scene:document.querySelector('#daily-phrase').dataset.background,background:getComputedStyle(document.querySelector('#daily-phrase')).backgroundImage,scenes};})()`);
 assert.match(result.url,/https:\/\/appassets.androidplatform.net/);assert.equal(result.scenes.length,8);assert.ok(result.scenes.every(s=>s.status===200));
 if(broken){assert.ok(result.scenes.every(s=>!s.decoded));assert.ok(result.scenes.every(s=>s.type.startsWith('application/octet-stream')));}
 else{assert.ok(result.scenes.every(s=>s.decoded&&s.width>0));assert.ok(result.scenes.every(s=>s.type.startsWith('image/svg+xml')));assert.ok(result.background.includes(result.scene+'.svg'));}
 const suffix=broken?'before':'after';fs.writeFileSync(`outputs/android-daily-${suffix}-results.json`,JSON.stringify(result,null,2));
 for(const night of [false,true]){await c.evaluate(`document.body.classList.toggle('theme-night',${night});document.querySelector('#daily-phrase').scrollIntoView({block:'center'})`);const image=await c.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`outputs/android-daily-${suffix}-${night?'night':'day'}.png`,Buffer.from(image.data,'base64'));}
 await c.evaluate(`document.body.classList.remove('theme-night')`);
 console.log(broken?'PASS reproduced Android 0.1.11: all 8 SVG responses are octet-stream and image decoding fails':'PASS Android WebView: all 8 SVG responses have image/svg+xml, all decode, selected background applied; day/night screenshots saved');
}finally{c.close();}})().catch(e=>{console.error(e);process.exitCode=1});
