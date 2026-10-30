// Native Android uses app-private storage; the browser adapter is for local development.
const pending=new Map();let serial=0;
window.nativeResolve=(id,result)=>{const p=pending.get(id);if(!p)return;pending.delete(id);result.ok?p.resolve(result.data):p.reject(Error(result.error));};
export const native=!!window.Android;
export async function call(action,args={}) {
    if(native)return new Promise((resolve,reject)=>{const id=String(++serial);pending.set(id,{resolve,reject});window.Android.request(id,action,JSON.stringify(args));});
    return browser(action,args);
}
let database;
async function db(){if(!database)database=await new Promise((resolve,reject)=>{const r=indexedDB.open('leaf-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return database;}
export async function fileStore(key,value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files',value===undefined?'readonly':'readwrite');const r=value===undefined?t.objectStore('files').get(key):value===null?t.objectStore('files').delete(key):t.objectStore('files').put(value,key);let result;r.onsuccess=()=>{result=r.result;};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);});}
export async function bookFile(meta){if(native){const res=await fetch('/books/'+encodeURIComponent(meta.file));if(!res.ok)throw Error('书籍文件不存在，请重新导入原文件');return new File([await res.blob()],meta.name||meta.file);}
 const blob=await fileStore(meta.file);if(!blob)throw Error('书籍文件不存在，请重新导入原文件');return new File([blob],meta.name||meta.file);}
function selectFile(accept=''){return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept=accept;input.hidden=true;document.body.append(input);input.onchange=()=>{resolve(input.files[0]||null);input.remove();};input.oncancel=()=>{resolve(null);input.remove();};input.click();});}
async function browser(action,a) {
 switch(action){
 case 'loadState':return JSON.parse(localStorage.getItem('leaf-state')||'null');
 case 'saveState':localStorage.setItem('leaf-state',JSON.stringify(a));return true;
 case 'importFile': {const f=await selectFile('.txt,.epub,.mobi,.azw,.azw3');if(!f)return null;if(f.size>80*1024*1024)throw Error('文件超过 80 MB 限制');const file=crypto.randomUUID()+'.'+f.name.split('.').pop().toLowerCase();await fileStore(file,f);return {file,name:f.name};}
 case 'saveText':{const file=crypto.randomUUID()+'.txt';await fileStore(file,new Blob([a.text]));return {file,name:a.name+'.txt'};}
 case 'deleteBook':await fileStore(a.file,null);return true;
 case 'wordForms':{const r=await fetch('/__api/word-forms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)});if(!r.ok)throw Error('词形读取失败');return r.json();}
 case 'lookup':{const r=await fetch('/__api/lookup?word='+encodeURIComponent(a.word));if(!r.ok)throw Error('开发预览词典服务不可用');return r.json();}
 case 'pronounce':{const m=await (await fetch('/audio/manifest.json')).json();return m[a.word]?{url:'/audio/'+m[a.word].file,label:'内置真人美音',credit:m[a.word]}:null;}
 case 'stats':return (await fetch('/resource-stats.json')).json();
 case 'cacheInfo':return {bytes:0};case 'clearCache':return true;
 case 'fetchArticle':{const r=await fetch('/__api/article?url='+encodeURIComponent(a.url));const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
 case 'backup':{await import('./vendor/foliate/vendor/zip.js');const z=globalThis.zip;const writer=new z.ZipWriter(new z.BlobWriter('application/zip'));await writer.add('state.json',new z.TextReader(JSON.stringify(a.state)));if(a.includeBooks)for(const b of a.state.books){const f=await fileStore(b.file);if(f)await writer.add('books/'+b.file,new z.BlobReader(f));}const url=URL.createObjectURL(await writer.close());const link=document.createElement('a');link.href=url;link.download='LeafReader-backup.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);return true;}
 case 'restore':{const f=await selectFile('.zip');if(!f)return null;await import('./vendor/foliate/vendor/zip.js');const z=globalThis.zip;const reader=new z.ZipReader(new z.BlobReader(f));try{const entries=await reader.getEntries();const entry=entries.find(x=>x.filename==='state.json');if(!entry)throw Error('备份格式无效');const {validateState}=await import('./core.js');const state=validateState(JSON.parse(await entry.getData(new z.TextWriter())));for(const b of state.books){const e=entries.find(x=>x.filename==='books/'+b.file);if(e)await fileStore(b.file,await e.getData(new z.BlobWriter()));}localStorage.setItem('leaf-state',JSON.stringify(state));return true;}finally{await reader.close();}}
 case 'licenses':return {recordings:await (await fetch('/audio/manifest.json')).json(),cached:{}};
 default:throw Error('不支持此操作');
 }
}
