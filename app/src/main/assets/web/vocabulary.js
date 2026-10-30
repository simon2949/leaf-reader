import {normalizeWord} from './core.js';
export const cleanTag=value=>String(value||'').trim().replace(/\s+/g,' ').slice(0,24);
export const uniqueTags=values=>[...new Set((Array.isArray(values)?values:[]).filter(x=>typeof x==='string').map(cleanTag).filter(Boolean))];
export function encounterOf(value){
 const out={};for(const key of ['sentence','queried','bookId','bookTitle','chapter','cfi'])if(typeof value?.[key]==='string')out[key]=value[key];
 if(!out.sentence&&!out.bookId&&!out.bookTitle)return null;
 out.createdAt=Number(value.createdAt)||0;return out;
}
export function encounterKey(e){return JSON.stringify([e.bookId||e.bookTitle||'',e.chapter||'',e.sentence||'',normalizeWord(e.queried||'')]);}
export function encountersOf(word){
 const values=Array.isArray(word.encounters)?word.encounters:[word],seen=new Set();
 return values.map(encounterOf).filter(e=>{if(!e)return false;if(!e.queried)e.queried=word.queried||word.word;const k=encounterKey(e);if(seen.has(k))return false;seen.add(k);return true;});
}
export function hasEncounter(word,entry){
 const e=encounterOf(entry);return !e||encountersOf(word).some(x=>encounterKey(x)===encounterKey(e));
}
export function collectWord(words,entry,now=Date.now()){
 const key=normalizeWord(entry.word);let word=words.find(w=>w.word===key);
 const encounter=encounterOf({...entry,createdAt:now});
 if(!word){word={...entry,word:key,tags:[],encounters:[],createdAt:now};words.unshift(word);}
 if(encounter&&!hasEncounter(word,encounter))word.encounters.unshift(encounter);
 // A newly created entry has an empty encounter array and is filled above.
 for(const key of ['phonetic','zh','en'])if(!word[key]&&entry[key])word[key]=entry[key];
 word.lastCollectedAt=now;return word;
}
export function migrateVocabularyState(state){
 const merged=new Map();
 for(const input of state.words){
  const key=normalizeWord(input.word)||input.word.toLowerCase().trim();
  const word={...input,word:key,tags:uniqueTags(input.tags),encounters:encountersOf(input),createdAt:Number(input.createdAt)||0};
  if(!merged.has(key)){merged.set(key,word);continue;}
  const target=merged.get(key);target.tags=uniqueTags([...target.tags,...word.tags]);
  for(const encounter of word.encounters)if(!hasEncounter(target,encounter))target.encounters.push(encounter);
  target.createdAt=Math.max(target.createdAt,word.createdAt);target.lastCollectedAt=Math.max(target.lastCollectedAt||0,word.lastCollectedAt||0);
 }
 state.words=[...merged.values()];state.wordTags=uniqueTags([...(Array.isArray(state.wordTags)?state.wordTags:[]),...state.words.flatMap(w=>w.tags)]);return state;
}
export function sourceKey(e){return e.bookId?'id:'+e.bookId:e.bookTitle?'title:'+e.bookTitle:'none';}
export function sourceName(e,books){return books.find(b=>b.id===e.bookId)?.title||e.bookTitle||'无书籍来源';}
export function bookFilters(words,books){
 const sources=new Map();for(const word of words)for(const e of encountersOf(word))if(sourceKey(e)!=='none')sources.set(sourceKey(e),sourceName(e,books));
 return [...sources].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN'));
}
export function filterWords(words,{query='',book='',tag='',sort='recent'}={}){
 const q=query.trim().toLowerCase();
 return words.filter(w=>{
  const encounters=encountersOf(w);
  return (!book||(book==='none'?(!encounters.length||encounters.every(e=>sourceKey(e)==='none')):encounters.some(e=>sourceKey(e)===book)))&&(!tag||(tag==='__untagged'?!w.tags.length:w.tags.includes(tag.startsWith('tag:')?tag.slice(4):tag)))&&(!q||[w.word,w.queried,w.meaning,w.zh,w.en,...w.tags,...encounters.flatMap(e=>[e.sentence,e.queried])].join(' ').toLowerCase().includes(q));
 }).sort(sort==='az'?(a,b)=>a.word.localeCompare(b.word,'en'):(a,b)=>(b.lastCollectedAt||b.createdAt||0)-(a.lastCollectedAt||a.createdAt||0)||a.word.localeCompare(b.word,'en'));
}
export function shortMeaning(word){return String(word.meaning||word.zh||word.en||'暂无释义').split(/\n/).find(s=>s.trim())||'暂无释义';}
export function changeTags(words,keys,tags,remove=false){
 const chosen=new Set(keys),values=uniqueTags(tags);
 for(const w of words)if(chosen.has(w.word))w.tags=remove?w.tags.filter(t=>!values.includes(t)):uniqueTags([...w.tags,...values]);
}
