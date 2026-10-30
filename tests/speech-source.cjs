const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),voice=fs.readFileSync(path.join(root,'app/src/main/assets/web/vendor/mespeak/en-us.json'),'utf8');
function load(file){class XHR{open(){}send(){this.responseText=voice;this.status=200;this.readyState=4;this.onreadystatechange();}}
 const messages=[],scope={console:{log(...args){messages.push(args.join(' '));},warn(){},error(){}},XMLHttpRequest:XHR,location:{href:'https://appassets.androidplatform.net/'}};scope.self=scope;vm.createContext(scope);vm.runInContext(fs.readFileSync(file,'utf8'),scope,{timeout:10000});let ready=false;scope.meSpeakCore.loadVoice('/voice.json',ok=>ready=ok);assert.ok(ready);return {engine:scope.meSpeakCore,messages};}
execFileSync(process.execPath,['tools/build_speech_source.cjs'],{cwd:root,stdio:'inherit'});
const a=load(path.join(root,'app/src/main/assets/web/vendor/mespeak/mespeak-core.js')),b=load(path.join(root,'outputs/speech-source/mespeak-core.js'));
const words=['sesquipedalian','attention','quiet','photograph','read','record','extraordinary',"can't",'co-operate','Café','naïve','Hello, world!'];const evidence=[];
for(let i=0;i<96;i++){
 const word=words[i%words.length],args=['-w','wav.wav','-a','90','-g','0','-p','50','-s','155','-b','1','-v','en/en-us','--path=/espeak',word];const old=Buffer.from(a.engine.speak(args)),built=Buffer.from(b.engine.speak(args));
 assert.deepEqual(built,old,'Rebuilt source must preserve the entire WAV stream: '+word+' #'+i);assert.equal(old.toString('ascii',0,4),'RIFF');assert.equal(old.readUInt32LE(24),22050);assert.ok(old.length>1000&&old.subarray(44).some(x=>x!==0));
 if(i<words.length)evidence.push({text:word,bytes:old.length,sha256:crypto.createHash('sha256').update(old).digest('hex')});
}
assert.ok(a.messages.some(m=>m.includes('automatic restart'))&&b.messages.some(m=>m.includes('automatic restart')),'Exercise the 80-call recovery path');
fs.writeFileSync(path.join(root,'outputs/speech-source/equivalence.json'),JSON.stringify({checks:96,rate:22050,wholeWavByteIdentical:true,automaticRestart:true,samples:evidence},null,2)+'\n');
console.log('PASS readable-source rebuild: 96 WAVs byte-identical to shipped core, US voice, nonempty PCM, Latin text and automatic 80-call restart');
