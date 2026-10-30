// Rebuild the shipped meSpeak frontend/core from the supplied readable JS sources.
// Outputs are deliberately separate from the app's immutable tested runtime files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{minify}=require('terser');
const root=path.resolve(__dirname,'..'),source=path.join(root,'third_party/offline-speech/mespeak');
(async()=>{const arg=process.argv.indexOf('--output'),out=path.resolve(root,arg>=0?process.argv[arg+1]:'outputs/speech-source');
 if(out===path.join(root,'app/src/main/assets/web/vendor/mespeak'))throw Error('Use a separate build output; app resources are not replaced by this command.');
 fs.mkdirSync(out,{recursive:true});let core=fs.readFileSync(path.join(source,'mespeak-core.full.js'),'utf8');
 const edits=[['meSpeak-core  v.2.0.7','meSpeak-core  v.2.0.6'],['function recoverFromFSError(message, auto)','function recoverFromFSError(message)'],["console.log('meSpeak'+(auto?'':' -- recovering from error')+':', message)","console.log('meSpeak -- recovering from error:', message)"]];
 for(const [old,value] of edits){if(core.split(old).length!==2)throw Error('Source adaptation no longer matches; inspect the upstream source.');core=core.replace(old,value);}
 fs.writeFileSync(path.join(out,'mespeak-core.current.full.js'),core);
 const outputs=[];
 for(const [name,text] of [['mespeak.js',fs.readFileSync(path.join(source,'mespeak.full.js'),'utf8')],['mespeak-core.js',core]]){
  const result=await minify(text,{compress:false,mangle:false,format:{comments:/GPL|Copyright|meSpeak|eSpeak/}});const data=result.code+'\n';fs.writeFileSync(path.join(out,name),data);outputs.push({name,bytes:Buffer.byteLength(data),sha256:crypto.createHash('sha256').update(data).digest('hex')});
 }
 fs.copyFileSync(path.join(source,'en-us.json'),path.join(out,'en-us.json'));
 fs.writeFileSync(path.join(out,'BUILD.json'),JSON.stringify({terser:require('terser/package.json').version,options:{compress:false,mangle:false},outputs},null,2)+'\n');
 console.log('Rebuilt readable meSpeak sources into '+path.relative(root,out)+'; app runtime unchanged.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
