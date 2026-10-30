// Start an isolated local preview and run the supported browser suite sequentially.
const {spawn}=require('node:child_process'),net=require('node:net'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
const suites={default:['e2e','mobile','speech-playback','audio-credits','home-library','daily-card','dictionary-layout','reading-preferences','vocabulary-ui','vocabulary-actions','vocabulary-filters','reader-navigation','reader-chrome','font-picker'],speech:['speech-playback'],audio:['audio-credits','speech-playback','vocabulary-actions'],daily:['home-library','daily-card'],formats:['formats'],vocabulary:['vocabulary-ui','vocabulary-actions','vocabulary-filters']};
const suite=suites[process.argv[2]||'default'];if(!suite)throw Error('Unknown browser suite');
const run=(cmd,args,env)=>new Promise((resolve,reject)=>{const child=spawn(cmd,args,{cwd:root,env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${args.join(' ')} exited ${code}`)));});
(async()=>{const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(resolve=>server.close(resolve));const url=`http://127.0.0.1:${port}`,env={...process.env,LEAF_TEST_URL:url};
 const preview=spawn(process.env.PYTHON||'python3',['tools/dev_server.py','--port',String(port)],{cwd:root,env,stdio:['ignore','ignore','pipe']});let startup='';preview.stderr.on('data',d=>{startup=(startup+d).slice(-4000);});
 const stop=()=>preview.kill('SIGTERM');process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{let ready=false;for(let i=0;i<100;i++){if(preview.exitCode!==null)throw Error(startup);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('Preview did not start: '+startup);for(const name of suite){console.log(`\nRunning ${name}`);await run(process.execPath,[`tests/${name}.cjs`],env);}}
 finally{stop();process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
